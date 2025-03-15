"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { GithubIcon, AlertCircle, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function GitHubAuthState() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    checkGitHubConnection()
  }, [])

  const checkGitHubConnection = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/user/github-token")
      
      if (response.status === 404) {
        // 404 means the token doesn't exist, but it's not an error
        console.log("GitHub connection not found (404), showing connect UI")
        setIsConnected(false)
        setError(null)
        return
      }
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to check GitHub connection")
      }
      
      setIsConnected(true)
      setError(null)
    } catch (err) {
      console.error("Error checking GitHub connection:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
      setIsConnected(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnectGitHub = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/auth/github/authorize")
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to start GitHub authorization")
      }
      
      // Redirect to GitHub OAuth page
      window.location.href = data.url
    } catch (err) {
      console.error("Error connecting to GitHub:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
      setIsLoading(false)
    }
  }

  if (isConnected === true) {
    return (
      <Alert className="bg-green-50 border-green-300 mb-6">
        <AlertTitle>GitHub Connected</AlertTitle>
        <AlertDescription>
          Your GitHub account is connected and working correctly.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert className="bg-blue-50 border-blue-300 mb-6">
      <div className="flex justify-between items-center">
        <div>
          <AlertTitle>Connect GitHub</AlertTitle>
          <AlertDescription>
            {error ? (
              <span className="text-red-500">{error}</span>
            ) : (
              "Connect your GitHub account to analyze repositories."
            )}
          </AlertDescription>
        </div>
        <Button 
          onClick={handleConnectGitHub} 
          disabled={isLoading}
          className="ml-4"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            "Connect GitHub"
          )}
        </Button>
      </div>
    </Alert>
  )
} 