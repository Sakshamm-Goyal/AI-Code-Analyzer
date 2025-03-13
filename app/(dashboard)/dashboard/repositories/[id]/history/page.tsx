"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Calendar, Clock, AlertCircle, AlertTriangle, CheckCircle, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"

interface ScanHistory {
  id: string
  createdAt: string
  status: "completed" | "failed" | "in_progress"
  issues: {
    high: number
    medium: number
    low: number
  }
  summary: string
  branch: string
  commit: string
}

export default function HistoryPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [repository, setRepository] = useState<any>(null)
  const [history, setHistory] = useState<ScanHistory[]>([])

  useEffect(() => {
    fetchRepositoryAndHistory()
  }, [params.id])

  const fetchRepositoryAndHistory = async () => {
    setIsLoading(true)
    try {
      // Fetch repository details
      const repoResponse = await fetch(`/api/github/repositories/${params.id}`)
      if (!repoResponse.ok) throw new Error("Failed to fetch repository")
      const repoData = await repoResponse.json()
      setRepository(repoData.repository)

      // Fetch scan history
      const historyResponse = await fetch(`/api/github/repositories/${params.id}/history`)
      if (!historyResponse.ok) throw new Error("Failed to fetch history")
      const historyData = await historyResponse.json()
      setHistory(historyData.history)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to load scan history",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case "in_progress":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      default:
        return null
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
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          asChild
        >
          <Link href={`/dashboard/repositories/${params.id}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to Repository
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Scan History</h1>
        <p className="text-muted-foreground">
          View past security scans for {repository?.name}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analysis History</CardTitle>
          <CardDescription>
            Past security scans and their results
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6">
              <p className="text-center text-muted-foreground">
                No scan history available yet.
              </p>
              <Button
                className="mt-4"
                onClick={() => router.push(`/dashboard/repositories/${params.id}`)}
              >
                Run First Scan
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((scan) => (
                <div
                  key={scan.id}
                  className="flex items-start justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(scan.status)}
                      <span className="font-medium">
                        Scan on {new Date(scan.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {scan.summary}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Branch: {scan.branch}</span>
                      <span>•</span>
                      <span>Commit: {scan.commit.substring(0, 7)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {scan.issues.high > 0 && (
                      <Badge variant="destructive">
                        {scan.issues.high} High
                      </Badge>
                    )}
                    {scan.issues.medium > 0 && (
                      <Badge variant="warning">
                        {scan.issues.medium} Medium
                      </Badge>
                    )}
                    {scan.issues.low > 0 && (
                      <Badge variant="secondary">
                        {scan.issues.low} Low
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 