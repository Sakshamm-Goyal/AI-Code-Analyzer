import Link from "next/link"
import { auth } from "@clerk/nextjs"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowRight, Code, Shield, GitBranch, BarChart } from "lucide-react"

export default function Home() {
  const { userId } = auth()

  if (userId) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <Shield className="h-6 w-6 text-primary" />
            <span>CodeScan AI</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/sign-in">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/sign-up">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 xl:grid-cols-2">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                    AI-Powered Code Analysis
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Enhance your code quality and security with our advanced AI-powered static code analysis tool.
                    Integrate with GitHub, schedule scans, and get actionable insights.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Link href="/sign-up">
                    <Button size="lg" className="gap-1.5">
                      Get Started <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-2">
                  <div className="flex flex-col items-center gap-2 rounded-lg bg-muted p-4 md:p-6">
                    <Code className="h-10 w-10 text-primary" />
                    <h3 className="text-xl font-bold">Code Analysis</h3>
                    <p className="text-center text-sm text-muted-foreground">
                      Advanced static code analysis powered by Google's Gemini API
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-2 rounded-lg bg-muted p-4 md:p-6">
                    <GitBranch className="h-10 w-10 text-primary" />
                    <h3 className="text-xl font-bold">GitHub Integration</h3>
                    <p className="text-center text-sm text-muted-foreground">
                      Seamlessly connect with your GitHub repositories
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-2 rounded-lg bg-muted p-4 md:p-6">
                    <Shield className="h-10 w-10 text-primary" />
                    <h3 className="text-xl font-bold">Security Insights</h3>
                    <p className="text-center text-sm text-muted-foreground">
                      Identify vulnerabilities and security risks in your code
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-2 rounded-lg bg-muted p-4 md:p-6">
                    <BarChart className="h-10 w-10 text-primary" />
                    <h3 className="text-xl font-bold">Trend Analysis</h3>
                    <p className="text-center text-sm text-muted-foreground">
                      Track improvements in code quality over time
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} CodeScan AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

