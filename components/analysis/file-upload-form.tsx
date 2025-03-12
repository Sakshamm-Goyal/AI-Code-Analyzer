"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Upload, File, X, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function FileUploadForm() {
  const [files, setFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const handleAnalyze = async () => {
    if (files.length === 0 || selectedTypes.length === 0) return

    setIsUploading(true)
    setError(null)
    setResult(null)

    try {
      // Create FormData to send files
      const formData = new FormData()
      files.forEach((file) => {
        formData.append('files', file)
      })
      
      // Add analysis types
      selectedTypes.forEach(type => {
        formData.append('analysisType', type)
      })

      const response = await fetch("/api/analyze-files", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed")
      }

      setResult(data.analysis)
    } catch (error) {
      console.error("Analysis error:", error)
      setError(error instanceof Error ? error.message : "Analysis failed")
    } finally {
      setIsUploading(false)
    }
  }

  // Analysis types array
  const analysisTypes = ["Security", "Code Quality", "Performance", "Best Practices"]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>File Upload Analysis</CardTitle>
          <CardDescription>Upload files for code analysis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid w-full items-center gap-1.5">
            <label
              htmlFor="file-upload"
              className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-input bg-background px-3 py-2 text-center text-sm ring-offset-background transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Upload className="h-6 w-6 text-muted-foreground" />
              <div className="mt-2 text-sm font-medium">Drag and drop files or click to browse</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Supports .js, .ts, .py, .java, .cs, .php, .go, .rb, .rs, .swift
              </div>
              <Input
                id="file-upload"
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
                accept=".js,.ts,.py,.java,.cs,.php,.go,.rb,.rs,.swift"
              />
            </label>
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Selected Files</div>
              <div className="rounded-md border">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between border-b p-2 last:border-0">
                    <div className="flex items-center gap-2">
                      <File className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{file.name}</span>
                      <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(2)} KB)</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Analysis Type
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {analysisTypes.map((type) => (
                <Button
                  key={type}
                  variant={selectedTypes.includes(type.toLowerCase()) ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => {
                    setSelectedTypes((prev) =>
                      prev.includes(type.toLowerCase())
                        ? prev.filter((t) => t !== type.toLowerCase())
                        : [...prev, type.toLowerCase()]
                    )
                  }}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={handleAnalyze} 
            disabled={files.length === 0 || selectedTypes.length === 0 || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Analyze Files"
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
            <CardDescription>
              Risk Score: {result.summary?.riskScore}/100 - {result.summary?.message}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.issues && result.issues.length > 0 ? (
              <div>
                <h3 className="text-lg font-medium">Issues Found ({result.issues.length})</h3>
                <div className="space-y-3 mt-2">
                  {result.issues.map((issue: any, index: number) => (
                    <div key={index} className="border rounded-md p-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          issue.severity === 'High' ? 'bg-red-100 text-red-800' : 
                          issue.severity === 'Medium' ? 'bg-orange-100 text-orange-800' : 
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {issue.severity}
                        </span>
                        <h4 className="font-medium">{issue.title}</h4>
                      </div>
                      <p className="text-sm mt-1">{issue.description}</p>
                      <div className="flex flex-col gap-1 mt-2">
                        <span className="text-xs text-gray-500">
                          {issue.file && `File: ${issue.file}`}{issue.line && `, Line: ${issue.line}`}
                        </span>
                        <p className="text-sm"><strong>Recommendation:</strong> {issue.recommendation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p>No issues found!</p>
            )}
            
            {result.metrics && (
              <div>
                <h3 className="text-lg font-medium">Code Metrics</h3>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="border rounded-md p-3">
                    <h4 className="font-medium">Complexity</h4>
                    <p className="text-sm mt-1">{result.metrics.complexity}</p>
                  </div>
                  <div className="border rounded-md p-3">
                    <h4 className="font-medium">Maintainability</h4>
                    <p className="text-sm mt-1">{result.metrics.maintainability}</p>
                  </div>
                </div>
              </div>
            )}
            
            {result.bestPractices && result.bestPractices.length > 0 && (
              <div>
                <h3 className="text-lg font-medium">Best Practices</h3>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  {result.bestPractices.map((practice: string, index: number) => (
                    <li key={index} className="text-sm">{practice}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

