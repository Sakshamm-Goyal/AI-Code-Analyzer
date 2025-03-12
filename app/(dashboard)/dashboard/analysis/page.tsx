import type { Metadata } from "next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { CodeAnalysisForm } from "@/components/analysis/code-analysis-form"
import { FileUploadForm } from "@/components/analysis/file-upload-form"

export const metadata: Metadata = {
  title: "Code Analysis - CodeScan AI",
  description: "Analyze your code with AI",
}

export default function AnalysisPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Code Analysis</h1>
        <p className="text-muted-foreground">Analyze your code for security vulnerabilities and quality issues.</p>
      </div>

      <Tabs defaultValue="repository" className="space-y-4">
        <TabsList>
          <TabsTrigger value="repository">Repository</TabsTrigger>
          <TabsTrigger value="snippet">Code Snippet</TabsTrigger>
          <TabsTrigger value="file">File Upload</TabsTrigger>
        </TabsList>
        <TabsContent value="repository" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Repository Analysis</CardTitle>
              <CardDescription>Analyze code from a GitHub repository</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Repository URL
                  </label>
                  <div className="mt-2">
                    <input
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="https://github.com/username/repo"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Branch
                  </label>
                  <div className="mt-2">
                    <input
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="main"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Analysis Type
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button variant="outline" className="rounded-full">
                    Security
                  </Button>
                  <Button variant="outline" className="rounded-full">
                    Code Quality
                  </Button>
                  <Button variant="outline" className="rounded-full">
                    Performance
                  </Button>
                  <Button variant="outline" className="rounded-full">
                    Best Practices
                  </Button>
                  <Button variant="outline" className="rounded-full">
                    Accessibility
                  </Button>
                </div>
              </div>
              <Button>Analyze Repository</Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="snippet" className="space-y-4">
          <CodeAnalysisForm />
        </TabsContent>
        <TabsContent value="file" className="space-y-4">
          <FileUploadForm />
        </TabsContent>
      </Tabs>
    </div>
  )
}

