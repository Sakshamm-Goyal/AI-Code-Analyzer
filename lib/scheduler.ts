// This file would contain functions to manage scheduled scans
// In a real application, you would use a job scheduler like node-cron or BullMQ

import { analyzeCode } from "./gemini"
import { getRepositoryContent, getFileContent } from "./github"
import { addScanResult, updateScheduledScanStatus } from "./db"
import { Cron } from "croner"
import { getRepositoryById, updateScheduledScan, createScanResult } from "@/lib/db"
import { startCodeScan } from "@/lib/scanner"

interface ScheduleOptions {
  repositoryId: string
  userId: string
  frequency: "daily" | "weekly" | "monthly"
  day?: string
  time: string
  analysisType: string[]
}

interface ScheduledJob {
  id: string
  cron: Cron
}

const activeJobs = new Map<string, ScheduledJob>()

export function getNextRunTime(frequency: string, day: string | null, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number)
  const now = new Date()
  let nextRun = new Date()
  
  nextRun.setHours(hours, minutes, 0, 0)

  switch (frequency) {
    case "daily":
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1)
      }
      break
      
    case "weekly":
      const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
      const targetDay = daysOfWeek.indexOf(day?.toLowerCase() || "")
      while (nextRun.getDay() !== targetDay || nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1)
      }
      break
      
    case "monthly":
      const targetDate = parseInt(day || "1")
      nextRun.setDate(targetDate)
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1)
      }
      break
  }

  return nextRun
}

export async function scheduleCodeScan(scheduleId: string, repositoryId: string, frequency: string, day: string | null, time: string) {
  try {
    // Stop existing job if any
    stopScheduledJob(scheduleId)

    const cronExpression = getCronExpression(frequency, day, time)
    
    const job = new Cron(cronExpression, async () => {
      try {
        // Get latest repository data
        const repository = await getRepositoryById(repositoryId)
        if (!repository) {
          throw new Error("Repository not found")
        }

        // Create scan result entry
        const scanResult = await createScanResult({
          repositoryId,
          status: "pending",
          branch: repository.defaultBranch || "main",
          commit: repository.lastCommit || "",
        })

        // Start the scan
        await startCodeScan(repository, scanResult.id)

        // Update next run time
        const nextRun = getNextRunTime(frequency, day, time)
        await updateScheduledScan(scheduleId, {
          lastRun: new Date().toISOString(),
          nextRun: nextRun.toISOString(),
        })

      } catch (error) {
        console.error(`Error in scheduled scan ${scheduleId}:`, error)
        // Update schedule with error status if needed
      }
    })

    activeJobs.set(scheduleId, { id: scheduleId, cron: job })

    // Update next run time immediately
    const nextRun = getNextRunTime(frequency, day, time)
    await updateScheduledScan(scheduleId, {
      nextRun: nextRun.toISOString(),
    })

    return true
  } catch (error) {
    console.error(`Error scheduling scan ${scheduleId}:`, error)
    throw error
  }
}

export function stopScheduledJob(scheduleId: string) {
  const job = activeJobs.get(scheduleId)
  if (job) {
    job.cron.stop()
    activeJobs.delete(scheduleId)
  }
}

export async function pauseScheduledScan(scheduleId: string) {
  stopScheduledJob(scheduleId)
}

export async function resumeScheduledScan(scheduleId: string) {
  const schedule = await getScheduledScanById(scheduleId)
  if (schedule) {
    await scheduleCodeScan(
      scheduleId,
      schedule.repositoryId,
      schedule.frequency,
      schedule.day,
      schedule.time
    )
  }
}

function getCronExpression(frequency: string, day: string | null, time: string): string {
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

export function deleteScheduledScan(jobId: string) {
  // In a real application, you would delete the job from your scheduler
  console.log(`Deleted scheduled scan: ${jobId}`)
  return true
}

// This function would be called by your scheduler when it's time to run a scan
export async function runScheduledScan(
  scheduledScanId: string,
  repositoryId: string,
  userId: string,
  accessToken: string,
  owner: string,
  repo: string,
  branch: string,
  analysisType: string[],
) {
  try {
    // 1. Create a scan result record with status "running"
    const scanResult = await addScanResult({
      userId,
      repositoryId,
      branch,
      commit: "latest", // In a real implementation, you would get the actual commit hash
      timestamp: new Date().toISOString(),
      status: "running",
      summary: {
        riskScore: 0,
        issues: {
          high: 0,
          medium: 0,
          low: 0,
        },
      },
      issues: [],
    })

    // 2. Fetch repository content
    const contents = await getRepositoryContent(accessToken, owner, repo, "", branch)

    // 3. Filter for code files
    const codeFiles = contents.filter((item: any) => item.type === "file" && isCodeFile(item.name))

    // 4. Analyze each file
    const analysisResults = []
    for (const file of codeFiles) {
      const content = await getFileContent(accessToken, file.download_url)
      const language = getLanguageFromFilename(file.name)
      const analysis = await analyzeCode(content, language, analysisType)
      analysisResults.push({
        file: file.path,
        analysis,
      })
    }

    // 5. Aggregate results
    const aggregatedResults = aggregateAnalysisResults(analysisResults)

    // 6. Update scan result with completed status and analysis results
    const updatedScanResult = {
      ...scanResult,
      status: "completed",
      summary: aggregatedResults.summary,
      issues: aggregatedResults.issues,
    }

    // 7. Update the scheduled scan's last run time
    await updateScheduledScanStatus(scheduledScanId, "active")

    return updatedScanResult
  } catch (error) {
    console.error("Error running scheduled scan:", error)

    // Update scan result with failed status
    const failedScanResult = {
      userId,
      repositoryId,
      branch,
      commit: "latest",
      timestamp: new Date().toISOString(),
      status: "failed",
      summary: {
        riskScore: 0,
        issues: {
          high: 0,
          medium: 0,
          low: 0,
        },
      },
      issues: [],
    }

    await addScanResult(failedScanResult)
    throw error
  }
}

function isCodeFile(filename: string): boolean {
  const codeExtensions = [
    ".js",
    ".ts",
    ".jsx",
    ".tsx",
    ".py",
    ".java",
    ".cs",
    ".php",
    ".go",
    ".rb",
    ".rs",
    ".swift",
    ".c",
    ".cpp",
    ".html",
    ".css",
    ".scss",
  ]

  return codeExtensions.some((ext) => filename.endsWith(ext))
}

function getLanguageFromFilename(filename: string): string {
  if (filename.endsWith(".js")) return "javascript"
  if (filename.endsWith(".ts")) return "typescript"
  if (filename.endsWith(".jsx")) return "javascript"
  if (filename.endsWith(".tsx")) return "typescript"
  if (filename.endsWith(".py")) return "python"
  if (filename.endsWith(".java")) return "java"
  if (filename.endsWith(".cs")) return "csharp"
  if (filename.endsWith(".php")) return "php"
  if (filename.endsWith(".go")) return "go"
  if (filename.endsWith(".rb")) return "ruby"
  if (filename.endsWith(".rs")) return "rust"
  if (filename.endsWith(".swift")) return "swift"
  if (filename.endsWith(".c") || filename.endsWith(".cpp")) return "cpp"
  if (filename.endsWith(".html")) return "html"
  if (filename.endsWith(".css") || filename.endsWith(".scss")) return "css"

  return "unknown"
}

function aggregateAnalysisResults(results: any[]): any {
  // Aggregate all issues and calculate overall risk score
  const allIssues = results.flatMap((result) =>
    result.analysis.issues.map((issue: any) => ({
      ...issue,
      file: result.file,
    })),
  )

  const highIssues = allIssues.filter((issue: any) => issue.severity === "high")
  const mediumIssues = allIssues.filter((issue: any) => issue.severity === "medium")
  const lowIssues = allIssues.filter((issue: any) => issue.severity === "low")

  // Calculate risk score based on number and severity of issues
  const riskScore = calculateRiskScore(highIssues.length, mediumIssues.length, lowIssues.length)

  return {
    summary: {
      riskScore,
      issues: {
        high: highIssues.length,
        medium: mediumIssues.length,
        low: lowIssues.length,
      },
    },
    issues: allIssues,
  }
}

function calculateRiskScore(high: number, medium: number, low: number): number {
  // Simple risk score calculation
  // High issues have more weight than medium, which have more weight than low
  const score = 100 - (high * 10 + medium * 3 + low * 1)
  return Math.max(0, Math.min(100, score)) // Ensure score is between 0 and 100
}

