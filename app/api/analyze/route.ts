import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

// Initialize the Gemini AI model with error handling
let genAI: any = null;
try {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
} catch (error) {
  console.error("Failed to initialize Gemini AI:", error);
}

export async function POST(req: NextRequest) {
  try {
    // Check if AI is initialized
    if (!genAI) {
      return NextResponse.json(
        { 
          error: "AI model not initialized", 
          analysis: createEmptyAnalysis("AI model not available")
        },
        { status: 500 }
      );
    }

    // Parse the request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return NextResponse.json(
        { 
          error: "Invalid request body", 
          analysis: createEmptyAnalysis("Invalid request format")
        },
        { status: 400 }
      );
    }

    const { code, language, analysisType } = body;

    // Validate required fields
    if (!code || !language) {
      return NextResponse.json(
        { 
          error: "Code and language are required",
          analysis: createEmptyAnalysis("Missing required parameters")
        },
        { status: 400 }
      );
    }

    // Limit code size to prevent API issues
    const limitedCode = code.length > 10000 ? code.substring(0, 10000) + "..." : code;

    try {
      // Get the AI model
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      // Create a prompt based on analysis types
      const prompt = createAnalysisPrompt(limitedCode, language, analysisType || ["security", "quality"]);

      // Generate content with timeout protection
      const result = await Promise.race([
        model.generateContent(prompt),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("AI request timeout")), 15000)
        )
      ]);

      // Parse the response
      const response = await result.response;
      const analysis = parseAnalysisResponse(response.text());

      return NextResponse.json({ analysis });
    } catch (aiError) {
      console.error("AI analysis error:", aiError);
      return NextResponse.json({ 
        analysis: createEmptyAnalysis("Failed to analyze code")
      });
    }
  } catch (error) {
    console.error("Error analyzing code:", error);
    return NextResponse.json(
      { 
        error: "Failed to analyze code",
        analysis: createEmptyAnalysis("Internal server error")
      },
      { status: 500 }
    );
  }
}

function createAnalysisPrompt(code: string, language: string, analysisTypes: string[]) {
  const basePrompt = `Analyze the following ${language} code for `;
  const typePrompts = {
    security: "security vulnerabilities, potential risks, and best practices",
    quality: "code quality issues, maintainability concerns, and improvement suggestions",
    performance: "performance optimization opportunities and efficiency improvements",
  };

  const selectedTypes = analysisTypes
    .map(type => typePrompts[type as keyof typeof typePrompts] || "")
    .filter(Boolean)
    .join(", ");

  return `${basePrompt}${selectedTypes || "security and quality issues"}. Provide a detailed analysis with:
  1. A summary with risk score (0-100)
  2. Specific issues found (with severity levels)
  3. Code quality metrics
  4. Recommendations for improvement

  Here's the code:
  \`\`\`${language}
  ${code}
  \`\`\`
  
  Format the response as JSON with the following structure:
  {
    "summary": {
      "riskScore": number,
      "message": string
    },
    "issues": [
      {
        "title": string,
        "severity": "High" | "Medium" | "Low",
        "description": string,
        "line": number,
        "recommendation": string
      }
    ],
    "metrics": {
      "complexity": number,
      "maintainability": number,
      "testability": number
    },
    "recommendations": [
      {
        "title": string,
        "description": string,
        "priority": "High" | "Medium" | "Low"
      }
    ]
  }`;
}

function parseAnalysisResponse(text: string): any {
  try {
    // Find the JSON part of the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in response:", text.substring(0, 200));
      return createEmptyAnalysis("Failed to extract JSON from AI response");
    }

    // Parse the JSON
    const analysis = JSON.parse(jsonMatch[0]);

    // Ensure the analysis has the expected structure
    return {
      summary: {
        riskScore: analysis.summary?.riskScore ?? 0,
        message: analysis.summary?.message ?? "No summary available",
      },
      issues: Array.isArray(analysis.issues) ? analysis.issues : [],
      metrics: analysis.metrics ?? {
        complexity: 0,
        maintainability: 0,
        testability: 0,
      },
      recommendations: Array.isArray(analysis.recommendations) 
        ? analysis.recommendations 
        : [],
      bestPractices: Array.isArray(analysis.bestPractices)
        ? analysis.bestPractices
        : []
    };
  } catch (error) {
    console.error("Error parsing analysis response:", error);
    return createEmptyAnalysis("Failed to parse analysis results");
  }
}

function createEmptyAnalysis(message: string = "No analysis available") {
  return {
    summary: {
      riskScore: 0,
      message: message,
    },
    issues: [],
    metrics: {
      complexity: 0,
      maintainability: 0,
      testability: 0,
    },
    recommendations: [],
    bestPractices: []
  };
}

function getLanguageSpecificRules(language: string) {
  const commonRules = {
    security: [
      "Check for input validation",
      "Look for potential XSS vulnerabilities",
      "Identify SQL injection risks",
      "Examine authentication handling",
      "Review authorization checks",
    ],
    quality: [
      "Code duplication",
      "Function length and complexity",
      "Naming conventions",
      "Comment quality and documentation",
      "Error handling practices",
    ],
    performance: [
      "Resource usage",
      "Algorithm efficiency",
      "Memory management",
      "Caching opportunities",
      "Loop optimizations",
    ],
  }

  const languageRules: Record<string, typeof commonRules> = {
    JavaScript: {
      ...commonRules,
      security: [
        ...commonRules.security,
        "Check for eval() usage",
        "Validate JSON parsing",
        "Review DOM manipulation",
      ],
      quality: [
        ...commonRules.quality,
        "ESLint compliance",
        "Modern JS features usage",
        "Proper async/await usage",
      ],
      performance: [
        ...commonRules.performance,
        "Bundle size impact",
        "Memory leaks in closures",
        "Event listener cleanup",
      ],
    },
    TypeScript: {
      ...commonRules,
      security: [
        ...commonRules.security,
        "Type assertion safety",
        "Null checking",
        "Type guard usage",
      ],
      quality: [
        ...commonRules.quality,
        "Type definition quality",
        "Interface usage",
        "Strict mode compliance",
      ],
      performance: [
        ...commonRules.performance,
        "Type system overhead",
        "Generic optimization",
        "Decorator performance",
      ],
    },
    // Add more language-specific rules as needed
  }

  return languageRules[language] || commonRules
}

function calculateMetrics(code: string, language: string): any {
  // This is a simplified metric calculation
  // In a real implementation, you would use more sophisticated analysis
  const lines = code.split('\n').length
  const complexity = Math.min(10, Math.ceil(lines / 100))
  const maintainability = Math.min(10, 10 - (complexity / 2))
  const testability = Math.min(10, maintainability - 1)

  return {
    complexity,
    maintainability,
    testability,
  }
}

function enhancePromptWithContext(prompt: string, language: string) {
  const rules = getLanguageSpecificRules(language)
  const context = `
    When analyzing this ${language} code, consider these specific aspects:
    
    Security:
    ${rules.security.map(rule => `- ${rule}`).join('\n')}
    
    Code Quality:
    ${rules.quality.map(rule => `- ${rule}`).join('\n')}
    
    Performance:
    ${rules.performance.map(rule => `- ${rule}`).join('\n')}
  `

  return `${context}\n\n${prompt}`
}

