import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { getRepositoryById, updateRepository, deleteRepository } from "@/lib/db";
import { parseGitHubUrl, getRepository, createGitHubClient } from "@/lib/github";
import { Octokit } from "@octokit/rest";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Await the auth check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate repository ID
    const repoId = parseInt(params.id);
    if (!repoId || isNaN(repoId)) {
      return NextResponse.json(
        { error: "Invalid repository ID" },
        { status: 400 }
      );
    }

    // Create GitHub client
    const client = await createGitHubClient();
    
    try {
      // Use the correct Octokit request format - method and path combined as a single string
      const { data: repo } = await client.request('GET /repositories/{repository_id}', {
        repository_id: repoId
      });

      // Format the response
      const dbRepo = await getRepositoryById(repoId);
      const repository = {
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        url: repo.html_url,
        private: repo.private,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        defaultBranch: repo.default_branch,
        updatedAt: repo.updated_at,
        owner: repo.owner.login,
        lastScan: dbRepo?.lastScan || null,
        issues: dbRepo?.issues || { high: 0, medium: 0, low: 0 },
        scanResults: dbRepo?.scanResults || [],
      };

      return NextResponse.json({ repository });
    } catch (apiError: any) {
      console.error("GitHub API Error:", apiError);
      
      // Handle specific GitHub API errors
      if (apiError.status === 404) {
        return NextResponse.json(
          { error: "Repository not found" },
          { status: 404 }
        );
      }
      
      if (apiError.status === 401) {
        return NextResponse.json(
          { error: "GitHub authentication failed" },
          { status: 401 }
        );
      }

      throw apiError;
    }
  } catch (error) {
    console.error("Error fetching repository:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to fetch repository",
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const repoId = parseInt(params.id);
    if (!repoId || isNaN(repoId)) {
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

    const deleted = await deleteRepository(repoId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Failed to delete repository" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting repository:", error);
    return NextResponse.json(
      { error: "Failed to delete repository" },
      { status: 500 }
    );
  }
} 