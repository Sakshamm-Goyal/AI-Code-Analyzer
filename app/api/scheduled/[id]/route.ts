import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs"
import { getScheduledScanById, updateScheduledScan, deleteScheduledScan } from "@/lib/db"
import { scheduleCodeScan, pauseScheduledScan, resumeScheduledScan } from "@/lib/scheduler"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const schedule = await getScheduledScanById(params.id)
    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }

    if (schedule.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    return NextResponse.json({ schedule })
  } catch (error) {
    console.error("Error fetching schedule:", error)
    return NextResponse.json(
      { error: "Failed to fetch schedule" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const schedule = await getScheduledScanById(params.id)
    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }

    if (schedule.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const data = await req.json()
    const { action } = data

    switch (action) {
      case "pause":
        await pauseScheduledScan(params.id)
        await updateScheduledScan(params.id, { status: "paused" })
        break
      case "resume":
        await resumeScheduledScan(params.id)
        await updateScheduledScan(params.id, { status: "active" })
        break
      default:
        await updateScheduledScan(params.id, data)
    }

    const updatedSchedule = await getScheduledScanById(params.id)
    return NextResponse.json({ schedule: updatedSchedule })
  } catch (error) {
    console.error("Error updating schedule:", error)
    return NextResponse.json(
      { error: "Failed to update schedule" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const schedule = await getScheduledScanById(params.id)
    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
    }

    if (schedule.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    await deleteScheduledScan(params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting schedule:", error)
    return NextResponse.json(
      { error: "Failed to delete schedule" },
      { status: 500 }
    )
  }
} 