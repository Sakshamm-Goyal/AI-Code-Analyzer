import type { Metadata } from "next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Download, FileText, BarChart, PieChart } from "lucide-react"

export const metadata: Metadata = {
  title: "Reports - CodeScan AI",
  description: "View and download code analysis reports",
}

// Mock reports data
const reports = [
  {
    id: "report-1",
    name: "Monthly Security Audit",
    date: "2023-06-15T14:30:00",
    type: "security",
    format: "PDF",
    size: "2.4 MB",
  },
  {
    id: "report-2",
    name: "Code Quality Assessment",
    date: "2023-06-10T09:15:00",
    type: "quality",
    format: "HTML",
    size: "1.8 MB",
  },
  {
    id: "report-3",
    name: "Performance Analysis",
    date: "2023-06-05T11:45:00",
    type: "performance",
    format: "PDF",
    size: "3.1 MB",
  },
  {
    id: "report-4",
    name: "Quarterly Compliance Report",
    date: "2023-05-20T16:00:00",
    type: "compliance",
    format: "PDF",
    size: "4.5 MB",
  },
]

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <Button>Generate New Report</Button>
        </div>
        <p className="text-muted-foreground">View, generate and download code analysis reports</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Generated in last 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quality Reports</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Generated in last 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance Reports</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">Generated in last 30 days</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
          <CardDescription>View and download your recent analysis reports</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.name}</TableCell>
                  <TableCell>{new Date(report.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        report.type === "security"
                          ? "destructive"
                          : report.type === "quality"
                          ? "secondary"
                          : report.type === "performance"
                          ? "default"
                          : "outline"
                      }
                    >
                      {report.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{report.format}</TableCell>
                  <TableCell>{report.size}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" className="flex items-center gap-1">
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
} 