"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, AlertCircle, AlertTriangle, CheckCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function IssuesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [repository, setRepository] = useState<any>(null);
  const [issues, setIssues] = useState<{
    high: any[],
    medium: any[],
    low: any[]
  }>({ high: [], medium: [], low: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchIssues();
  }, [params.id]);

  const fetchIssues = async () => {
    try {
      const response = await fetch(`/api/github/repositories/${params.id}/issues`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch issues");
      }
      
      const data = await response.json();
      console.log("Received issues data:", data);
      
      setRepository(data.repository);
      
      // Ensure issues data has the expected structure
      const issuesData = data.issues || { high: [], medium: [], low: [] };
      setIssues({
        high: Array.isArray(issuesData.high) ? issuesData.high : [],
        medium: Array.isArray(issuesData.medium) ? issuesData.medium : [],
        low: Array.isArray(issuesData.low) ? issuesData.low : []
      });
    } catch (error) {
      console.error("Error fetching issues:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch issues");
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch issues",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'medium':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'low':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge variant="warning">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
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

      <Card>
        <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
            <CardDescription>
              {error}
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Button onClick={fetchIssues}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalIssues = 
    (issues.high ? issues.high.length : 0) + 
    (issues.medium ? issues.medium.length : 0) + 
    (issues.low ? issues.low.length : 0);

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
        <h1 className="text-3xl font-bold tracking-tight">Security Issues</h1>
        <p className="text-muted-foreground">
          {repository?.name} - {totalIssues} issues found
        </p>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Issues</TabsTrigger>
          <TabsTrigger value="high">High ({issues.high?.length || 0})</TabsTrigger>
          <TabsTrigger value="medium">Medium ({issues.medium?.length || 0})</TabsTrigger>
          <TabsTrigger value="low">Low ({issues.low?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Security Issues</CardTitle>
              <CardDescription>
                Issues found during the last scan on {repository?.lastScan ? new Date(repository.lastScan).toLocaleDateString() : "unknown date"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-6">
                  {(issues.high?.length > 0) && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 text-red-500">High Severity Issues</h3>
                      <div className="space-y-3">
                        {issues.high.map((issue, index) => (
                          <Card key={`high-${index}`}>
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                {getSeverityIcon('high')}
                                <div className="space-y-1">
                                  <h4 className="font-semibold">{issue.title}</h4>
                                  <p className="text-sm text-muted-foreground">{issue.description}</p>
                                  <div className="flex flex-wrap gap-2 mt-2 text-xs">
                                    <Badge variant="outline">{issue.file}</Badge>
                                    <Badge variant="outline">{issue.language}</Badge>
                                    {issue.line && <Badge variant="outline">Line: {issue.line}</Badge>}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {(issues.medium?.length > 0) && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 text-amber-500">Medium Severity Issues</h3>
                      <div className="space-y-3">
                        {issues.medium.map((issue, index) => (
                          <Card key={`medium-${index}`}>
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                {getSeverityIcon('medium')}
                                <div className="space-y-1">
                                  <h4 className="font-semibold">{issue.title}</h4>
                                  <p className="text-sm text-muted-foreground">{issue.description}</p>
                                  <div className="flex flex-wrap gap-2 mt-2 text-xs">
                                    <Badge variant="outline">{issue.file}</Badge>
                                    <Badge variant="outline">{issue.language}</Badge>
                                    {issue.line && <Badge variant="outline">Line: {issue.line}</Badge>}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {(issues.low?.length > 0) && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 text-green-500">Low Severity Issues</h3>
                      <div className="space-y-3">
                        {issues.low.map((issue, index) => (
                          <Card key={`low-${index}`}>
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                {getSeverityIcon('low')}
                                <div className="space-y-1">
                                  <h4 className="font-semibold">{issue.title}</h4>
                                  <p className="text-sm text-muted-foreground">{issue.description}</p>
                                  <div className="flex flex-wrap gap-2 mt-2 text-xs">
                                    <Badge variant="outline">{issue.file}</Badge>
                                    <Badge variant="outline">{issue.language}</Badge>
                                    {issue.line && <Badge variant="outline">Line: {issue.line}</Badge>}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  </div>
                  )}
                  
                  {!totalIssues && (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold">No Issues Found</h3>
                      <p className="text-muted-foreground mt-2">
                        Great job! Your repository has no detected security issues.
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="high">
          <Card>
            <CardHeader>
              <CardTitle>High Severity Issues</CardTitle>
              <CardDescription>
                Critical issues that should be addressed immediately
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-3">
                  {issues.high?.length > 0 ? (
                    issues.high.map((issue, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {getSeverityIcon('high')}
                            <div className="space-y-1">
                              <h4 className="font-semibold">{issue.title}</h4>
                              <p className="text-sm text-muted-foreground">{issue.description}</p>
                              <div className="flex flex-wrap gap-2 mt-2 text-xs">
                                <Badge variant="outline">{issue.file}</Badge>
                                <Badge variant="outline">{issue.language}</Badge>
                                {issue.line && <Badge variant="outline">Line: {issue.line}</Badge>}
                              </div>
                  </div>
                </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold">No High Severity Issues</h3>
                      <p className="text-muted-foreground mt-2">
                        Great job! Your repository has no high severity security issues.
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
            </TabsContent>

        <TabsContent value="medium">
          <Card>
            <CardHeader>
              <CardTitle>Medium Severity Issues</CardTitle>
              <CardDescription>Important issues that should be addressed soon</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-3">
                  {issues.medium?.length > 0 ? (
                    issues.medium.map((issue, index) => (
                      <Card key={`medium-${index}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {getSeverityIcon('medium')}
                            <div className="space-y-1">
                              <h4 className="font-semibold">{issue.title}</h4>
                              <p className="text-sm text-muted-foreground">{issue.description}</p>
                              <div className="flex flex-wrap gap-2 mt-2 text-xs">
                                <Badge variant="outline">{issue.file}</Badge>
                                <Badge variant="outline">{issue.language}</Badge>
                                {issue.line && <Badge variant="outline">Line: {issue.line}</Badge>}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold">No Medium Severity Issues</h3>
                      <p className="text-muted-foreground mt-2">
                        Great job! Your repository has no medium severity security issues.
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="low">
          <Card>
            <CardHeader>
              <CardTitle>Low Severity Issues</CardTitle>
              <CardDescription>Issues that can be addressed later</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-3">
                  {issues.low?.length > 0 ? (
                    issues.low.map((issue, index) => (
                      <Card key={`low-${index}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {getSeverityIcon('low')}
                            <div className="space-y-1">
                              <h4 className="font-semibold">{issue.title}</h4>
                              <p className="text-sm text-muted-foreground">{issue.description}</p>
                              <div className="flex flex-wrap gap-2 mt-2 text-xs">
                                <Badge variant="outline">{issue.file}</Badge>
                                <Badge variant="outline">{issue.language}</Badge>
                                {issue.line && <Badge variant="outline">Line: {issue.line}</Badge>}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold">No Low Severity Issues</h3>
                      <p className="text-muted-foreground mt-2">
                        Great job! Your repository has no low severity security issues.
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 