"use server";

import { z } from "zod";
import { getAIManager } from "./providers";

// Zod schema for enhanced task editing with decision tracking
export const enhancedEditCommandSchema = z.object({
  action: z.enum(["edit", "delete", "complete", "prioritize", "schedule", "add_label", "remove_label", "search", "record_decision"]),
  taskId: z.number().optional(),
  taskName: z.string().optional(),
  updates: z.record(z.string(), z.unknown()).optional(),
  searchQuery: z.string().optional(),
  decisionContext: z.object({
    question: z.string(),
    options: z.array(z.object({
      text: z.string(),
      pros: z.array(z.string()),
      cons: z.array(z.string()),
      weight: z.number().min(0).max(1),
    })),
    timeframe: z.string().optional(),
    impact_level: z.enum(["low", "medium", "high"]).optional(),
  }).optional(),
});

export type EnhancedEditCommand = z.infer<typeof enhancedEditCommandSchema>;

/**
 * Enhanced task editing with AI decision-making support
 */
export async function enhancedEditTask(
  input: EnhancedEditCommand,
  context: { tasks: any[]; userId: number }
): Promise<{ success: boolean; message: string; task?: any; decisionId?: number }> {
  const ai = getAIManager();
  const parsed = enhancedEditCommandSchema.parse(input);

  switch (parsed.action) {
    case "edit":
    case "delete":
    case "complete":
    case "prioritize":
    case "schedule":
    case "add_label":
    case "remove_label":
    case "search":
      return await ai.parseEditCommand(input.text || "", context.tasks);

    case "record_decision":
      return await recordDecisionWithAI(parsed, context);

    default:
      throw new Error(`Unsupported action: ${parsed.action}`);
  }
}

/**
 * Record a decision based on AI analysis
 */
async function recordDecisionWithAI(
  input: EnhancedEditCommand,
  context: { tasks: any[]; userId: number }
): Promise<{ success: boolean; message: string; task?: any; decisionId?: number }> {
  if (!input.decisionContext) {
    throw new Error("Decision context is required for decision recording");
  }

  // Use AI to analyze the decision context
  const ai = getAIManager();
  const decisionAnalysis = await ai.generateDecisionAnalysis(
    input.decisionContext,
    context.tasks
  );

  // Record the decision
  const { createDecisionEntry } = await import("@/lib/actions/decisions");
  const { entry, optionIds } = await createDecisionEntry({
    task_id: input.taskId,
    decision_type: determineDecisionType(input),
    question: input.decisionContext.question,
    chosen_option_id: optionIds && optionIds.length > 0 ? optionIds[0] : undefined,
    rationale: decisionAnalysis.rationale,
    outcome: decisionAnalysis.predicted_outcome,
    outcome_notes: decisionAnalysis.reasoning,
    outcome_rating: decisionAnalysis.confidence,
    options: input.decisionContext.options.map((opt, index) => ({
      option_text: opt.text,
      pros: opt.pros,
      cons: opt.cons,
    })),
  });

  // Apply the task update if specified
  if (input.updates && input.taskId) {
    const { updateTask } = await import("@/lib/actions/tasks");
    await updateTask(input.taskId, input.updates);

    // Refresh task data
    const updatedTask = await getTaskById(input.taskId);
    if (updatedTask) {
      return {
        success: true,
        message: `Decision recorded and task ${input.taskId} updated successfully`,
        task: updatedTask,
        decisionId: entry.id,
      };
    }
  }

  return {
    success: true,
    message: `Decision recorded with ID ${entry.id}`,
    task: null,
    decisionId: entry.id,
  };
}

/**
 * Generate insights from completed tasks
 */
export async function generateDecisionInsights(
  tasks: any[],
  options?: {
    userId: number;
    timeFrame?: { start: string; end: string };
    includeCompletedOnly?: boolean;
  }
): Promise<any> {
  const ai = getAIManager();
  return ai.generateTaskInsights(tasks, options);
}

/**
 * Predict completion time for a task with confidence
 */
export async function predictTaskCompletion(
  taskId: number,
  context: {
    userId: number;
    factors?: {
      taskComplexity?: "simple" | "moderate" | "complex";
      energyLevel?: "high" | "medium" | "low";
      deadlineUrgency?: number;
      availableTime?: number;
    };
  }
): Promise<any> {
  const ai = getAIManager();
  return ai.predictTaskDuration(taskId, context);
}

/**
 * Suggest task dependencies based on patterns
 */
export async function suggestTaskDependencies(
  tasks: any[],
  userId: number,
  options?: {
    similarityThreshold?: number;
    excludeCompleted?: boolean;
  }
): Promise<Array<{ sourceTaskId: number; targetTaskId: number; reason: string; strength: number }>> {
  const ai = getAIManager();
  return ai.suggestDependencies(tasks, userId, options);
}

/**
 * Generate retrospective analysis from completed tasks
 */
export async function generateRetrospective(
  tasks: any[],
  userId: number,
  options?: {
    timeRange?: { start: string; end: string };
    focusAreas?: string[];
  }
): Promise<any> {
  const ai = getAIManager();
  return ai.generateRetrospective(tasks, userId, options);
}

/**
 * Helper function to determine decision type from edit command
 */
function determineDecisionType(input: EnhancedEditCommand): string {
  switch (input.action) {
    case "edit":
    case "update":
      return "approach";
    case "prioritize":
    case "schedule":
      return "priority";
    case "delete":
      return "cancellation";
    case "add_label":
    case "remove_label":
      return "tool";
    case "search":
      return "tool";
    case "complete":
      return "allocation";
    default:
      return "approach";
  }
}

/**
 * Helper function to get task by ID
 */
async function getTaskById(taskId: number): Promise<any> {
  const { getTaskById } = await import("@/lib/actions/tasks");
  return getTaskById(taskId);
}

// Re-export AI manager
export { getAIManager } from "./providers";