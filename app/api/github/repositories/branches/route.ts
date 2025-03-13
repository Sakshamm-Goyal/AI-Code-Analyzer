import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs"
import { getGitHubToken } from "@/lib/github"

export async function GET(req: NextRequest) {
  try {
    const { userId } = auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const owner = searchParams.get("owner")
    const repo = searchParams.get("repo")

    if (!owner || !repo) {
      return NextResponse.json(
        { error: "Owner and repo are required" },
        { status: 400 }
      )
    }

    const accessToken = await getGitHubToken()

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/branches`,
      {
        headers: {
          Authorization: `token ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    )

    if (!response.ok) {
      return NextResponse.json(
        { error: `GitHub API error: ${response.statusText}` },
        { status: response.status }
      )
    }

    const branches = await response.json()

    return NextResponse.json({
      branches: branches.map((branch: any) => ({
        name: branch.name,
        protected: branch.protected,
        commit: branch.commit?.sha,
      })),
    })
  } catch (error) {
    console.error("Error fetching branches:", error)
    return NextResponse.json(
      { error: "Failed to fetch branches" },
      { status: 500 }
    )
  }
} 