import { type NextRequest, NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs"
import { exchangeCodeForToken } from "@/lib/github-oauth"

export async function GET(req: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.redirect(new URL("/sign-in", req.url))
    }

    const { searchParams } = new URL(req.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")

    if (!code) {
      throw new Error("No code provided")
    }

    // Exchange the code for an access token
    const accessToken = await exchangeCodeForToken(code)

    // Store the token in Clerk user metadata
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        githubAccessToken: accessToken,
        githubConnectedAt: new Date().toISOString(),
      },
    })

    // Redirect back to the repositories page with success message
    return NextResponse.redirect(
      new URL("/dashboard/repositories?connection=success", req.url)
    )
  } catch (error) {
    console.error("Error in GitHub OAuth callback:", error)
    return NextResponse.redirect(
      new URL("/dashboard/repositories?error=oauth-failed", req.url)
    )
  }
} 