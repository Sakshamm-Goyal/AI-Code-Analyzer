// This file would contain functions to interact with the GitHub API

import { Octokit } from "@octokit/rest"
import { currentUser } from "@clerk/nextjs"

// Helper function to get GitHub token from Clerk user
export async function getGitHubToken() {
  const user = await currentUser()
  if (!user) throw new Error("Unauthorized")

  const githubToken = user.publicMetadata.githubAccessToken as string
  if (!githubToken) {
    throw new Error("GitHub account not connected")
  }

  return githubToken
}

export async function createGitHubClient() {
  try {
    const token = await getGitHubToken()
    return new Octokit({
      auth: token,
      baseUrl: 'https://api.github.com',
      headers: {
        accept: 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })
  } catch (error) {
    console.error("Error creating GitHub client:", error)
    throw new Error("Failed to authenticate with GitHub")
  }
}

export async function getRepositories() {
  try {
    const accessToken = await getGitHubToken();
    
    const response = await fetch("https://api.github.com/user/repos", {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching GitHub repositories:", error);
    throw error;
  }
}

export async function getRepository(owner: string, repo: string) {
  try {
    const accessToken = await getGitHubToken();
    
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching GitHub repository:", error);
    throw error;
  }
}

export async function getRepositoryContent(
  owner: string,
  repo: string,
  path = "",
  branch = "main",
) {
  try {
    const accessToken = await getGitHubToken();
    
    const url = path
      ? `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`
      : `https://api.github.com/repos/${owner}/${repo}/contents?ref=${branch}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching GitHub repository content:", error);
    throw error;
  }
}

// Function to parse GitHub URL into owner and repo
export function parseGitHubUrl(url: string) {
  try {
    if (!url) return null

    // Handle SSH URLs
    if (url.startsWith('git@')) {
      const match = url.match(/git@github\.com:(.+?)\/(.+?)(?:\.git)?$/)
      if (match) {
        return { owner: match[1], repo: match[2] }
      }
    }

    // Handle HTTPS URLs
    const urlObj = new URL(url)
    if (urlObj.hostname === 'github.com') {
      const [, owner, repo] = urlObj.pathname.split('/')
      return { owner, repo: repo?.replace('.git', '') }
    }

    return null
  } catch {
    return null
  }
}

// Function to connect a new repository
export async function connectRepository(repoUrl: string) {
  const parsed = parseGitHubUrl(repoUrl)
  if (!parsed) {
    throw new Error("Invalid GitHub repository URL")
  }

  const response = await fetch("/api/github/repositories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: repoUrl }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to connect repository")
  }

  return response.json()
}

export async function getFileContent(accessToken: string, url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch file content: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching file content:", error)
    throw error
  }
}