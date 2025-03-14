"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, GitBranch, Play, Pause, Trash2, Loader2 } from "lucide-react"
import { ScheduleScanForm } from "@/components/scheduled/schedule-scan-form"
import { useToast } from "@/components/ui/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

interface ScheduledScan {
  id: string
  repository: string
  frequency: "daily" | "weekly" | "monthly"
  day?: string
  time: string
  lastRun?: string
  nextRun: string
  status: "active" | "paused"
}

export default function ScheduledScansPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [scheduledScans, setScheduledScans] = useState<ScheduledScan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  useEffect(() => {
    fetchScheduledScans()
  }, [])

  const fetchScheduledScans = async () => {
    try {
      const response = await fetch("/api/scheduled", {
        credentials: "include",
      })
      if (!response.ok) throw new Error("Failed to fetch scheduled scans")
      const data = await response.json()
      setScheduledScans(data.scheduledScans)
    } catch (error) {
      console.error("Error fetching scheduled scans:", error)
      toast({
        title: "Error",
        description: "Failed to load scheduled scans",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChange = async (scheduleId: string, action: "pause" | "resume") => {
    setActionInProgress(scheduleId)
    try {
      const response = await fetch(`/api/scheduled/${scheduleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })

      if (!response.ok) throw new Error("Failed to update schedule status")

      toast({
        title: "Success",
        description: `Schedule ${action === "pause" ? "paused" : "resumed"} successfully`,
      })

      await fetchScheduledScans()
    } catch (error) {
      console.error("Error updating schedule status:", error)
      toast({
        title: "Error",
        description: "Failed to update schedule status",
        variant: "destructive",
      })
    } finally {
      setActionInProgress(null)
    }
  }

  const handleDelete = async (scheduleId: string) => {
    setActionInProgress(scheduleId)
    try {
      const response = await fetch(`/api/scheduled/${scheduleId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete schedule")

      toast({
        title: "Success",
        description: "Schedule deleted successfully",
      })

      await fetchScheduledScans()
    } catch (error) {
      console.error("Error deleting schedule:", error)
      toast({
        title: "Error",
        description: "Failed to delete schedule",
        variant: "destructive",
      })
    } finally {
      setActionInProgress(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

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
          {scheduledScans.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <p className="text-center text-muted-foreground mb-4">
                  No scheduled scans found. Create your first schedule to automate security checks.
                </p>
                <Button onClick={() => router.push("?tab=new")}>Create Schedule</Button>
              </CardContent>
            </Card>
          ) : (
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
                        {schedule.lastRun && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <GitBranch className="h-4 w-4" />
                            <span>Last run: {new Date(schedule.lastRun).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => handleStatusChange(schedule.id, schedule.status === "active" ? "pause" : "resume")}
                          disabled={actionInProgress === schedule.id}
                        >
                          {actionInProgress === schedule.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : schedule.status === "active" ? (
                            <Pause className="mr-2 h-4 w-4" />
                          ) : (
                            <Play className="mr-2 h-4 w-4" />
                          )}
                          {schedule.status === "active" ? "Pause" : "Resume"}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="w-full">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this scheduled scan? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(schedule.id)}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="new">
          <ScheduleScanForm onSuccess={fetchScheduledScans} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

