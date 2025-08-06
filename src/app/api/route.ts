import { NextResponse } from "next/server";

// Định nghĩa interface cho request body
interface RequestBody {
  question: string;
  chatHistory: Array<{ role: string; parts: Array<{ text: string }> }>;
}

// Định nghĩa interface cho Gemini API response
interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
  }>;
}

// CORS headers
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400",
};

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    console.log("🚀 API called");

    // Parse request body
    let body: RequestBody;
    try {
      body = await request.json();
      console.log("📥 Request body:", JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.error("❌ JSON parse error:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    const { question, chatHistory } = body;

    // Validate required fields
    if (!question || typeof question !== "string") {
      console.error("❌ Missing or invalid question field");
      return NextResponse.json(
        { error: "Question is required and must be a string" },
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    if (!Array.isArray(chatHistory)) {
      console.error("❌ Invalid chatHistory field");
      return NextResponse.json(
        { error: "chatHistory must be an array" },
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    // Prepare user message
    const userMessage = {
      role: "user" as const,
      parts: [{ text: question }],
    };

    // Build chat history for Gemini API
    const updatedChatHistory = [...chatHistory, userMessage];

    const requestBody = {
      contents: updatedChatHistory,
    };

    console.log(
      "📤 Sending to Gemini API:",
      JSON.stringify(requestBody, null, 2)
    );

    // Gemini API configuration
    const geminiApiUrl =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
    const geminiApiKey = "AIzaSyAOav82BONuO-owTfdlyB9tS3kZaNiXgS0";

    // Call Gemini API
    let geminiResponse: Response;
    try {
      geminiResponse = await fetch(`${geminiApiUrl}?key=${geminiApiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        cache: "no-store" as RequestInit["cache"],
      });

      console.log("📡 Gemini API response status:", geminiResponse.status);
    } catch (fetchError) {
      console.error("❌ Gemini API fetch error:", fetchError);
      return NextResponse.json(
        { error: "Failed to connect to Gemini API" },
        {
          status: 502,
          headers: corsHeaders,
        }
      );
    }

    // Check if Gemini API request was successful
    // Check if Gemini API request was successful
    if (!geminiResponse.ok) {
      let errorDetails: string;
      try {
        errorDetails = await geminiResponse.text();
        console.error("❌ Gemini API error response:", errorDetails);
      } catch (e) {
        console.error("❌ Could not read Gemini API error response:", e);
      }

      return NextResponse.json(
        {
          error: `Gemini API error: ${geminiResponse.status} ${geminiResponse.statusText}`,
        },
        {
          status: geminiResponse.status,
          headers: corsHeaders,
        }
      );
    }

    // Parse Gemini API response
    let geminiData: GeminiResponse;
    try {
      geminiData = await geminiResponse.json();
      console.log(
        "📥 Gemini API response:",
        JSON.stringify(geminiData, null, 2)
      );
    } catch (parseError) {
      console.error("❌ Failed to parse Gemini API response:", parseError);
      return NextResponse.json(
        { error: "Invalid response from Gemini API" },
        {
          status: 502,
          headers: corsHeaders,
        }
      );
    }

    // Extract text from Gemini response
    let responseText: string;
    try {
      if (!geminiData.candidates || geminiData.candidates.length === 0) {
        throw new Error("No candidates in Gemini response");
      }

      if (
        !geminiData.candidates[0].content ||
        !geminiData.candidates[0].content.parts
      ) {
        throw new Error("Invalid content structure in Gemini response");
      }

      if (geminiData.candidates[0].content.parts.length === 0) {
        throw new Error("No parts in Gemini response content");
      }

      responseText = geminiData.candidates[0].content.parts[0].text;

      if (!responseText) {
        throw new Error("Empty text in Gemini response");
      }

      console.log("✅ Extracted response text:", responseText);
    } catch (extractError) {
      console.error(
        "❌ Failed to extract text from Gemini response:",
        extractError
      );
      console.error(
        "❌ Gemini response structure:",
        JSON.stringify(geminiData, null, 2)
      );

      return NextResponse.json(
        { error: "Failed to extract response from Gemini API" },
        {
          status: 502,
          headers: corsHeaders,
        }
      );
    }

    // Return successful response
    const successResponse = { text: responseText };
    console.log("✅ Sending success response:", successResponse);

    return NextResponse.json(successResponse, {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("💥 Unexpected error:", error);
    console.error(
      "💥 Error stack:",
      error instanceof Error ? error.stack : error
    );

    return NextResponse.json(
      { error: "Internal server error" },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}

// Health check endpoint
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      status: "OK",
      timestamp: new Date().toISOString(),
      message: "Chat API is running",
    },
    {
      status: 200,
      headers: corsHeaders,
    }
  );
}
