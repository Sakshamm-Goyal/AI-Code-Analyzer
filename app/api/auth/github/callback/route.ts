import { type NextRequest, NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs"
import { exchangeCodeForToken } from "@/lib/github-oauth"

export async function GET(req: NextRequest) {
  try {
    // IMPORTANT: Must await auth() in App Router
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.redirect(new URL("/sign-in", req.url))
    }

    const { searchParams } = new URL(req.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")

    if (!code) {
      throw new Error("No code provided")
    }

    console.log(`Exchanging GitHub code for token for user ${userId}`);
    
    // Exchange the code for an access token
    const accessToken = await exchangeCodeForToken(code)
    
    console.log(`Successfully obtained GitHub token, storing in user metadata`);

    // Store the token in Clerk user metadata
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        githubAccessToken: accessToken,
        githubConnectedAt: new Date().toISOString(),
      },
    })
    
    console.log(`GitHub token stored in user metadata, redirecting to success page`);

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