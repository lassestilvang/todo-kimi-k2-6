import { NextRequest } from "next/server";
import { applyMiddleware, errorResponse, jsonResponse } from "@/lib/api-middleware";
import { getAIManager } from "@/lib/ai/providers";

interface DecisionTemplate {
  id: number;
  user_id: number;
  name: string;
  prompt_template: string;
  option_template?: string;
  decision_type?: string;
  created_at: string;
}

const decisionTypes = [
  { value: "priority", label: "Priority Decision" },
  { value: "approach", label: "Approach Decision" },
  { value: "tool", label: "Tool Selection" },
  { value: "timeline", label: "Timeline Decision" },
  { value: "allocation", label: "Resource Allocation" },
  { value: "cancellation", label: "Cancellation Decision" },
];

// In-memory storage for decision templates (in production, this would be a database)
const templatesStore = new Map<number, DecisionTemplate>();
let nextId = 1;

// GET /api/decision-templates - Get user's decision templates
export async function GET(request: NextRequest) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) return middleware.error;

  const userId = middleware.auth?.userId || 1;
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type");

  try {
    // Get all templates for the user
    let templates = Array.from(templatesStore.values()).filter(t => t.user_id === userId);

    // Filter by type if specified
    if (type) {
      templates = templates.filter(t => t.decision_type === type);
    }

    return jsonResponse({ templates });
  } catch (error) {
    return errorResponse("Failed to fetch templates", 500);
  }
}

// POST /api/decision-templates - Create a new decision template
export async function POST(request: NextRequest) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) return middleware.error;

  const userId = middleware.auth?.userId || 1;
  const body = await request.json() as Partial<DecisionTemplate>;

  if (!body.name || !body.prompt_template) {
    return errorResponse("Name and prompt_template are required", 400);
  }

  try {
    const template: DecisionTemplate = {
      id: nextId++,
      user_id: userId,
      name: body.name,
      prompt_template: body.prompt_template,
      option_template: body.option_template || undefined,
      decision_type: body.decision_type || "approach",
      created_at: new Date().toISOString(),
    };

    templatesStore.set(template.id, template);

    return jsonResponse({ template }, 201);
  } catch (error) {
    return errorResponse("Failed to create template", 500);
  }
}

// PUT /api/decision-templates/[id] - Update a template
export async function PUT(request: NextRequest) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) return middleware.error;

  const userId = middleware.auth?.userId || 1;
  const searchParams = request.nextUrl.searchParams;
  const id = parseInt(searchParams.get("id") || "0", 10);

  if (!id) {
    return errorResponse("Template ID required", 400);
  }

  const existing = templatesStore.get(id);
  if (!existing || existing.user_id !== userId) {
    return errorResponse("Template not found or access denied", 404);
  }

  const body = await request.json() as Partial<DecisionTemplate>;

  try {
    const updated: DecisionTemplate = {
      ...existing,
      ...body,
      created_at: existing.created_at,
    };
    templatesStore.set(id, updated);

    return jsonResponse({ template: updated });
  } catch (error) {
    return errorResponse("Failed to update template", 500);
  }
}

// DELETE /api/decision-templates/[id] - Delete a template
export async function DELETE(request: NextRequest) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) return middleware.error;

  const userId = middleware.auth?.userId || 1;
  const searchParams = request.nextUrl.searchParams;
  const id = parseInt(searchParams.get("id") || "0", 10);

  if (!id) {
    return errorResponse("Template ID required", 400);
  }

  const existing = templatesStore.get(id);
  if (!existing || existing.user_id !== userId) {
    return errorResponse("Template not found or access denied", 404);
  }

  templatesStore.delete(id);

  return jsonResponse({ success: true });
}

// POST /api/decision-templates/generate - Generate AI template
export async function PATCH(request: NextRequest) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) return middleware.error;

  const userId = middleware.auth?.userId || 1;
  const body = await request.json() as { context?: { decisionType?: string; taskName?: string } };

  try {
    const ai = getAIManager();
    const template = await ai.generateDecisionTemplate(body.context || {});

    const savedTemplate: DecisionTemplate = {
      id: nextId++,
      user_id: userId,
      name: template.name,
      prompt_template: template.prompt_template,
      option_template: template.option_template,
      decision_type: body.context?.decisionType || "approach",
      created_at: new Date().toISOString(),
    };

    templatesStore.set(savedTemplate.id, savedTemplate);

    return jsonResponse({ template: savedTemplate });
  } catch (error) {
    return errorResponse("Failed to generate template", 500);
  }
}

// Export types for use in components
export type { DecisionTemplate, decisionTypes };