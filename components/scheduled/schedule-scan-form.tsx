"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"

export function ScheduleScanForm() {
  const [repository, setRepository] = useState("")
  const [frequency, setFrequency] = useState("")
  const [day, setDay] = useState("")
  const [time, setTime] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!repository || !frequency || !time) return
    if (frequency !== "daily" && !day) return

    setIsSubmitting(true)

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false)
      // Reset form
      setRepository("")
      setFrequency("")
      setDay("")
      setTime("")
    }, 2000)
  }

  // Mock repositories
  const repositories = [
    { id: "repo-1", name: "frontend-app" },
    { id: "repo-2", name: "backend-api" },
    { id: "repo-3", name: "mobile-app" },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Scheduled Scan</CardTitle>
        <CardDescription>Set up automated code scans for your repositories</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Repository</label>
            <Select value={repository} onValueChange={setRepository}>
              <SelectTrigger>
                <SelectValue placeholder="Select repository" />
              </SelectTrigger>
              <SelectContent>
                {repositories.map((repo) => (
                  <SelectItem key={repo.id} value={repo.id}>
                    {repo.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Frequency</label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {frequency === "weekly" && (
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Day of Week</label>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger>
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Monday">Monday</SelectItem>
                  <SelectItem value="Tuesday">Tuesday</SelectItem>
                  <SelectItem value="Wednesday">Wednesday</SelectItem>
                  <SelectItem value="Thursday">Thursday</SelectItem>
                  <SelectItem value="Friday">Friday</SelectItem>
                  <SelectItem value="Saturday">Saturday</SelectItem>
                  <SelectItem value="Sunday">Sunday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {frequency === "monthly" && (
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Day of Month</label>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger>
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1st">1st</SelectItem>
                  <SelectItem value="15th">15th</SelectItem>
                  <SelectItem value="last">Last day</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Time (UTC)</label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Analysis Type</label>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="rounded-full">
                Security
              </Button>
              <Button type="button" variant="outline" className="rounded-full">
                Code Quality
              </Button>
              <Button type="button" variant="outline" className="rounded-full">
                Performance
              </Button>
              <Button type="button" variant="outline" className="rounded-full">
                Best Practices
              </Button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={!repository || !frequency || !time || (frequency !== "daily" && !day) || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Schedule...
              </>
            ) : (
              "Create Schedule"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

