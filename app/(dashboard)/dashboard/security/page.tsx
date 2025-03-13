import type { Metadata } from "next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { SecurityOverview } from "@/components/dashboard/security-overview"

export const metadata: Metadata = {
  title: "Security - CodeScan AI",
  description: "Security vulnerabilities and threat analysis",
}

export default function SecurityPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Security</h1>
          <Button>Run Security Scan</Button>
        </div>
        <p className="text-muted-foreground">Analyze and track security vulnerabilities in your code</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vulnerabilities">Vulnerabilities</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <SecurityOverview />
        </TabsContent>
        <TabsContent value="vulnerabilities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vulnerability Details</CardTitle>
              <CardDescription>Detailed list of all security vulnerabilities</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Detailed vulnerability content will appear here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Reports</CardTitle>
              <CardDescription>View and download security reports</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Security reports will appear here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 