import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs"

export async function GET(req: NextRequest) {
  try {
    const { userId } = auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // In a real implementation, you would fetch scheduled scans from your database

    // Mock implementation
    const scheduledScans = [
      {
        id: "schedule-1",
        repository: "frontend-app",
        frequency: "weekly",
        day: "Monday",
        time: "09:00",
        lastRun: "2023-06-05T09:00:00",
        nextRun: "2023-06-12T09:00:00",
        status: "active",
      },
      {
        id: "schedule-2",
        repository: "backend-api",
        frequency: "daily",
        time: "00:00",
        lastRun: "2023-06-09T00:00:00",
        nextRun: "2023-06-10T00:00:00",
        status: "active",
      },
      {
        id: "schedule-3",
        repository: "mobile-app",
        frequency: "monthly",
        day: "1st",
        time: "12:00",
        lastRun: "2023-06-01T12:00:00",
        nextRun: "2023-07-01T12:00:00",
        status: "paused",
      },
    ]

    return NextResponse.json({ scheduledScans })
  } catch (error) {
    console.error("Error fetching scheduled scans:", error)
    return NextResponse.json({ error: "Failed to fetch scheduled scans" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { repository, frequency, day, time, analysisType } = await req.json()

    if (!repository || !frequency || !time) {
      return NextResponse.json({ error: "Repository, frequency, and time are required" }, { status: 400 })
    }

    if (frequency !== "daily" && !day) {
      return NextResponse.json({ error: "Day is required for weekly and monthly schedules" }, { status: 400 })
    }

    // In a real implementation, you would:
    // 1. Validate the input
    // 2. Calculate the next run time
    // 3. Store the schedule in your database
    // 4. Set up a job scheduler (e.g., node-cron, BullMQ) to run the scan

    // Mock implementation
    const now = new Date()
    const nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000) // Tomorrow

    const scheduledScan = {
      id: `schedule-${Date.now()}`,
      repository,
      frequency,
      day: frequency === "daily" ? null : day,
      time,
      analysisType: analysisType || ["security", "quality"],
      lastRun: null,
      nextRun: nextRun.toISOString(),
      status: "active",
    }

    return NextResponse.json({ scheduledScan })
  } catch (error) {
    console.error("Error creating scheduled scan:", error)
    return NextResponse.json({ error: "Failed to create scheduled scan" }, { status: 500 })
  }
}

