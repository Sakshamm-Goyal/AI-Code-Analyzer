// This is a mock database implementation
// In a real application, you would use Prisma or another ORM

import { auth } from "@clerk/nextjs";
import { createClient } from '@supabase/supabase-js'
import { createGitHubClient } from '@clerk/nextjs'

interface User {
  id: string
  email: string
  githubToken?: string
}

export interface Repository {
  id: string
  userId: string
  name: string
  url: string
  description?: string
  defaultBranch: string
  stars?: number
  forks?: number
  lastScan?: string
  issues?: {
    high: number
    medium: number
    low: number
  }
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
)

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
  // In a real implementation, you would query your database
  // For now, we'll use localStorage
  const repositories = getRepositoriesFromStorage();
  return repositories.filter(repo => repo.userId === userId);
}

export async function getRepositoryById(id: string) {
  try {
    // Query Supabase for the repository
    const { data, error } = await supabase
      .from('repositories')
      .select('*')
      .eq('github_id', id)
      .single();

    if (error) {
      console.error("Database error:", error);
      return null;
    }

    if (!data) {
      console.log("No repository found with ID:", id);
      return null;
    }

    // Return the repository data
    return {
      id: data.github_id,
      name: data.name,
      fullName: data.full_name,
      description: data.description,
      url: data.url,
      private: data.is_private,
      stars: data.stars,
      forks: data.forks,
      defaultBranch: data.default_branch,
      updatedAt: data.updated_at,
      owner: data.owner,
      userId: data.user_id,
      issues: data.issues,
      lastScan: data.last_scan,
      scanResults: data.scan_results
    };
  } catch (error) {
    console.error("Error getting repository:", error);
    return null;
  }
}

export async function addRepository(repository: Omit<Repository, 'id'>): Promise<Repository> {
  const repositories = getRepositoriesFromStorage();
  
  // Create a new repository with an ID
  const newRepository: Repository = {
    ...repository,
    id: `repo-${Date.now()}`,
    issues: {
      high: 0,
      medium: 0,
      low: 0,
    }
  };
  
  // Add to the list and save
  repositories.push(newRepository);
  saveRepositoriesToStorage(repositories);
  
  return newRepository;
}

export async function updateRepository(id: string | number, data: any) {
  try {
    console.log("Updating repository:", id, data)
    
    // Try to update in database
    try {
      const { data: repository, error } = await supabase
        .from('repositories')
        .update({
          last_scan: data.lastScan,
          issues: data.issues,
          scan_results: data.scanResults
        })
        .eq('github_id', id)
        .select()
        .single()

      if (error) {
        console.warn("Error updating repository in database:", error)
      } else {
        return repository
      }
    } catch (updateError) {
      console.warn("Failed to update repository in database:", updateError)
    }
    
    // If database update fails, return the input data as a fallback
    return { github_id: id, ...data }
  } catch (error) {
    console.error("Error in updateRepository:", error)
    // Return input data as fallback
    return { github_id: id, ...data }
  }
}

export async function deleteRepository(id: string): Promise<boolean> {
  const repositories = getRepositoriesFromStorage();
  const filteredRepos = repositories.filter(repo => repo.id !== id);
  
  if (filteredRepos.length === repositories.length) return false;
  
  saveRepositoriesToStorage(filteredRepos);
  return true;
}

// Scan result operations
export async function getScanResultsByUserId(userId: string): Promise<ScanResult[]> {
  return scanResults.filter((result) => result.userId === userId)
}

export async function getScanResultsByRepositoryId(repositoryId: string): Promise<ScanResult[]> {
  return scanResults.filter((result) => result.repositoryId === repositoryId)
}

export async function addScanResult(scanResult: any): Promise<any> {
  const { repositoryId } = scanResult;
  const repositories = getRepositoriesFromStorage();
  const index = repositories.findIndex(repo => repo.id === repositoryId);
  
  if (index === -1) return null;
  
  // Update the repository with scan results
  repositories[index] = {
    ...repositories[index],
    lastScan: scanResult.timestamp,
    issues: scanResult.summary.issues,
  };
  
  saveRepositoriesToStorage(repositories);
  
  // In a real implementation, you would also store the detailed scan results
  // in a separate table/collection
  
  return scanResult;
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

// Helper function to get repositories from localStorage
function getRepositoriesFromStorage(): Repository[] {
  if (typeof window === 'undefined') return [];
  
  const storedRepos = localStorage.getItem('repositories');
  return storedRepos ? JSON.parse(storedRepos) : [];
}

// Helper function to save repositories to localStorage
function saveRepositoriesToStorage(repositories: Repository[]): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('repositories', JSON.stringify(repositories));
}

export async function createRepository(data: any) {
  try {
    console.log("Creating repository with data:", {
      github_id: data.id,
      name: data.name,
      full_name: data.fullName
    })
    
    // Check if tables exist and create them if not
    await ensureTablesExist()

    // First check if repository already exists
    let existing = null
    try {
      const { data: existingData } = await supabase
        .from('repositories')
        .select('*')
        .eq('github_id', data.id)
        .maybeSingle()
      
      existing = existingData
    } catch (lookupError) {
      console.warn("Error checking for existing repository:", lookupError)
    }
    
    if (existing) {
      console.log("Repository already exists, returning existing:", existing)
      return existing
    }

    // Insert new repository
    try {
      const { data: repository, error } = await supabase
        .from('repositories')
        .insert([{
          github_id: data.id,
          name: data.name,
          full_name: data.fullName,
          description: data.description,
          url: data.url,
          is_private: data.private,
          stars: data.stars,
          forks: data.forks,
          default_branch: data.defaultBranch,
          updated_at: data.updatedAt,
          owner: data.owner,
          user_id: data.userId,
          issues: data.issues,
          last_scan: data.lastScan,
          scan_results: data.scanResults || []
        }])
        .select()
        .single()

      if (error) {
        console.error("Error creating repository:", error)
        throw error
      }
      
      console.log("Successfully created repository:", repository)
      return repository
    } catch (insertError) {
      console.error("Error inserting repository:", insertError)
      
      // Return a simplified object if database insert fails
      // This allows the application to continue working
      return {
        github_id: data.id,
        name: data.name,
        full_name: data.fullName,
        url: data.url,
        default_branch: data.defaultBranch,
        user_id: data.userId
      }
    }
  } catch (error) {
    console.error("Database error in createRepository:", error)
    // Return minimal object rather than throwing
    return {
      github_id: data.id,
      name: data.name,
      url: data.url,
      default_branch: "main"
    }
  }
}

// Helper function to ensure tables exist
async function ensureTablesExist() {
  try {
    // Check if repositories table exists
    const { error: checkError } = await supabase
      .from('repositories')
      .select('count')
      .limit(1)
    
    if (checkError) {
      console.log("Creating repositories table...")
      
      // Create repositories table
      const { error: createError } = await supabase.rpc('create_repositories_table')
      
      if (createError) {
        console.error("Error creating repositories table:", createError)
      }
    }
  } catch (error) {
    console.warn("Error checking/creating tables:", error)
    // Continue anyway - tables might already exist
  }
}

