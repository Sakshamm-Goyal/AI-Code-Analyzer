import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs"
import { GITHUB_OAUTH_CONFIG } from "@/lib/github-oauth"

export async function GET(req: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Generate state parameter for security
    const state = Math.random().toString(36).substring(7)

    // Store state in session or database to verify later
    // In a real app, you'd want to store this securely
    
    const params = new URLSearchParams({
      client_id: GITHUB_OAUTH_CONFIG.clientId,
      redirect_uri: GITHUB_OAUTH_CONFIG.redirectUri,
      scope: GITHUB_OAUTH_CONFIG.scope,
      state,
    })

    const url = `https://github.com/login/oauth/authorize?${params.toString()}`

    return NextResponse.json({ url })
  } catch (error) {
    console.error("Error generating GitHub auth URL:", error)
    return NextResponse.json(
      { error: "Failed to generate authorization URL" },
      { status: 500 }
    )
  }
} 