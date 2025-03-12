import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, GitBranch, Play, Pause, Trash2 } from "lucide-react"
import { ScheduleScanForm } from "@/components/scheduled/schedule-scan-form"

export const metadata: Metadata = {
  title: "Scheduled Scans - CodeScan AI",
  description: "Manage your scheduled code scans",
}

// Mock scheduled scans data
const scheduledScans = [
  {
    id: "schedule-1",
    repository: "frontend-app",
    frequency: "weekly",
    day: "Monday",
    time: "09:00",
    lastRun: "2023-06-05T09:00:00",
    nextRun: "2023-06-12T09:00:00",
    status: "active",
  },
  {
    id: "schedule-2",
    repository: "backend-api",
    frequency: "daily",
    time: "00:00",
    lastRun: "2023-06-09T00:00:00",
    nextRun: "2023-06-10T00:00:00",
    status: "active",
  },
  {
    id: "schedule-3",
    repository: "mobile-app",
    frequency: "monthly",
    day: "1st",
    time: "12:00",
    lastRun: "2023-06-01T12:00:00",
    nextRun: "2023-07-01T12:00:00",
    status: "paused",
  },
]

export default function ScheduledScansPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Scheduled Scans</h1>
          <Button>New Schedule</Button>
        </div>
        <p className="text-muted-foreground">Manage your automated code scan schedules</p>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Schedules</TabsTrigger>
          <TabsTrigger value="new">Create Schedule</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {scheduledScans.map((schedule) => (
              <Card key={schedule.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{schedule.repository}</CardTitle>
                    <Badge variant={schedule.status === "active" ? "default" : "secondary"}>{schedule.status}</Badge>
                  </div>
                  <CardDescription>
                    {schedule.frequency === "daily"
                      ? "Daily"
                      : schedule.frequency === "weekly"
                        ? `Weekly on ${schedule.day}`
                        : `Monthly on the ${schedule.day}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{schedule.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Next run: {new Date(schedule.nextRun).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <GitBranch className="h-4 w-4" />
                        <span>Last run: {new Date(schedule.lastRun).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {schedule.status === "active" ? (
                        <Button size="sm" variant="outline" className="w-full">
                          <Pause className="mr-2 h-4 w-4" />
                          Pause
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="w-full">
                          <Play className="mr-2 h-4 w-4" />
                          Resume
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="w-full">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="new">
          <ScheduleScanForm />
        </TabsContent>
      </Tabs>
    </div>
  )
}

