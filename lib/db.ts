// This is a mock database implementation
// In a real application, you would use Prisma or another ORM

import { auth } from "@clerk/nextjs";
import { createClient } from '@supabase/supabase-js'
import { Octokit } from "@octokit/rest";
import { clerkClient } from "@clerk/nextjs/server";

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
  repositoryName: string
  frequency: "daily" | "weekly" | "monthly"
  day?: string
  time: string
  analysisTypes: string[]
  status: "active" | "paused"
  lastRun: string | null
  nextRun: string
  createdAt: string
  updatedAt: string
}

interface ExternalAccount {
  id: string;
  provider: string;
  externalId: string;
  approvedScopes: string[];
  emailAddress: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  imageUrl?: string;
  publicMetadata?: Record<string, unknown>;
  label?: string | null;
  verification?: {
    status: "verified" | "unverified";
    strategy: string;
    externalVerificationRedirectURL: string | null;
  };
  accessToken?: string;
  identificationId?: string;
}

// Mock data stores
const users: User[] = []
const repositories: Repository[] = []
const scanResults: ScanResult[] = []
const scheduledScans: ScheduledScan[] = []

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabase = createClient(supabaseUrl, supabaseKey);

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
export async function getRepositoriesByUserId(userId: string): Promise<any[]> {
  try {
    console.log(`Getting repositories for user ${userId} from Supabase`);
    
    if (!supabase) {
      console.error("Supabase client not initialized");
      return [];
    }
    
    // Note the column name change from userId to user_id to match Supabase convention
    const { data, error } = await supabase
      .from('repositories')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    
    if (error) {
      if (error.code === 'PGRST204') {
        console.log("The repositories table might not exist or column mismatch. Returning empty array.");
        return [];
      }
      console.error("Error querying repositories:", error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log(`No repositories found for user ${userId}`);
      return [];
    }
    
    // Transform snake_case column names to camelCase for frontend
    const repositories = data.map(repo => ({
      id: repo.id,
      userId: repo.user_id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.url,
      private: repo.private,
      stars: repo.stars,
      forks: repo.forks,
      defaultBranch: repo.default_branch,
      updatedAt: repo.updated_at,
      owner: repo.owner,
      issues: repo.issues,
      lastScan: repo.last_scan,
      scanResults: repo.scan_results || []
    }));
    
    console.log(`Found ${repositories.length} repositories for user ${userId}`);
    return repositories;
  } catch (error) {
    console.error("Error in getRepositoriesByUserId:", error);
    return [];
  }
}

export async function getRepositoryById(id: string): Promise<any | null> {
  try {
    console.log(`Getting repository ${id} from Supabase`);
    
    if (!supabase) {
      console.error("Supabase client not initialized");
      return null;
    }

    const { data, error } = await supabase
      .from('repositories')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error("Error querying repository:", error);
      
      // If the table doesn't exist, return null
      if (error.code === 'PGRST204') {
        console.log("The repositories table might not exist or column mismatch");
      }
      
      // Don't need to throw, return null for not found
      return null;
    }
    
    if (!data) {
      console.log(`Repository ${id} not found in database`);
      return null;
    }
    
    // Convert to camelCase from snake_case
    const repository = {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      fullName: data.full_name,
      description: data.description,
      url: data.url,
      private: data.private,
      stars: data.stars,
      forks: data.forks,
      defaultBranch: data.default_branch,
      updatedAt: data.updated_at,
      owner: data.owner,
      issues: data.issues,
      lastScan: data.last_scan,
      scanResults: data.scan_results || []
    };
    
    console.log(`Repository ${id} found: ${repository.name}`);
    return repository;
  } catch (error) {
    console.error("Error in getRepositoryById:", error);
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

export async function updateRepository(id: string, updates: any): Promise<boolean> {
  try {
    console.log(`Updating repository ${id} in Supabase`);
    
    if (!supabase) {
      console.error("Supabase client not initialized");
      return false;
    }
    
    // Convert camelCase to snake_case for database update
    const updateData: Record<string, any> = {};
    
    if (updates.name) updateData.name = updates.name;
    if (updates.fullName) updateData.full_name = updates.fullName;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.url) updateData.url = updates.url;
    if (updates.private !== undefined) updateData.private = updates.private;
    if (updates.stars !== undefined) updateData.stars = updates.stars;
    if (updates.forks !== undefined) updateData.forks = updates.forks;
    if (updates.defaultBranch) updateData.default_branch = updates.defaultBranch;
    if (updates.updatedAt) updateData.updated_at = updates.updatedAt;
    if (updates.owner) updateData.owner = updates.owner;
    if (updates.issues) updateData.issues = updates.issues;
    if (updates.lastScan) updateData.last_scan = updates.lastScan;
    if (updates.scanResults) {
      // Try to save scan results in repositories table
      // This could be large, so we might want to store separately
      try {
        updateData.scan_results = updates.scanResults;
      } catch (scanError) {
        console.error("Error setting scan results, may be too large:", scanError);
        
        // Try saving just a summary of scan results
        try {
          const summaryResults = updates.scanResults.map((r: any) => ({
            file: r.file,
            issueCount: r.analysis?.issues?.length || 0,
            summary: r.analysis?.summary
          }));
          
          updateData.scan_results = summaryResults;
          
          // Also save detailed results in scan_history
          for (const result of updates.scanResults) {
            try {
              await supabase
                .from('scan_history')
                .insert({
                  repository_id: id,
                  file_path: result.file,
                  analysis: result.analysis,
                  issues_count: result.analysis?.issues?.length || 0
                });
            } catch (historyError) {
              console.error(`Failed to save history for ${result.file}:`, historyError);
            }
          }
        } catch (summaryError) {
          console.error("Error setting summary results:", summaryError);
        }
      }
    }
    
    // Add updated_at if not set explicitly
    if (!updateData.updated_at) {
      updateData.updated_at = new Date().toISOString();
    }
    
    console.log(`Sending update with fields: ${Object.keys(updateData).join(', ')}`);
    
    const { error } = await supabase
      .from('repositories')
      .update(updateData)
      .eq('id', id);
    
    if (error) {
      console.error("Error updating repository:", error);
      
      // If it's a column error, try a minimal update
      if (error.code === 'PGRST204') {
        console.log("Trying minimal update with just issues and last_scan");
        
        const minimalUpdate = {
          last_scan: updates.lastScan,
          issues: updates.issues
        };
        
        const { error: minimalError } = await supabase
          .from('repositories')
          .update(minimalUpdate)
          .eq('id', id);
        
        if (minimalError) {
          console.error("Error with minimal update:", minimalError);
          return false;
        }
        
        return true;
      }
      
      return false;
    }
    
    console.log(`Repository ${id} updated successfully`);
    return true;
  } catch (error) {
    console.error("Error in updateRepository:", error);
    return false;
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
  try {
    const { error } = await supabase
      .from('scheduled_scans')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error("Error deleting scheduled scan:", error);
    throw error;
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

export async function createRepository(repository: any): Promise<any> {
  console.log(`Creating repository ${repository.name}`);
  
  try {
    if (!supabase) {
      console.error("Supabase client not initialized");
      return createClientSideRepository(repository);
    }
    
    // Convert camelCase to snake_case for database insert
    const repoData = {
      id: repository.id?.toString(),
      user_id: repository.userId,
      name: repository.name,
      full_name: repository.fullName,
      description: repository.description || '',
      url: repository.url || '',
      private: !!repository.private,
      stars: repository.stars || 0,
      forks: repository.forks || 0,
      default_branch: repository.defaultBranch || 'main',
      updated_at: repository.updatedAt || new Date().toISOString(),
      owner: repository.owner || '',
      issues: repository.issues || { high: 0, medium: 0, low: 0 },
      last_scan: repository.lastScan || null
    };
    
    // Try inserting with all fields
    console.log("Attempting to insert repository with all fields");
    const { data, error } = await supabase
      .from('repositories')
      .upsert(repoData)
      .select();
    
    if (error) {
      console.error("Full insert error:", error);
      
      // If the error is about missing columns, try a minimal insert
      if (error.code === 'PGRST204') {
        console.log("Trying minimal repository insert with just id, user_id and name");
        
        const minimalData = {
          id: repository.id?.toString(),
          user_id: repository.userId,
          name: repository.name
        };
        
        const { data: minimalResult, error: minimalError } = await supabase
          .from('repositories')
          .upsert(minimalData)
          .select();
        
        if (minimalError) {
          console.error("Error with minimal repository data:", minimalError);
          return createClientSideRepository(repository);
        }
        
        // Convert back to camelCase for consistency
        if (minimalResult && minimalResult.length > 0) {
          const result = {
            id: minimalResult[0].id,
            userId: minimalResult[0].user_id,
            name: minimalResult[0].name,
            // Add default values for other fields
            fullName: repository.fullName || repository.name,
            description: repository.description || '',
            url: repository.url || '',
            private: !!repository.private,
            stars: repository.stars || 0,
            forks: repository.forks || 0,
            defaultBranch: repository.defaultBranch || 'main',
            updatedAt: repository.updatedAt || minimalResult[0].updated_at || new Date().toISOString(),
            owner: repository.owner || '',
            issues: repository.issues || { high: 0, medium: 0, low: 0 },
            lastScan: repository.lastScan || null,
            scanResults: repository.scanResults || []
          };
          
          console.log(`Repository ${repository.name} created with minimal data`);
          return result;
        }
      }
      
      // If still failing, fall back to client-side
      return createClientSideRepository(repository);
    }
    
    // If insert succeeded, convert back to camelCase
    if (data && data.length > 0) {
      const result = {
        id: data[0].id,
        userId: data[0].user_id,
        name: data[0].name,
        fullName: data[0].full_name,
        description: data[0].description,
        url: data[0].url,
        private: data[0].private,
        stars: data[0].stars,
        forks: data[0].forks,
        defaultBranch: data[0].default_branch,
        updatedAt: data[0].updated_at,
        owner: data[0].owner,
        issues: data[0].issues,
        lastScan: data[0].last_scan,
        scanResults: data[0].scan_results || []
      };
      
      console.log(`Repository ${repository.name} created successfully with ID ${data[0].id}`);
      return result;
    }
    
    // If no data returned but no error, fall back to client-side
    return createClientSideRepository(repository);
  } catch (error) {
    console.error("Error in createRepository:", error);
    return createClientSideRepository(repository);
  }
}

// Helper function to create a client-side only repository object
function createClientSideRepository(repository: any): any {
  console.log(`Creating client-side repository object for ${repository.name}`);
  
  // Return a formatted object with all expected fields
  return {
    id: repository.id?.toString(),
    name: repository.name || 'Unknown repository',
    fullName: repository.fullName || repository.name,
    description: repository.description || '',
    url: repository.url || '',
    private: !!repository.private,
    stars: repository.stars || 0,
    forks: repository.forks || 0,
    defaultBranch: repository.defaultBranch || 'main',
    updatedAt: repository.updatedAt || new Date().toISOString(),
    owner: repository.owner || '',
    userId: repository.userId || 'guest',
    issues: repository.issues || { high: 0, medium: 0, low: 0 },
    lastScan: repository.lastScan || null,
    scanResults: repository.scanResults || [],
    // Add a flag to indicate this is a client-side only object
    _clientSideOnly: true
  };
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

export async function createScheduledScan(data: Omit<ScheduledScan, "id">): Promise<ScheduledScan> {
  try {
    const { data: schedule, error } = await supabase
      .from('scheduled_scans')
      .insert([{
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) throw error
    return schedule
  } catch (error) {
    console.error("Error creating scheduled scan:", error)
    throw error
  }
}

export async function getScheduledScans(userId: string): Promise<ScheduledScan[]> {
  try {
    const { data: schedules, error } = await supabase
      .from('scheduled_scans')
      .select(`
        *,
        repository:repositories(name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return schedules.map(schedule => ({
      ...schedule,
      repositoryName: schedule.repository?.name || 'Unknown Repository'
    }))
  } catch (error) {
    console.error("Error fetching scheduled scans:", error)
    return []
  }
}

export async function getScheduledScanById(id: string): Promise<ScheduledScan | null> {
  try {
    const { data: schedule, error } = await supabase
      .from('scheduled_scans')
      .select(`
        *,
        repository:repositories(name)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return {
      ...schedule,
      repositoryName: schedule.repository?.name || 'Unknown Repository'
    }
  } catch (error) {
    console.error("Error fetching scheduled scan:", error)
    return null
  }
}

export async function updateScheduledScan(
  id: string,
  data: Partial<ScheduledScan>
): Promise<ScheduledScan> {
  try {
    const { data: schedule, error } = await supabase
      .from('scheduled_scans')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return schedule
  } catch (error) {
    console.error("Error updating scheduled scan:", error)
    throw error
  }
}

// Add this function to create GitHub client
async function createGitHubClient() {
  try {
    // Get the GitHub token from local API
    const response = await fetch('/api/user/github-token');
    if (!response.ok) {
      throw new Error('Failed to get GitHub token');
    }
    
    const { token } = await response.json();
    
    if (!token) {
      throw new Error('No GitHub token available');
    }
    
    // Create and return Octokit instance
    return new Octokit({ auth: token });
  } catch (error) {
    console.error('Error creating GitHub client:', error);
    throw error;
  }
}

// Update the importUserRepositories function to work properly server-side
export async function importUserRepositories(userId: string) {
  try {
    console.log(`Importing repositories for user ${userId}`);
    
    // Server-side implementation
    try {
      // Get user directly using currentUser
      const user = await clerkClient.users.getUser(userId);
      
      if (!user) {
        throw new Error("User not found");
      }
      
      // First try to get token from publicMetadata
      const tokenFromMetadata = user.publicMetadata.githubAccessToken as string;
      let token: string;
      
      if (tokenFromMetadata) {
        console.log("Using GitHub token from user metadata");
        token = tokenFromMetadata;
      } else {
        // If not in metadata, try to get from OAuth connections
        console.log("Token not found in metadata, checking OAuth connections");
        
        const githubAccount = user.externalAccounts.find(
          account => account.provider === "github"
        ) as ExternalAccount | undefined;
        
        if (!githubAccount) {
          throw new Error("GitHub account not connected");
        }
        
        if (!githubAccount.accessToken) {
          throw new Error("GitHub token not available from OAuth account");
        }
        
        token = githubAccount.accessToken;
        
        // Store the token in metadata for future use
        await clerkClient.users.updateUserMetadata(userId, {
          publicMetadata: {
            ...user.publicMetadata,
            githubAccessToken: token,
            githubConnectedAt: new Date().toISOString(),
          },
        });
      }
      
      const client = new Octokit({ auth: token });
      
      console.log("Successfully created GitHub client with user token");
      
      // Get all user repositories
      const { data: repos } = await client.rest.repos.listForAuthenticatedUser({
        per_page: 100,
        sort: 'updated'
      });
      
      console.log(`Found ${repos.length} repositories on GitHub`);
      
      // Import each repository to our database
      const importPromises = repos.map(async (repo) => {
        try {
          // Check if repo already exists
          const existingRepo = await getRepositoryById(repo.id.toString());
          
          if (existingRepo) {
            console.log(`Repository ${repo.full_name} already exists, skipping`);
            return existingRepo;
          }
          
          // Create repository in our database
          return await createRepository({
            id: repo.id.toString(),
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description || '',
            url: repo.html_url,
            private: repo.private,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            defaultBranch: repo.default_branch,
            updatedAt: repo.updated_at,
            owner: repo.owner.login,
            userId: userId,
            issues: { high: 0, medium: 0, low: 0 },
            lastScan: null,
            scanResults: []
          });
        } catch (error) {
          console.error(`Error importing repository ${repo.full_name}:`, error);
          return null;
        }
      });
      
      const results = await Promise.all(importPromises);
      const successfulImports = results.filter(Boolean);
      
      console.log(`Successfully imported ${successfulImports.length} repositories`);
      return successfulImports;
    } catch (error) {
      console.error("Error importing repositories:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error in importUserRepositories:", error);
    throw error;
  }
}

