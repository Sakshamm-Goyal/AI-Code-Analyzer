import { z } from "zod"

export const scheduledScanSchema = z.object({
  id: z.string(),
  userId: z.string(),
  repositoryId: z.string(),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  day: z.string().optional(),
  time: z.string(),
  analysisTypes: z.array(z.string()),
  status: z.enum(["active", "paused"]),
  lastRun: z.string().nullable(),
  nextRun: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type ScheduledScan = z.infer<typeof scheduledScanSchema> 