"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

const scheduleFormSchema = z.object({
  repositoryId: z.string().min(1, "Repository is required"),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  day: z.string().optional(),
  time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  analysisTypes: z.array(z.string()).min(1, "Select at least one analysis type"),
})

type ScheduleFormValues = z.infer<typeof scheduleFormSchema>

interface Repository {
  id: string
  name: string
  fullName: string
}

export interface ScheduleScanFormProps {
  onSuccess?: () => Promise<void> | void
}

export function ScheduleScanForm({ onSuccess }: ScheduleScanFormProps) {
  const { toast } = useToast()
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      frequency: "daily",
      time: "09:00",
      analysisTypes: ["security"],
    },
  })

  useEffect(() => {
    fetchRepositories()
  }, [])

  const fetchRepositories = async () => {
    try {
      const response = await fetch("/api/github/repositories")
      if (!response.ok) throw new Error("Failed to fetch repositories")
      const data = await response.json()
      setRepositories(data.repositories)
    } catch (error) {
      console.error("Error fetching repositories:", error)
      toast({
        title: "Error",
        description: "Failed to load repositories",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (values: ScheduleFormValues) => {
    try {
      const response = await fetch("/api/scheduled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create schedule")
      }

      toast({
        title: "Success",
        description: "Schedule created successfully",
      })

      form.reset()
      onSuccess?.()
    } catch (error) {
      console.error("Error creating schedule:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create schedule",
        variant: "destructive",
      })
    }
  }

  const analysisTypes = [
    { id: "security", label: "Security" },
    { id: "quality", label: "Code Quality" },
    { id: "performance", label: "Performance" },
    { id: "best-practices", label: "Best Practices" },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Schedule</CardTitle>
        <CardDescription>Set up automated code scans for your repository</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="repositoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Repository</FormLabel>
                  <Select
                    disabled={isLoading}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a repository" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {repositories.map((repo) => (
                        <SelectItem key={repo.id} value={repo.id}>
                          {repo.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch("frequency") !== "daily" && (
              <FormField
                control={form.control}
                name="day"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={
                            form.watch("frequency") === "weekly"
                              ? "Select day of week"
                              : "Select day of month"
                          } />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {form.watch("frequency") === "weekly"
                          ? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                              <SelectItem key={day} value={day.toLowerCase()}>
                                {day}
                              </SelectItem>
                            ))
                          : Array.from({ length: 28 }, (_, i) => (
                              <SelectItem key={i + 1} value={String(i + 1)}>
                                {i + 1}
                              </SelectItem>
                            ))
                        }
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormDescription>
                    All times are in your local timezone
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="analysisTypes"
              render={() => (
                <FormItem>
                  <FormLabel>Analysis Types</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {analysisTypes.map((type) => (
                      <Button
                        key={type.id}
                        type="button"
                        variant={form.watch("analysisTypes")?.includes(type.id) ? "default" : "outline"}
                        className="rounded-full"
                        onClick={() => {
                          const current = form.watch("analysisTypes") || []
                          const updated = current.includes(type.id)
                            ? current.filter((t) => t !== type.id)
                            : [...current, type.id]
                          form.setValue("analysisTypes", updated)
                        }}
                      >
                        {type.label}
                      </Button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={!form.formState.isValid || form.formState.isSubmitting}
              className="w-full"
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Schedule...
                </>
              ) : (
                "Create Schedule"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

