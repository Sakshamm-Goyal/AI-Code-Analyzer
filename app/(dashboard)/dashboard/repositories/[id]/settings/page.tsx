"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, GitBranch, Bell } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function RepositorySettingsPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [repository, setRepository] = useState<any>(null)
  const [settings, setSettings] = useState({
    webhookEnabled: false,
    webhookUrl: "",
    defaultBranch: "main",
    autoScan: false,
    notifications: {
      email: true,
      slack: false,
    },
  })

  useEffect(() => {
    fetchRepositoryAndSettings()
  }, [params.id])

  const fetchRepositoryAndSettings = async () => {
    setIsLoading(true)
    try {
      // Fetch repository details and settings
      const [repoResponse, settingsResponse] = await Promise.all([
        fetch(`/api/github/repositories/${params.id}`),
        fetch(`/api/github/repositories/${params.id}/settings`),
      ])

      if (!repoResponse.ok) throw new Error("Failed to fetch repository")
      const repoData = await repoResponse.json()
      setRepository(repoData.repository)

      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json()
        setSettings(settingsData.settings)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to load repository settings",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/github/repositories/${params.id}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      })

      if (!response.ok) throw new Error("Failed to save settings")

      toast({
        title: "Success",
        description: "Repository settings updated successfully",
      })
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({
        title: "Error",
        description: "Failed to save repository settings",
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
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/repositories/${params.id}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to Repository
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Repository Settings</h1>
        <p className="text-muted-foreground">
          Configure settings for {repository?.name}
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Configure general repository settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Default Branch</Label>
                <Input
                  value={settings.defaultBranch}
                  onChange={(e) => setSettings({ ...settings, defaultBranch: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-scan on Push</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically scan repository when new code is pushed
                  </p>
                </div>
                <Switch
                  checked={settings.autoScan}
                  onCheckedChange={(checked) => setSettings({ ...settings, autoScan: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Add more TabsContent components for webhooks and notifications */}
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleSaveSettings} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </Button>
      </div>
    </div>
  )
} 