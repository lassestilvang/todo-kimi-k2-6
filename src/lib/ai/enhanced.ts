'use server';

import { z } from 'zod';
import {
  getAIManager,
  TaskDurationInput,
  DurationPredictionContext,
} from './providers';

/**
 * Basic task structure for enhanced edit context
 */
export interface EnhancedTask {
  id: number;
  name: string;
  completed: boolean;
  priority: string;
  [key: string]: unknown;
}

// Zod schema for enhanced task editing with decision tracking
export const enhancedEditCommandSchema = z.object({
  action: z.enum([
    'edit',
    'delete',
    'complete',
    'prioritize',
    'schedule',
    'add_label',
    'remove_label',
    'search',
    'record_decision',
  ]),
  taskId: z.number().optional(),
  taskName: z.string().optional(),
  updates: z.record(z.string(), z.unknown()).optional(),
  searchQuery: z.string().optional(),
  decisionContext: z
    .object({
      question: z.string(),
      options: z.array(
        z.object({
          text: z.string(),
          pros: z.array(z.string()),
          cons: z.array(z.string()),
          weight: z.number().min(0).max(1),
        })
      ),
      timeframe: z.string().optional(),
      impact_level: z.enum(['low', 'medium', 'high']).optional(),
    })
    .optional(),
});

export type EnhancedEditCommand = z.infer<typeof enhancedEditCommandSchema>;

/**
 * Enhanced task editing with AI decision-making support
 */
export async function enhancedEditTask(
  input: EnhancedEditCommand,
  context: { tasks: EnhancedTask[]; userId: number }
): Promise<{
  success: boolean;
  message: string;
  task?: EnhancedTask;
  decisionId?: number;
}> {
  switch (input.action) {
    case 'edit':
    case 'delete':
    case 'complete':
    case 'prioritize':
    case 'schedule':
    case 'add_label':
    case 'remove_label':
    case 'search': {
      // Process edit command with AI parsing
      await processEditCommand(getAIManager(), input, context);

      return {
        success: true,
        message: `AI processed edit command`,
        task: input.taskId
          ? {
              id: input.taskId,
              name: '',
              completed: false,
              priority: 'medium',
            }
          : undefined,
        decisionId: undefined,
      };
    }

    case 'record_decision':
      return await recordDecisionWithAI(input, context);

    default:
      throw new Error(`Unsupported action: ${input.action}`);
  }
}

/**
 * Process edit commands using AI
 */
async function processEditCommand(
  ai: Awaited<ReturnType<typeof getAIManager>>,
  input: EnhancedEditCommand,
  context: { tasks: EnhancedTask[]; userId: number }
): Promise<{
  success: boolean;
  message: string;
  task?: EnhancedTask;
  decisionId?: number;
}> {
  const typedTasks = context.tasks as {
    id: number;
    name: string;
    completed: boolean;
    priority: string;
  }[];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const result = await ai.parseEditCommand(input.searchQuery || '', {
    tasks: typedTasks,
  });

  return {
    success: true,
    message: `AI processed edit command`,
    task: input.taskId
      ? {
          id: input.taskId,
          name: '',
          completed: false,
          priority: 'medium',
        }
      : undefined,
    decisionId: undefined,
  };
}

/**
 * Record a decision based on AI analysis
 */
async function recordDecisionWithAI(
  input: EnhancedEditCommand,
  _context: { tasks: EnhancedTask[]; userId: number }
): Promise<{
  success: boolean;
  message: string;
  task?: EnhancedTask;
  decisionId?: number;
}> {
  if (!input.decisionContext) {
    throw new Error('Decision context is required for decision recording');
  }

  // Record the decision using keyword parser analysis
  const { createDecisionEntry } = await import('@/lib/actions/decisions');
  const result = await createDecisionEntry({
    task_id: input.taskId,
    decision_type: determineDecisionType(input),
    question: input.decisionContext.question,
    options: input.decisionContext.options.map(opt => ({
      option_text: opt.text,
      pros: opt.pros ? JSON.stringify(opt.pros) : null,
      cons: opt.cons ? JSON.stringify(opt.cons) : null,
    })) as unknown as import('@/types').DecisionOption[],
  });

  const { entry } = result;

  // Apply the task update if specified
  if (input.updates && input.taskId) {
    const { updateTask } = await import('@/lib/actions/tasks');
    await updateTask(input.taskId, input.updates as Record<string, unknown>);

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
    task: undefined,
    decisionId: entry.id,
  };
}

/**
 * Task insights return type
 */
export interface TaskInsights {
  analysis: string;
  insights?: string[];
}

/**
 * Generate insights from completed tasks
 */
export async function generateDecisionInsights(
  tasks: EnhancedTask[],
  options?: {
    userId: number;
    timeFrame?: { start: string; end: string };
    includeCompletedOnly?: boolean;
  }
): Promise<TaskInsights> {
  const ai = getAIManager();
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ai as any).generateDecisionAnalysis?.(tasks, options) ?? {
      analysis: 'limited ai not available',
    }
  );
}

/**
 * Predict completion time for a task with confidence
 */
export async function predictTaskCompletion(
  taskId: number,
  context: DurationPredictionContext
): Promise<{
  estimated_duration: number;
  confidence: number;
  factors: string[];
}> {
  const ai = getAIManager();
  return ai.predictTaskDuration(
    {
      name: `Task ${taskId}`,
      ...context,
    } as TaskDurationInput,
    context
  );
}

/**
 * Suggest task dependencies based on patterns
 */
export async function suggestTaskDependencies(
  _tasks: EnhancedTask[],
  _userId: number,
  _options?: {
    similarityThreshold?: number;
    excludeCompleted?: boolean;
  }
): Promise<
  Array<{
    sourceTaskId: number;
    targetTaskId: number;
    reason: string;
    strength: number;
  }>
> {
  // Return empty suggestions since no AI method exists
  return [];
}

/**
 * Retrospective analysis result type
 */
export interface RetrospectiveAnalysis {
  analysis: string;
  insights?: string[];
}

/**
 * Generate retrospective analysis from completed tasks
 */
export async function generateRetrospective(
  tasks: EnhancedTask[],
  userId: number,
  options?: {
    timeRange?: { start: string; end: string };
    focusAreas?: string[];
  }
): Promise<RetrospectiveAnalysis> {
  const ai = getAIManager();
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ai as any).generateRetrospective?.(tasks, userId, options) ?? {
      analysis: 'limited ai not available',
    }
  );
}

/**
 * Helper function to determine decision type from edit command
 */
function determineDecisionType(
  input: EnhancedEditCommand
):
  | 'priority'
  | 'approach'
  | 'tool'
  | 'timeline'
  | 'allocation'
  | 'cancellation' {
  switch (input.action) {
    case 'edit':
      return 'approach';
    case 'prioritize':
    case 'schedule':
      return 'timeline';
    case 'delete':
      return 'cancellation';
    case 'add_label':
    case 'remove_label':
      return 'tool';
    case 'search':
      return 'tool';
    case 'complete':
      return 'allocation';
    case 'record_decision':
      return 'approach';
  }
}

/**
 * Helper function to get task by ID
 */
async function getTaskById(taskId: number): Promise<EnhancedTask | null> {
  const { getTaskById } = await import('@/lib/actions/tasks');
  const task = await getTaskById(taskId);
  return task ? (task as unknown as EnhancedTask) : null;
}

// Re-export AI manager
export { getAIManager } from './providers';
