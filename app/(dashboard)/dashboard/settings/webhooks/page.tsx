"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { GitHubLogoIcon, ExclamationTriangleIcon, CheckCircledIcon, PlusIcon, ReloadIcon } from "@radix-ui/react-icons"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default function WebhooksPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [webhooks, setWebhooks] = useState<any[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [newWebhookUrl, setNewWebhookUrl] = useState("")
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["push", "pull_request"])
  const { toast } = useToast()

  useEffect(() => {
    fetchWebhooks()
  }, [])

  const fetchWebhooks = async () => {
    setIsLoading(true)
    try {
      // In a real app, you'd fetch this from your backend
      // For now, let's use mock data
      setTimeout(() => {
        setWebhooks([
          {
            id: "wh-1",
            url: "https://example.com/webhook",
            events: ["push", "pull_request"],
            active: true,
            createdAt: new Date().toISOString(),
            lastDeliveredAt: new Date().toISOString(),
            deliveryCount: 27,
            successRate: 98,
          },
          {
            id: "wh-2",
            url: "https://api.yourapp.com/hooks/github",
            events: ["push"],
            active: false,
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            lastDeliveredAt: null,
            deliveryCount: 0,
            successRate: null,
          },
        ])
        setIsLoading(false)
      }, 1000)
    } catch (error) {
      console.error("Error fetching webhooks:", error)
      toast({
        title: "Error",
        description: "Failed to fetch webhooks",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  const handleCreateWebhook = async () => {
    if (!newWebhookUrl) {
      toast({
        title: "Error",
        description: "Webhook URL is required",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)
    try {
      // In a real app, you'd create the webhook via your API
      setTimeout(() => {
        const newWebhook = {
          id: `wh-${Date.now()}`,
          url: newWebhookUrl,
          events: selectedEvents,
          active: true,
          createdAt: new Date().toISOString(),
          lastDeliveredAt: null,
          deliveryCount: 0,
          successRate: null,
        }
        setWebhooks([...webhooks, newWebhook])
        setNewWebhookUrl("")
        setSelectedEvents(["push", "pull_request"])
        setIsCreating(false)
        toast({
          title: "Success",
          description: "Webhook created successfully",
        })
      }, 1000)
    } catch (error) {
      console.error("Error creating webhook:", error)
      toast({
        title: "Error",
        description: "Failed to create webhook",
        variant: "destructive",
      })
      setIsCreating(false)
    }
  }

  const toggleWebhookStatus = async (id: string, currentStatus: boolean) => {
    try {
      // In a real app, you'd update the webhook via your API
      setWebhooks(webhooks.map(webhook => 
        webhook.id === id ? { ...webhook, active: !currentStatus } : webhook
      ))
      toast({
        title: "Success",
        description: `Webhook ${currentStatus ? 'disabled' : 'enabled'} successfully`,
      })
    } catch (error) {
      console.error("Error toggling webhook status:", error)
      toast({
        title: "Error",
        description: "Failed to update webhook status",
        variant: "destructive",
      })
    }
  }

  const deleteWebhook = async (id: string) => {
    try {
      // In a real app, you'd delete the webhook via your API
      setWebhooks(webhooks.filter(webhook => webhook.id !== id))
      toast({
        title: "Success",
        description: "Webhook deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting webhook:", error)
      toast({
        title: "Error",
        description: "Failed to delete webhook",
        variant: "destructive",
      })
    }
  }

  const handleEventToggle = (event: string) => {
    setSelectedEvents(prev => {
      if (prev.includes(event)) {
        return prev.filter(e => e !== event)
      } else {
        return [...prev, event]
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Webhooks</h1>
        <p className="text-muted-foreground">Manage webhooks for your repositories</p>
      </div>

      <Tabs defaultValue="webhooks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="create">Create Webhook</TabsTrigger>
        </TabsList>
        
        <TabsContent value="webhooks" className="space-y-4">
          {webhooks.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No Webhooks</CardTitle>
                <CardDescription>
                  You don't have any webhooks set up yet. Create one to automate your workflow.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button variant="outline" onClick={() => document.querySelector('[data-value="create"]')?.click()}>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Create Webhook
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>URL</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Delivery Stats</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhooks.map((webhook) => (
                    <TableRow key={webhook.id}>
                      <TableCell className="font-medium">{webhook.url}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {webhook.events.map((event: string) => (
                            <Badge key={event} variant="outline">{event}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <div className={`mr-2 h-2 w-2 rounded-full ${webhook.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span>{webhook.active ? 'Active' : 'Inactive'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {webhook.deliveryCount > 0 ? (
                          <div className="text-sm">
                            <div>{webhook.deliveryCount} deliveries</div>
                            <div className="text-muted-foreground">{webhook.successRate}% success rate</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No deliveries yet</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleWebhookStatus(webhook.id, webhook.active)}
                          >
                            {webhook.active ? 'Disable' : 'Enable'}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteWebhook(webhook.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Create Webhook</CardTitle>
              <CardDescription>
                Create a new webhook to receive events from GitHub repositories
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhook-url">Payload URL</Label>
                <Input
                  id="webhook-url"
                  placeholder="https://example.com/webhook"
                  value={newWebhookUrl}
                  onChange={(e) => setNewWebhookUrl(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  This URL will receive webhook payloads when events occur
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Events</Label>
                <div className="grid gap-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="event-push"
                      checked={selectedEvents.includes("push")}
                      onCheckedChange={() => handleEventToggle("push")}
                    />
                    <Label htmlFor="event-push">Push</Label>
                    <span className="text-sm text-muted-foreground ml-2">
                      Any Git push to a repository
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="event-pull-request"
                      checked={selectedEvents.includes("pull_request")}
                      onCheckedChange={() => handleEventToggle("pull_request")}
                    />
                    <Label htmlFor="event-pull-request">Pull Request</Label>
                    <span className="text-sm text-muted-foreground ml-2">
                      Pull request opened, closed, or synchronized
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => document.querySelector('[data-value="webhooks"]')?.click()}>
                Cancel
              </Button>
              <Button 
                disabled={isCreating || !newWebhookUrl || selectedEvents.length === 0} 
                onClick={handleCreateWebhook}
              >
                {isCreating ? (
                  <>
                    <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Webhook'
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 