"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useEffect, useState } from "react"

// Client Component to display issues
export function IssuesClient({ repository }: { repository: any }) {
  const [isLoading, setIsLoading] = useState(true);
  const [highIssues, setHighIssues] = useState<any[]>([]);
  const [mediumIssues, setMediumIssues] = useState<any[]>([]);
  const [lowIssues, setLowIssues] = useState<any[]>([]);
  
  // Process scan results when component mounts
  useEffect(() => {
    try {
      console.log("Processing repository data:", repository);
      
      // Check if scanResults exists and has valid data
      if (!repository.scanResults || !Array.isArray(repository.scanResults)) {
        console.log("No scan results found or invalid format", repository.scanResults);
        setIsLoading(false);
        return;
      }
      
      console.log(`Found ${repository.scanResults.length} scan results`);
      
      const high: any[] = [];
      const medium: any[] = [];
      const low: any[] = [];
      
      // Process scan results to extract issues
      repository.scanResults.forEach((result: any) => {
        if (!result || !result.analysis?.issues) {
          console.warn("Invalid scan result entry:", result);
          return;
        }
        
        const filePath = result.file;
        const issues = result.analysis.issues;
        
        console.log(`Processing ${issues.length} issues from ${filePath}`);
        
        // Process each issue
        issues.forEach((issue: any) => {
          if (!issue || !issue.severity) return;
          
          const issueWithFile = {
            ...issue,
            file: filePath
          };
          
          switch (issue.severity.toLowerCase()) {
            case 'high':
              high.push(issueWithFile);
              break;
            case 'medium':
              medium.push(issueWithFile);
              break;
            case 'low':
              low.push(issueWithFile);
              break;
          }
        });
      });
      
      console.log(`Processed issues - High: ${high.length}, Medium: ${medium.length}, Low: ${low.length}`);
      
      setHighIssues(high);
      setMediumIssues(medium);
      setLowIssues(low);
    } catch (error) {
      console.error("Error processing repository issues:", error);
    } finally {
      setIsLoading(false);
    }
  }, [repository]);
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-2">Processing issues...</span>
      </div>
    );
  }

  // Make sure we have scan results to display
  if (!repository.scanResults || repository.scanResults.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">
          No scan results available. Run a scan first to see issues.
        </p>
      </div>
    );
  }

  const totalIssues = highIssues.length + mediumIssues.length + lowIssues.length;

  // Show "no issues found" if we have scan results but no issues
  if (totalIssues === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-green-600 font-semibold">
          No issues found! Your code looks good.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>High Severity</CardTitle>
            <CardDescription>Critical security issues</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">{highIssues.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Medium Severity</CardTitle>
            <CardDescription>Important issues to address</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-500">{mediumIssues.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Low Severity</CardTitle>
            <CardDescription>Minor issues to review</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500">{lowIssues.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="high">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="high">High ({highIssues.length})</TabsTrigger>
          <TabsTrigger value="medium">Medium ({mediumIssues.length})</TabsTrigger>
          <TabsTrigger value="low">Low ({lowIssues.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="high">
          <Card>
            <CardHeader>
              <CardTitle>High Severity Issues</CardTitle>
              <CardDescription>
                Critical security vulnerabilities that should be fixed immediately
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RenderIssues issues={highIssues} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="medium">
          <Card>
            <CardHeader>
              <CardTitle>Medium Severity Issues</CardTitle>
              <CardDescription>
                Important issues that should be addressed soon
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RenderIssues issues={mediumIssues} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="low">
          <Card>
            <CardHeader>
              <CardTitle>Low Severity Issues</CardTitle>
              <CardDescription>
                Minor issues that should be reviewed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RenderIssues issues={lowIssues} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

// Helper component to render issues
function RenderIssues({ issues }: { issues: any[] }) {
  if (issues.length === 0) {
    return <p className="text-muted-foreground">No issues found in this category.</p>;
  }

  return (
    <ScrollArea className="h-[600px] rounded-md border p-4">
      {issues.map((issue, index) => (
        <div key={index} className="mb-6 last:mb-0">
          <div className="flex items-start justify-between">
            <h3 className="text-lg font-medium">{issue.title}</h3>
            <Badge 
              variant="outline" 
              className={
                issue.severity === 'high' ? 'bg-red-100 text-red-800' : 
                issue.severity === 'medium' ? 'bg-amber-100 text-amber-800' : 
                'bg-blue-100 text-blue-800'
              }
            >
              {issue.severity}
            </Badge>
          </div>
          
          <div className="mt-1 text-sm text-muted-foreground">
            <span className="font-mono bg-slate-100 px-1 py-0.5 rounded">
              {issue.file}
              {issue.line ? `:${issue.line}` : ''}
            </span>
          </div>
          
          <div className="mt-2">
            <p className="text-sm mt-1">{issue.description}</p>
          </div>
          
          {issue.recommendation && (
            <div className="mt-3 bg-green-50 p-3 rounded-md">
              <h4 className="text-sm font-medium text-green-900">Recommendation:</h4>
              <p className="text-sm text-green-800 mt-1">{issue.recommendation}</p>
            </div>
          )}
          
          {index < issues.length - 1 && <Separator className="my-4" />}
        </div>
      ))}
    </ScrollArea>
  );
} 