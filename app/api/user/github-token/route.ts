import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser, clerkClient } from "@clerk/nextjs";

export async function GET(request: NextRequest) {
  try {
    // IMPORTANT: Always await auth() first
    const authResult = await auth();
    const userId = authResult.userId;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    console.log(`Getting GitHub token for user ${userId}`);
    
    try {
      // First, try to get from user's publicMetadata
      const user = await clerkClient.users.getUser(userId);
      const githubTokenFromMetadata = user.publicMetadata.githubAccessToken;
      
      if (githubTokenFromMetadata) {
        console.log("Found GitHub token in user metadata");
        return NextResponse.json({ token: githubTokenFromMetadata });
      }
      
      // If not found in metadata, check OAuth connections
      console.log("Token not found in metadata, checking OAuth connections...");
      
      // IMPORTANT: Must await currentUser() in App Router
      const currentUserData = await currentUser();
      
      if (!currentUserData) {
        return NextResponse.json({ error: "Current user not found" }, { status: 404 });
      }
      
      // Find GitHub OAuth account
      const githubAccount = currentUserData.externalAccounts.find(
        (account) => account.provider === "github"
      );
      
      if (!githubAccount) {
        console.log("No GitHub account connected");
        return NextResponse.json(
          { error: "GitHub account not connected" },
          { status: 404 }
        );
      }
      
      // The accessToken is available directly in OAuth account
      if (!githubAccount.accessToken) {
        console.log("No GitHub token available in OAuth account");
        return NextResponse.json(
          { error: "GitHub token not available" },
          { status: 404 }
        );
      }
      
      console.log("GitHub token retrieved successfully from OAuth account");
      
      // Also save it to metadata for future use
      await clerkClient.users.updateUserMetadata(userId, {
        publicMetadata: {
          ...user.publicMetadata,
          githubAccessToken: githubAccount.accessToken,
          githubConnectedAt: new Date().toISOString(),
        },
      });
      
      return NextResponse.json({ token: githubAccount.accessToken });
    } catch (tokenError) {
      console.error("Error retrieving GitHub token:", tokenError);
      return NextResponse.json(
        { error: "Failed to retrieve GitHub token", details: tokenError instanceof Error ? tokenError.message : String(tokenError) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in GitHub token endpoint:", error);
    return NextResponse.json(
      { error: "Failed to get GitHub token", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 