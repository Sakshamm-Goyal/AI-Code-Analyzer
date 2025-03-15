// This file would contain functions to interact with the GitHub API

import { Octokit } from "@octokit/rest"
import { currentUser } from "@clerk/nextjs"

// Helper function to get GitHub token from Clerk user
export async function getGitHubToken() {
  // IMPORTANT: Must await currentUser() in App Router
  const user = await currentUser()
  if (!user) throw new Error("Unauthorized")

  const githubToken = user.publicMetadata.githubAccessToken as string
  if (!githubToken) {
    throw new Error("GitHub account not connected")
  }

  return githubToken
}

// Create GitHub client with user's token
export async function createGitHubClient() {
  const token = await getGitHubToken()
  return new Octokit({ auth: token })
}

// Parse GitHub repository URL
export function parseGitHubUrl(url: string) {
  try {
    // Handle various URL formats
    // 1. https://github.com/owner/repo
    // 2. https://github.com/owner/repo.git
    // 3. git@github.com:owner/repo.git
    
    let owner = '';
    let repo = '';
    
    if (url.includes('github.com')) {
      // Handle HTTPS URLs
      const parsed = new URL(url);
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      
      if (pathParts.length >= 2) {
        owner = pathParts[0];
        repo = pathParts[1].replace('.git', '');
      }
    } else if (url.includes('git@github.com')) {
      // Handle SSH URLs
      const match = url.match(/git@github\.com:([^\/]+)\/(.+)\.git/);
      if (match) {
        owner = match[1];
        repo = match[2];
      }
    }
    
    if (owner && repo) {
      console.log(`Parsed GitHub URL: owner=${owner}, repo=${repo}`);
      return { owner, repo };
    }
    
    return null;
  } catch (error) {
    console.error("Failed to parse GitHub URL:", error);
    return null;
  }
}

// Helper function to connect a repository
export async function connectRepository(url: string) {
  const response = await fetch("/api/github/repositories", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to connect repository");
  }

  const { repository } = await response.json();
  return repository;
}

// Get file content from GitHub
export async function getFileContent(owner: string, repo: string, path: string, ref?: string) {
  try {
    const client = await createGitHubClient()
    
    const response = await client.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: ref || undefined,
      mediaType: {
        format: "raw"
      }
    })
    
    return response.data
  } catch (error) {
    console.error("Error fetching file content:", error)
    throw error
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