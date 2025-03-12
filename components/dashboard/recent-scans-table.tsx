import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Mock data for recent scans
const recentScans = [
  {
    id: "scan-1",
    repository: "frontend-app",
    timestamp: "2023-06-10T09:00:00",
    status: "completed",
    issues: {
      high: 2,
      medium: 5,
      low: 8,
    },
  },
  {
    id: "scan-2",
    repository: "backend-api",
    timestamp: "2023-06-09T14:30:00",
    status: "completed",
    issues: {
      high: 0,
      medium: 3,
      low: 12,
    },
  },
  {
    id: "scan-3",
    repository: "mobile-app",
    timestamp: "2023-06-08T11:15:00",
    status: "completed",
    issues: {
      high: 1,
      medium: 7,
      low: 4,
    },
  },
  {
    id: "scan-4",
    repository: "data-service",
    timestamp: "2023-06-07T16:45:00",
    status: "completed",
    issues: {
      high: 0,
      medium: 2,
      low: 6,
    },
  },
]

export function RecentScansTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Scans</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Repository</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>High Risk</TableHead>
              <TableHead>Medium Risk</TableHead>
              <TableHead>Low Risk</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentScans.map((scan) => (
              <TableRow key={scan.id}>
                <TableCell className="font-medium">{scan.repository}</TableCell>
                <TableCell>{new Date(scan.timestamp).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {scan.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={scan.issues.high > 0 ? "destructive" : "outline"}>{scan.issues.high}</Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={scan.issues.medium > 0 ? "warning" : "outline"}
                    className="bg-amber-500 hover:bg-amber-600"
                  >
                    {scan.issues.medium}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={scan.issues.low > 0 ? "secondary" : "outline"}>{scan.issues.low}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

