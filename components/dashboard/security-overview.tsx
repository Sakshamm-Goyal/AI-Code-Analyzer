import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertCircle, AlertTriangle, CheckCircle } from "lucide-react"

// Mock security issues
const securityIssues = [
  {
    id: "issue-1",
    severity: "high",
    title: "SQL Injection Vulnerability",
    description: "Unsanitized user input is directly used in SQL queries in UserController.js",
    file: "src/controllers/UserController.js",
    line: 42,
  },
  {
    id: "issue-2",
    severity: "high",
    title: "Hardcoded API Key",
    description: "API key is hardcoded in AuthService.js",
    file: "src/services/AuthService.js",
    line: 15,
  },
  {
    id: "issue-3",
    severity: "medium",
    title: "Insecure Cookie Configuration",
    description: "Cookies are not set with secure and httpOnly flags",
    file: "src/middleware/session.js",
    line: 28,
  },
  {
    id: "issue-4",
    severity: "medium",
    title: "Outdated Dependency",
    description: "Using vulnerable version of express-jwt package",
    file: "package.json",
    line: 12,
  },
  {
    id: "issue-5",
    severity: "low",
    title: "Console Logging Sensitive Information",
    description: "User credentials are being logged to console",
    file: "src/services/LogService.js",
    line: 56,
  },
]

export function SecurityOverview() {
  const highIssues = securityIssues.filter((issue) => issue.severity === "high")
  const mediumIssues = securityIssues.filter((issue) => issue.severity === "medium")
  const lowIssues = securityIssues.filter((issue) => issue.severity === "low")

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Security Overview</CardTitle>
          <CardDescription>Summary of security issues found in your codebase</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col items-center justify-center rounded-lg border p-4">
              <div className="text-destructive mb-2">
                <AlertCircle className="h-8 w-8" />
              </div>
              <div className="text-2xl font-bold">{highIssues.length}</div>
              <div className="text-sm text-muted-foreground">High Risk Issues</div>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg border p-4">
              <div className="text-amber-500 mb-2">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <div className="text-2xl font-bold">{mediumIssues.length}</div>
              <div className="text-sm text-muted-foreground">Medium Risk Issues</div>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg border p-4">
              <div className="text-green-500 mb-2">
                <CheckCircle className="h-8 w-8" />
              </div>
              <div className="text-2xl font-bold">{lowIssues.length}</div>
              <div className="text-sm text-muted-foreground">Low Risk Issues</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Security Issues</CardTitle>
          <CardDescription>Detailed list of security issues found in your codebase</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {securityIssues.map((issue) => (
              <Alert key={issue.id} variant={issue.severity === "high" ? "destructive" : "default"}>
                <div className="flex items-start gap-4">
                  <div className="mt-0.5">
                    {issue.severity === "high" ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : issue.severity === "medium" ? (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <AlertTitle>{issue.title}</AlertTitle>
                      <Badge
                        variant={
                          issue.severity === "high"
                            ? "destructive"
                            : issue.severity === "medium"
                              ? "warning"
                              : "secondary"
                        }
                        className={issue.severity === "medium" ? "bg-amber-500 hover:bg-amber-600" : ""}
                      >
                        {issue.severity}
                      </Badge>
                    </div>
                    <AlertDescription className="mt-1">{issue.description}</AlertDescription>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {issue.file}:{issue.line}
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    View
                  </Button>
                </div>
              </Alert>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

