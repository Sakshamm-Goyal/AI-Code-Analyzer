"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GithubIcon, Loader2 } from "lucide-react"
import { getGitHubAuthUrl } from "@/lib/github-oauth"

export default function ConnectGitHubPage() {
  const [isConnecting, setIsConnecting] = useState(false)
  const router = useRouter()

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      const authUrl = getGitHubAuthUrl()
      window.location.href = authUrl
    } catch (error) {
      console.error("Error starting GitHub OAuth:", error)
      setIsConnecting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Connect GitHub</h1>
        <p className="text-muted-foreground">
          Connect your GitHub account to analyze repositories
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>GitHub Integration</CardTitle>
          <CardDescription>
            Grant access to your GitHub repositories for code analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-6">
            <GithubIcon className="h-12 w-12" />
            <div className="text-center">
              <h3 className="text-lg font-semibold">GitHub Repository Access</h3>
              <p className="text-sm text-muted-foreground mt-1">
                We need access to your repositories to perform code analysis.
                We only read your code and never make any changes.
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <GithubIcon className="mr-2 h-4 w-4" />
                  Connect GitHub Account
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 