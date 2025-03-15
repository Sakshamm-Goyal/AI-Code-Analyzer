import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { importUserRepositories } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    // IMPORTANT: Must await auth() in App Router
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`Syncing repositories for user ${userId}`);

    // Import all repositories for the user
    const repositories = await importUserRepositories(userId);
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully imported ${repositories.length} repositories`,
      count: repositories.length,
      repositories: repositories, // Include the repositories in the response
    });
  } catch (error) {
    console.error("Error syncing repositories:", error);
    return NextResponse.json(
      { error: "Failed to sync repositories", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 