import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs"
import { getRepositoryById } from "@/lib/db"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const repositoryId = params.id
    const repository = await getRepositoryById(repositoryId)

    if (!repository) {
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 }
      )
    }

    if (repository.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // In a real implementation, you would fetch this from your database
    // For now, we'll return mock data
    const history = [
      {
        id: "scan_1",
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        status: "completed",
        issues: { high: 2, medium: 3, low: 5 },
        summary: "Found multiple security vulnerabilities",
        branch: "main",
        commit: "abc123def456",
      },
      {
        id: "scan_2",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: "completed",
        issues: { high: 1, medium: 2, low: 3 },
        summary: "Minor security issues detected",
        branch: "main",
        commit: "xyz789uvw123",
      },
      // Add more mock history items as needed
    ]

    return NextResponse.json({ history })
  } catch (error) {
    console.error("Error fetching scan history:", error)
    return NextResponse.json(
      { error: "Failed to fetch scan history" },
      { status: 500 }
    )
  }
} 