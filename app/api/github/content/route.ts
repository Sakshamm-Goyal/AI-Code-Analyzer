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
    const path = searchParams.get("path") || ""
    const branch = searchParams.get("branch") || "main"

    if (!owner || !repo) {
      return NextResponse.json({ error: "Owner and repo are required" }, { status: 400 })
    }

    const accessToken = await getGitHubToken()

    const url = path
      ? `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`
      : `https://api.github.com/repos/${owner}/${repo}/contents?ref=${branch}`

    const response = await fetch(url, {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("GitHub API error:", errorText)
      return NextResponse.json(
        { error: `GitHub API error: ${response.statusText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // Format the response consistently whether it's a single file or an array
    const contents = Array.isArray(data) ? data : [data]
    
    // Map to a simpler structure
    const mappedContents = contents.map(item => ({
      name: item.name,
      path: item.path,
      type: item.type,
      size: item.size,
      url: item.html_url,
      downloadUrl: item.download_url,
      sha: item.sha,
    }))

    return NextResponse.json({ contents: mappedContents })
  } catch (error) {
    console.error("Error fetching repository content:", error)
    return NextResponse.json(
      { error: "Failed to fetch repository content" },
      { status: 500 }
    )
  }
} 