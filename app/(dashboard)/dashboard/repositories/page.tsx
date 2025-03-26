"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GitBranch, GitFork, Star, AlertCircle, AlertTriangle, CheckCircle, Loader2, PlusIcon, RefreshCw } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { parseGitHubUrl } from "@/lib/github"
import { useToast } from "@/components/ui/use-toast"
import { useSearchParams } from "next/navigation"
import GitHubAuthState from "@/components/github-auth-state"
import LoadingSpinner from "@/components/loading-spinner"

export default function RepositoriesPage() {
  const [repositories, setRepositories] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [repoUrl, setRepoUrl] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const { toast } = useToast()
  const searchParams = useSearchParams()

  const syncRepositoriesToDatabase = async () => {
    try {
      console.log("Syncing repositories to database...");
      
      setIsSyncing(true);
      
      const response = await fetch("/api/github/repositories/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to sync repositories");
      }
      
      const data = await response.json();
      console.log(`Successfully synced ${data.count} repositories`);
      
      // Refresh the repository list
      await fetchRepositories();
      
      toast({
        title: "Repositories Synced",
        description: `Successfully synced ${data.count} repositories from GitHub.`,
      });
    } catch (error) {
      console.error("Error syncing repositories:", error);
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Failed to sync repositories",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Fetch repositories when the component mounts
  useEffect(() => {
    fetchRepositories()
    
    // Auto-sync repositories to database when the page loads
    syncRepositoriesToDatabase().catch(error => {
      console.error("Auto-sync failed:", error);
    });
    
    // Check for connection success from OAuth flow
    const connectionStatus = searchParams.get("connection")
    const error = searchParams.get("error")
    
    if (connectionStatus === "success") {
      toast({
        title: "GitHub Connected",
        description: "Your GitHub account has been successfully connected.",
      })
    } else if (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect your GitHub account. Please try again.",
        variant: "destructive",
      })
    }
  }, [searchParams, toast])

  const fetchRepositories = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log("Fetching repositories...")
      const response = await fetch("/api/github/repositories", {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Cache-Control": "no-cache",
        },
        credentials: "include",
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch repositories")
      }
      
      const data = await response.json()
      console.log("Repositories response:", data)
      
      if (data.repositories && Array.isArray(data.repositories)) {
        setRepositories(data.repositories)
      } else {
        console.warn("Invalid repositories data:", data)
        setRepositories([])
      }
    } catch (error) {
      console.error("Error fetching repositories:", error)
      setError(error instanceof Error ? error.message : "Failed to fetch repositories")
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnectRepository = async () => {
    if (!repoUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid repository URL",
        variant: "destructive",
      })
      return
    }
    
    setIsConnecting(true)
    try {
      const parsed = parseGitHubUrl(repoUrl)
      if (!parsed) {
        throw new Error("Invalid GitHub repository URL")
      }
      
      const response = await fetch("/api/github/repositories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: repoUrl }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to connect repository")
      }
      
      const data = await response.json()
      
      // Add the new repository to the list
      if (data.repository) {
        setRepositories(prev => [data.repository, ...prev])
      }
      
      // Reset form and close dialog
      setRepoUrl("")
      setIsDialogOpen(false)
      
      toast({
        title: "Success",
        description: "Repository connected successfully",
      })
    } catch (error) {
      console.error("Error connecting repository:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to connect repository",
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const handleSyncRepositories = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch("/api/github/repositories/sync", {
        method: "POST",
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to sync repositories")
      }
      
      // Refetch repositories to get the updated list
      await fetchRepositories()
      
      toast({
        title: "Success",
        description: "Repositories synced successfully",
      })
    } catch (error) {
      console.error("Error syncing repositories:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sync repositories",
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
    }
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Repositories</h1>
          <div className="flex items-center gap-2">
            <Button disabled variant="outline" size="sm" onClick={handleSyncRepositories}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync
            </Button>
            <Button disabled variant="default" size="sm" onClick={() => setIsDialogOpen(true)}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Connect
            </Button>
          </div>
        </div>

        <div className="flex justify-center items-center p-12">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Repositories</h1>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSyncRepositories}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync
              </>
            )}
          </Button>
          <Button variant="default" size="sm" onClick={() => setIsDialogOpen(true)}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Connect
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div className="font-medium text-red-600">Error loading repositories</div>
          </div>
          <div className="mt-2 text-sm text-red-700">{error}</div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchRepositories} 
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
      ) : repositories.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <h3 className="mb-2 text-xl font-semibold">No repositories found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Connect your GitHub repositories to start scanning for security issues
          </p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Connect Repository
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {repositories.map((repo) => (
            <Card key={repo.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="truncate text-lg">{repo.name}</CardTitle>
                <CardDescription className="truncate">
                  {repo.fullName || repo.description || "No description"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                  {repo.stars !== undefined && (
                    <div className="flex items-center">
                      <Star className="mr-1 h-3.5 w-3.5" />
                      <span>{repo.stars}</span>
                    </div>
                  )}
                  {repo.forks !== undefined && (
                    <div className="flex items-center">
                      <GitFork className="mr-1 h-3.5 w-3.5" />
                      <span>{repo.forks}</span>
                    </div>
                  )}
                  {repo.defaultBranch && (
                    <div className="flex items-center">
                      <GitBranch className="mr-1 h-3.5 w-3.5" />
                      <span>{repo.defaultBranch}</span>
                    </div>
                  )}
                  {repo.private && (
                    <Badge variant="outline" className="text-xs">Private</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-auto">
                  {repo.lastScan ? (
                    <div className="flex items-center">
                      <Badge variant="outline" className="mr-2">
                        <span className="flex items-center">
                          {repo.issues?.high > 0 ? (
                            <AlertCircle className="mr-1 h-3 w-3 text-red-500" />
                          ) : repo.issues?.medium > 0 ? (
                            <AlertTriangle className="mr-1 h-3 w-3 text-amber-500" />
                          ) : (
                            <CheckCircle className="mr-1 h-3 w-3 text-green-500" />
                          )}
                          Last scanned: {new Date(repo.lastScan).toLocaleDateString()}
                        </span>
                      </Badge>
                    </div>
                  ) : (
                    <Badge variant="outline">Not scanned</Badge>
                  )}
                </div>
                <div className="mt-4 flex items-center space-x-2">
                  <Button variant="default" size="sm" asChild className="flex-1">
                    <Link href={`/dashboard/repositories/${repo.id}`}>
                      View Details
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Repository</DialogTitle>
            <DialogDescription>
              Enter the URL of a GitHub repository to connect it to your account.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="https://github.com/username/repository"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
              disabled={isConnecting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConnectRepository}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span className="text-foreground">Connecting...</span>
                </>
              ) : (
                'Connect'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

