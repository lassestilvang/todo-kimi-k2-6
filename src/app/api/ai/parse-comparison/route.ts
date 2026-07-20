import { NextRequest } from "next/server";
import { getAIManager } from "@/lib/ai/providers";
import { applyMiddleware, errorResponse, jsonResponse } from "@/lib/api-middleware";

interface ParseComparisonRequest {
  input: {
    text: string;
    context?: any;
  };
}

// GET available AI models
export async function GET() {
  return jsonResponse({
    models: [
      { id: "keyword-parser", name: "Keyword Parser", provider: "Built-in", available: true },
      { id: "openai-gpt4", name: "GPT-4o", provider: "OpenAI", available: !!process.env.OPENAI_API_KEY },
      { id: "claude-sonnet", name: "Claude 3.5 Sonnet", provider: "Anthropic", available: !!process.env.ANTHROPIC_API_KEY },
    ]
  });
}

// POST compare parsing across models
export async function POST(request: NextRequest) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) return middleware.error;

  try {
    const body = await request.json() as ParseComparisonRequest;
    const { text } = body.input;

    if (!text?.trim()) {
      return errorResponse("Input text is required", 400);
    }

    const ai = getAIManager();
    const results: any[] = [];
    const startTime = Date.now();

    // Get all providers including keyword parser
    const providers = [
      { name: "keyword-parser", label: "Keyword Parser (Built-in)" },
      ...(process.env.OPENAI_API_KEY ? [{ name: "openai-gpt4", label: "GPT-4o (OpenAI)" }] : []),
      ...(process.env.ANTHROPIC_API_KEY ? [{ name: "claude-sonnet", label: "Claude 3.5 Sonnet (Anthropic)" }] : []),
    ];

    // Test each provider
    for (const provider of providers) {
      const attemptStart = Date.now();

      try {
        const providerStart = Date.now();
        // Use the AI manager's parseTask method which handles provider selection
        const result = await ai.parseTask({ text });
        const duration = Date.now() - providerStart;

        results.push({
          provider: provider.name,
          label: provider.label,
          name: result.name,
          description: result.description,
          priority: result.priority,
          estimated_duration: result.estimated_duration,
          suggested_date: result.suggested_date,
          recurring: result.recurring,
          timeout: false,
          duration_ms: duration,
          confidence_score: 0.8, // Default confidence for successful parses
        });
      } catch (error: any) {
        const duration = Date.now() - attemptStart;
        const isTimeout = error.message?.includes("timed out") || duration > 10000;

        results.push({
          provider: provider.name,
          label: provider.label,
          name: null,
          description: null,
          priority: "none",
          estimated_duration: null,
          suggested_date: null,
          recurring: "none",
          timeout: isTimeout,
          duration_ms: duration,
          confidence_score: 0,
          error: error.message || "Unknown error",
        });
      }
    }

    const totalDuration = Date.now() - startTime;

    return jsonResponse({
      results,
      summary: {
        totalDurationMs: totalDuration,
        successful: results.filter(r => !r.timeout).length,
        failed: results.filter(r => r.timeout).length,
        fastest: results.reduce((min, r) => r.duration_ms < min ? r : min),
      },
    });

  } catch (error) {
    console.error("AI comparison error:", error);
    return errorResponse("Failed to compare AI models", 500);
  }
}