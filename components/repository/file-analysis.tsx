"use client"

import { useState, useEffect } from "react"
import { Loader2, FileText } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface FileAnalysisProps {
  file: any
  repoOwner: string
  repoName: string
}

export function FileAnalysis({ file, repoOwner, repoName }: FileAnalysisProps) {
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<any | null>(null)
  const [selectedAnalysisTypes, setSelectedAnalysisTypes] = useState<string[]>(["security", "quality"])
  const { toast } = useToast()

  // Reset state when a new file is selected
  useEffect(() => {
    setFileContent(null)
    setAnalysis(null)
  }, [file])

  const fetchFileContent = async () => {
    if (!file?.downloadUrl) return
    
    setIsLoading(true)
    
    try {
      const response = await fetch(`/api/github/file-content?url=${encodeURIComponent(file.downloadUrl)}`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch file content")
      }
      
      const data = await response.json()
      setFileContent(data.content)
    } catch (error) {
      console.error("Error fetching file content:", error)
      toast({
        title: "Error",
        description: "Failed to fetch file content",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnalysisTypeChange = (type: string, checked: boolean) => {
    setSelectedAnalysisTypes(prev => {
      if (checked) {
        return [...prev, type]
      } else {
        return prev.filter(t => t !== type)
      }
    })
  }

  const analyzeFile = async () => {
    if (!fileContent) return
    
    setIsAnalyzing(true)
    
    try {
      // Determine language from file extension
      const fileExtension = file.name.split('.').pop()?.toLowerCase()
      const language = mapExtensionToLanguage(fileExtension)
      
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: fileContent,
          language,
          analysisType: selectedAnalysisTypes,
        }),
      })
      
      if (!response.ok) {
        throw new Error("Failed to analyze file")
      }
      
      const data = await response.json()
      setAnalysis(data.analysis)
    } catch (error) {
      console.error("Error analyzing file:", error)
      toast({
        title: "Error",
        description: "Failed to analyze file",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  function mapExtensionToLanguage(extension?: string) {
    if (!extension) return "unknown"
    
    const extensionMap: Record<string, string> = {
      js: "JavaScript",
      jsx: "JavaScript (React)",
      ts: "TypeScript",
      tsx: "TypeScript (React)",
      py: "Python",
      java: "Java",
      rb: "Ruby",
      php: "PHP",
      go: "Go",
      cs: "C#",
      cpp: "C++",
      c: "C",
      html: "HTML",
      css: "CSS",
      scss: "SCSS",
      json: "JSON",
      md: "Markdown",
    }
    
    return extensionMap[extension] || extension.toUpperCase()
  }

  if (!file) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-96">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">
            Select a file from the file explorer to view and analyze
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{file.name}</span>
          {fileContent && (
            <div className="flex items-center space-x-4">
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={analyzeFile}
                  disabled={isAnalyzing || selectedAnalysisTypes.length === 0}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    "Analyze"
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardTitle>
        <CardDescription>
          {file.path}
        </CardDescription>
        <div className="mt-4 space-y-2">
          <div className="text-sm font-medium">Analysis Options</div>
          <div className="flex gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="security"
                checked={selectedAnalysisTypes.includes("security")}
                onCheckedChange={(checked) => 
                  handleAnalysisTypeChange("security", checked as boolean)
                }
              />
              <Label htmlFor="security">Security Analysis</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="quality"
                checked={selectedAnalysisTypes.includes("quality")}
                onCheckedChange={(checked) => 
                  handleAnalysisTypeChange("quality", checked as boolean)
                }
              />
              <Label htmlFor="quality">Code Quality</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="performance"
                checked={selectedAnalysisTypes.includes("performance")}
                onCheckedChange={(checked) => 
                  handleAnalysisTypeChange("performance", checked as boolean)
                }
              />
              <Label htmlFor="performance">Performance</Label>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <Button
            variant="outline"
            onClick={fetchFileContent}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "View Content"
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={analysis ? "analysis" : "content"} className="space-y-4">
          <TabsList>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="analysis" disabled={!analysis}>Analysis</TabsTrigger>
          </TabsList>
          
          <TabsContent value="content">
            {fileContent ? (
              <ScrollArea className="h-[400px] rounded-md border p-4">
                <pre className="text-sm">
                  <code>{fileContent}</code>
                </pre>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center h-96">
                <p className="text-muted-foreground">No content loaded</p>
                <Button 
                  className="mt-4" 
                  variant="outline"
                  onClick={fetchFileContent}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "View Content"
                  )}
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="analysis">
            {analysis ? (
              <ScrollArea className="h-[400px] rounded-md border p-4">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Summary</h3>
                    <div className="rounded-lg bg-muted p-4">
                      <div className="flex items-center justify-between">
                        <span>Risk Score:</span>
                        <span className="font-semibold">{analysis.summary.riskScore}/100</span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{analysis.summary.message}</p>
                    </div>
                  </div>
                  
                  {analysis.issues && analysis.issues.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">Issues</h3>
                      <div className="space-y-4">
                        {analysis.issues.map((issue: any, index: number) => (
                          <div key={index} className="rounded-lg border p-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold">{issue.title}</h4>
                              <div className={`px-2 py-1 rounded text-xs font-semibold ${
                                issue.severity === "High" ? "bg-red-100 text-red-800" :
                                issue.severity === "Medium" ? "bg-amber-100 text-amber-800" :
                                "bg-green-100 text-green-800"
                              }`}>
                                {issue.severity}
                              </div>
                            </div>
                            <p className="mt-2 text-sm">{issue.description}</p>
                            <div className="mt-2 text-xs text-muted-foreground">Line: {issue.line}</div>
                            <div className="mt-2">
                              <h5 className="text-sm font-semibold">Recommendation</h5>
                              <p className="text-sm">{issue.recommendation}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {analysis.metrics && (
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">Code Metrics</h3>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-lg border p-4">
                          <div className="text-sm font-medium">Complexity</div>
                          <div className="mt-1 text-2xl font-bold">
                            {analysis.metrics.complexity}/10
                          </div>
                        </div>
                        <div className="rounded-lg border p-4">
                          <div className="text-sm font-medium">Maintainability</div>
                          <div className="mt-1 text-2xl font-bold">
                            {analysis.metrics.maintainability}/10
                          </div>
                        </div>
                        <div className="rounded-lg border p-4">
                          <div className="text-sm font-medium">Testability</div>
                          <div className="mt-1 text-2xl font-bold">
                            {analysis.metrics.testability}/10
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {analysis.bestPractices && analysis.bestPractices.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">Best Practices</h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {analysis.bestPractices.map((practice: string, index: number) => (
                          <li key={index} className="text-sm">{practice}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {analysis.recommendations && analysis.recommendations.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">Recommendations</h3>
                      <div className="space-y-4">
                        {analysis.recommendations.map((rec: any, index: number) => (
                          <div key={index} className="rounded-lg border p-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold">{rec.title}</h4>
                              <div className={`px-2 py-1 rounded text-xs font-semibold ${
                                rec.priority === "High" ? "bg-red-100 text-red-800" :
                                rec.priority === "Medium" ? "bg-amber-100 text-amber-800" :
                                "bg-green-100 text-green-800"
                              }`}>
                                {rec.priority} Priority
                              </div>
                            </div>
                            <p className="mt-2 text-sm">{rec.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center h-96">
                <p className="text-muted-foreground">No analysis available</p>
                <Button 
                  className="mt-4" 
                  onClick={analyzeFile}
                  disabled={isAnalyzing || !fileContent || selectedAnalysisTypes.length === 0}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    "Analyze"
                  )}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
} 