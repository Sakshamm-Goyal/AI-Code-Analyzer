"use client"

import { useState, useEffect } from "react"
import { CheckIcon, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { parseGitHubUrl } from "@/lib/github"

interface BranchSelectorProps {
  repositoryUrl: string
  defaultBranch: string
  onSelectBranch: (branch: string) => void
}

export function BranchSelector({ repositoryUrl, defaultBranch, onSelectBranch }: BranchSelectorProps) {
  const [open, setOpen] = useState(false)
  const [branches, setBranches] = useState<string[]>([])
  const [selectedBranch, setSelectedBranch] = useState(defaultBranch)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchBranches()
  }, [repositoryUrl])

  const fetchBranches = async () => {
    if (!repositoryUrl) return
    
    setIsLoading(true)
    
    try {
      const parsed = parseGitHubUrl(repositoryUrl)
      if (!parsed) throw new Error("Invalid repository URL")
      
      const { owner, repo } = parsed
      
      const response = await fetch(`/api/github/repositories/branches?owner=${owner}&repo=${repo}`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch branches")
      }
      
      const data = await response.json()
      setBranches(data.branches.map((branch: any) => branch.name))
    } catch (error) {
      console.error("Error fetching branches:", error)
      // Fall back to just the default branch
      setBranches([defaultBranch])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectBranch = (branch: string) => {
    setSelectedBranch(branch)
    setOpen(false)
    onSelectBranch(branch)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-40 justify-between"
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : selectedBranch}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-0">
        <Command>
          <CommandInput placeholder="Search branch..." />
          <CommandEmpty>No branch found.</CommandEmpty>
          <CommandGroup>
            {branches.map((branch) => (
              <CommandItem
                key={branch}
                value={branch}
                onSelect={() => handleSelectBranch(branch)}
              >
                <CheckIcon
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedBranch === branch ? "opacity-100" : "opacity-0"
                  )}
                />
                {branch}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 