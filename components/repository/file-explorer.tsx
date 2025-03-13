"use client"

import { useState, useEffect } from "react"
import { Folder, File, ChevronRight, ChevronDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { parseGitHubUrl } from "@/lib/github"

interface FileExplorerProps {
  repositoryUrl: string
  defaultBranch: string
  onSelectFile: (file: any) => void
}

export function FileExplorer({ repositoryUrl, defaultBranch, onSelectFile }: FileExplorerProps) {
  const [files, setFiles] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [selectedPath, setSelectedPath] = useState<string | null>(null)

  useEffect(() => {
    if (repositoryUrl) {
      fetchFiles()
    }
  }, [repositoryUrl, defaultBranch])

  const fetchFiles = async (path = "") => {
    setIsLoading(true)
    setError(null)

    try {
      const parsed = parseGitHubUrl(repositoryUrl)
      if (!parsed) throw new Error("Invalid repository URL")

      const { owner, repo } = parsed

      const response = await fetch(
        `/api/github/content?owner=${owner}&repo=${repo}&path=${path}&branch=${defaultBranch}`
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch repository files")
      }

      const data = await response.json()
      setFiles(path === "" ? data.contents : data.contents)
    } catch (error) {
      console.error("Error fetching files:", error)
      setError(error instanceof Error ? error.message : "Failed to fetch files")
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleFolder = (path: string) => {
    const newExpandedFolders = new Set(expandedFolders)
    if (expandedFolders.has(path)) {
      newExpandedFolders.delete(path)
    } else {
      newExpandedFolders.add(path)
      // Fetch content of this folder if expanding
      fetchFolderContent(path)
    }
    setExpandedFolders(newExpandedFolders)
  }

  const fetchFolderContent = async (path: string) => {
    // Only fetch if we don't already have children for this path
    const folder = findItemByPath(path)
    if (folder && (!folder.children || folder.children.length === 0)) {
      try {
        const parsed = parseGitHubUrl(repositoryUrl)
        if (!parsed) throw new Error("Invalid repository URL")

        const { owner, repo } = parsed

        const response = await fetch(
          `/api/github/content?owner=${owner}&repo=${repo}&path=${path}&branch=${defaultBranch}`
        )

        if (!response.ok) {
          throw new Error("Failed to fetch folder content")
        }

        const data = await response.json()
        updateFileTree(path, data.contents)
      } catch (error) {
        console.error(`Error fetching content for ${path}:`, error)
      }
    }
  }

  const findItemByPath = (path: string, items = files): any => {
    for (const item of items) {
      if (item.path === path) {
        return item
      }
      if (item.type === "dir" && item.children) {
        const found = findItemByPath(path, item.children)
        if (found) return found
      }
    }
    return null
  }

  const updateFileTree = (path: string, newContents: any[]) => {
    const updateTree = (items: any[]): any[] => {
      return items.map(item => {
        if (item.path === path) {
          return { ...item, children: newContents }
        }
        if (item.type === "dir" && item.children) {
          return { ...item, children: updateTree(item.children) }
        }
        return item
      })
    }

    setFiles(updateTree(files))
  }

  const handleSelectFile = (file: any) => {
    setSelectedPath(file.path)
    onSelectFile(file)
  }

  const renderFileTree = (items: any[], level = 0) => {
    return items.map(item => {
      const isFolder = item.type === "dir"
      const isExpanded = expandedFolders.has(item.path)
      const isSelected = selectedPath === item.path

      return (
        <div key={item.path} style={{ marginLeft: `${level * 16}px` }}>
          <div 
            className={`flex items-center gap-2 py-1 px-2 rounded-sm ${isSelected ? 'bg-accent' : 'hover:bg-accent/50'}`}
            onClick={() => isFolder ? handleToggleFolder(item.path) : handleSelectFile(item)}
          >
            {isFolder ? (
              <>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0" />
                )}
                <Folder className="h-4 w-4 shrink-0 text-blue-400" />
              </>
            ) : (
              <>
                <div className="w-4" />
                <File className="h-4 w-4 shrink-0 text-gray-400" />
              </>
            )}
            <span className="truncate text-sm">{item.name}</span>
          </div>
          {isFolder && isExpanded && item.children && (
            <div className="mt-1">
              {renderFileTree(item.children, level + 1)}
            </div>
          )}
        </div>
      )
    })
  }

  if (isLoading && files.length === 0) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center p-4 text-sm text-muted-foreground">
        <p className="mb-2">Error loading files: {error}</p>
        <Button variant="outline" size="sm" onClick={() => fetchFiles()}>
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <ScrollArea className="h-[400px] rounded-md border">
      <div className="p-2">
        {files.length === 0 ? (
          <p className="text-center p-4 text-sm text-muted-foreground">
            No files found in this repository
          </p>
        ) : (
          renderFileTree(files)
        )}
      </div>
    </ScrollArea>
  )
} 