import { NextRequest } from "next/server";
import { applyMiddleware, errorResponse, jsonResponse } from "@/lib/api-middleware";
import { getDb } from "@/lib/db";
import { z } from "zod";

export const DecisionTemplateValidationSchema = z.object({
  id: z.number().optional(),
  user_id: z.number(),
  name: z.string().min(1).max(200),
  prompt_template: z.string().min(1).max(5000),
  option_template: z.string().optional(),
  decision_type: z.enum([
    "priority",
    "approach",
    "tool",
    "timeline",
    "allocation",
    "cancellation"
  ]).optional(),
  created_at: z.string().optional(),
});

const CreateTemplateValidationSchema = z.object({
  name: z.string().min(1).max(200),
  prompt_template: z.string().min(1).max(5000),
  option_template: z.string().optional(),
  decision_type: z.enum([
    "priority",
    "approach",
    "tool",
    "timeline",
    "allocation",
    "cancellation"
  ]).optional(),
});

const GenerateTemplateValidationSchema = z.object({
  context: z.object({
    decisionType: z.string().optional(),
    taskName: z.string().optional(),
  }),
});

type TemplateRow = {
  id: number;
  user_id: number;
  name: string;
  prompt_template: string;
  option_template: string | null;
  decision_type: string | null;
  created_at: string;
};

// GET /api/decision-templates - Get user's decision templates
export async function GET(request: NextRequest) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) return middleware.error;

  const userId = middleware.auth?.userId;
  if (!userId) {
    return errorResponse("User not authenticated", 401);
  }

  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type");

  try {
    const db = getDb();
    let query = `
      SELECT id, user_id, name, prompt_template, option_template, decision_type, created_at
      FROM decision_templates
      WHERE user_id = ?
    `;
    const params: (number | string)[] = [userId];

    if (type) {
      query += ` AND decision_type = ?`;
      params.push(type);
    }

    query += ` ORDER BY created_at DESC`;

    const rows = db.prepare(query).all(...params) as TemplateRow[];

    const templates = rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      prompt_template: row.prompt_template,
      option_template: row.option_template,
      decision_type: row.decision_type,
      created_at: row.created_at,
    }));

    return jsonResponse({ templates });
  } catch (error: unknown) {
    console.error("Failed to fetch templates:", error);
    return errorResponse("Failed to fetch templates", 500);
  }
}

// POST /api/decision-templates - Create a new decision template
export async function POST(request: NextRequest) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) return middleware.error;

  const userId = middleware.auth?.userId;
  if (!userId) {
    return errorResponse("User not authenticated", 401);
  }

  try {
    const body = await request.json();
    const parsed = CreateTemplateValidationSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Invalid input: " + parsed.error.issues[0].message, 400);
    }

    const db = getDb();
    const result = db.prepare(`
      INSERT INTO decision_templates (user_id, name, prompt_template, option_template, decision_type, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(
      userId,
      parsed.data.name,
      parsed.data.prompt_template,
      parsed.data.option_template || null,
      parsed.data.decision_type || "approach"
    );

    const row = db.prepare(`
      SELECT id, user_id, name, prompt_template, option_template, decision_type, created_at
      FROM decision_templates
      WHERE id = ?
    `).get(result.lastInsertRowid as number) as TemplateRow;

    const template = {
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      prompt_template: row.prompt_template,
      option_template: row.option_template,
      decision_type: row.decision_type,
      created_at: row.created_at,
    };

    return jsonResponse({ template }, 201);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to create template:", error);
    return errorResponse(`Failed to create template: ${errorMessage}`, 500);
  }
}

// PUT /api/decision-templates/[id] - Update a template
export async function PUT(request: NextRequest) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) return middleware.error;

  const userId = middleware.auth?.userId;
  if (!userId) {
    return errorResponse("User not authenticated", 401);
  }

  const searchParams = request.nextUrl.searchParams;
  const id = parseInt(searchParams.get("id") || "0", 10);

  if (!id) {
    return errorResponse("Template ID required", 400);
  }

  try {
    const body = await request.json();
    const partialSchema = CreateTemplateValidationSchema.partial();
    const parsed = partialSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Invalid input: " + parsed.error.issues[0].message, 400);
    }

    const db = getDb();

    // Check if template exists and belongs to user
    const existing = db.prepare(`
      SELECT user_id FROM decision_templates WHERE id = ?
    `).get(id) as { user_id: number } | undefined;

    if (!existing || existing.user_id !== userId) {
      return errorResponse("Template not found or access denied", 404);
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (parsed.data.name !== undefined) {
      updates.push("name = ?");
      values.push(parsed.data.name);
    }
    if (parsed.data.prompt_template !== undefined) {
      updates.push("prompt_template = ?");
      values.push(parsed.data.prompt_template);
    }
    if (parsed.data.option_template !== undefined) {
      updates.push("option_template = ?");
      values.push(parsed.data.option_template || null);
    }
    if (parsed.data.decision_type !== undefined) {
      updates.push("decision_type = ?");
      values.push(parsed.data.decision_type);
    }

    if (updates.length === 0) {
      return errorResponse("No updates provided", 400);
    }

    values.push(id, userId);

    db.prepare(`
      UPDATE decision_templates
      SET ${updates.join(", ")}
      WHERE id = ? AND user_id = ?
    `).run(...values);

    const row = db.prepare(`
      SELECT id, user_id, name, prompt_template, option_template, decision_type, created_at
      FROM decision_templates
      WHERE id = ? AND user_id = ?
    `).get(id, userId) as TemplateRow | undefined;

    if (!row) {
      return errorResponse("Template not found or access denied", 404);
    }

    const template = {
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      prompt_template: row.prompt_template,
      option_template: row.option_template,
      decision_type: row.decision_type,
      created_at: row.created_at,
    };

    return jsonResponse({ template });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to update template:", error);
    return errorResponse(`Failed to update template: ${errorMessage}`, 500);
  }
}

// DELETE /api/decision-templates/[id] - Delete a template
export async function DELETE(request: NextRequest) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) return middleware.error;

  const userId = middleware.auth?.userId;
  if (!userId) {
    return errorResponse("User not authenticated", 401);
  }

  const searchParams = request.nextUrl.searchParams;
  const id = parseInt(searchParams.get("id") || "0", 10);

  if (!id) {
    return errorResponse("Template ID required", 400);
  }

  try {
    const db = getDb();

    // Check if template exists and belongs to user
    const existing = db.prepare(`
      SELECT user_id FROM decision_templates WHERE id = ?
    `).get(id) as { user_id: number } | undefined;

    if (!existing || existing.user_id !== userId) {
      return errorResponse("Template not found or access denied", 404);
    }

    db.prepare("DELETE FROM decision_templates WHERE id = ?").run(id);

    return jsonResponse({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to delete template:", error);
    return errorResponse(`Failed to delete template: ${errorMessage}`, 500);
  }
}

// PATCH /api/decision-templates/generate - Generate AI template
export async function PATCH(request: NextRequest) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) return middleware.error;

  const userId = middleware.auth?.userId;
  if (!userId) {
    return errorResponse("User not authenticated", 401);
  }

  try {
    const body = await request.json();
    const parsed = GenerateTemplateValidationSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Invalid input: " + parsed.error.issues[0].message, 400);
    }

    // Import the AI manager dynamically to avoid circular dependencies
    const { getAIManager } = await import("@/lib/ai/providers");
    const ai = getAIManager();

    const template = await ai.generateDecisionTemplate({
      decisionType: parsed.data.context.decisionType || "approach",
      task: parsed.data.context.taskName ? { name: parsed.data.context.taskName } : undefined,
    });

    const db = getDb();
    const result = db.prepare(`
      INSERT INTO decision_templates (user_id, name, prompt_template, option_template, decision_type, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(
      userId,
      template.name,
      template.prompt_template,
      template.option_template || null,
      parsed.data.context.decisionType || "approach"
    );

    const row = db.prepare(`
      SELECT id, user_id, name, prompt_template, option_template, decision_type, created_at
      FROM decision_templates
      WHERE id = ?
    `).get(result.lastInsertRowid as number) as TemplateRow;

    const savedTemplate = {
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      prompt_template: row.prompt_template,
      option_template: row.option_template,
      decision_type: row.decision_type,
      created_at: row.created_at,
    };

    return jsonResponse({ template: savedTemplate });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to generate template:", error);
    return errorResponse(`Failed to generate template: ${errorMessage}`, 500);
  }
}

export type { CreateTemplateValidationSchema, GenerateTemplateValidationSchema, TemplateRow };