// This file would contain functions to manage scheduled scans
// In a real application, you would use a job scheduler like node-cron or BullMQ

import { analyzeCode } from "./gemini"
import { getRepositoryContent, getFileContent } from "./github"
import { addScanResult, updateScheduledScanStatus } from "./db"

interface ScheduleOptions {
  repositoryId: string
  userId: string
  frequency: "daily" | "weekly" | "monthly"
  day?: string
  time: string
  analysisType: string[]
}

export function scheduleCodeScan(options: ScheduleOptions) {
  // In a real application, you would:
  // 1. Calculate the next run time based on frequency, day, and time
  // 2. Create a job in your scheduler (e.g., node-cron, BullMQ)
  // 3. Return the scheduled job ID

  const jobId = `job-${Date.now()}`

  // Mock implementation - just log the scheduled scan
  console.log(`Scheduled scan for repository ${options.repositoryId}:`, {
    frequency: options.frequency,
    day: options.day,
    time: options.time,
    analysisType: options.analysisType,
  })

  return jobId
}

export function pauseScheduledScan(jobId: string) {
  // In a real application, you would pause the job in your scheduler
  console.log(`Paused scheduled scan: ${jobId}`)
  return true
}

export function resumeScheduledScan(jobId: string) {
  // In a real application, you would resume the job in your scheduler
  console.log(`Resumed scheduled scan: ${jobId}`)
  return true
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

