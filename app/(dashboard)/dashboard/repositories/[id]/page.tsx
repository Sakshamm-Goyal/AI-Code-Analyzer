"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, GitBranch, GitFork, Star, AlertCircle, AlertTriangle, CheckCircle, Loader2, ShieldAlert, List, Calendar, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { useParams, useRouter } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { FileExplorer } from "@/components/repository/file-explorer"
import { FileAnalysis } from "@/components/repository/file-analysis"
import { parseGitHubUrl } from "@/lib/github"
import LoadingSpinner from "@/components/loading-spinner"

// Skeleton component for loading state
function RepositoryDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-32" />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
        <Skeleton className="h-5 w-full max-w-md" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </div>
  )
}

// Add type definitions for file analysis
interface RepositoryFile {
  name: string;
  path: string;
  size: number;
  downloadUrl: string;
  language: string;
}

export default function RepositoryDetailPage() {
  const params = useParams<{ id: string }>()
  const [repository, setRepository] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [selectedFile, setSelectedFile] = useState<any>(null)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (params?.id) {
      fetchRepositoryDetails()
    }
  }, [params?.id])

  const fetchRepositoryDetails = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      if (!params?.id) {
        throw new Error("Repository ID is missing")
      }
      
      console.log(`Fetching repository details for ID: ${params.id}`);
      
      const response = await fetch(`/api/github/repositories/${params.id}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
        },
        credentials: 'include',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch repository details")
      }
      
      const data = await response.json()
      
      if (!data.repository) {
        throw new Error("Repository data not found")
      }
      
      console.log("Repository data received:", data.repository);
      setRepository(data.repository)
    } catch (error) {
      console.error("Error fetching repository details:", error)
      setError(error instanceof Error ? error.message : "Failed to fetch repository details")
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch repository details",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleScanNow = async () => {
    try {
      setIsScanning(true);
      setError(null);

      // Check if params.id exists
      if (!params?.id) {
        throw new Error("Repository ID is missing");
      }

      // Make sure we have the required info before proceeding
      if (!repository || !repository.fullName) {
        throw new Error("Repository information is incomplete");
      }

      console.log("Starting comprehensive code analysis using Gemini API");

      // Step 1: Get owner and repo from fullName
      const owner = repository.fullName.split('/')[0];
      const repo = repository.fullName.split('/')[1];
      
      // Step 2: Get GitHub token
      let token = "";
      try {
        const tokenResponse = await fetch('/api/user/github-token');
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          token = tokenData.token;
        } else {
          throw new Error("Failed to get GitHub token");
        }
      } catch (error) {
        console.error("Error getting GitHub token:", error);
        throw new Error("Failed to authenticate with GitHub");
      }
      
      // Step 3: Get all files from the repository
      const allFiles: RepositoryFile[] = [];
      const skipExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico', '.mp3', '.mp4', '.pdf', '.zip', '.tar.gz', '.eot', '.ttf', '.woff', '.woff2'];
      const skipDirectories = ['node_modules', 'dist', '.git', 'build', 'vendor', '.next', '.cache', 'public/assets'];
      
      try {
        toast({
          title: "Fetching Repository Files",
          description: "Scanning repository structure and preparing for analysis...",
        });
        
        // Start by getting the top-level contents
        const fetchDirectoryContents = async (path = '') => {
          try {
            console.log(`Fetching directory contents for: ${path || 'root'}`);
            const contentsResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
              headers: { Authorization: token ? `token ${token}` : "" }
            });
            
            if (!contentsResponse.ok) {
              throw new Error(`Failed to fetch directory contents: ${contentsResponse.statusText}`);
            }
            
            const contents = await contentsResponse.json();
            
            // Process each item
            for (const item of contents) {
              // Skip directories we want to ignore
              if (skipDirectories.some(dir => item.path.includes(dir))) {
                continue;
              }
              
              if (item.type === 'file') {
                // Skip binary files or files we're not interested in
                const ext = item.name.substring(item.name.lastIndexOf('.')).toLowerCase();
                if (skipExtensions.includes(ext) || item.size > 250000) {  // Increased size limit slightly
                  continue;
                }
                
                // Skip files without extensions (likely binary) unless they have special names
                const hasExtension = item.name.includes('.');
                const specialNames = ['Dockerfile', 'Makefile', 'README', 'LICENSE', 'CONTRIBUTING'];
                if (!hasExtension && !specialNames.some(name => item.name.includes(name))) {
                  continue;
                }
                
                allFiles.push({
                  name: item.name,
                  path: item.path,
                  size: item.size,
                  downloadUrl: item.download_url,
                  language: item.name.endsWith('.js') ? 'javascript' :
                            item.name.endsWith('.jsx') ? 'javascript' :
                            item.name.endsWith('.ts') ? 'typescript' :
                            item.name.endsWith('.tsx') ? 'typescript' :
                            item.name.endsWith('.py') ? 'python' :
                            item.name.endsWith('.html') ? 'html' :
                            item.name.endsWith('.css') ? 'css' :
                            item.name.endsWith('.json') ? 'json' :
                            item.name.endsWith('.md') ? 'markdown' :
                            item.name.endsWith('.java') ? 'java' :
                            item.name.endsWith('.php') ? 'php' :
                            item.name.endsWith('.go') ? 'go' :
                            item.name.endsWith('.rb') ? 'ruby' :
                            item.name.endsWith('.c') ? 'c' :
                            item.name.endsWith('.cpp') ? 'cpp' :
                            item.name.endsWith('.cs') ? 'csharp' :
                            item.name.endsWith('.swift') ? 'swift' :
                            item.name.endsWith('.kt') ? 'kotlin' :
                            item.name.endsWith('.rs') ? 'rust' :
                            item.name.endsWith('.dart') ? 'dart' :
                            'text'
                });
              } else if (item.type === 'dir') {
                // Recursively fetch contents of directories, but limit depth to avoid API rate limits
                const depth = path.split('/').length;
                if (depth < 5) {  // Limit directory depth to prevent excessive API calls
                  await fetchDirectoryContents(item.path);
                }
              }
            }
          } catch (error) {
            console.warn(`Error fetching directory ${path}:`, error);
          }
        };
        
        // Start the recursive fetching process
        await fetchDirectoryContents();
        
        console.log(`Found ${allFiles.length} files to analyze`);
        
        if (allFiles.length === 0) {
          throw new Error("No suitable files found for analysis");
        }

        // For very large repositories, limit the number of files to analyze
        const MAX_FILES = 50;
        let filesToAnalyze = allFiles;
        
        if (allFiles.length > MAX_FILES) {
          console.log(`Repository has ${allFiles.length} files, limiting to ${MAX_FILES} for analysis`);
          
          // Sort files by importance (prioritize code files over documentation)
          const codeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.php', '.go', '.rb', '.c', '.cpp', '.cs', '.swift', '.kt', '.rs'];
          const sortedFiles = [...allFiles].sort((a, b) => {
            const aExt = a.name.substring(a.name.lastIndexOf('.')).toLowerCase();
            const bExt = b.name.substring(b.name.lastIndexOf('.')).toLowerCase();
            
            // Prioritize code files
            const aIsCode = codeExtensions.includes(aExt);
            const bIsCode = codeExtensions.includes(bExt);
            
            if (aIsCode && !bIsCode) return -1;
            if (!aIsCode && bIsCode) return 1;
            
            // For similar file types, prioritize smaller files
            return a.size - b.size;
          });
          
          filesToAnalyze = sortedFiles.slice(0, MAX_FILES);
          
          toast({
            title: "Large Repository Detected",
            description: `Analyzing ${MAX_FILES} files out of ${allFiles.length} total files.`,
          });
        }
        
      } catch (error) {
        console.error("Error fetching repository files:", error);
        throw new Error("Failed to fetch repository files");
      }
      
      // Step 4: Set up scan state in localStorage
      const scanId = `scan_${params.id}`;
      const initialScanState = {
        status: 'processing',
        progress: 0,
        timestamp: new Date().toISOString(),
        totalFiles: allFiles.length,
        processedFiles: 0,
        fileResults: [],
        aggregatedIssues: { high: 0, medium: 0, low: 0 },
      };
      
      localStorage.setItem(scanId, JSON.stringify(initialScanState));
      
      // Step 5: Process files in batches (for better UX, we'll start processing in the background)
      // But first redirect user to the status page so they can see progress
      toast({
        title: "Analysis Started",
        description: `Starting analysis of ${allFiles.length} files. You'll see progress on the scan status page.`,
        variant: "default",
      });

      // Redirect to scan status page
      if (params?.id) {
        router.push(`/dashboard/repositories/${params.id}/scan-status`);
      } else {
        router.push('/dashboard/repositories');
      }
      
      // After redirecting, continue processing in the background
      setTimeout(async () => {
        try {
          // Process files in batches
          const BATCH_SIZE = 3; // Increase batch size to 3 files at a time (up from 1)
          const fileAnalyses = [];
          let consecutiveFailures = 0;
          const MAX_CONSECUTIVE_FAILURES = 5;

          // Add priority ranking to files - analyze smaller files first
          const prioritizedFiles = [...allFiles].sort((a, b) => {
            // Prioritize by size (smallest files first to get early results)
            return a.size - b.size;
          });
          
          for (let i = 0; i < prioritizedFiles.length; i += BATCH_SIZE) {
            // Stop if we've had too many consecutive failures
            if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
              console.error(`Too many consecutive failures (${consecutiveFailures}). Pausing analysis.`);
              
              // Update state to indicate partial completion
              const currentProgress = Math.floor((fileAnalyses.length / allFiles.length) * 100);
              const finalState = {
                ...initialScanState,
                status: 'paused',
                progress: currentProgress,
                processedFiles: fileAnalyses.length,
                fileResults: fileAnalyses,
                error: "Analysis paused due to too many API errors. You can resume later."
              };
              
              localStorage.setItem(scanId, JSON.stringify(finalState));
              break;
            }
            
            const batch = prioritizedFiles.slice(i, i + BATCH_SIZE);
            console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(prioritizedFiles.length/BATCH_SIZE)}, files ${i+1}-${Math.min(i+BATCH_SIZE, prioritizedFiles.length)}`);
            
            const batchPromises = batch.map(async (file) => {
              try {
                // Fetch file content
                let content = '';
                if (file.downloadUrl) {
                  try {
                    const fileResponse = await fetch(file.downloadUrl);
                    if (fileResponse.ok) {
                      content = await fileResponse.text();
                    } else {
                      throw new Error(`Failed to fetch file content: ${fileResponse.statusText}`);
                    }
                  } catch (err) {
                    console.warn(`Error fetching file ${file.path}:`, err);
                    return {
                      path: file.path,
                      language: file.language,
                      result: {
                        success: false,
                        error: err instanceof Error ? err.message : "Failed to fetch file"
                      }
                    };
                  }
                }
                
                if (!content) {
                  return {
                    path: file.path,
                    language: file.language,
                    result: {
                      success: false,
                      error: "Empty file or could not retrieve content"
                    }
                  };
                }
                
                // Skip files that are too large for analysis
                if (content.length > 250000) {
                  console.log(`Skipping ${file.path} - too large (${content.length} bytes)`);
                  return {
                    path: file.path,
                    language: file.language,
                    result: {
                      success: false,
                      error: "File too large for analysis"
                    }
                  };
                }
                
                // Skip files that are likely binary
                if (/^\ufffd/.test(content) || /[\x00-\x08\x0E-\x1F\x7F-\xFF]/.test(content.substring(0, 100))) {
                  console.log(`Skipping ${file.path} - likely binary content`);
                  return {
                    path: file.path,
                    language: file.language,
                    result: {
                      success: false,
                      error: "Binary file detected"
                    }
                  };
                }
                
                console.log(`Analyzing file: ${file.path}`);
                
                // Send to Gemini API for analysis with retry logic
                let analysisResult;
                let analyzeRetries = 0;
                const MAX_ANALYSIS_RETRIES = 3;
                
                while (analyzeRetries <= MAX_ANALYSIS_RETRIES) {
                  try {
                    const analysisResponse = await fetch('/api/gemini-analysis', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        code: content,
                        language: file.language,
                        filename: file.path
                      })
                    });
                    
                    if (!analysisResponse.ok) {
                      // Check if we should retry based on error type
                      const errorData = await analysisResponse.json();
                      
                      if (analysisResponse.status === 429 || (errorData.retryable && analyzeRetries < MAX_ANALYSIS_RETRIES)) {
                        // Rate limit hit or retryable error - implement backoff
                        analyzeRetries++;
                        // Use much longer backoff times to avoid hitting rate limits
                        const backoffTime = 5000 * Math.pow(2, analyzeRetries); // Exponential backoff starting at 10s
                        console.log(`Rate limit hit for ${file.path}, retrying in ${backoffTime/1000}s (attempt ${analyzeRetries}/${MAX_ANALYSIS_RETRIES})`);
                        await new Promise(resolve => setTimeout(resolve, backoffTime));
                        continue;
                      }
                      
                      throw new Error(`Failed to analyze ${file.path}: ${errorData.error || analysisResponse.statusText}`);
                    }
                    
                    analysisResult = await analysisResponse.json();
                    console.log(`Analysis completed for ${file.path}`);
                    consecutiveFailures = 0; // Reset on success
                    break; // Success - exit the retry loop
                  } catch (error) {
                    analyzeRetries++;
                    console.warn(`Error analyzing ${file.path} (attempt ${analyzeRetries}/${MAX_ANALYSIS_RETRIES + 1}):`, error);
                    
                    if (analyzeRetries > MAX_ANALYSIS_RETRIES) {
                      consecutiveFailures++; // Increment consecutive failures counter
                      // Return partial result with error information
                      return {
                        path: file.path,
                        language: file.language,
                        result: {
                          success: false,
                          error: error instanceof Error ? error.message : String(error)
                        }
                      };
                    }
                    
                    // Wait before retrying
                    const backoffTime = 5000 * Math.pow(2, analyzeRetries - 1);
                    await new Promise(resolve => setTimeout(resolve, backoffTime));
                  }
                }
                
                // Return result with file info
                return {
                  path: file.path,
                  language: file.language,
                  result: analysisResult
                };
              } catch (error) {
                console.warn(`Error analyzing ${file.path}:`, error);
                consecutiveFailures++; // Increment consecutive failures counter
                // Return partial result if analysis fails
                return {
                  path: file.path,
                  language: file.language,
                  result: {
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                  }
                };
              }
            });
            
            // Wait for batch to complete
            const batchResults = await Promise.all(batchPromises);
            const validResults = batchResults.filter(Boolean);
            fileAnalyses.push(...validResults);
            
            // Update progress
            const currentProgress = Math.min(100, Math.round((fileAnalyses.length / allFiles.length) * 100));
            const currentScanState = JSON.parse(localStorage.getItem(scanId) || JSON.stringify(initialScanState));
            
            // Count issues from all results so far
            const aggregatedIssues = { high: 0, medium: 0, low: 0 };
            fileAnalyses.forEach(analysis => {
              if (analysis?.result?.analysis?.analysis?.issues) {
                analysis.result.analysis.analysis.issues.forEach((issue: any) => {
                  if (issue.severity === 'high') aggregatedIssues.high++;
                  else if (issue.severity === 'medium') aggregatedIssues.medium++;
                  else if (issue.severity === 'low') aggregatedIssues.low++;
                });
              }
            });
            
            // Update scan state
            const updatedScanState = {
              ...currentScanState,
              status: i + BATCH_SIZE >= prioritizedFiles.length ? 'completed' : 'processing',
              progress: currentProgress,
              processedFiles: fileAnalyses.length,
              fileResults: fileAnalyses,
              aggregatedIssues: aggregatedIssues
            };
            
            localStorage.setItem(scanId, JSON.stringify(updatedScanState));
            
            // Add a shorter delay between batches to process faster but still avoid overwhelming the API
            if (i + BATCH_SIZE < prioritizedFiles.length) {
              // Use moderate delays to respect the 15 RPM limit
              const progressRatio = fileAnalyses.length / allFiles.length;
              const baseDelay = progressRatio > 0.5 ? 5000 : (progressRatio > 0.25 ? 4000 : 3000);
              const randomDelay = baseDelay + (Math.random() * 2000); // Random delay between 3-7s
              console.log(`Waiting ${Math.round(randomDelay/1000)} seconds before processing next batch...`);
              await new Promise(resolve => setTimeout(resolve, randomDelay));
            }
          }
          
          // Final update to mark as completed
          const finalScanState = JSON.parse(localStorage.getItem(scanId) || JSON.stringify(initialScanState));
          localStorage.setItem(scanId, JSON.stringify({
            ...finalScanState,
            status: 'completed',
            progress: 100,
            processedFiles: fileAnalyses.length,
            fileResults: fileAnalyses
          }));
          
          console.log(`Completed analysis of ${fileAnalyses.length} files`);
          
        } catch (error) {
          console.error("Error during batch processing:", error);
          
          // Update scan state to mark as failed
          const currentScanState = JSON.parse(localStorage.getItem(scanId) || JSON.stringify(initialScanState));
          localStorage.setItem(scanId, JSON.stringify({
            ...currentScanState,
            status: 'failed',
            error: error instanceof Error ? error.message : 'An unknown error occurred'
          }));
        }
      }, 500);
      
    } catch (error) {
      console.error("Error analyzing repository:", error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze repository",
        variant: "destructive",
      });
      setError(error instanceof Error ? error.message : "Failed to analyze repository");
      setIsScanning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Link href="/dashboard/repositories" className="flex items-center text-sm text-muted-foreground mb-4">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Repositories
        </Link>
        <div className="flex justify-center items-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Link href="/dashboard/repositories" className="flex items-center text-sm text-muted-foreground mb-4">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Repositories
        </Link>
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle>Error Loading Repository</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Please try again or contact support if the problem persists.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={fetchRepositoryDetails}>Try Again</Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (!repository) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/repositories">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Repositories
            </Link>
          </Button>
        </div>
        
        <div className="rounded-lg border border-dashed p-6 text-center">
          <h3 className="mb-2 text-xl font-semibold">Repository Not Found</h3>
          <p className="text-sm text-muted-foreground">
            The repository you are looking for does not exist or you do not have access to it.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            asChild
          >
            <Link href="/dashboard/repositories">View All Repositories</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/repositories">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Repositories
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">{repository.name}</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Star className="h-5 w-5" />
              <span>{repository.stars || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <GitFork className="h-5 w-5" />
              <span>{repository.forks || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <GitBranch className="h-5 w-5" />
              <span>{repository.defaultBranch || "main"}</span>
            </div>
          </div>
        </div>
        <p className="text-muted-foreground">{repository.description}</p>
        <div className="flex items-center gap-2 mt-2">
          <Button 
            onClick={handleScanNow}
            disabled={isScanning}
          >
            {isScanning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Repository...
              </>
            ) : (
              "Analyze All Files"
            )}
          </Button>
          <Button
            variant="outline"
            asChild
            className="ml-2"
          >
            <Link href={`/dashboard/repositories/${params?.id}/scan-status`}>
              View Scan Status
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={repository.url} target="_blank" rel="noopener noreferrer">
              View on GitHub
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Security Status</CardTitle>
                <CardDescription>
                  {repository.lastScan 
                    ? `Last scanned: ${new Date(repository.lastScan).toLocaleDateString()}`
                    : "Not scanned yet"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {repository.issues ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                        <span className="font-medium">High Severity</span>
                      </div>
                      <Badge variant={repository.issues.high > 0 ? "destructive" : "outline"}>
                        {repository.issues.high || 0}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        <span className="font-medium">Medium Severity</span>
                      </div>
                      <Badge variant="outline" className={repository.issues.medium > 0 ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}>
                        {repository.issues.medium || 0}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="font-medium">Low Severity</span>
                      </div>
                      <Badge variant="secondary">
                        {repository.issues.low || 0}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6">
                    <p className="text-center text-muted-foreground">
                      No scan data available. Run a scan to see security issues.
                    </p>
                    <Button
                      className="mt-4"
                      onClick={handleScanNow}
                      disabled={isScanning}
                    >
                      {isScanning ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing Repository...
                        </>
                      ) : (
                        "Analyze All Files"
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Repository Information</CardTitle>
                <CardDescription>Details about this repository</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm font-medium">URL</div>
                    <div className="text-sm text-muted-foreground truncate">
                      <a href={repository.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {repository.url}
                      </a>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm font-medium">Default Branch</div>
                    <div className="text-sm text-muted-foreground">
                      {repository.defaultBranch || "main"}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm font-medium">Stars</div>
                    <div className="text-sm text-muted-foreground">
                      {repository.stars || 0}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm font-medium">Forks</div>
                    <div className="text-sm text-muted-foreground">
                      {repository.forks || 0}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="issues">
          <Card>
            <CardHeader>
              <CardTitle>Security Issues</CardTitle>
              <CardDescription>
                {repository.lastScan 
                  ? `Last scanned: ${new Date(repository.lastScan).toLocaleDateString()}`
                  : "Not scanned yet"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {repository.issues && (repository.issues.high > 0 || repository.issues.medium > 0 || repository.issues.low > 0) ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          <span>High: {repository.issues.high}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          <span>Medium: {repository.issues.medium}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-green-500" />
                          <span>Low: {repository.issues.low}</span>
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="outline"
                      onClick={() => router.push(`/dashboard/repositories/${params?.id}/issues`)}
                    >
                      View Detailed Report
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6">
                  <p className="text-center text-muted-foreground">
                    No issues found or no scan data available.
                  </p>
                  <Button 
                    className="mt-4"
                    onClick={handleScanNow} 
                    disabled={isScanning}
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing Repository...
                      </>
                    ) : (
                      "Analyze All Files"
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="files" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>File Explorer</CardTitle>
                <CardDescription>Browse repository files</CardDescription>
              </CardHeader>
              <CardContent>
                <FileExplorer 
                  repositoryUrl={repository.url}
                  defaultBranch={repository.defaultBranch || "main"}
                  onSelectFile={setSelectedFile}
                />
              </CardContent>
            </Card>
            
            <div className="md:col-span-2">
              <FileAnalysis 
                file={selectedFile}
                repoOwner={parseGitHubUrl(repository.url)?.owner || ""}
                repoName={parseGitHubUrl(repository.url)?.repo || ""}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}