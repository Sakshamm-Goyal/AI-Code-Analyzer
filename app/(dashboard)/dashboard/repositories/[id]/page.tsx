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
    if (params.id) {
      fetchRepositoryDetails()
    }
  }, [params.id])

  const fetchRepositoryDetails = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
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

      // Make sure we have the required info before sending
      if (!repository || !repository.name || !repository.fullName) {
        throw new Error("Repository information is incomplete");
      }

      // Extract owner from fullName (format: "owner/repo")
      const owner = repository.fullName.split('/')[0];
      
      console.log(`Initiating scan for repository: ${repository.fullName} (ID: ${params.id})`);

      const response = await fetch(`/api/github/repositories/${params.id}/scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: repository.name,
          owner: owner,
          fullName: repository.fullName
        })
      });
      
      const jsonData = await response.json();
      
      // Check for success
      if (!response.ok) {
        throw new Error(jsonData.error || "Failed to scan repository");
      }
      
      // Show success message
      toast({
        title: "Scan Initiated",
        description: "Your repository scan has been started. You'll be redirected to the scan status page.",
        variant: "default",
      });
      
      // Redirect to scan status page
      router.push(`/dashboard/repositories/${params.id}/scan-status`);
    } catch (error) {
      console.error("Error scanning repository:", error);
      toast({
        title: "Scan Failed",
        description: error instanceof Error ? error.message : "Failed to initiate scan",
        variant: "destructive",
      });
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
                Scanning...
              </>
            ) : (
              "Scan Now"
            )}
          </Button>
          <Button
            variant="outline"
            asChild
            className="ml-2"
          >
            <Link href={`/dashboard/repositories/${params.id}/scan-status`}>
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
                          Scanning...
                        </>
                      ) : (
                        "Scan Now"
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
                      onClick={() => router.push(`/dashboard/repositories/${params.id}/issues`)}
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
                        Scanning...
                      </>
                    ) : (
                      "Scan Now"
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