import { type NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs"

export async function POST(req: NextRequest) {
  try {
    console.log("API called - checking user")
    const user = await currentUser()
    
    if (!user) {
      console.log("User not authenticated")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("User authenticated:", user.id)
    
    const { code, language, analysisType } = await req.json()
    console.log(`Received request: language=${language}, analysisTypes=${JSON.stringify(analysisType)}, code length=${code?.length || 0}`)

    if (!code || !language) {
      console.log("Missing required fields")
      return NextResponse.json({ error: "Code and language are required" }, { status: 400 })
    }

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
    if (!apiKey) {
      console.error("API key is missing")
      return NextResponse.json({ error: "API configuration error" }, { status: 500 })
    }
    
    console.log("Calling Gemini API...")
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`
    
    const prompt = createAnalysisPrompt(code, language, analysisType)
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    })

    console.log("Gemini API response status:", response.status)
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => "No error details");
      console.error("Gemini API error details:", errorText);
      return NextResponse.json({ error: `Gemini API error: ${response.status} ${response.statusText}` }, { status: 500 });
    }

    const result = await response.json()
    console.log("Gemini API response:", JSON.stringify(result).substring(0, 200) + "...")
    
    if (!result?.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error("Unexpected response format:", result)
      return NextResponse.json({ error: "Unexpected response format from Gemini API" }, { status: 500 });
    }
    
    const text = result.candidates[0].content.parts[0].text
    const analysis = parseAnalysisResponse(text)
    console.log("Analysis parsed successfully")

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error("Analysis error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    )
  }
}

function createAnalysisPrompt(code: string, language: string, analysisType: string[] = ["security", "quality"]) {
  const prompt = `
    You are an expert code analyzer. Analyze the following ${language} code for ${analysisType.join(", ")} issues:
    
    \`\`\`${language}
    ${code}
    \`\`\`
    
    Provide your analysis in the following JSON format (and only JSON, no other text):
    {
      "summary": {
        "riskScore": number between 0-100,
        "message": "brief summary"
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
        "suggestion 2"
      ]
    }
  `;
  console.log("Created prompt:", prompt.substring(0, 200) + "...");
  return prompt;
}

function parseAnalysisResponse(text: string) {
  try {
    let cleanText = text.trim();
    console.log("Raw response text (first 100 chars):", cleanText.substring(0, 100));
    
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.substring(7, cleanText.lastIndexOf("```")).trim();
    } else if (cleanText.startsWith("```")) {
      cleanText = cleanText.substring(3, cleanText.lastIndexOf("```")).trim();
    }
    
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Failed to parse analysis response:", error);
    return {
      summary: {
        riskScore: 50,
        message: "Analysis completed but response format was unexpected.",
      },
      issues: [],
      rawAnalysis: text,
    }
  }
}

