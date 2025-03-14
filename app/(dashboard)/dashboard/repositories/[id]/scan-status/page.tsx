"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, AlertCircle, AlertTriangle, CheckCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/use-toast"
import LoadingSpinner from "@/components/loading-spinner"

export default function ScanStatusPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [scanStatus, setScanStatus] = useState<any>(null);
  const [isStartingNewScan, setIsStartingNewScan] = useState(false);
  const [shouldPoll, setShouldPoll] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScanStatus = useCallback(async () => {
    if (!params.id || !shouldPoll) return;
    
    try {
      console.log("Fetching scan status...");
      
      const response = await fetch(`/api/github/repositories/${params.id}/scan`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Cache-Control": "no-store"
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch scan status");
      }
      
      const data = await response.json();
      console.log("Scan status:", data);
      setScanStatus(data);
      
      // Stop polling if scan is completed or failed
      if (data.status === 'completed' || data.status === 'failed') {
        console.log(`Scan ${data.status}. Stopping status polling.`);
        setShouldPoll(false);
      }
    } catch (error) {
      console.error("Error fetching scan status:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch scan status");
      // Stop polling on error
      setShouldPoll(false);
    } finally {
      setIsLoading(false);
    }
  }, [params.id, shouldPoll]);

  useEffect(() => {
    fetchScanStatus();
    
    // Set up polling only if we should be polling
    let intervalId: NodeJS.Timeout | null = null;
    
    if (shouldPoll) {
      // Poll every 3 seconds (increased from 2s to reduce load)
      intervalId = setInterval(fetchScanStatus, 3000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [fetchScanStatus, shouldPoll]);

  const handleStartNewScan = async () => {
    try {
      setIsStartingNewScan(true);

      // Get repository information if we don't have it already
      const repoResponse = await fetch(`/api/github/repositories/${params.id}`);
      if (!repoResponse.ok) {
        throw new Error("Failed to get repository information");
      }
      
      const repoData = await repoResponse.json();
      const repository = repoData.repository;
      
      if (!repository || !repository.name || !repository.fullName) {
        throw new Error("Invalid repository data");
      }
      
      // Extract owner from fullName (owner/repo format)
      const owner = repository.fullName.split('/')[0];
      
      // Start a new scan
      const response = await fetch(`/api/github/repositories/${params.id}/scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: repository.name,
          owner: owner,
          fullName: repository.fullName
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start scan");
      }
      
      // Reset the scan status and start polling again
      setScanStatus(null);
      setIsLoading(true);
      setShouldPoll(true);
      
      toast({
        title: "Scan Started",
        description: "Your repository scan has been started."
      });
    } catch (error) {
      console.error("Error starting scan:", error);
      toast({
        title: "Scan Failed",
        description: error instanceof Error ? error.message : "Failed to start scan",
        variant: "destructive"
      });
    } finally {
      setIsStartingNewScan(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Link href={`/dashboard/repositories/${params.id}`} className="flex items-center text-sm text-muted-foreground mb-4">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Repository
        </Link>
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">Repository Scan Status</h1>
            <p className="text-muted-foreground">Monitor the progress and results of your repository scan</p>
          </div>
          <div className="flex justify-center items-center min-h-[400px]">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Link href={`/dashboard/repositories/${params.id}`} className="flex items-center text-sm text-muted-foreground mb-4">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to Repository
      </Link>
      
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Repository Scan Status</h1>
          <p className="text-muted-foreground">Monitor the progress and results of your repository scan</p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Scan Status</CardTitle>
              <CardDescription>Current status of the repository analysis</CardDescription>
            </CardHeader>
            <CardContent>
              {scanStatus?.status === 'not_found' && (
                <div className="flex items-center text-muted-foreground">
                  <AlertCircle className="mr-2 h-5 w-5" />
                  <p>No scan has been initiated yet</p>
                </div>
              )}
              
              {scanStatus?.status === 'pending' && (
                <div className="flex items-center text-amber-500">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  <p>Scan pending...</p>
                </div>
              )}
              
              {scanStatus?.status === 'processing' && (
                <div className="flex items-center text-blue-500">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  <p>Scan in progress...</p>
                </div>
              )}
              
              {scanStatus?.status === 'completed' && (
                <div className="flex items-center text-green-500">
                  <CheckCircle className="mr-2 h-5 w-5" />
                  <p>Scan completed successfully</p>
                </div>
              )}
              
              {scanStatus?.status === 'failed' && (
                <div className="flex items-center text-red-500">
                  <AlertTriangle className="mr-2 h-5 w-5" />
                  <p>Scan failed: {scanStatus.error || "Unknown error"}</p>
                </div>
              )}
              
              {(scanStatus?.status === 'processing' || scanStatus?.status === 'completed') && (
                <div className="mt-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Progress</span>
                    <span className="text-sm font-medium">{scanStatus.progress.toFixed(0)}%</span>
                  </div>
                  <Progress value={scanStatus.progress} className="h-2" />
                </div>
              )}
              
              {(scanStatus?.status === 'completed' || scanStatus?.status === 'failed') && (
                <div className="mt-6">
                  <Button
                    onClick={handleStartNewScan}
                    disabled={isStartingNewScan}
                  >
                    {isStartingNewScan ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      'Start New Scan'
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          {scanStatus?.status === 'completed' && scanStatus?.issues && (
            <Card>
              <CardHeader>
                <CardTitle>Issues Found</CardTitle>
                <CardDescription>Summary of security issues in your code</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col items-center p-4 bg-red-50 rounded-lg">
                    <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
                    <span className="text-2xl font-bold">{scanStatus.issues.high}</span>
                    <span className="text-sm text-muted-foreground">High Severity</span>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-amber-50 rounded-lg">
                    <AlertTriangle className="h-8 w-8 text-amber-500 mb-2" />
                    <span className="text-2xl font-bold">{scanStatus.issues.medium}</span>
                    <span className="text-sm text-muted-foreground">Medium Severity</span>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-blue-50 rounded-lg">
                    <AlertCircle className="h-8 w-8 text-blue-500 mb-2" />
                    <span className="text-2xl font-bold">{scanStatus.issues.low}</span>
                    <span className="text-sm text-muted-foreground">Low Severity</span>
                  </div>
                </div>
                
                <div className="mt-6">
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/dashboard/repositories/${params.id}/issues`}>
                      View Detailed Report
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 