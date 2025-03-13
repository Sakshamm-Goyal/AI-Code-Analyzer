import { NextResponse, NextRequest } from "next/server";
import { auth, currentUser } from "@clerk/nextjs";

export async function GET(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    
    // Try to get token from user metadata
    const githubToken = user?.publicMetadata?.githubAccessToken as string;
    const githubConnectedAt = user?.publicMetadata?.githubConnectedAt as string;
    
    if (githubToken) {
      // Check if token is expired (tokens older than 8 hours)
      const connectedDate = new Date(githubConnectedAt);
      const now = new Date();
      const hoursSinceConnection = (now.getTime() - connectedDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceConnection > 8) {
        return NextResponse.json(
          { error: "GitHub token expired" },
          { status: 401 }
        );
      }
      
      return NextResponse.json({ token: githubToken });
    }

    return NextResponse.json(
      { error: "GitHub account not connected" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error fetching GitHub token:", error);
    return NextResponse.json(
      { error: "Failed to get GitHub token" },
      { status: 500 }
    );
  }
} 