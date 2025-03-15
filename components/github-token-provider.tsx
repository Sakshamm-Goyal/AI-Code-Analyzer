"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface GitHubTokenContextType {
  token: string | null;
  isLoading: boolean;
  error: string | null;
  refreshToken: () => Promise<void>;
}

const GitHubTokenContext = createContext<GitHubTokenContextType>({
  token: null,
  isLoading: true,
  error: null,
  refreshToken: async () => {},
});

export function useGitHubToken() {
  return useContext(GitHubTokenContext);
}

export function GitHubTokenProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchToken = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/user/github-token");
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch GitHub token");
      }
      
      const data = await response.json();
      setToken(data.token);
    } catch (err) {
      console.error("Error fetching GitHub token:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchToken();
  }, []);

  return (
    <GitHubTokenContext.Provider 
      value={{ 
        token, 
        isLoading, 
        error,
        refreshToken: fetchToken
      }}
    >
      {children}
    </GitHubTokenContext.Provider>
  );
} 