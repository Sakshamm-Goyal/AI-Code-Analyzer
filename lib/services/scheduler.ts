import { Cron } from "croner"
import { getScheduledScans, updateScheduledScan } from "@/lib/db"
import { runScheduledScan } from "@/lib/scheduler"
import { sendNotification } from "@/lib/notifications"

class SchedulerService {
  private jobs: Map<string, Cron> = new Map()
  private isInitialized: boolean = false

  async initialize() {
    if (this.isInitialized) return

    try {
      // Load all active schedules
      const schedules = await getScheduledScans("system")
      
      // Start jobs for each active schedule
      for (const schedule of schedules) {
        if (schedule.status === "active") {
          await this.startJob(schedule)
        }
      }

      this.isInitialized = true
    } catch (error) {
      console.error("Error initializing scheduler:", error)
    }
  }

  async startJob(schedule: any) {
    try {
      const job = new Cron(
        this.getCronExpression(schedule.frequency, schedule.day, schedule.time),
        { timezone: "UTC" },
        async () => {
          try {
            // Run the scan
            const result = await runScheduledScan(schedule)

            // Update next run time
            await updateScheduledScan(schedule.id, {
              lastRun: new Date().toISOString(),
              nextRun: job.nextRun()?.toISOString() || new Date().toISOString(),
            })

            // Send notification
            await sendNotification(schedule.userId, {
              type: "scan_complete",
              priority: "low",
              title: "Scheduled Scan Complete",
              message: `Scan completed for ${schedule.repositoryName}`,
              metadata: {
                scanId: result.id,
                repositoryId: schedule.repositoryId,
                issues: result.summary.issues,
              },
            })
          } catch (error) {
            console.error(`Error running scheduled scan ${schedule.id}:`, error)
            
            // Send error notification
            await sendNotification(schedule.userId, {
              type: "error",
              priority: "high",
              title: "Scheduled Scan Failed",
              message: `Failed to run scheduled scan for ${schedule.repositoryName}`,
              metadata: {
                scheduleId: schedule.id,
                repositoryId: schedule.repositoryId,
                error: error instanceof Error ? error.message : "Unknown error",
              },
            })
          }
        }
      )

      this.jobs.set(schedule.id, job)
    } catch (error) {
      console.error(`Error starting job for schedule ${schedule.id}:`, error)
    }
  }

  stopJob(scheduleId: string) {
    const job = this.jobs.get(scheduleId)
    if (job) {
      job.stop()
      this.jobs.delete(scheduleId)
    }
  }

  private getCronExpression(frequency: string, day: string | null, time: string): string {
    const [hours, minutes] = time.split(":").map(Number)
    
    switch (frequency) {
      case "daily":
        return `${minutes} ${hours} * * *`
        
      case "weekly": {
        const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
        const dayNum = daysOfWeek.indexOf(day?.toLowerCase() || "")
        return `${minutes} ${hours} * * ${dayNum}`
      }
      
      case "monthly":
        const dayOfMonth = parseInt(day || "1")
        return `${minutes} ${hours} ${dayOfMonth} * *`
        
      default:
        throw new Error(`Invalid frequency: ${frequency}`)
    }
  }
}

export const scheduler = new SchedulerService() 