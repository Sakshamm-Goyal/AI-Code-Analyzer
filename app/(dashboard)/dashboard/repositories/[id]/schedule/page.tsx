"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Calendar, Clock, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

export default function SchedulePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [repository, setRepository] = useState<any>(null)
  const [schedule, setSchedule] = useState({
    frequency: "daily",
    time: "00:00",
    day: "1",
  })

  useEffect(() => {
    fetchRepositoryAndSchedule()
  }, [params.id])

  const fetchRepositoryAndSchedule = async () => {
    setIsLoading(true)
    try {
      // Fetch repository details
      const response = await fetch(`/api/github/repositories/${params.id}`)
      if (!response.ok) throw new Error("Failed to fetch repository")
      const data = await response.json()
      setRepository(data.repository)

      // Fetch existing schedule
      const scheduleResponse = await fetch(`/api/github/repositories/${params.id}/schedule`)
      if (scheduleResponse.ok) {
        const scheduleData = await scheduleResponse.json()
        setSchedule(scheduleData.schedule)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to load repository details",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveSchedule = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/github/repositories/${params.id}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule }),
      })

      if (!response.ok) throw new Error("Failed to save schedule")

      toast({
        title: "Success",
        description: "Scan schedule updated successfully",
      })

      router.push(`/dashboard/repositories/${params.id}`)
    } catch (error) {
      console.error("Error saving schedule:", error)
      toast({
        title: "Error",
        description: "Failed to save scan schedule",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
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
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          asChild
        >
          <Link href={`/dashboard/repositories/${params.id}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to Repository
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Schedule Scans</h1>
        <p className="text-muted-foreground">
          Configure automated security scans for {repository?.name}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scan Schedule</CardTitle>
          <CardDescription>
            Choose how often you want to scan this repository for security issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label>Frequency</Label>
            <RadioGroup
              value={schedule.frequency}
              onValueChange={(value) => setSchedule({ ...schedule, frequency: value })}
              className="grid grid-cols-3 gap-4"
            >
              <Label
                htmlFor="daily"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary"
              >
                <RadioGroupItem value="daily" id="daily" className="sr-only" />
                <Calendar className="mb-2 h-6 w-6" />
                <span className="text-sm font-medium">Daily</span>
              </Label>
              <Label
                htmlFor="weekly"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary"
              >
                <RadioGroupItem value="weekly" id="weekly" className="sr-only" />
                <Calendar className="mb-2 h-6 w-6" />
                <span className="text-sm font-medium">Weekly</span>
              </Label>
              <Label
                htmlFor="monthly"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary"
              >
                <RadioGroupItem value="monthly" id="monthly" className="sr-only" />
                <Calendar className="mb-2 h-6 w-6" />
                <span className="text-sm font-medium">Monthly</span>
              </Label>
            </RadioGroup>
          </div>

          <div className="space-y-4">
            <Label>Time of Day</Label>
            <Select
              value={schedule.time}
              onValueChange={(value) => setSchedule({ ...schedule, time: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }).map((_, i) => (
                  <SelectItem key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                    {`${i.toString().padStart(2, '0')}:00`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {schedule.frequency === "monthly" && (
            <div className="space-y-4">
              <Label>Day of Month</Label>
              <Select
                value={schedule.day}
                onValueChange={(value) => setSchedule({ ...schedule, day: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }).map((_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {(i + 1).toString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/repositories/${params.id}`)}
          >
            Cancel
          </Button>
          <Button onClick={handleSaveSchedule} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Schedule'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}