import { Octokit } from "@octokit/rest"

export const GITHUB_OAUTH_CONFIG = {
  clientId: process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/github/callback`,
  scope: "repo user",
}

export async function createGitHubClient(accessToken: string) {
  return new Octokit({
    auth: accessToken,
  })
}

export function getGitHubAuthUrl(state: string = "") {
  const params = new URLSearchParams({
    client_id: GITHUB_OAUTH_CONFIG.clientId,
    redirect_uri: GITHUB_OAUTH_CONFIG.redirectUri,
    scope: GITHUB_OAUTH_CONFIG.scope,
    state,
  })

  return `https://github.com/login/oauth/authorize?${params.toString()}`
}

function generateState() {
  return Math.random().toString(36).substring(7)
}

export async function exchangeCodeForToken(code: string) {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: GITHUB_OAUTH_CONFIG.clientId,
      client_secret: GITHUB_OAUTH_CONFIG.clientSecret,
      code,
      redirect_uri: GITHUB_OAUTH_CONFIG.redirectUri,
    }),
  })

  const data = await response.json()
  
  if (data.error) {
    throw new Error(data.error_description || "Failed to exchange code for token")
  }

  return data.access_token
} 