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
    const url = searchParams.get("url")

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // For public files, we may not need the token
    const accessToken = await getGitHubToken().catch(() => null)

    const headers: HeadersInit = {
      Accept: "application/vnd.github.v3.raw",
    }
    
    if (accessToken) {
      headers.Authorization = `token ${accessToken}`
    }

    const response = await fetch(url, { headers })

    if (!response.ok) {
      return NextResponse.json(
        { error: `GitHub API error: ${response.statusText}` },
        { status: response.status }
      )
    }

    const content = await response.text()

    return NextResponse.json({ content })
  } catch (error) {
    console.error("Error fetching file content:", error)
    return NextResponse.json(
      { error: "Failed to fetch file content" },
      { status: 500 }
    )
  }
} 