"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, AlertCircle, AlertTriangle, CheckCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/use-toast"

export default function ScanStatusPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [scanStatus, setScanStatus] = useState<any>(null);
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchScanStatus();
    // Set up polling interval
    const interval = setInterval(fetchScanStatus, 5000);
    setRefreshInterval(interval);
    return () => clearInterval(interval);
  }, [params.id]);

  const fetchScanStatus = async () => {
    try {
      const response = await fetch(`/api/github/repositories/${params.id}/scan`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch scan status");
      }

      console.log("Scan status:", data);
      setScanStatus(data);

      // If scan is complete, clear the refresh interval
      if (data.status === 'completed' || data.status === 'failed') {
        if (refreshInterval) {
          clearInterval(refreshInterval);
          setRefreshInterval(null);
        }
      }
    } catch (error) {
      console.error("Error fetching scan status:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch scan status");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartNewScan = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/github/repositories/${params.id}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to start scan");
      }

      toast({
        title: "Scan Started",
        description: "The repository scan has been initiated",
      });

      // Reset scan status and start polling
      setScanStatus({ status: 'pending', progress: 0 });
      if (!refreshInterval) {
        const interval = setInterval(fetchScanStatus, 5000);
        setRefreshInterval(interval);
      }
    } catch (error) {
      console.error("Error starting scan:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start scan",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (scanStatus?.status) {
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-6 w-6 text-red-500" />;
      case 'pending':
      case 'processing':
        return <Loader2 className="h-6 w-6 animate-spin" />;
      default:
        return <AlertTriangle className="h-6 w-6 text-amber-500" />;
    }
  };

  const getStatusText = () => {
    switch (scanStatus?.status) {
      case 'completed':
        return "Scan completed successfully";
      case 'failed':
        return scanStatus.error || "Scan failed";
      case 'pending':
        return "Scan is queued";
      case 'processing':
        return "Analyzing repository files...";
      default:
        return "No scan information available";
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/repositories/${params.id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Repository
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Repository Scan Status</h1>
        <p className="text-muted-foreground">
          Monitor the progress and results of your repository scan
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scan Status</CardTitle>
          <CardDescription>Current status of the repository analysis</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-red-500">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                {getStatusIcon()}
                <div>
                  <h3 className="text-lg font-semibold">
                    {scanStatus?.status ? scanStatus.status.charAt(0).toUpperCase() + scanStatus.status.slice(1) : "Unknown"}
                  </h3>
                  <p className="text-muted-foreground">{getStatusText()}</p>
                </div>
              </div>

              {scanStatus?.progress !== undefined && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progress</span>
                    <span>{scanStatus.progress}%</span>
                  </div>
                  <Progress value={scanStatus.progress} />
                </div>
              )}

              {scanStatus?.issues && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg border p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">{scanStatus.issues.high}</div>
                    <div className="text-sm text-muted-foreground">High Severity</div>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <div className="text-2xl font-bold text-amber-600">{scanStatus.issues.medium}</div>
                    <div className="text-sm text-muted-foreground">Medium Severity</div>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{scanStatus.issues.low}</div>
                    <div className="text-sm text-muted-foreground">Low Severity</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <div className="flex w-full justify-between">
            {scanStatus?.status === 'completed' && (
              <Button asChild>
                <Link href={`/dashboard/repositories/${params.id}/issues`}>
                  View Detailed Report
                </Link>
              </Button>
            )}
            {(!scanStatus || ['completed', 'failed', 'not_found'].includes(scanStatus.status)) && (
              <Button 
                onClick={handleStartNewScan}
                disabled={isLoading}
                variant={scanStatus?.status === 'completed' ? "outline" : "default"}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting Scan...
                  </>
                ) : (
                  'Start New Scan'
                )}
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
} 