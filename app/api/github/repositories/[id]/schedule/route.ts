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
      schedule: repository.schedule || {
        frequency: "daily",
        time: "00:00",
        day: "1",
      },
    })
  } catch (error) {
    console.error("Error fetching schedule:", error)
    return NextResponse.json(
      { error: "Failed to fetch schedule" },
      { status: 500 }
    )
  }
}

export async function POST(
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

    const { schedule } = await req.json()

    // Validate schedule
    if (!schedule?.frequency || !schedule?.time) {
      return NextResponse.json(
        { error: "Invalid schedule format" },
        { status: 400 }
      )
    }

    // Update repository with new schedule
    const updated = await updateRepository(repositoryId, {
      ...repository,
      schedule,
    })

    return NextResponse.json({ schedule: updated.schedule })
  } catch (error) {
    console.error("Error updating schedule:", error)
    return NextResponse.json(
      { error: "Failed to update schedule" },
      { status: 500 }
    )
  }
} 