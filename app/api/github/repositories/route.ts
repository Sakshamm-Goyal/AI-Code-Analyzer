import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs"
import { createGitHubClient, parseGitHubUrl } from "@/lib/github"
import { createRepository } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const client = await createGitHubClient()
    const { data: repos } = await client.repos.listForAuthenticatedUser({
      visibility: "all",
      sort: "updated",
      per_page: 100,
    })

    return NextResponse.json({
      repositories: repos.map(repo => ({
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
      })),
    })
  } catch (error) {
    console.error("Error fetching repositories:", error)
    return NextResponse.json(
      { error: "Failed to fetch repositories" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { url } = await req.json()
    const parsed = parseGitHubUrl(url)
    
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid repository URL" },
        { status: 400 }
      )
    }

    const client = await createGitHubClient()
    const { data: repo } = await client.repos.get({
      owner: parsed.owner,
      repo: parsed.repo,
    })

    console.log("Creating repository in database with GitHub ID:", repo.id)

    // Create repository in database
    const repository = await createRepository({
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
      userId: userId,
      issues: { high: 0, medium: 0, low: 0 },
      lastScan: null,
      scanResults: []
    })

    return NextResponse.json({ repository })
  } catch (error) {
    console.error("Error connecting repository:", error)
    return NextResponse.json(
      { error: "Failed to connect repository" },
      { status: 500 }
    )
  }
}

