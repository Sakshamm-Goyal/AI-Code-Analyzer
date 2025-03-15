import type { Metadata } from "next"
import { ReactNode } from "react"
import GitHubAuthState from "@/components/github-auth-state"

export const metadata: Metadata = {
  title: "Repositories - CodeScan AI",
  description: "Manage your connected GitHub repositories",
}

export default function RepositoriesLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-6">
      <GitHubAuthState />
      {children}
    </div>
  )
} 