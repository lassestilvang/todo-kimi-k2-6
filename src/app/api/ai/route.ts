"use server";

import { NextRequest } from "next/server";
import { parseTaskInput, generateTaskInsights, generateTasksFromNotes, parseEditCommand, getAIManager } from "@/lib/ai";
import type { AITaskInput } from "@/lib/ai";
import { getAIConfigStatus } from "@/lib/ai/config";
import { getClientKey, checkRateLimit } from "@/lib/rate-limiter";
import { logError } from "@/lib/logger";
import { applyMiddleware, errorResponse } from "@/lib/api-middleware";

export async function POST(request: NextRequest) {
  // Apply middleware with authentication
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  // Rate limiting
  const clientKey = getClientKey(request);
  const rateResult = await checkRateLimit(clientKey, { windowMs: 60000, max: 20 });
  const { allowed, remaining } = rateResult;

  if (!allowed) {
    return errorResponse("Rate limit exceeded. Please try again later.", 429);
  }

  try {
    const body = await request.json();
    const { type, input } = body as {
      type: string;
      input: AITaskInput | { tasks?: unknown[]; notes?: string; context?: unknown };
    };

    if (type === "parse") {
      const result = await parseTaskInput(input as AITaskInput);
      return Response.json({ ...result, _rateLimit: remaining });
    }

    if (type === "parse_stream") {
      const aiManager = getAIManager();
      const encoder = new TextEncoder();
      const streamResponse = new ReadableStream({
        async start(controller) {
          try {
            const result = await aiManager.parseTask(input as AITaskInput);
            controller.enqueue(encoder.encode(JSON.stringify(result) + "\n"));
            controller.close();
          } catch {
            controller.enqueue(encoder.encode(JSON.stringify({ error: "Streaming failed" }) + "\n"));
            controller.close();
          }
        },
      });
      return new Response(streamResponse, {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (type === "insights") {
      const insightsInput = input as { tasks?: unknown[] };
      const tasks = insightsInput.tasks ?? [];
      const result = await generateTaskInsights(tasks as Array<{
        name: string;
        completed: boolean;
        priority: string;
        date?: string | null;
        deadline?: string | null;
      }>);
      return Response.json({ ...result, _rateLimit: remaining });
    }

    if (type === "generateTasks") {
      const notesInput = input as { notes?: string; context?: { lists?: Array<{ id: number; name: string; emoji: string }> } };
      const result = await generateTasksFromNotes(notesInput.notes ?? "", notesInput.context);
      return Response.json({ ...result, _rateLimit: remaining });
    }

    if (type === "edit") {
      const editInput = input as { text: string; tasks: Array<{ id: number; name: string; completed: boolean; priority: string }> };
      const result = await parseEditCommand(editInput.text, editInput);
      return Response.json({ ...result, _rateLimit: remaining });
    }

    return Response.json({ error: "Invalid request type" }, { status: 400 });
  } catch (error) {
    logError("AI API error", undefined, error instanceof Error ? error : new Error(String(error)));
    return Response.json(
      { error: "Failed to process AI request" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const status = getAIConfigStatus();
  return Response.json(status);
}