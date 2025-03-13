"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GitBranch, GitFork, Star, AlertCircle, AlertTriangle, CheckCircle, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { connectRepository } from "@/lib/github"
import { useToast } from "@/components/ui/use-toast"
import { useSearchParams } from "next/navigation"
import { GitHubAuthState } from "@/components/github-auth-state"

export default function RepositoriesPage() {
  const [repositories, setRepositories] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [repoUrl, setRepoUrl] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [isScanning, setIsScanning] = useState<Record<number, boolean>>({})
  const { toast } = useToast()
  const searchParams = useSearchParams()

  useEffect(() => {
    fetchRepositories()
  }, [])

  const fetchRepositories = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch("/api/github/repositories")
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch repositories")
      }
      
      const data = await response.json()
      setRepositories(data.repositories || [])
    } catch (error) {
      console.error("Error fetching repositories:", error)
      setError(error instanceof Error ? error.message : "Failed to fetch repositories")
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnectRepository = async () => {
    setIsConnecting(true)
    try {
      const repository = await connectRepository(repoUrl)
      setRepositories(prev => [...prev, repository])
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

  const handleScanNow = async (repoId: number) => {
    setIsScanning(prev => ({ ...prev, [repoId]: true }))
    
    try {
      const response = await fetch(`/api/github/repositories/${repoId}/scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to initiate scan")
      }
      
      toast({
        title: "Scan initiated",
        description: "The repository scan has been started.",
      })
      
      // Refresh repositories to show updated scan status
      await fetchRepositories()
    } catch (error) {
      console.error("Error scanning repository:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to scan repository",
        variant: "destructive",
      })
    } finally {
      setIsScanning(prev => ({ ...prev, [repoId]: false }))
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <GitHubAuthState />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Repositories</h1>
          <p className="text-muted-foreground">
            Manage and analyze your GitHub repositories
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Connect Repository</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect Repository</DialogTitle>
              <DialogDescription>
                Enter the URL of the GitHub repository you want to connect.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Input
                placeholder="https://github.com/owner/repo"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                onClick={handleConnectRepository}
                disabled={!repoUrl || isConnecting}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {repositories.map((repo) => (
          <Card key={repo.id}>
            <CardHeader>
              <CardTitle>{repo.name}</CardTitle>
              <CardDescription>{repo.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4" />
                    <span>{repo.stars}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <GitFork className="h-4 w-4" />
                    <span>{repo.forks}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <GitBranch className="h-4 w-4" />
                    <span>{repo.defaultBranch}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => handleScanNow(repo.id)}
                  disabled={isScanning[repo.id]}
                >
                  {isScanning[repo.id] ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    'Scan Now'
                  )}
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/dashboard/repositories/${repo.id}`}>
                    View Details
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

