import { waitForRateLimit } from "./rate-limit";

// Define the structure of the analysis result
interface AnalysisResult {
  summary: {
    riskScore: number;
    message: string;
  };
  issues: Array<{
    title: string;
    severity: "high" | "medium" | "low";
    description: string;
    file?: string;
    line?: number;
    recommendation: string;
  }>;
  codeQuality?: {
    complexity?: number;
    duplication?: number;
    maintainability?: number;
    coverage?: number;
  };
  bestPractices?: string[];
  rawAnalysis?: string;
}

export async function analyzeCode(
  code: string,
  language: string,
  analysisType: string[] = ["security", "quality"]
): Promise<AnalysisResult> {
  try {
    // Wait for rate limit
    await waitForRateLimit();

    // Create the prompt
    const prompt = createAnalysisPrompt(code, language, analysisType);

    // Make direct API call with exactly the format from the working curl command
    console.log("Sending request to Gemini API...");
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      }
    );

    console.log("Gemini API response status:", response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
      console.error("Gemini API error details:", errorData);
      throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log("Received Gemini API response:", data.candidates ? "Valid response" : "Missing candidates");
    
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error("No text in Gemini response:", data);
      return {
        summary: {
          riskScore: 0,
          message: "Analysis failed: Received empty response from Gemini",
        },
        issues: [],
        codeQuality: {
          complexity: 0,
          maintainability: 0,
        },
        bestPractices: [],
        rawAnalysis: "Empty response from API",
      };
    }

    // Parse the response
    return parseAnalysisResponse(text);
  } catch (error) {
    console.error("Error analyzing code with Gemini:", error);
    
    // Return a default result instead of throwing
    return {
      summary: {
        riskScore: 0,
        message: "Analysis failed: " + (error instanceof Error ? error.message : "Unknown error"),
      },
      issues: [],
      codeQuality: {
        complexity: 0,
        maintainability: 0,
      },
      bestPractices: [],
      rawAnalysis: error instanceof Error ? error.message : "Analysis failed",
    };
  }
}

function createAnalysisPrompt(
  code: string,
  language: string,
  analysisType: string[] = ["security", "quality"]
): string {
  return `You are an expert code analyzer. Please analyze the following ${language} code for ${analysisType.join(
    ", "
  )} issues.

Code to analyze:
\`\`\`${language}
${code}
\`\`\`

Provide your analysis in the following JSON format (and only JSON, no other text):
{
  "summary": {
    "riskScore": number between 0-100,
    "message": "brief summary of findings"
  },
  "issues": [
    {
      "title": "issue title",
      "severity": "high|medium|low",
      "description": "detailed description",
      "line": line number if applicable,
      "recommendation": "suggested fix"
    }
  ],
  "codeQuality": {
    "complexity": number between 0-100,
    "maintainability": number between 0-100
  },
  "bestPractices": [
    "suggestion 1",
    "suggestion 2"
  ]
}`;
}

function parseAnalysisResponse(text: string): AnalysisResult {
  try {
    // Try to extract JSON from the response if it contains other text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : text;
    
    // Parse the JSON
    const parsed = JSON.parse(jsonStr);
    
    // Validate and ensure the structure matches AnalysisResult
    return {
      summary: {
        riskScore: parsed.summary?.riskScore ?? 0,
        message: parsed.summary?.message ?? "No analysis available",
      },
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      codeQuality: parsed.codeQuality ?? {
        complexity: 0,
        maintainability: 0,
      },
      bestPractices: Array.isArray(parsed.bestPractices) ? parsed.bestPractices : [],
    };
  } catch (error) {
    console.error("Error parsing analysis response:", error);
    // Return a default structure if parsing fails
    return {
      summary: {
        riskScore: 0,
        message: "Failed to parse analysis results",
      },
      issues: [],
      codeQuality: {
        complexity: 0,
        maintainability: 0,
      },
      bestPractices: [],
      rawAnalysis: text,
    };
  }
}

