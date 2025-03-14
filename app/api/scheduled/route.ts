import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs"
import { z } from "zod"
import { createScheduledScan, getScheduledScans } from "@/lib/db"
import { scheduleCodeScan } from "@/lib/scheduler"
import { getRepositoryById } from "@/lib/db"

const createScheduleSchema = z.object({
  repositoryId: z.string(),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  day: z.string().optional(),
  time: z.string(),
  analysisTypes: z.array(z.string()),
})

export async function GET(req: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const schedules = await getScheduledScans(userId)
    return NextResponse.json({ scheduledScans: schedules })
  } catch (error) {
    console.error("Error fetching scheduled scans:", error)
    return NextResponse.json(
      { error: "Failed to fetch scheduled scans" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await req.json()
    const validatedData = createScheduleSchema.parse(data)

    // Verify repository access
    const repository = await getRepositoryById(validatedData.repositoryId)
    if (!repository || repository.userId !== userId) {
      return NextResponse.json(
        { error: "Repository not found or unauthorized" },
        { status: 404 }
      )
    }

    // Calculate next run time
    const nextRun = getNextRunTime(
      validatedData.frequency,
      validatedData.day || null,
      validatedData.time
    )

    // Create schedule in database
    const schedule = await createScheduledScan({
      userId,
      repositoryId: validatedData.repositoryId,
      frequency: validatedData.frequency,
      day: validatedData.day,
      time: validatedData.time,
      analysisTypes: validatedData.analysisTypes,
      status: "active",
      lastRun: null,
      nextRun: nextRun.toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    // Set up the actual schedule
    await scheduleCodeScan(
      schedule.id,
      schedule.repositoryId,
      schedule.frequency,
      schedule.day || null,
      schedule.time
    )

    return NextResponse.json({ schedule })
  } catch (error) {
    console.error("Error creating scheduled scan:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid schedule data", details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create scheduled scan" },
      { status: 500 }
    )
  }
}

