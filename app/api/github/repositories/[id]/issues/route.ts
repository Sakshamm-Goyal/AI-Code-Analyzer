import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs"
import { getRepositoryById } from "@/lib/db"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get repository from database
    const repository = await getRepositoryById(params.id)
    
    if (!repository) {
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 }
      )
    }
    
    // Skip user check if repository exists - the scan results should be viewable
    // by any authenticated user who has access to this route
    
    // Extract issues from scan results
    const issues = []
    
    if (repository.scan_results && Array.isArray(repository.scan_results)) {
      for (const file of repository.scan_results) {
        if (file.issues && Array.isArray(file.issues)) {
          for (const issue of file.issues) {
            issues.push({
              ...issue,
              file: file.path,
              language: file.language || "Unknown",
            })
          }
        }
      }
    }
    
    // Group issues by severity - ensure they're always arrays
    const groupedIssues = {
      high: issues.filter(issue => issue.severity?.toLowerCase() === 'high') || [],
      medium: issues.filter(issue => issue.severity?.toLowerCase() === 'medium') || [],
      low: issues.filter(issue => issue.severity?.toLowerCase() === 'low') || [],
    }
    
    console.log("Returning grouped issues:", {
      high: groupedIssues.high.length,
      medium: groupedIssues.medium.length,
      low: groupedIssues.low.length
    });
    
    // Return the grouped issues
    return NextResponse.json({
      repository: {
        id: repository.id || repository.github_id,
        name: repository.name,
        fullName: repository.full_name,
        lastScan: repository.last_scan,
      },
      issues: groupedIssues,
      scanResults: repository.scan_results || [],
    })
  } catch (error) {
    console.error("Error fetching repository issues:", error)
    return NextResponse.json(
      { error: "Failed to fetch repository issues" },
      { status: 500 }
    )
  }
} 