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
  // Always await params in App Router
  const { id } = params;
  console.log(`GET scan status for repository ${id}`);    

  try {
    // Get the authenticated user
    const authResult = await auth();
    const userId = authResult?.userId;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get scan status from queue
    const scanJob = scanQueue.get(id);
    if (!scanJob) {
      // Check if we have a completed scan in the database
      const repository = await getRepositoryById(id);
      
      if (repository && repository.lastScan) {
        return NextResponse.json({
          status: 'completed',
          progress: 100,
          issues: repository.issues || { high: 0, medium: 0, low: 0 },
        });
      }
      
      return NextResponse.json({
        status: 'not_found',
        progress: 0,
        issues: { high: 0, medium: 0, low: 0 }
      });
    }
    
    // Return progress information
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
      { 
        error: "Failed to get scan status",
        status: 'failed',
        progress: 0,
        issues: { high: 0, medium: 0, low: 0 }
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Always await params in App Router
  const id = params?.id;
  console.log(`Starting scan for repository ${id}`);

  try {
    // Validate request body
    let body;
    try {
      body = await request.json();
      console.log("Scan request body:", body);
    } catch (error) {
      console.error("Error parsing request body:", error);
      return NextResponse.json({ error: "Invalid request format" }, { status: 400 });
    }

    // Ensure required fields are present
    const { name, owner, fullName } = body;
    if (!name || !owner) {
      return NextResponse.json({ 
        error: "Missing required fields: name and owner are required" 
      }, { status: 400 });
    }

    // Get authenticated user
    const authResult = await auth();
    const userId = authResult?.userId;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if scan is already in progress
    const existingScan = scanQueue.get(id);
    if (existingScan && ['pending', 'processing'].includes(existingScan.status)) {
      console.log(`Scan already in progress for repository ${id}`);
      return NextResponse.json({ 
        message: "Scan already in progress", 
        scanId: id 
      });
    }

    // Initialize scan job
    const scanJob: ScanJob = {
      repositoryId: id,
      userId: userId,
      status: 'pending',
      progress: 0,
      startTime: new Date(),
      issues: { high: 0, medium: 0, low: 0 }
    };
    
    scanQueue.set(id, scanJob);

    // Start scan in background
    processScan(scanJob, name, owner).catch(error => {
      console.error(`Error processing scan for repository ${id}:`, error);
      scanJob.status = 'failed';
      scanJob.error = error instanceof Error ? error.message : String(error);
      scanQueue.set(id, { ...scanJob });
    });

    return NextResponse.json({ 
      message: "Scan initiated", 
      scanId: id,
      status: scanJob.status
    });
  } catch (error) {
    console.error("Error initiating scan:", error);
    return NextResponse.json(
      { error: "Failed to initiate scan" },
      { status: 500 }
    );
  }
}

// Process scan in background
async function processScan(job: ScanJob, repoName: string, owner: string) {
  console.log(`Processing scan for repository ${job.repositoryId}`);
  job.status = 'processing';
  scanQueue.set(job.repositoryId, { ...job });

  try {
    // Get user for token and notifications
    const user = await clerkClient.users.getUser(job.userId);
    let token = user.publicMetadata.githubAccessToken as string;

    if (!token) {
      // Try to get from OAuth
      const githubAccount = user.externalAccounts.find(
        account => account.provider === "github"
      );
      
      if (!githubAccount || !githubAccount.accessToken) {
        throw new Error("GitHub token not available");
      }
      
      token = githubAccount.accessToken;
    }

    const client = new Octokit({ auth: token });
    
    // Get repository files
    console.log(`Getting files for ${owner}/${repoName}...`);
    const files = await getRepositoryFiles(client, owner, repoName);
    
    job.totalFiles = files.length;
    job.processedFiles = 0;
    job.progress = 0;
    scanQueue.set(job.repositoryId, { ...job });
    
    console.log(`Found ${files.length} files in repository`);
    
    // Filter files to analyze
    const filesToAnalyze = files.filter(file => !shouldSkipFile(file.path));
    console.log(`After filtering, analyzing ${filesToAnalyze.length} out of ${files.length} files`);
    
    // Calculate total files and initialize counters
    const totalFiles = files.length;
    let processedFiles = 0;
    const results: any[] = [];
    const issues = { high: 0, medium: 0, low: 0 };

    // Process files in batches
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (file) => {
        try {
          // Skip files that are too large
          if (file.size > MAX_FILE_SIZE) {
            console.log(`Skipping large file: ${file.path} (${file.size} bytes)`);
            return {
              file: file.path,
              skipped: true,
              reason: "File too large",
              size: file.size
            };
          }
          
          // Get file content
          const language = getLanguageFromFilename(file.path);
          console.log(`Analyzing ${file.path} (${language})`);
          
          // Get file content using GitHub API
          const content = await getFileContent(file, client, owner, repoName);
          
          if (!content) {
            console.log(`Empty or binary file: ${file.path}`);
            return {
              file: file.path,
              skipped: true,
              reason: "Empty or binary file"
            };
          }
          
          // Analyze the file
          const analysis = await analyzeCode(content, language);
          
          // Update progress after each file
          processedFiles++;
          job.progress = Math.floor((processedFiles / totalFiles) * 100);
          job.processedFiles = processedFiles;
          job.totalFiles = totalFiles;
          scanQueue.set(job.repositoryId, { ...job });

          return {
            file: file.path,
            analysis: analysis,
            issues: analysis.issues?.length || 0
          };
        } catch (error) {
          console.error(`Error processing file ${file.path}:`, error);
          return { file: file.path, error: error.message, skipped: true };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(r => !r.skipped));

      // Update issues count
      batchResults.forEach(result => {
        if (result.analysis?.issues) {
          result.analysis.issues.forEach((issue: any) => {
            if (issue.severity) {
              issues[issue.severity.toLowerCase()]++;
            }
          });
        }
      });

      // Wait before next batch
      if (i + BATCH_SIZE < files.length) {
        console.log(`Batch completed. Waiting ${LONGER_DELAY}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, LONGER_DELAY));
      }
    }

    // Ensure progress is 100% when scan is complete
    job.progress = 100;
    job.status = 'completed';
    job.issues = issues;
    scanQueue.set(job.repositoryId, { ...job });

    // Format scan results for storage
    const formattedResults = results.map(result => ({
      file: result.file,
      analysis: {
        issues: result.analysis?.issues || [],
        summary: result.analysis?.summary || null
      }
    }));

    try {
      // Update repository with scan results
      await updateRepository(job.repositoryId, {
        lastScan: new Date().toISOString(),
        issues: issues,
        scanResults: formattedResults
      });

      // Save scan record to Supabase
      if (supabase) {
        const { data: scanRecord, error: scanError } = await supabase
          .from('repositories_scan')
          .insert({
            repository_id: job.repositoryId,
            status: 'completed',
            completed_at: new Date().toISOString(),
            issues: issues,
            results: formattedResults
          })
          .select();

        if (scanError) {
          console.error("Error saving scan record:", scanError);
        } else {
          console.log("Scan record saved successfully:", scanRecord);
        }
      }

      // Verify the update succeeded
      const updatedRepo = await getRepositoryById(job.repositoryId);
      if (updatedRepo) {
        console.log(`Repository updated. Scan results saved: ${formattedResults.length} files`);
        console.log(`Issue counts: High=${issues.high}, Medium=${issues.medium}, Low=${issues.low}`);
      }
    } catch (dbError) {
      console.error("Error saving scan results:", dbError);
    }

    // Send notifications after successful scan
    try {
      // Get user email - using first email from Clerk
      const userEmail = user.emailAddresses[0]?.emailAddress;
      
      if (userEmail) {
        // Send email notification
        try {
          await resend.emails.send({
            from: 'GitHub Guardian <notifications@github-guardian.example.com>',
            to: [userEmail],
            subject: 'Repository Scan Complete',
            html: `
              <h1>Repository Scan Complete</h1>
              <p>Your repository scan has completed with the following results:</p>
              <ul>
                <li>High severity issues: ${issues.high}</li>
                <li>Medium severity issues: ${issues.medium}</li>
                <li>Low severity issues: ${issues.low}</li>
              </ul>
              <p>View the detailed report in your dashboard.</p>
            `,
          });
          console.log("Email notification sent");
        } catch (emailError) {
          console.error("Error sending email notification:", emailError);
        }
      }

      // Send in-app notification
      try {
        await sendNotification(job.userId, {
          title: 'Repository Scan Complete',
          message: 'Your repository scan has finished. View the results now.',
          metadata: { repositoryId: job.repositoryId }
        });
      } catch (notifyError) {
        console.error("Error sending in-app notification:", notifyError);
      }
    } catch (error) {
      console.error("Error sending notifications:", error);
    }
  } catch (error) {
    console.error("Error processing scan:", error);
    job.status = 'failed';
    job.error = error instanceof Error ? error.message : String(error);
    scanQueue.set(job.repositoryId, { ...job });
  }
} 