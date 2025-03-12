"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts"

// Mock data for code quality metrics over time
const qualityData = [
  {
    date: "2023-05-01",
    complexity: 78,
    duplication: 12,
    maintainability: 85,
    coverage: 72,
  },
  {
    date: "2023-05-15",
    complexity: 75,
    duplication: 10,
    maintainability: 87,
    coverage: 75,
  },
  {
    date: "2023-06-01",
    complexity: 72,
    duplication: 8,
    maintainability: 90,
    coverage: 78,
  },
  {
    date: "2023-06-15",
    complexity: 68,
    duplication: 7,
    maintainability: 92,
    coverage: 80,
  },
  {
    date: "2023-07-01",
    complexity: 65,
    duplication: 6,
    maintainability: 94,
    coverage: 83,
  },
]

// Mock data for issue distribution
const issueDistributionData = [
  { name: "Code Smells", value: 42 },
  { name: "Bugs", value: 15 },
  { name: "Vulnerabilities", value: 8 },
  { name: "Security Hotspots", value: 12 },
  { name: "Duplications", value: 23 },
]

// Mock data for language distribution
const languageDistributionData = [
  { name: "JavaScript", value: 45 },
  { name: "TypeScript", value: 30 },
  { name: "HTML", value: 10 },
  { name: "CSS", value: 8 },
  { name: "Python", value: 7 },
]

export function CodeQualityChart() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Code Quality Trends</CardTitle>
          <CardDescription>Track code quality metrics over time</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="line">
            <TabsList className="mb-4">
              <TabsTrigger value="line">Line</TabsTrigger>
              <TabsTrigger value="area">Area</TabsTrigger>
              <TabsTrigger value="bar">Bar</TabsTrigger>
            </TabsList>
            <TabsContent value="line">
              <ChartContainer className="h-80">
                <LineChart data={qualityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                  <YAxis />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <ChartTooltip>
                            <ChartTooltipContent>
                              <div className="text-sm font-medium">
                                {new Date(payload[0].payload.date).toLocaleDateString()}
                              </div>
                              {payload.map((entry) => (
                                <div key={entry.dataKey} className="flex items-center justify-between gap-2">
                                  <span className="capitalize">{entry.dataKey}:</span>
                                  <span className="font-medium">{entry.value}</span>
                                </div>
                              ))}
                            </ChartTooltipContent>
                          </ChartTooltip>
                        )
                      }
                      return null
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="complexity" stroke="#ef4444" activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="duplication" stroke="#f97316" />
                  <Line type="monotone" dataKey="maintainability" stroke="#22c55e" />
                  <Line type="monotone" dataKey="coverage" stroke="#3b82f6" />
                </LineChart>
              </ChartContainer>
            </TabsContent>
            <TabsContent value="area">
              <ChartContainer className="h-80">
                <AreaChart data={qualityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                  <YAxis />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <ChartTooltip>
                            <ChartTooltipContent>
                              <div className="text-sm font-medium">
                                {new Date(payload[0].payload.date).toLocaleDateString()}
                              </div>
                              {payload.map((entry) => (
                                <div key={entry.dataKey} className="flex items-center justify-between gap-2">
                                  <span className="capitalize">{entry.dataKey}:</span>
                                  <span className="font-medium">{entry.value}</span>
                                </div>
                              ))}
                            </ChartTooltipContent>
                          </ChartTooltip>
                        )
                      }
                      return null
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="complexity"
                    stackId="1"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="duplication"
                    stackId="1"
                    stroke="#f97316"
                    fill="#f97316"
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="maintainability"
                    stackId="1"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="coverage"
                    stackId="1"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ChartContainer>
            </TabsContent>
            <TabsContent value="bar">
              <ChartContainer className="h-80">
                <BarChart data={qualityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                  <YAxis />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <ChartTooltip>
                            <ChartTooltipContent>
                              <div className="text-sm font-medium">
                                {new Date(payload[0].payload.date).toLocaleDateString()}
                              </div>
                              {payload.map((entry) => (
                                <div key={entry.dataKey} className="flex items-center justify-between gap-2">
                                  <span className="capitalize">{entry.dataKey}:</span>
                                  <span className="font-medium">{entry.value}</span>
                                </div>
                              ))}
                            </ChartTooltipContent>
                          </ChartTooltip>
                        )
                      }
                      return null
                    }}
                  />
                  <Legend />
                  <Bar dataKey="complexity" fill="#ef4444" />
                  <Bar dataKey="duplication" fill="#f97316" />
                  <Bar dataKey="maintainability" fill="#22c55e" />
                  <Bar dataKey="coverage" fill="#3b82f6" />
                </BarChart>
              </ChartContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Issue Distribution</CardTitle>
          <CardDescription>Breakdown of code issues by type</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer className="h-80">
            <BarChart data={issueDistributionData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <ChartTooltip>
                        <ChartTooltipContent>
                          <div className="flex items-center justify-between gap-2">
                            <span>{payload[0].payload.name}:</span>
                            <span className="font-medium">{payload[0].value}</span>
                          </div>
                        </ChartTooltipContent>
                      </ChartTooltip>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Language Distribution</CardTitle>
          <CardDescription>Breakdown of code by programming language</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer className="h-80">
            <BarChart data={languageDistributionData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <ChartTooltip>
                        <ChartTooltipContent>
                          <div className="flex items-center justify-between gap-2">
                            <span>{payload[0].payload.name}:</span>
                            <span className="font-medium">{payload[0].value}%</span>
                          </div>
                        </ChartTooltipContent>
                      </ChartTooltip>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="value" fill="#22c55e" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}

