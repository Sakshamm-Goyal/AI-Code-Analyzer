import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs"
import { createGitHubClient } from "@/lib/github"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { updateRepository, getRepositoryById, createRepository, supabase } from "@/lib/db"
import { parseGitHubUrl } from "@/lib/github"
import { sendNotification } from "@/lib/notifications"
import { Resend } from 'resend'
import { waitForRateLimit } from "@/lib/rate-limit"
import { analyzeCode, shouldSkipFile } from "@/lib/gemini"
import { getFileContent, getLanguageFromFilename } from "@/lib/github-utils"
import { Octokit } from "@octokit/rest"
import { clerkClient } from "@clerk/nextjs"

// Initialize services
const resend = new Resend(process.env.RESEND_API_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Constants
const BATCH_SIZE = 5;
const DELAY_BETWEEN_FILES = 2000;
const LONGER_DELAY = 5000;
const MAX_FILE_SIZE = 100000;
const SKIP_DIRECTORIES = ['node_modules', 'dist', '.git', 'build', 'vendor'];

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
  totalFiles?: number;
  processedFiles?: number;
}

// Helper function to get repository files
async function getRepositoryFiles(client: Octokit, owner: string, repo: string) {
  try {
    const { data } = await client.rest.repos.getContent({
      owner,
      repo,
      path: '',
    });

    // Filter and process files recursively
    const files = await processDirectory(client, owner, repo, '', Array.isArray(data) ? data : [data]);
    return files;
  } catch (error) {
    console.error("Error getting repository files:", error);
    throw error;
  }
}

// Helper function to process directory contents
async function processDirectory(client: Octokit, owner: string, repo: string, path: string, contents: any[]): Promise<any[]> {
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
        const dirFiles = await processDirectory(client, owner, repo, item.path, Array.isArray(dirContents) ? dirContents : [dirContents]);
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
  return SKIP_DIRECTORIES.some(dir => path.includes(dir));
}

export async function GET(
  request: NextRequest, 
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log(`GET scan status for repository ${id}`);    

    // Get the authenticated user
    const authResult = await auth();
    const userId = authResult?.userId;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First check if repository exists and user has access
    const repository = await getRepositoryById(id);
      if (!repository) {
      return NextResponse.json({ error: "Repository not found" }, { status: 404 });
    }

    if (repository.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get scan status from queue
    const scanJob = scanQueue.get(id);
    if (!scanJob) {
      // If no active scan job but we have results in the repository, return completed status
      if (repository.scanResults && repository.scanResults.length > 0) {
        return NextResponse.json({
          status: 'completed',
          progress: 100,
          issues: repository.issues || { high: 0, medium: 0, low: 0 },
          processedFiles: repository.scanResults.length,
          totalFiles: repository.scanResults.length,
        });
      }
      return NextResponse.json({ error: "No active scan found" }, { status: 404 });
    }

        return NextResponse.json({
      status: scanJob.status,
      progress: scanJob.progress,
      issues: scanJob.issues || { high: 0, medium: 0, low: 0 },
      processedFiles: scanJob.processedFiles || 0,
      totalFiles: scanJob.totalFiles || 0,
      error: scanJob.error,
    });
  } catch (error) {
    console.error("Error getting scan status:", error);
    return NextResponse.json(
      { error: "Failed to get scan status" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Check if there's already an active scan
    const existingScan = scanQueue.get(id);
    if (existingScan && existingScan.status === 'processing') {
      return NextResponse.json({ error: "Scan already in progress" }, { status: 409 });
    }

    // Initialize scan job
      const job: ScanJob = {
        repositoryId: id,
      userId: userId,
      status: 'processing',
        progress: 0,
        startTime: new Date(),
        issues: { high: 0, medium: 0, low: 0 },
      processedFiles: 0,
      totalFiles: 0
    };

    scanQueue.set(id, job);

    // Start scan process in background
    processScan(job).catch(error => {
      console.error("Scan process failed:", error);
        job.status = 'failed';
        job.error = error instanceof Error ? error.message : String(error);
      scanQueue.set(id, { ...job });
    });

    return NextResponse.json({ status: 'processing' });
  } catch (error) {
    console.error("Error starting scan:", error);
    return NextResponse.json({ error: "Failed to start scan" }, { status: 500 });
  }
}

// Update the processScan function to handle errors better
async function processScan(job: ScanJob) {
  try {
    // Validate repository exists before starting scan
    const repository = await getRepositoryById(job.repositoryId);
    if (!repository) {
          throw new Error("Repository not found");
    }

    // Rest of your scan process...
    // When error occurs during scan:
    if (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : String(error);
      scanQueue.set(job.repositoryId, { ...job });
      return;
    }

  } catch (error) {
    job.status = 'failed';
    job.error = error instanceof Error ? error.message : String(error);
    scanQueue.set(job.repositoryId, { ...job });
    throw error; // Re-throw to be caught by the POST handler
  }
} 