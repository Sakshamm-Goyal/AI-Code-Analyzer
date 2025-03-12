// This is a mock database implementation
// In a real application, you would use Prisma or another ORM

interface User {
  id: string
  email: string
  githubToken?: string
}

interface Repository {
  id: string
  userId: string
  name: string
  url: string
  description?: string
  defaultBranch: string
}

interface ScanResult {
  id: string
  userId: string
  repositoryId: string
  branch: string
  commit: string
  timestamp: string
  status: "pending" | "running" | "completed" | "failed"
  summary: {
    riskScore: number
    issues: {
      high: number
      medium: number
      low: number
    }
  }
  issues: Array<{
    id: string
    title: string
    severity: "high" | "medium" | "low"
    description: string
    file: string
    line: number
    recommendation: string
  }>
}

interface ScheduledScan {
  id: string
  userId: string
  repositoryId: string
  frequency: "daily" | "weekly" | "monthly"
  day?: string
  time: string
  analysisType: string[]
  lastRun?: string
  nextRun: string
  status: "active" | "paused"
}

// Mock data stores
const users: User[] = []
const repositories: Repository[] = []
const scanResults: ScanResult[] = []
const scheduledScans: ScheduledScan[] = []

// User operations
export async function getUserById(id: string): Promise<User | null> {
  return users.find((user) => user.id === id) || null
}

export async function updateUserGithubToken(userId: string, token: string): Promise<User> {
  const user = await getUserById(userId)
  if (!user) {
    throw new Error("User not found")
  }

  user.githubToken = token
  return user
}

// Repository operations
export async function getRepositoriesByUserId(userId: string): Promise<Repository[]> {
  return repositories.filter((repo) => repo.userId === userId)
}

export async function addRepository(repository: Omit<Repository, "id">): Promise<Repository> {
  const newRepository = {
    ...repository,
    id: `repo-${Date.now()}`,
  }

  repositories.push(newRepository)
  return newRepository
}

// Scan result operations
export async function getScanResultsByUserId(userId: string): Promise<ScanResult[]> {
  return scanResults.filter((result) => result.userId === userId)
}

export async function getScanResultsByRepositoryId(repositoryId: string): Promise<ScanResult[]> {
  return scanResults.filter((result) => result.repositoryId === repositoryId)
}

export async function addScanResult(scanResult: Omit<ScanResult, "id">): Promise<ScanResult> {
  const newScanResult = {
    ...scanResult,
    id: `scan-${Date.now()}`,
  }

  scanResults.push(newScanResult)
  return newScanResult
}

// Scheduled scan operations
export async function getScheduledScansByUserId(userId: string): Promise<ScheduledScan[]> {
  return scheduledScans.filter((schedule) => schedule.userId === userId)
}

export async function addScheduledScan(scheduledScan: Omit<ScheduledScan, "id">): Promise<ScheduledScan> {
  const newScheduledScan = {
    ...scheduledScan,
    id: `schedule-${Date.now()}`,
  }

  scheduledScans.push(newScheduledScan)
  return newScheduledScan
}

export async function updateScheduledScanStatus(id: string, status: "active" | "paused"): Promise<ScheduledScan> {
  const scheduledScan = scheduledScans.find((schedule) => schedule.id === id)
  if (!scheduledScan) {
    throw new Error("Scheduled scan not found")
  }

  scheduledScan.status = status
  return scheduledScan
}

export async function deleteScheduledScan(id: string): Promise<void> {
  const index = scheduledScans.findIndex((schedule) => schedule.id === id)
  if (index !== -1) {
    scheduledScans.splice(index, 1)
  }
}

