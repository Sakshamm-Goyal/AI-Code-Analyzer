// This file would contain functions to interact with the GitHub API

export async function getRepositories(accessToken: string) {
  try {
    const response = await fetch("https://api.github.com/user/repos", {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching GitHub repositories:", error)
    throw error
  }
}

export async function getRepository(accessToken: string, owner: string, repo: string) {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching GitHub repository:", error)
    throw error
  }
}

export async function getRepositoryContent(
  accessToken: string,
  owner: string,
  repo: string,
  path = "",
  branch = "main",
) {
  try {
    const url = path
      ? `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`
      : `https://api.github.com/repos/${owner}/${repo}/contents?ref=${branch}`

    const response = await fetch(url, {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching GitHub repository content:", error)
    throw error
  }
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
      throw new Error(`GitHub API error: ${response.statusText}`)
    }

    const data = await response.json()
    return Buffer.from(data.content, "base64").toString("utf-8")
  } catch (error) {
    console.error("Error fetching GitHub file content:", error)
    throw error
  }
}

export async function createWebhook(accessToken: string, owner: string, repo: string, webhookUrl: string) {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/hooks`, {
      method: "POST",
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "web",
        active: true,
        events: ["push", "pull_request"],
        config: {
          url: webhookUrl,
          content_type: "json",
          insecure_ssl: "0",
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error creating GitHub webhook:", error)
    throw error
  }
}

