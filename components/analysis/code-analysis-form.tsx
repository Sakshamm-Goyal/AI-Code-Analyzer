"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function CodeAnalysisForm() {
  const [code, setCode] = useState("")
  const [language, setLanguage] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any | null>(null)

  const handleAnalyze = async () => {
    if (!code || !language || selectedTypes.length === 0) return

    setIsAnalyzing(true)
    setError(null)
    setResult(null)
    
    try {
      console.log("Sending request with:", { code: code.substring(0, 50) + "...", language, analysisType: selectedTypes });
      
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language,
          analysisType: selectedTypes
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "Analysis failed")
      }
      
      console.log("Analysis result:", data);
      setResult(data.analysis)
    } catch (error) {
      console.error("Analysis error:", error)
      setError(error instanceof Error ? error.message : "Analysis failed")
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Code Snippet Analysis</CardTitle>
          <CardDescription>Paste your code snippet for analysis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Programming Language
            </label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="typescript">TypeScript</SelectItem>
                <SelectItem value="python">Python</SelectItem>
                <SelectItem value="java">Java</SelectItem>
                <SelectItem value="csharp">C#</SelectItem>
                <SelectItem value="php">PHP</SelectItem>
                <SelectItem value="go">Go</SelectItem>
                <SelectItem value="ruby">Ruby</SelectItem>
                <SelectItem value="rust">Rust</SelectItem>
                <SelectItem value="swift">Swift</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Code Snippet
            </label>
            <Textarea
              className="mt-2 font-mono"
              placeholder="Paste your code here..."
              rows={15}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Analysis Type
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {["Security", "Code Quality", "Performance", "Best Practices"].map((type) => (
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
            disabled={!code || !language || selectedTypes.length === 0 || isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Analyze Code"
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
                        <span className="text-xs text-gray-500">Line: {issue.line}</span>
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

