"use server";

import { parseTaskInput, generateTaskInsights, generateTasksFromNotes } from "@/lib/ai";
import type { AITaskInput } from "@/lib/ai";
import { getAIConfigStatus } from "@/lib/ai/config";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, input } = body;

    const aiStatus = getAIConfigStatus();

    if (type === "parse") {
      const result = await parseTaskInput(input as AITaskInput);
      return Response.json(result);
    }

    if (type === "insights") {
      const result = await generateTaskInsights(input.tasks);
      return Response.json(result);
    }

    if (type === "generateTasks") {
      const result = await generateTasksFromNotes(input.notes, input.context);
      return Response.json(result);
    }

    return Response.json({ error: "Invalid request type" }, { status: 400 });
  } catch (error) {
    console.error("AI API error:", error);
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