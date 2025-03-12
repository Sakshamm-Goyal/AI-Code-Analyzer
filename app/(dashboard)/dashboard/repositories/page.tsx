import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GitBranch, GitFork, Star, AlertCircle, AlertTriangle, CheckCircle } from "lucide-react"

export const metadata: Metadata = {
  title: "Repositories - CodeScan AI",
  description: "Manage your connected repositories",
}

// Mock repository data
const repositories = [
  {
    id: "repo-1",
    name: "frontend-app",
    description: "React frontend application",
    url: "https://github.com/username/frontend-app",
    stars: 24,
    forks: 5,
    lastScan: "2023-06-10T09:00:00",
    issues: {
      high: 2,
      medium: 5,
      low: 8,
    },
  },
  {
    id: "repo-2",
    name: "backend-api",
    description: "Node.js backend API",
    url: "https://github.com/username/backend-api",
    stars: 18,
    forks: 3,
    lastScan: "2023-06-09T14:30:00",
    issues: {
      high: 0,
      medium: 3,
      low: 12,
    },
  },
  {
    id: "repo-3",
    name: "mobile-app",
    description: "React Native mobile application",
    url: "https://github.com/username/mobile-app",
    stars: 32,
    forks: 7,
    lastScan: "2023-06-08T11:15:00",
    issues: {
      high: 1,
      medium: 7,
      low: 4,
    },
  },
]

export default function RepositoriesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Repositories</h1>
          <Button>Connect Repository</Button>
        </div>
        <p className="text-muted-foreground">Manage your connected GitHub repositories</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {repositories.map((repo) => (
          <Card key={repo.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">
                  <Link href={`/dashboard/repositories/${repo.id}`} className="hover:underline">
                    {repo.name}
                  </Link>
                </CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4" />
                    <span>{repo.stars}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <GitFork className="h-4 w-4" />
                    <span>{repo.forks}</span>
                  </div>
                </div>
              </div>
              <CardDescription>{repo.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <GitBranch className="h-4 w-4" />
                  <span>Last scanned: {new Date(repo.lastScan).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <Badge variant={repo.issues.high > 0 ? "destructive" : "outline"}>{repo.issues.high}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <Badge variant="warning" className="bg-amber-500 hover:bg-amber-600">
                      {repo.issues.medium}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <Badge variant="secondary">{repo.issues.low}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/dashboard/repositories/${repo.id}`}>View Details</Link>
                  </Button>
                  <Button size="sm" variant="outline">
                    Scan Now
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

