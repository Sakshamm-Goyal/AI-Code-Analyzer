import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "@clerk/nextjs/server"
import { createGitHubClient } from "@/lib/github"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { updateRepository, getRepositoryById, createRepository } from "@/lib/db"
import { parseGitHubUrl } from "@/lib/github"
import { sendNotification } from "@/lib/notifications"
import { Resend } from 'resend'
import { waitForRateLimit } from "@/lib/rate-limit"
import { analyzeCode } from "@/lib/gemini"
import { getFileContent, getLanguageFromFilename } from "@/lib/github-utils"
import { headers } from 'next/headers'

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
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the ID using destructuring directly in the function parameters
    const { id } = params;
    
    // Use Clerk auth
    const auth = getAuth(request);
    const userId = auth.userId;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use id directly
    const repository = await getRepositoryById(id);
    
    if (!repository) {
      return NextResponse.json({ error: "Repository not found" }, { status: 404 });
    }

    // Use id directly
    const scanJob = scanQueue.get(id) || {
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
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the ID using destructuring directly in the function parameters
    const { id } = params;
    
    // Use Clerk auth
    const auth = getAuth(request);
    const userId = auth.userId;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use id directly
    let repository = await getRepositoryById(id);
    
    // If not found in DB, try to fetch from GitHub API
    if (!repository) {
      console.log("Repository not found in database, fetching from GitHub...");
      try {
        const client = await createGitHubClient();
        
        // Use repository ID to get details from GitHub
        const { data: repoData } = await client.request('GET /repositories/{repository_id}', {
          repository_id: parseInt(id)
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
      console.log("Still no repository found for ID:", id);
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
      repositoryId: id,
      userId: userId,
      status: 'pending',
      progress: 0,
      startTime: new Date(),
      issues: { high: 0, medium: 0, low: 0 }
    };

    // Add to queue
    scanQueue.set(id, job);

    // Start processing
    processScan(job, parsed.owner, parsed.repo).catch(error => {
      console.error("Scan processing error:", error);
      job.status = 'failed';
      job.error = error.message;
    });

    // Return response
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
    
    // Get list of files in the repository
    console.log(`Getting files for ${owner}/${repo}...`);
    const files = await getRepositoryFiles(client, owner, repo);
    const totalFiles = files.length;
    let processedFiles = 0;
    const results = [];

    // Process files in batches
    const batches = [];
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      batches.push(files.slice(i, i + BATCH_SIZE));
    }

    console.log(`Processing ${totalFiles} files in ${batches.length} batches...`);

    const issues = { high: 0, medium: 0, low: 0 };

    for (const batch of batches) {
      for (const file of batch) {
        try {
          // Wait for rate limit before processing each file
          await waitForRateLimit();

          // Get file content
          const content = await getFileContent(file, client, owner, repo);
          if (!content || content.length > MAX_FILE_SIZE) {
            console.log(`Skipping ${file.path} (empty or too large: ${content?.length || 0} bytes)`);
            processedFiles++;
            job.progress = Math.floor((processedFiles / totalFiles) * 100);
            continue;
          }

          console.log(`Analyzing ${file.path}...`);

          // Analyze with Gemini
          const analysis = await analyzeCode(
            content,
            getLanguageFromFilename(file.path),
            ['security', 'quality']
          );

          console.log(`Analysis completed for ${file.path}`);

          // Update issue counts
          if (analysis.issues && analysis.issues.length > 0) {
            analysis.issues.forEach(issue => {
              issues[issue.severity]++;
            });
          }

          // Add file results to the overall results
          results.push({
            file: file.path,
            analysis
          });

          processedFiles++;
          job.progress = Math.floor((processedFiles / totalFiles) * 100);
          job.issues = issues;

        } catch (error) {
          console.error(`Error processing file ${file.path}:`, error);
          processedFiles++;
          job.progress = Math.floor((processedFiles / totalFiles) * 100);
        }
      }
      // Add a delay between batches to avoid overloading the APIs
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_FILES));
    }

    console.log("Scan completed, updating repository...");
    
    // Update repository with scan results
    const repository = await getRepositoryById(job.repositoryId);
    if (repository) {
      await updateRepository(job.repositoryId, { 
        lastScan: new Date(),
        issues: issues,
        scanResults: results
      });
    }

    job.status = 'completed';
    job.issues = issues;

    console.log("Repository scan results:", issues);

    // Send notification via email
    try {
      const email = await resend.emails.send({
        from: 'GitHub Guardian <notifications@github-guardian.example.com>',
        to: [job.userId],
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
      console.log("Email notification sent:", email);
    } catch (error) {
      console.error("Error sending email notification:", error);
    }

    // Send in-app notification
    try {
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
  } catch (error) {
    console.error("Error processing scan:", error);
    job.status = 'failed';
    job.error = error.message;
  }
} 