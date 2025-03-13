import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs"
import { createGitHubClient } from "@/lib/github"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { updateRepository, getRepositoryById, createRepository } from "@/lib/db"
import { parseGitHubUrl } from "@/lib/github"
import { sendNotification } from "@/lib/notifications"
import { Resend } from 'resend'

// Initialize services
const resend = new Resend(process.env.RESEND_API_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Constants
const BATCH_SIZE = 5;
const DELAY_BETWEEN_FILES = 4000;
const MAX_FILE_SIZE = 100000;
const SKIP_DIRECTORIES = ['node_modules', 'dist', '.git', 'build'];

// Scan queue
const scanQueue = new Map<string, ScanJob>();

interface ScanJob {
  repositoryId: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  startTime: Date;
  error?: string;
  issues?: {
    high: number;
    medium: number;
    low: number;
  };
}

// Helper function to get repository files
async function getRepositoryFiles(client: any, owner: string, repo: string) {
  try {
    const { data } = await client.rest.repos.getContent({
      owner,
      repo,
      path: '',
    });

    // Filter and process files recursively
    const files = await processDirectory(client, owner, repo, '', data);
    return files;
  } catch (error) {
    console.error("Error getting repository files:", error);
    throw error;
  }
}

// Helper function to process directory contents
async function processDirectory(client: any, owner: string, repo: string, path: string, contents: any[]): Promise<any[]> {
  const files = [];
  
  for (const item of contents) {
    if (item.type === 'file') {
      files.push({
        path: item.path,
        downloadUrl: item.download_url,
        size: item.size
      });
    } else if (item.type === 'dir' && !shouldSkipDirectory(item.path)) {
      try {
        const { data: dirContents } = await client.rest.repos.getContent({
          owner,
          repo,
          path: item.path,
        });
        const dirFiles = await processDirectory(client, owner, repo, item.path, dirContents);
        files.push(...dirFiles);
      } catch (error) {
        console.warn(`Skipping directory ${item.path} due to error:`, error);
      }
    }
  }
  
  return files;
}

// Helper function to check if directory should be skipped
function shouldSkipDirectory(path: string): boolean {
  const skipDirs = ['node_modules', 'dist', '.git', 'build', 'vendor'];
  return skipDirs.some(dir => path.includes(dir));
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Auth check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get repository
    const repository = await getRepositoryById(params.id);
    if (!repository) {
      return NextResponse.json({ error: "Repository not found" }, { status: 404 });
    }

    // Get scan status from queue or create default status
    const scanJob = scanQueue.get(params.id) || {
      status: repository.lastScan ? 'completed' : 'not_found',
      progress: 0,
      issues: repository.issues || { high: 0, medium: 0, low: 0 }
    };

    return NextResponse.json(scanJob);
  } catch (error) {
    console.error("Error getting scan status:", error);
    return NextResponse.json(
      { error: "Failed to get scan status" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Auth check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try to get repository from database first
    const repoId = params.id;
    console.log("Looking up repository with ID:", repoId);
    
    let repository = await getRepositoryById(repoId);
    console.log("Repository lookup result:", repository);
    
    // If not found in DB, try to fetch from GitHub API
    if (!repository) {
      console.log("Repository not found in database, fetching from GitHub...");
      try {
        const client = await createGitHubClient();
        
        // Use repository ID to get details from GitHub
        const { data: repoData } = await client.request('GET /repositories/{repository_id}', {
          repository_id: parseInt(repoId)
        });
        
        if (repoData) {
          console.log("Found repository on GitHub:", repoData.full_name);
          
          // Create repository in our database
          repository = await createRepository({
            id: repoData.id.toString(),
            name: repoData.name,
            fullName: repoData.full_name,
            description: repoData.description,
            url: repoData.html_url,
            private: repoData.private,
            stars: repoData.stargazers_count,
            forks: repoData.forks_count,
            defaultBranch: repoData.default_branch,
            updatedAt: repoData.updated_at,
            owner: repoData.owner.login,
            userId: userId,
            issues: { high: 0, medium: 0, low: 0 },
            lastScan: null,
            scanResults: []
          });
          
          console.log("Created repository in database:", repository);
        }
      } catch (githubError) {
        console.error("Error fetching from GitHub:", githubError);
        return NextResponse.json({ error: "Repository not found" }, { status: 404 });
      }
    }
    
    if (!repository) {
      console.log("Still no repository found for ID:", repoId);
      return NextResponse.json({ error: "Repository not found" }, { status: 404 });
    }

    // Parse GitHub URL
    const repoUrl = repository.url || repository.html_url;
    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      return NextResponse.json({ error: "Invalid repository URL" }, { status: 400 });
    }

    // Create scan job
    const job: ScanJob = {
      repositoryId: repoId,
      userId,
      status: 'pending',
      progress: 0,
      startTime: new Date(),
      issues: { high: 0, medium: 0, low: 0 }
    };

    // Add to queue
    scanQueue.set(repoId, job);

    // Start processing in background
    processScan(job, parsed.owner, parsed.repo).catch(error => {
      console.error("Scan processing error:", error);
      job.status = 'failed';
      job.error = error.message;
    });

    return NextResponse.json({
      message: "Scan initiated",
      status: job.status,
      progress: job.progress
    });

  } catch (error) {
    console.error("Error initiating scan:", error);
    return NextResponse.json(
      { error: "Failed to initiate scan" },
      { status: 500 }
    );
  }
}

async function processScan(job: ScanJob, owner: string, repo: string) {
  try {
    job.status = 'processing';
    
    const client = await createGitHubClient();
    
    // Get repository files
    const files = await getRepositoryFiles(client, owner, repo);
    const totalFiles = files.length;
    let processedFiles = 0;
    const results = [];

    // Process files in batches
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      
      for (const file of batch) {
        try {
          // Update progress
          processedFiles++;
          job.progress = Math.round((processedFiles / totalFiles) * 100);

          // Respect rate limits
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_FILES));
        } catch (error) {
          console.error(`Error processing file ${file.path}:`, error);
        }
      }
    }

    // Update repository with results
    await updateRepository(job.repositoryId, {
      lastScan: new Date().toISOString(),
      issues: job.issues,
      scanResults: results
    });

    // Mark job as completed
    job.status = 'completed';
    job.progress = 100;

    // Send notifications
    await sendScanCompletionNotifications(job);

  } catch (error) {
    job.status = 'failed';
    job.error = error instanceof Error ? error.message : "Scan failed";
    throw error;
  }
}

async function sendScanCompletionNotifications(job: ScanJob) {
  try {
    // Send email notification
    await resend.emails.send({
      from: 'security-scanner@yourdomain.com',
      to: job.userId,
      subject: 'Repository Scan Complete',
      html: `Your repository scan has completed. Found ${job.issues?.high || 0} high, ${job.issues?.medium || 0} medium, and ${job.issues?.low || 0} low severity issues.`
    });

    // Send in-app notification
    await sendNotification(job.userId, {
      type: 'scan_complete',
      priority: 'medium',
      title: 'Repository Scan Complete',
      message: 'Your repository scan has finished. View the results now.',
      metadata: { repositoryId: job.repositoryId }
    });
  } catch (error) {
    console.error("Error sending notifications:", error);
  }
} 