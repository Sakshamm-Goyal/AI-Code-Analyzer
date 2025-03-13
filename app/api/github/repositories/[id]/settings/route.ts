import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs"
import { getRepositoryById, updateRepository } from "@/lib/db"

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

    return NextResponse.json({
      settings: repository.settings || {
        webhookEnabled: false,
        webhookUrl: "",
        defaultBranch: repository.defaultBranch || "main",
        autoScan: false,
        notifications: {
          email: true,
          slack: false,
        },
      },
    })
  } catch (error) {
    console.error("Error fetching repository settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const repository = await getRepositoryById(params.id)
    if (!repository) {
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 }
      )
    }

    if (repository.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const data = await req.json()
    
    // Update repository with scan results
    await updateRepository(params.id, {
      lastScan: data.lastScan,
      issues: data.issues,
      scanResults: data.scanResults,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating repository settings:", error)
    return NextResponse.json(
      { error: "Failed to update repository settings" },
      { status: 500 }
    )
  }
} 