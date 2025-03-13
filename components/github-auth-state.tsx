"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { GithubIcon, AlertCircle, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export function GitHubAuthState() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    checkGitHubConnection()
  }, [])

  const checkGitHubConnection = async () => {
    try {
      const response = await fetch("/api/user/github-token")
      setIsConnected(response.ok)
    } catch (error) {
      console.error("Error checking GitHub connection:", error)
      setIsConnected(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnectGitHub = async () => {
    setIsConnecting(true)
    try {
      // Get the authorization URL from our backend
      const response = await fetch("/api/auth/github/authorize")
      const data = await response.json()
      
      if (data.url) {
        // Store current URL to return after auth
        sessionStorage.setItem('githubOAuthReturnTo', window.location.pathname)
        // Redirect to GitHub
        window.location.href = data.url
      } else {
        throw new Error("No authorization URL received")
      }
    } catch (error) {
      console.error("Error starting GitHub OAuth:", error)
      toast({
        title: "Error",
        description: "Failed to start GitHub connection",
        variant: "destructive",
      })
      setIsConnecting(false)
    }
  }

  if (isLoading) {
    return (
      <Alert>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertTitle>Checking GitHub Connection</AlertTitle>
        <AlertDescription>
          Please wait while we verify your GitHub connection...
        </AlertDescription>
      </Alert>
    )
  }

  if (!isConnected) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>GitHub Not Connected</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>Connect your GitHub account to analyze repositories.</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleConnectGitHub}
            disabled={isConnecting}
            className="ml-2 flex items-center gap-2"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <GithubIcon className="h-4 w-4" />
                Connect GitHub
              </>
            )}
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return null
} 