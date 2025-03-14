import { Octokit } from "@octokit/rest"

export const GITHUB_OAUTH_CONFIG = {
  clientId: process.env.GITHUB_CLIENT_ID || '',
  clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  redirectUri: process.env.NEXT_PUBLIC_URL 
    ? `${process.env.NEXT_PUBLIC_URL}/api/auth/github/callback` 
    : 'http://localhost:3000/api/auth/github/callback',
  scope: 'repo,read:user,user:email',
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

export async function exchangeCodeForToken(code: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: GITHUB_OAUTH_CONFIG.clientId,
    client_secret: GITHUB_OAUTH_CONFIG.clientSecret,
    code,
    redirect_uri: GITHUB_OAUTH_CONFIG.redirectUri,
  });

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`GitHub OAuth error: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
  }

  return data.access_token;
} 