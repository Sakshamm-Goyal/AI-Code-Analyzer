import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { waitForRateLimit, markRateLimitExhausted } from "@/lib/rate-limit";

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Constants for retry management
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 500;

export async function POST(request: NextRequest) {
  try {
    console.log("[Gemini Analysis API] Starting code analysis...");

    // Authenticate the user
    const authResult = await auth();
    const userId = authResult?.userId;

    if (!userId) {
      console.log("Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { code, language, filename } = body;

    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    console.log(`Analyzing ${filename || "code"} (${language || "unknown language"})`);
    
    // Prepare the prompt for Gemini
    const prompt = `
Analyze the following ${language || ""} code for:
1. Security vulnerabilities
2. Code quality issues
3. Performance concerns
4. Best practice violations

Provide a comprehensive analysis with specific locations of issues and recommended fixes.
Format your response as JSON with the following structure:
{
  "summary": "A brief summary of the overall code quality",
  "securityScore": 0-100,
  "qualityScore": 0-100,
  "performanceScore": 0-100,
  "issues": [
    {
      "title": "Issue title",
      "severity": "high/medium/low",
      "line": line number (if applicable),
      "description": "Detailed description of the issue",
      "recommendation": "How to fix it"
    }
  ]
}

Here's the code to analyze:
\`\`\`${language || ""}
${code}
\`\`\`
`;

    // Configure the Gemini model
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });

    // Generate content with Gemini with retry logic
    let result;
    let retries = 0;
    let lastError;
    
    while (retries <= MAX_RETRIES) {
      try {
        // Wait for rate limit token
        const canProceed = await waitForRateLimit();
        if (!canProceed) {
          console.log(`Rate limit exhausted, retrying after backoff (attempt ${retries + 1}/${MAX_RETRIES + 1})`);
          // Shorter exponential backoff
          const backoffTime = INITIAL_BACKOFF_MS * Math.pow(1.5, retries);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          retries++;
          continue;
        }
        
        // Attempt to generate content
        result = await model.generateContent(prompt);
        break; // If successful, exit the loop
      } catch (error) {
        lastError = error;
        console.warn(`API call failed (attempt ${retries + 1}/${MAX_RETRIES + 1}):`, error);
        
        // Check if it's a rate limit error (429)
        if (error.message && error.message.includes("429")) {
          // Mark the API as exhausted to pause requests
          markRateLimitExhausted();
          console.log("Rate limit exhausted, waiting before retry");
        }
        
        if (retries >= MAX_RETRIES) {
          console.error("Maximum retries reached, giving up");
          break;
        }
        
        // Less aggressive exponential backoff
        const backoffTime = INITIAL_BACKOFF_MS * Math.pow(1.5, retries);
        console.log(`Retrying after ${backoffTime}ms`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        retries++;
      }
    }
    
    // If we've exhausted retries and still don't have a result, throw an error
    if (!result) {
      throw lastError || new Error("Failed to generate analysis after multiple attempts");
    }
    
    const response = result.response;
    const text = response.text();
    console.log("Analysis completed successfully");

    // Try to parse the response as JSON
    try {
      // Extract JSON from the response (Gemini might wrap it in markdown code blocks)
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || 
                        text.match(/```\n([\s\S]*?)\n```/) || 
                        text.match(/{[\s\S]*}/);
                        
      const jsonString = jsonMatch ? jsonMatch[0].replace(/```json\n|```\n|```/g, '') : text;
      const analysis = JSON.parse(jsonString);
      
      return NextResponse.json({
        success: true,
        analysis,
        filename: filename || "unknown",
        language: language || "unknown"
      });
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError);
      // Fall back to returning the raw text
      return NextResponse.json({
        success: true,
        analysis: {
          summary: "Analysis completed but couldn't be structured as JSON",
          issues: [
            {
              title: "Raw Analysis",
              severity: "medium",
              description: text,
              recommendation: "See full description for details"
            }
          ]
        },
        filename: filename || "unknown",
        language: language || "unknown",
        rawResponse: text
      });
    }
  } catch (error) {
    console.error("Error analyzing code with Gemini:", error);
    return NextResponse.json({
      error: "Failed to analyze code",
      details: error instanceof Error ? error.message : String(error),
      retryable: true
    }, { status: 500 });
  }
} 