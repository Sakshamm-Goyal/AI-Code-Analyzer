import { type NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs";
import { getRepositoryById, updateRepository, deleteRepository, createRepository } from "@/lib/db";
import { parseGitHubUrl } from "@/lib/github";
import { Octokit } from "@octokit/rest";
import { clerkClient } from "@clerk/nextjs";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // IMPORTANT: Must await auth() in App Router
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Safely access params.id after auth() is awaited
    const repoId = params.id;
    console.log(`Getting repository ${repoId} for user ${userId}`);

    // Attempt to fetch directly from GitHub first
    try {
      // Get GitHub token from user metadata
      const user = await clerkClient.users.getUser(userId);
      
      if (user.publicMetadata.githubAccessToken) {
        const token = user.publicMetadata.githubAccessToken as string;
        const client = new Octokit({ auth: token });
        
        try {
          // Try to get the repository by ID from GitHub
          const { data: repo } = await client.request('GET /repositories/{repository_id}', {
            repository_id: parseInt(repoId)
          });
          
          if (repo) {
            console.log(`Found repository directly on GitHub: ${repo.full_name}`);
            
            // Return formatted repository without saving to database
            return NextResponse.json({ 
              repository: {
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
                scanResults: [],
                _sourceType: 'github_direct'
              }
            });
          }
        } catch (githubError) {
          console.error("Error fetching repository from GitHub by ID:", githubError);
          
          // Try fetching user's repositories and find by ID
          try {
            const { data: repos } = await client.repos.listForAuthenticatedUser({
              per_page: 100
            });
            
            const matchingRepo = repos.find(r => r.id.toString() === repoId);
            
            if (matchingRepo) {
              console.log(`Found repository in user's GitHub repos: ${matchingRepo.full_name}`);
              
              // Return formatted repository without saving to database
              return NextResponse.json({ 
                repository: {
                  id: matchingRepo.id.toString(),
                  name: matchingRepo.name,
                  fullName: matchingRepo.full_name,
                  description: matchingRepo.description || '',
                  url: matchingRepo.html_url,
                  private: matchingRepo.private,
                  stars: matchingRepo.stargazers_count,
                  forks: matchingRepo.forks_count,
                  defaultBranch: matchingRepo.default_branch,
                  updatedAt: matchingRepo.updated_at,
                  owner: matchingRepo.owner.login,
                  userId: userId,
                  issues: { high: 0, medium: 0, low: 0 },
                  scanResults: [],
                  _sourceType: 'github_list'
                }
              });
            }
          } catch (listError) {
            console.error("Error listing user repositories:", listError);
          }
        }
      }
    } catch (tokenError) {
      console.error("Error getting GitHub token:", tokenError);
    }
    
    // Fallback to database if GitHub fetch fails
    try {
      // Try to get from our database
      const repository = await getRepositoryById(repoId);
      
      if (repository) {
        if (repository.userId !== userId) {
          return NextResponse.json(
            { error: "Unauthorized" },
            { status: 403 }
          );
        }
        
        return NextResponse.json({ repository });
      }
    } catch (dbError) {
      console.error("Database error:", dbError);
    }
    
    // If we get here, we couldn't find the repository
    return NextResponse.json(
      { error: "Repository not found" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error getting repository:", error);
    return NextResponse.json(
      { error: "Failed to get repository" },
      { status: 500 }
    );
  }
}

// Helper function to get GitHub token safely
async function getGitHubToken(userId: string): Promise<string | null> {
  try {
    // Get token from Clerk metadata
    const { data, error } = await fetch('/api/user/github-token').then(res => res.json());
    
    if (error) {
      throw new Error(error);
    }
    
    return data?.token || null;
  } catch (error) {
    console.error("Error getting GitHub token:", error);
    return null;
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // IMPORTANT: Must await auth() in App Router
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Make sure we have a valid ID
    const repoId = params.id;
    if (!repoId) {
      return NextResponse.json(
        { error: "Invalid repository ID" },
        { status: 400 }
      );
    }

    const repository = await getRepositoryById(repoId);

    if (!repository) {
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 }
      );
    }

    if (repository.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await deleteRepository(repoId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting repository:", error);
    return NextResponse.json(
      { error: "Failed to delete repository" },
      { status: 500 }
    );
  }
} 