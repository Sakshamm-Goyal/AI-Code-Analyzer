import { Octokit } from "@octokit/rest";

export async function getFileContent(file: any, client: Octokit, owner: string, repo: string): Promise<string> {
  try {
    if (file && file.path) {
      try {
        const { data } = await client.rest.repos.getContent({
          owner,
          repo,
          path: file.path,
          mediaType: {
            format: "raw"
          }
        });
        
        return typeof data === 'string' ? data : '';
      } catch (error) {
        console.error(`Error fetching ${file.path} using GitHub API:`, error);
        
        if (file.downloadUrl) {
          const response = await fetch(file.downloadUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch file content: ${response.statusText}`);
          }
          return await response.text();
        }
      }
    }
    
    throw new Error(`Unable to get content for file: ${file?.path || 'unknown'}`);
  } catch (error) {
    console.error("Error fetching file content:", error);
    return '';
  }
}

export function getLanguageFromFilename(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  
  const langMap: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'jsx': 'javascript',
    'tsx': 'typescript',
    'py': 'python',
    'rb': 'ruby',
    'java': 'java',
    'php': 'php',
    'go': 'go',
    'c': 'c',
    'cpp': 'cpp',
    'cs': 'csharp',
    'html': 'html',
    'css': 'css',
    'json': 'json',
    'md': 'markdown',
    'sql': 'sql',
    'sh': 'bash',
    'yaml': 'yaml',
    'yml': 'yaml',
    'xml': 'xml',
    'swift': 'swift',
    'kt': 'kotlin',
    'rs': 'rust',
    'dart': 'dart',
  };
  
  return langMap[extension] || 'text';
} 