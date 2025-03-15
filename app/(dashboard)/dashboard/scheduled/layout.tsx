import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Scheduled Scans - CodeScan AI",
  description: "Manage your scheduled code scans",
}

export default function ScheduledLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 