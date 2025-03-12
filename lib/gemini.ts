import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// Define the structure of the analysis result
interface AnalysisResult {
  summary: {
    riskScore: number
    message: string
  }
  issues: Array<{
    title: string
    severity: "high" | "medium" | "low"
    description: string
    file?: string
    line?: number
    recommendation: string
  }>
  codeQuality?: {
    complexity?: number
    duplication?: number
    maintainability?: number
    coverage?: number
  }
  bestPractices?: string[]
  rawAnalysis?: string
}

export async function analyzeCode(
  code: string,
  language: string,
  analysisType: string[] = ["security", "quality"],
): Promise<AnalysisResult> {
  try {
    // Create a prompt for the AI model
    const prompt = createAnalysisPrompt(code, language, analysisType)

    // Call the AI model using the AI SDK
    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt,
      system:
        "You are an expert code analyzer specializing in identifying security vulnerabilities, code quality issues, and performance problems. Provide detailed, actionable feedback with severity ratings.",
      apiKey: process.env.GEMINI_API_KEY,
    })

    // Parse the response to extract structured data
    return parseAnalysisResponse(text)
  } catch (error) {
    console.error("Error analyzing code:", error)
    throw error
  }
}

function createAnalysisPrompt(
  code: string,
  language: string,
  analysisType: string[] = ["security", "quality"],
): string {
  return `
    Analyze the following ${language} code for ${analysisType.join(", ")} issues:
    
    \`\`\`${language}
    ${code}
    \`\`\`
    
    Provide a detailed analysis with the following structure:
    1. Summary of findings with an overall risk score (0-100)
    2. List of issues found, each with:
       - Issue title
       - Severity (High, Medium, Low)
       - Description
       - Line number(s)
       - Recommended fix
    3. Code quality metrics
    4. Best practices recommendations
    
    Format your response as JSON for easy parsing.
  `
}

function parseAnalysisResponse(text: string): AnalysisResult {
  try {
    // Attempt to parse the response as JSON
    return JSON.parse(text)
  } catch (error) {
    // If parsing fails, return the raw text with a basic structure
    return {
      summary: {
        riskScore: 50,
        message: "Analysis completed with potential issues.",
      },
      issues: [],
      rawAnalysis: text,
    }
  }
}

