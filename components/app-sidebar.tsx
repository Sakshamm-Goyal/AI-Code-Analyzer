"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserButton } from "@clerk/nextjs"
import { BarChart, Code, GitBranch, Home, Settings, Shield, Calendar } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import { cn } from "@/lib/utils"

export function AppSidebar() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  const menuItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: Home,
    },
    {
      title: "Code Analysis",
      href: "/dashboard/analysis",
      icon: Code,
    },
    {
      title: "Repositories",
      href: "/dashboard/repositories",
      icon: GitBranch,
    },
    {
      title: "Security",
      href: "/dashboard/security",
      icon: Shield,
    },
    {
      title: "Scheduled Scans",
      href: "/dashboard/scheduled",
      icon: Calendar,
    },
    {
      title: "Reports",
      href: "/dashboard/reports",
      icon: BarChart,
    },
    {
      title: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
    },
  ]

  return (
    <nav className="flex h-screen w-64 flex-col border-r bg-background">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold">
          <Shield className="h-6 w-6 text-primary" />
          <span>CodeScan AI</span>
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-4">
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent",
                  isActive(item.href) ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="border-t p-4">
        <div className="flex items-center justify-between">
          <UserButton afterSignOutUrl="/" />
          <ModeToggle />
        </div>
      </div>
    </nav>
  )
}

