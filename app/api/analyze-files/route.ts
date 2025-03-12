import { NextRequest, NextResponse } from "next/server"

// Explicitly set Node.js runtime instead of Edge
export const runtime = 'nodejs';

export const config = {
  api: {
    bodyParser: false,
  },
}

export async function POST(req: NextRequest) {
  try {
    // Parse the multipart form data
    const formData = await req.formData()
    const files = formData.getAll('files') as File[]
    const analysisTypes = formData.getAll('analysisType') as string[]

    if (files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 })
    }

    if (analysisTypes.length === 0) {
      return NextResponse.json({ error: "No analysis type selected" }, { status: 400 })
    }

    // Improved file type validation
    const validFileExtensions = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cs', 'php', 'go', 'rb', 'rs', 'swift'];
    const invalidFiles = files.filter(file => {
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      // Exclude declaration files and non-code files
      return !validFileExtensions.includes(extension) || 
             file.name.endsWith('.d.ts') || 
             file.name.includes('next-env');
    });

    if (invalidFiles.length > 0) {
      const invalidFileNames = invalidFiles.map(f => f.name).join(', ');
      return NextResponse.json({
        error: `Invalid file type(s): ${invalidFileNames}. Only code files are supported.`,
        supportedTypes: validFileExtensions.join(', ')
      }, { status: 400 });
    }

    // Process each file
    const fileContents = await Promise.all(
      files.map(async (file) => {
        // Skip declaration files and config files
        if (file.name.endsWith('.d.ts') || file.name.includes('next-env')) {
          throw new Error(`File ${file.name} is a declaration file and not suitable for analysis`);
        }
        
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        
        try {
          const content = buffer.toString('utf-8')
          
          // Improved text content validation
          if (!isLikelyText(content) || content.length < 10) {
            throw new Error(`File ${file.name} appears to be binary or empty`);
          }
          
          // Determine language from file extension
          const fileExtension = file.name.split('.').pop()?.toLowerCase() || ''
          const language = getLanguageFromExtension(fileExtension)
          
          return {
            name: file.name,
            content,
            language,
            size: file.size,
          }
        } catch (error) {
          throw new Error(`Failed to process ${file.name}: Not a valid text file`);
        }
      })
    )

    // Log what files we're analyzing
    console.log(`Analyzing ${fileContents.length} files:`, fileContents.map(f => f.name));

    // Analyze each file with Gemini
    const analysisResults = await Promise.all(
      fileContents.map(async (file) => {
        try {
          console.log(`Starting Gemini analysis of ${file.name} (${file.language})`);
          
          // Use Gemini API for analysis
          const analysis = await analyzeWithGemini(file.content, file.language, analysisTypes as string[]);
          
          console.log(`Completed Gemini analysis of ${file.name}`);
          return {
            file: file.name,
            analysis
          };
        } catch (error) {
          console.error(`Error analyzing file ${file.name}:`, error);
          // Fallback to static analysis if Gemini fails
          console.log(`Falling back to static analysis for ${file.name}`);
          const fallbackAnalysis = analyzeFileContent(file.content, file.language, analysisTypes as string[]);
          
          return {
            file: file.name,
            analysis: fallbackAnalysis,
            usedFallback: true
          };
        }
      })
    )

    // Filter out failed analyses
    const successfulAnalyses = analysisResults.filter(r => !r.error);
    const failedAnalyses = analysisResults.filter(r => r.error);

    console.log(`Analysis complete: ${successfulAnalyses.length} successful, ${failedAnalyses.length} failed`);

    // Only aggregate successful analyses
    const aggregatedResults = successfulAnalyses.length > 0 
      ? aggregateAnalysisResults(successfulAnalyses)
      : createEmptyAnalysisResult();

    return NextResponse.json({
      success: true,
      filesAnalyzed: files.length,
      successfulAnalyses: successfulAnalyses.length,
      failedAnalyses: failedAnalyses.length,
      failedFiles: failedAnalyses.map(r => r.file),
      analysis: aggregatedResults
    });
  } catch (error) {
    console.error("Error analyzing files:", error)
    return NextResponse.json({ 
      error: "Failed to analyze files",
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 400 })
  }
}

// Function to analyze code with Gemini API
async function analyzeWithGemini(
  content: string,
  language: string,
  analysisTypes: string[]
): Promise<any> {
  try {
    // Create a prompt for Gemini
    const prompt = `
You are an expert code analyzer. Analyze the following ${language} code for ${analysisTypes.join(", ")} issues:

\`\`\`${language}
${content}
\`\`\`

Provide your analysis in the following JSON format (and only JSON, no other text):
{
  "summary": {
    "riskScore": number between 0-100,
    "message": "brief summary of the risk level"
  },
  "issues": [
    {
      "title": "issue title",
      "severity": "High|Medium|Low",
      "description": "detailed description",
      "line": line number,
      "recommendation": "suggested fix"
    }
  ],
  "metrics": {
    "complexity": "score and description",
    "maintainability": "score and description"
  },
  "bestPractices": [
    "suggestion 1",
    "suggestion 2",
    "suggestion 3",
    "suggestion 4",
    "suggestion 5"
  ]
}
`;

    // Call Gemini API
    const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY || '',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API error:", errorData);
      throw new Error("Failed to get analysis from Gemini API");
    }

    const data = await response.json();
    
    // Extract the text response
    const responseText = data.candidates[0].content.parts[0].text;
    
    // Parse the JSON response - IMPROVED PARSING
    try {
      console.log("Raw Gemini response:", responseText.substring(0, 100) + "...");
      
      // Remove code block markers if present
      let jsonStr = responseText;
      
      // If the response is wrapped in a code block, extract just the JSON
      if (responseText.includes('```')) {
        // Extract content between code block markers
        const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch && codeBlockMatch[1]) {
          jsonStr = codeBlockMatch[1].trim();
        }
      }
      
      // Clean the JSON string to fix common issues
      jsonStr = jsonStr
        .replace(/\\"/g, '"')  // Fix escaped quotes
        .replace(/\\\\/g, '\\') // Fix double escapes
        .replace(/[\u0000-\u001F]/g, '') // Remove control characters
        .replace(/\n\s*"(\w+)":/g, ',"$1":') // Fix missing commas
        .replace(/,\s*}/g, '}') // Remove trailing commas
        .replace(/,\s*]/g, ']'); // Remove trailing commas in arrays
      
      // Make sure the JSON starts with { and ends with }
      if (!jsonStr.startsWith('{')) {
        const startIndex = jsonStr.indexOf('{');
        if (startIndex >= 0) {
          jsonStr = jsonStr.substring(startIndex);
        }
      }
      
      if (!jsonStr.endsWith('}')) {
        const endIndex = jsonStr.lastIndexOf('}');
        if (endIndex >= 0) {
          jsonStr = jsonStr.substring(0, endIndex + 1);
        }
      }
      
      console.log("Cleaned JSON string:", jsonStr.substring(0, 100) + "...");
      
      // Parse the JSON
      const analysisResult = JSON.parse(jsonStr);
      console.log("Successfully parsed analysis result");
      
      return analysisResult;
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError);
      
      // Try a more aggressive approach to extract valid JSON
      try {
        console.log("Attempting alternative JSON extraction...");
        
        // Use a more reliable regex to extract JSON
        const jsonRegex = /{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*}/g;
        const matches = responseText.match(jsonRegex);
        
        if (matches && matches.length > 0) {
          // Try each match until we find one that parses
          for (const match of matches) {
            try {
              const result = JSON.parse(match);
              console.log("Alternative parsing succeeded");
              return result;
            } catch (e) {
              // Continue to next match
            }
          }
        }
        
        // If we still can't parse, try to create a structured result from the text
        return createAnalysisFromText(responseText, language);
      } catch (alternativeError) {
        console.error("Alternative parsing also failed:", alternativeError);
        return createAnalysisFromText(responseText, language);
      }
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
}

// Helper function to create a structured analysis from text when JSON parsing fails
function createAnalysisFromText(text: string, language: string): any {
  console.log("Creating analysis from text content");
  
  // Extract risk score
  let riskScore = 30; // Default
  const riskMatch = text.match(/riskScore"?\s*:\s*(\d+)/);
  if (riskMatch && riskMatch[1]) {
    riskScore = parseInt(riskMatch[1], 10);
  }
  
  // Extract message
  let message = "Analysis based on text extraction";
  const messageMatch = text.match(/message"?\s*:\s*"([^"]+)"/);
  if (messageMatch && messageMatch[1]) {
    message = messageMatch[1];
  }
  
  // Extract issues
  const issues = [];
  const issueRegex = /"title"?\s*:\s*"([^"]+)"[^}]*"severity"?\s*:\s*"([^"]+)"[^}]*"description"?\s*:\s*"([^"]+)"[^}]*"line"?\s*:\s*(\d+)[^}]*"recommendation"?\s*:\s*"([^"]+)"/g;
  
  let match;
  while ((match = issueRegex.exec(text)) !== null) {
    issues.push({
      title: match[1],
      severity: match[2],
      description: match[3],
      line: parseInt(match[4], 10),
      recommendation: match[5]
    });
  }
  
  // If no issues found, add a default one
  if (issues.length === 0) {
    issues.push({
      title: "Code Review Recommended",
      severity: "Low",
      description: "The code should be reviewed for potential issues.",
      line: 1,
      recommendation: "Conduct a thorough code review."
    });
  }
  
  // Extract best practices
  const bestPractices = [];
  const practiceRegex = /"([^"]+)"/g;
  const bestPracticesSection = text.substring(text.indexOf("bestPractices"));
  
  while ((match = practiceRegex.exec(bestPracticesSection)) !== null) {
    if (match[1].length > 10 && !match[1].includes(":")) {
      bestPractices.push(match[1]);
    }
    
    if (bestPractices.length >= 5) break;
  }
  
  // If no best practices found, add defaults
  if (bestPractices.length === 0) {
    bestPractices.push(
      "Follow best practices for " + language + " development",
      "Conduct regular code reviews",
      "Write comprehensive tests",
      "Document your code properly",
      "Refactor complex sections of code"
    );
  }
  
  // Extract metrics
  let complexity = "Analysis based on text extraction";
  let maintainability = "Analysis based on text extraction";
  
  const complexityMatch = text.match(/complexity"?\s*:\s*"([^"]+)"/);
  if (complexityMatch && complexityMatch[1]) {
    complexity = complexityMatch[1];
  }
  
  const maintainabilityMatch = text.match(/maintainability"?\s*:\s*"([^"]+)"/);
  if (maintainabilityMatch && maintainabilityMatch[1]) {
    maintainability = maintainabilityMatch[1];
  }
  
  return {
    summary: {
      riskScore,
      message
    },
    issues,
    metrics: {
      complexity,
      maintainability
    },
    bestPractices: bestPractices.slice(0, 5)
  };
}

// Create an empty analysis result when all files fail
function createEmptyAnalysisResult() {
  return {
    summary: {
      riskScore: 0,
      message: "No successful analyses",
      issues: {
        high: 0,
        medium: 0,
        low: 0
      }
    },
    issues: [],
    metrics: {
      complexity: "N/A",
      maintainability: "N/A"
    },
    bestPractices: ["No successful analyses to provide best practices"]
  };
}

// Helper function to check if content is likely text and not binary
function isLikelyText(content: string): boolean {
  // Check if the string contains a high percentage of printable ASCII characters
  const printableChars = content.replace(/[^\x20-\x7E]/g, '');
  const ratio = printableChars.length / content.length;
  
  // If 90% of characters are printable ASCII, it's likely text
  return ratio > 0.9 && content.length > 0;
}

// Helper function to determine language from file extension
function getLanguageFromExtension(extension: string): string {
  const extensionMap: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'jsx': 'javascript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'cs': 'csharp',
    'php': 'php',
    'go': 'go',
    'rb': 'ruby',
    'rs': 'rust',
    'swift': 'swift',
  }
  
  return extensionMap[extension] || 'unknown'
}

// Function to analyze a file's content
async function analyzeFileContent(
  content: string,
  language: string,
  analysisTypes: string[]
): Promise<any> {
  // In a real implementation, you would directly call your AI model API here
  // For example, using the Gemini API directly instead of going through /api/analyze
  
  // We'll use a similar code quality analysis approach as would be in /api/analyze
  
  try {
    // Create realistic issues based on content and selected analysis types
    const issues = [];
    
    // This is a simplified version of analysis that examines the code for common issues
    
    // Security analysis
    if (analysisTypes.includes('security')) {
      if (content.match(/password|secret|key|token/i) && content.match(/['"][^'"]*['"]/) && !content.match(/process\.env/)) {
        issues.push({
          title: "Potential Hardcoded Secret",
          severity: "High",
          description: "Possible hardcoded credentials found in code.",
          line: findLineNumber(content, /password|secret|key|token/i),
          recommendation: "Use environment variables for sensitive information."
        });
      }
      
      if (content.match(/innerHTML|outerHTML|document\.write/i)) {
        issues.push({
          title: "DOM Manipulation Risk",
          severity: "Medium",
          description: "Direct DOM manipulation could lead to XSS vulnerabilities.",
          line: findLineNumber(content, /innerHTML|outerHTML|document\.write/i),
          recommendation: "Use safe DOM APIs or sanitize content before insertion."
        });
      }
    }
    
    // Code quality analysis
    if (analysisTypes.includes('code quality')) {
      // Check for long functions
      const functionMatches = content.match(/function\s+\w+\s*\([^)]*\)\s*{[^}]*}/g) || [];
      for (const fnMatch of functionMatches) {
        if (fnMatch.split('\n').length > 30) {
          issues.push({
            title: "Long Function",
            severity: "Medium",
            description: "Function is too long and may be difficult to maintain.",
            line: findLineNumber(content, fnMatch.substring(0, 50)),
            recommendation: "Break this function into smaller, focused functions."
          });
        }
      }
      
      // Check for commented-out code
      if (content.match(/\/\/\s*\w+\s*\([^)]*\)/g)) {
        issues.push({
          title: "Commented Code",
          severity: "Low",
          description: "Found commented-out code which may indicate dead code or incomplete refactoring.",
          line: findLineNumber(content, /\/\/\s*\w+\s*\([^)]*\)/g),
          recommendation: "Remove commented-out code to improve readability."
        });
      }
    }
    
    // Performance analysis
    if (analysisTypes.includes('performance')) {
      // Check for inefficient loops
      if (content.match(/for\s*\([^)]*\)\s*{[^}]*\$\([^)]*\)/g) || 
          content.match(/for\s*\([^)]*\)\s*{[^}]*createElement/g)) {
        issues.push({
          title: "DOM in Loop",
          severity: "Medium",
          description: "DOM operations inside loops can cause performance issues.",
          line: findLineNumber(content, /for\s*\([^)]*\)\s*{[^}]*\$\([^)]*\)/g) || 
                findLineNumber(content, /for\s*\([^)]*\)\s*{[^}]*createElement/g),
          recommendation: "Minimize DOM operations inside loops or use DocumentFragment."
        });
      }
    }
    
    // Best practices
    if (analysisTypes.includes('best practices')) {
      // Check for var usage
      if (language.includes('javascript') || language.includes('typescript')) {
        if (content.match(/\bvar\s+\w+/g)) {
          issues.push({
            title: "Legacy var Usage",
            severity: "Low",
            description: "Using 'var' instead of 'const' or 'let'.",
            line: findLineNumber(content, /\bvar\s+\w+/g),
            recommendation: "Replace 'var' with 'const' for constants and 'let' for variables that change."
          });
        }
      }
    }
    
    // If we don't have enough issues, add some generic ones
    if (issues.length < 2) {
      issues.push({
        title: "Improve Code Documentation",
        severity: "Low",
        description: "Code lacks sufficient documentation or comments.",
        line: 1,
        recommendation: "Add more descriptive comments and function documentation."
      });
    }
    
    // Calculate risk score based on issues
    const highIssues = issues.filter(issue => issue.severity === "High").length;
    const mediumIssues = issues.filter(issue => issue.severity === "Medium").length;
    const lowIssues = issues.filter(issue => issue.severity === "Low").length;
    
    const riskScore = Math.min(100, highIssues * 25 + mediumIssues * 15 + lowIssues * 5 + 10);
    
    // Generate language-specific best practices
    const bestPractices = getBestPracticesForLanguage(language);
    
    return {
      summary: {
        riskScore,
        message: riskScore > 70 
          ? "High risk - critical issues found that require immediate attention" 
          : riskScore > 40 
          ? "Medium risk - important issues to address in the near term" 
          : "Low risk - minor improvements suggested for code quality"
      },
      issues: issues,
      metrics: {
        complexity: calculateComplexityMetric(content, language),
        maintainability: calculateMaintainabilityMetric(content, language)
      },
      bestPractices: bestPractices
    };
  } catch (error) {
    console.error("Error in analysis:", error);
    throw new Error("Failed to analyze code");
  }
}

// Helper function to find line number for a pattern
function findLineNumber(content: string, pattern: RegExp | string): number {
  const lines = content.split("\n");
  const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
  
  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) {
      return i + 1;
    }
  }
  
  return 1; // Default to first line if not found
}

// Helper function to get best practices for a language
function getBestPracticesForLanguage(language: string): string[] {
  const commonPractices = [
    "Use consistent naming conventions",
    "Write unit tests for your code",
    "Keep functions short and focused on a single task",
    "Add proper error handling for edge cases",
    "Document public APIs and complex logic"
  ];
  
  const languagePractices: Record<string, string[]> = {
    javascript: [
      "Use const and let instead of var",
      "Implement proper error handling for asynchronous code",
      "Use ESLint to enforce code style",
      "Avoid nested callbacks, use async/await instead"
    ],
    typescript: [
      "Avoid using 'any' type when possible",
      "Use interfaces for object shapes and types for unions",
      "Enable strict mode in tsconfig.json",
      "Consider using utility types like Partial<T> and Pick<T>"
    ],
    python: [
      "Follow PEP 8 style guidelines",
      "Use type hints for better code documentation",
      "Prefer list comprehensions over loops when appropriate",
      "Use virtual environments for dependency management"
    ]
  };
  
  const specificPractices = languagePractices[language] || [];
  return [...specificPractices, ...commonPractices].slice(0, 5);
}

// Simple metrics calculation based on code patterns
function calculateComplexityMetric(content: string, language: string): string {
  // Count control structures as a simple proxy for cyclomatic complexity
  const controlStructures = (content.match(/if|else|for|while|switch|case|catch|&&|\|\|/g) || []).length;
  const lines = content.split("\n").length;
  
  const ratio = controlStructures / (lines || 1);
  
  if (ratio > 0.2) {
    return "High complexity - consider refactoring complex logic";
  } else if (ratio > 0.1) {
    return "Moderate complexity - some functions may need simplification";
  } else {
    return "Good complexity metrics - code is reasonably straightforward";
  }
}

function calculateMaintainabilityMetric(content: string, language: string): string {
  // Simple heuristics for maintainability
  const lines = content.split("\n").length;
  const commentRatio = ((content.match(/\/\/|\/\*|\*/g) || []).length) / (lines || 1);
  const longLines = content.split("\n").filter(line => line.length > 100).length;
  
  if (commentRatio < 0.05 || longLines > lines * 0.2) {
    return "Some maintainability concerns - consider adding comments and breaking up long lines";
  } else if (lines > 500) {
    return "File is quite large - consider breaking it into smaller modules";
  } else {
    return "Good maintainability - reasonable file size and documentation";
  }
}

// Function to aggregate results from multiple files
function aggregateAnalysisResults(results: any[]): any {
  try {
    // Safely extract issues with null/undefined checks
    const allIssues = results.flatMap((result) => {
      // Check if analysis and issues exist
      if (!result.analysis || !result.analysis.issues) {
        console.warn(`Missing analysis or issues for file: ${result.file}`);
        return [];
      }
      
      return result.analysis.issues.map((issue: any) => ({
      ...issue,
      file: result.file,
      }));
    });

    const highIssues = allIssues.filter((issue: any) => issue.severity === "High");
    const mediumIssues = allIssues.filter((issue: any) => issue.severity === "Medium");
    const lowIssues = allIssues.filter((issue: any) => issue.severity === "Low");

  // Calculate risk score based on number and severity of issues
    const totalFiles = results.length;
  const riskScore = totalFiles > 0 
    ? Math.min(
        100, 
          Math.floor((highIssues.length * 25 + mediumIssues.length * 15 + lowIssues.length * 5) / 
          Math.max(1, totalFiles))
      )
    : 0;

    // Safely collect best practices with null/undefined checks
  const allBestPractices = [...new Set(results.flatMap(r => 
      r.analysis && r.analysis.bestPractices ? r.analysis.bestPractices : []
    ))];
  
  return {
    summary: {
      riskScore,
      message: riskScore > 70 
        ? "High risk - critical issues found that require immediate attention" 
        : riskScore > 40 
        ? "Medium risk - important issues to address in the near term" 
        : "Low risk - minor improvements suggested for code quality",
      issues: {
        high: highIssues.length,
        medium: mediumIssues.length,
        low: lowIssues.length,
      },
    },
    issues: allIssues,
    metrics: {
      complexity: getAggregatedMetric(results, 'complexity'),
      maintainability: getAggregatedMetric(results, 'maintainability')
    },
    bestPractices: allBestPractices.slice(0, 5) // Limit to 5 most important practices
    };
  } catch (error) {
    console.error("Error in aggregation:", error);
    // Return a basic result if aggregation fails
    return createEmptyAnalysisResult();
  }
}

// Helper to extract aggregated metrics across files
function getAggregatedMetric(results: any[], metricName: string): string {
  try {
    // Look for concerning metrics (high numbers) with null/undefined checks
  const concerningMetrics = results.filter(r => {
      if (!r.analysis || !r.analysis.metrics || !r.analysis.metrics[metricName]) {
        return false;
      }
      
      const metric = r.analysis.metrics[metricName];
    return metric.includes('high') || 
           metric.includes('refactor') ||
           metric.includes('concerns') ||
           metric.includes('large');
  });
  
  if (concerningMetrics.length > Math.floor(results.length / 2)) {
    return `Significant issues found in multiple files - comprehensive refactoring recommended`;
  } else if (concerningMetrics.length > 0) {
    return `Some files need improvement - targeted refactoring recommended`;
  } else {
    return `Good metrics across analyzed files`;
    }
  } catch (error) {
    console.error("Error in metric aggregation:", error);
    return "Unable to determine metrics";
  }
} 