import { getRepositoryById, updateRepository } from "@/lib/db";
import { analyzeCode } from "@/lib/gemini";
import { sendScanNotification } from "@/lib/notifications";

interface ScanResult {
  id: string;
  repositoryId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  timestamp: string;
  progress: number;
  error?: string;
  summary?: {
    riskScore: number;
    issues: {
      high: number;
      medium: number;
      low: number;
    };
  };
  issues?: any[];
}

export async function startCodeScan(repository: any, scanId: string) {
  try {
    // Update scan status to processing
    await updateRepository(repository.id, {
      scanStatus: {
        id: scanId,
        status: 'processing',
        progress: 0,
        timestamp: new Date().toISOString()
      }
    });

    // Get repository files and analyze them
    const files = await getRepositoryFiles(repository);
    let totalFiles = files.length;
    let processedFiles = 0;
    let allIssues: any[] = [];
    
    for (const file of files) {
      try {
        const analysis = await analyzeCode(
          file.content,
          getFileLanguage(file.name),
          ["security", "quality"]
        );
        
        if (analysis.issues) {
          allIssues = allIssues.concat(
            analysis.issues.map((issue: any) => ({
              ...issue,
              file: file.name
            }))
          );
        }
        
        processedFiles++;
        const progress = Math.round((processedFiles / totalFiles) * 100);
        
        // Update progress
        await updateRepository(repository.id, {
          scanStatus: {
            id: scanId,
            status: 'processing',
            progress,
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        console.error(`Error analyzing file ${file.name}:`, error);
      }
    }

    // Calculate final summary
    const summary = calculateScanSummary(allIssues);

    // Update final status
    const finalScanResult: ScanResult = {
      id: scanId,
      repositoryId: repository.id,
      status: 'completed',
      timestamp: new Date().toISOString(),
      progress: 100,
      summary,
      issues: allIssues
    };

    await updateRepository(repository.id, {
      scanStatus: finalScanResult,
      issues: summary.issues
    });

    // Send notification
    await sendScanNotification({
      userId: repository.userId,
      scanId,
      repositoryName: repository.name,
      status: 'completed',
      summary: summary.issues
    });

    return finalScanResult;
  } catch (error) {
    console.error("Error in code scan:", error);
    
    // Update status to failed
    const failedResult: ScanResult = {
      id: scanId,
      repositoryId: repository.id,
      status: 'failed',
      timestamp: new Date().toISOString(),
      progress: 0,
      error: error instanceof Error ? error.message : 'Scan failed'
    };

    await updateRepository(repository.id, {
      scanStatus: failedResult
    });

    // Send failure notification
    await sendScanNotification({
      userId: repository.userId,
      scanId,
      repositoryName: repository.name,
      status: 'failed'
    });

    throw error;
  }
}

function getFileLanguage(filename: string): string {
  const extensions: { [key: string]: string } = {
    '.js': 'javascript',
    '.ts': 'typescript',
    '.jsx': 'javascript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.java': 'java',
    '.cpp': 'cpp',
    '.cs': 'csharp',
    '.go': 'go',
    '.rb': 'ruby',
    '.php': 'php',
    '.swift': 'swift',
    '.rs': 'rust'
  };

  const ext = Object.keys(extensions).find(ext => filename.endsWith(ext));
  return ext ? extensions[ext] : 'text';
}

async function getRepositoryFiles(repository: any): Promise<Array<{ name: string, content: string }>> {
  // This is a placeholder - implement actual GitHub API calls to get repository files
  // You'll need to use the GitHub API to get the repository contents
  return [];
}

function calculateScanSummary(issues: any[]) {
  const high = issues.filter(i => i.severity.toLowerCase() === 'high').length;
  const medium = issues.filter(i => i.severity.toLowerCase() === 'medium').length;
  const low = issues.filter(i => i.severity.toLowerCase() === 'low').length;

  // Calculate risk score based on issue counts
  const riskScore = Math.min(
    100,
    Math.round((high * 25 + medium * 15 + low * 5) / Math.max(1, issues.length))
  );

  return {
    riskScore,
    issues: { high, medium, low }
  };
} 