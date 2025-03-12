import type { Metadata } from "next"
import { currentUser } from "@clerk/nextjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, Code, GitBranch, BarChart, Calendar } from "lucide-react"
import { RecentScansTable } from "@/components/dashboard/recent-scans-table"
import { SecurityOverview } from "@/components/dashboard/security-overview"
import { CodeQualityChart } from "@/components/dashboard/code-quality-chart"

export const metadata: Metadata = {
  title: "Dashboard - CodeScan AI",
  description: "Dashboard for CodeScan AI",
}

export default async function DashboardPage() {
  const user = await currentUser()
  const firstName = user?.firstName || "there"

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome, {firstName}!</h1>
        <p className="text-muted-foreground">Monitor your code quality and security with AI-powered analysis.</p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Getting Started</AlertTitle>
        <AlertDescription>
          Connect your GitHub repositories or upload code to start analyzing your codebase.
          <Button variant="link" className="h-auto p-0 pl-2">
            Learn more
          </Button>
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
            <Code className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">+2 from last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected Repos</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">+1 from last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Scans</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">Active weekly scans</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Score</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">85%</div>
            <p className="text-xs text-muted-foreground">+5% from last scan</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="quality">Code Quality</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <RecentScansTable />
        </TabsContent>
        <TabsContent value="security" className="space-y-4">
          <SecurityOverview />
        </TabsContent>
        <TabsContent value="quality" className="space-y-4">
          <CodeQualityChart />
        </TabsContent>
      </Tabs>
    </div>
  )
}

