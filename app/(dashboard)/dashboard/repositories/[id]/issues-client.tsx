"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

// Client Component to display issues
export function IssuesClient({ repository }: { repository: any }) {
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

  // Group issues by severity
  const highIssues: any[] = [];
  const mediumIssues: any[] = [];
  const lowIssues: any[] = [];
  
  // Process scan results to extract issues
  repository.scanResults.forEach((result: any) => {
    if (result.analysis && result.analysis.issues) {
      result.analysis.issues.forEach((issue: any) => {
        // Add file info to each issue for context
        const issueWithFile = {
          ...issue,
          file: result.file
        };
        
        switch (issue.severity) {
          case 'high':
            highIssues.push(issueWithFile);
            break;
          case 'medium':
            mediumIssues.push(issueWithFile);
            break;
          case 'low':
            lowIssues.push(issueWithFile);
            break;
        }
      });
    }
  });

  const totalIssues = highIssues.length + mediumIssues.length + lowIssues.length;

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

      {totalIssues === 0 ? (
        <div className="text-center py-12 bg-green-50 rounded-lg">
          <h3 className="text-xl font-medium text-green-800">No issues detected!</h3>
          <p className="text-green-600 mt-2">Your repository passed all security checks.</p>
        </div>
      ) : (
        <Tabs defaultValue="high">
          <TabsList className="mb-4">
            <TabsTrigger value="high">
              High <Badge variant="outline" className="ml-2">{highIssues.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="medium">
              Medium <Badge variant="outline" className="ml-2">{mediumIssues.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="low">
              Low <Badge variant="outline" className="ml-2">{lowIssues.length}</Badge>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="high">
            <IssuesList issues={highIssues} />
          </TabsContent>
          <TabsContent value="medium">
            <IssuesList issues={mediumIssues} />
          </TabsContent>
          <TabsContent value="low">
            <IssuesList issues={lowIssues} />
          </TabsContent>
        </Tabs>
      )}
    </>
  );
}

// Component to render a list of issues
function IssuesList({ issues }: { issues: any[] }) {
  if (issues.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No issues of this severity found.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[600px]">
      <div className="space-y-4">
        {issues.map((issue, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{issue.title}</CardTitle>
                <Badge variant={issue.severity === 'high' ? 'destructive' : issue.severity === 'medium' ? 'default' : 'outline'}>
                  {issue.severity}
                </Badge>
              </div>
              <CardDescription>
                File: <code className="bg-gray-100 px-1 py-0.5 rounded">{issue.file}</code>
                {issue.line && <span> (Line: {issue.line})</span>}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-3">{issue.description}</p>
              <Separator className="my-3" />
              <div>
                <h4 className="font-semibold mb-1 text-sm">Recommendation</h4>
                <p className="text-sm">{issue.recommendation}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
} 