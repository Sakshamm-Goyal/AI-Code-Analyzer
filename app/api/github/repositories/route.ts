import { type NextRequest, NextResponse } from "next/server"
import { auth, currentUser, clerkClient } from "@clerk/nextjs"
import { createRepository, getRepositoryById, getRepositoriesByUserId } from "@/lib/db"
import { Octokit } from "@octokit/rest"
import { parseGitHubUrl } from "@/lib/github"

export async function GET(req: NextRequest) {
  try {
    // IMPORTANT: Get userId from auth
    const authResult = await auth();
    const userId = authResult.userId;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`Fetching repositories for user ${userId}`);
    
    try {
      // Get repositories directly from GitHub if possible
      // This way we don't rely on database at all
      let repositories = [];
      
      try {
      // Get GitHub token from user metadata
      const user = await clerkClient.users.getUser(userId);
      
        if (user.publicMetadata.githubAccessToken) {
      const token = user.publicMetadata.githubAccessToken as string;
      const client = new Octokit({ auth: token });
      
          console.log(`Created GitHub client for user ${userId}, fetching repos directly`);
      
      const { data: repos } = await client.repos.listForAuthenticatedUser({
        visibility: "all",
        sort: "updated",
        per_page: 100,
      });
      
      console.log(`Found ${repos.length} repositories on GitHub for user ${userId}`);
      
          // Format repositories for client-side display
          repositories = repos.map(repo => ({
                  id: repo.id.toString(),
                  name: repo.name,
                  fullName: repo.full_name,
                  description: repo.description || '',
                  url: repo.html_url,
                  private: repo.private,
                  stars: repo.stargazers_count,
                  forks: repo.forks_count,
            defaultBranch: repo.default_branch,
            updatedAt: repo.updated_at,
                  owner: repo.owner.login,
                  userId: userId,
                  issues: { high: 0, medium: 0, low: 0 },
            lastScan: null,
            _sourceType: 'github_direct'  // Indicate these came directly from GitHub
          }));
          
          // Return directly without trying to save to database
          return NextResponse.json({ repositories });
        }
      } catch (githubError) {
        console.error("Error fetching repositories from GitHub directly:", githubError);
        // Continue to try database fallback
      }
      
      // Only try database if GitHub direct fetch failed
      try {
        // Get user's repositories from database as fallback
        const existingRepos = await getRepositoriesByUserId(userId);
        
        if (existingRepos && existingRepos.length > 0) {
          console.log(`Found ${existingRepos.length} repositories in database for user ${userId}`);
          return NextResponse.json({ repositories: existingRepos });
        }
      } catch (dbError) {
        console.error("Database error:", dbError);
        // Fall through to return empty array if both GitHub and DB fail
      }
      
      // If we get here, we have no repositories to return
      return NextResponse.json({ repositories: [] });
    } catch (error) {
      console.error("Error fetching repositories:", error);
      return NextResponse.json({ repositories: [] });
    }
  } catch (error) {
    console.error("Error in repository API:", error);
    return NextResponse.json({ repositories: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    // IMPORTANT: Must await auth() in App Router
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url } = await req.json();
    const parsed = parseGitHubUrl(url);
    
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid repository URL" },
        { status: 400 }
      );
    }

    // Get GitHub token from user metadata
    const user = await clerkClient.users.getUser(userId);
    
    if (!user.publicMetadata.githubAccessToken) {
      return NextResponse.json(
        { error: "GitHub token not found. Please connect GitHub account first." },
        { status: 400 }
      );
    }
    
    const token = user.publicMetadata.githubAccessToken as string;
    const client = new Octokit({ auth: token });

    // Get repository details from GitHub
    const { data: repo } = await client.repos.get({
      owner: parsed.owner,
      repo: parsed.repo,
    });

    console.log(`Creating repository in database with GitHub ID: ${repo.id}`);

    // Create repository in database
    const repository = await createRepository({
      id: repo.id.toString(),
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description || '',
      url: repo.html_url,
      private: repo.private,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      defaultBranch: repo.default_branch,
      updatedAt: repo.updated_at,
      owner: repo.owner.login,
      userId: userId,
      issues: { high: 0, medium: 0, low: 0 },
      scanResults: []
    });

    return NextResponse.json({ repository });
  } catch (error) {
    console.error("Error connecting repository:", error);
    return NextResponse.json(
      { error: "Failed to connect repository" },
      { status: 500 }
    );
  }
}

