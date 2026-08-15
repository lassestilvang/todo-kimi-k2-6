import { getDb } from '@/lib/db';
import { logError } from '@/lib/logger';
import { executeWorkflow, evaluateConditions } from '@/lib/actions/workflows';
import { Task } from '@/types';

/**
 * Cron job to trigger workflows based on schedules and events
 * Run every 5 minutes to check for trigger conditions
 */
export async function GET() {
  try {
    const db = getDb();
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentDate = now.toISOString().split('T')[0];

    let triggeredCount = 0;

    // Get all active workflows
    const workflows = db
      .prepare(
        `
        SELECT w.*, u.email as user_email
        FROM workflows w
        JOIN users u ON w.user_id = u.id
        WHERE w.enabled = 1
      `
      )
      .all() as Array<{
      id: number;
      user_id: number;
      name: string;
      trigger_type: string;
      trigger_config: string;
      action_type: string;
      action_config: string;
      condition_json: string | null;
    }>;

    for (const workflow of workflows) {
      const triggerConfig = JSON.parse(workflow.trigger_config || '{}');
      const conditionConfig = workflow.condition_json
        ? JSON.parse(workflow.condition_json)
        : null;

      let shouldTrigger = false;
      const inputData: Record<string, unknown> = {};

      switch (workflow.trigger_type) {
        case 'cron':
          shouldTrigger = checkCronSchedule(
            triggerConfig,
            currentHour,
            currentMinute,
            currentDay
          );
          break;

        case 'schedule':
          shouldTrigger = checkScheduleSchedule(triggerConfig, currentDate);
          break;

        case 'task_completed':
          const completedTasks = await getRecentlyCompletedTasks(
            db,
            workflow.user_id,
            currentHour,
            currentMinute
          );
          if (completedTasks.length > 0) {
            shouldTrigger = true;
            inputData.tasks = completedTasks;
          }
          break;

        case 'task_created':
          const newTasks = await getRecentlyCreatedTasks(
            db,
            workflow.user_id,
            currentHour,
            currentMinute
          );
          if (newTasks.length > 0) {
            shouldTrigger = true;
            inputData.tasks = newTasks;
          }
          break;

        case 'due_date':
          const dueTasks = await getDueTodayTasks(
            db,
            workflow.user_id,
            currentDate
          );
          if (dueTasks.length > 0) {
            shouldTrigger = true;
            inputData.tasks = dueTasks;
          }
          break;

        case 'manual':
          // Manual triggers aren't auto-executed
          shouldTrigger = false;
          break;
      }

      // Evaluate conditions if trigger would fire
      if (shouldTrigger && conditionConfig) {
        // Add context for condition evaluation
        if (Array.isArray(inputData.tasks) && inputData.tasks.length > 0) {
          inputData.task_priority = (inputData.tasks[0] as Task).priority;
          inputData.task_labels =
            (inputData.tasks[0] as Task).labels?.map(l => l.name) || [];
          inputData.due_date = (inputData.tasks[0] as Task).deadline;
        }
        shouldTrigger = await evaluateConditions(conditionConfig, inputData);
      }

      // Execute workflow if triggered
      if (shouldTrigger) {
        try {
          await executeWorkflow(workflow.id, inputData, workflow.user_id);
          triggeredCount++;
        } catch (error) {
          logError(
            `Workflow ${workflow.id} execution failed`,
            undefined,
            error instanceof Error ? error : new Error(String(error))
          );
        }
      }
    }

    return Response.json({ success: true, triggered: triggeredCount });
  } catch (error) {
    logError(
      'Workflow cron job error',
      undefined,
      error instanceof Error ? error : new Error(String(error))
    );
    return Response.json(
      { error: 'Workflow cron job failed' },
      { status: 500 }
    );
  }
}

/**
 * Check if current time matches cron schedule
 */
function checkCronSchedule(
  config: Record<string, unknown>,
  hour: number,
  minute: number,
  day: number
): boolean {
  // Support simple cron-like formats
  // Example: { "cron": "0 */2 * * *" } - every 2 hours
  // Or: { "hour": "*/2" } - shorthand

  const cron = config.cron as string | undefined;
  if (cron) {
    return matchCron(cron, hour, minute, day);
  }

  const hourSpec = config.hour as string | undefined;
  const minuteSpec = config.minute as string | undefined;

  if (hourSpec) {
    if (!matchSpec(hourSpec, hour)) return false;
  }

  if (minuteSpec) {
    if (!matchSpec(minuteSpec, minute)) return false;
  }

  // Check day of week if specified
  const daySpec = config.day as string | undefined;
  if (daySpec) {
    if (!matchSpec(daySpec, day)) return false;
  }

  return true;
}

/**
 * Match time specification against current time
 */
function matchSpec(spec: string, value: number): boolean {
  // Handle "*/n" (every n hours/minutes)
  if (spec.startsWith('*/')) {
    const interval = parseInt(spec.slice(2), 10);
    return value % interval === 0;
  }

  // Handle specific value or range
  if (spec.includes('-')) {
    const [start, end] = spec.split('-').map(s => parseInt(s, 10));
    return value >= start && value <= end;
  }

  // Handle comma-separated list
  if (spec.includes(',')) {
    const values = spec.split(',').map(s => parseInt(s, 10));
    return values.includes(value);
  }

  // Handle exact value
  return parseInt(spec, 10) === value;
}

/**
 * Parse and match basic cron expression (5-field format)
 * minute hour day month weekday
 */
function matchCron(
  cron: string,
  hour: number,
  minute: number,
  day: number
): boolean {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const [minSpec, hourSpec, daySpec, , dayOfWeekSpec] = parts;

  return (
    matchSpec(minSpec, minute) &&
    matchSpec(hourSpec, hour) &&
    (matchSpec(daySpec, new Date().getDate()) || matchSpec(dayOfWeekSpec, day))
  );
}

/**
 * Check schedule-based triggers
 */
function checkScheduleSchedule(
  config: Record<string, unknown>,
  date: string
): boolean {
  // Check if today matches the schedule
  const scheduleType = config.type as string | undefined;

  if (scheduleType === 'daily') {
    return true;
  }

  if (scheduleType === 'weekly') {
    const dayOfWeek = new Date(date).getDay();
    const days = (config.days as string[]) || [
      'mon',
      'tue',
      'wed',
      'thu',
      'fri',
    ];
    const dayMap: Record<string, number> = {
      mon: 1,
      tue: 2,
      wed: 3,
      thu: 4,
      fri: 5,
      sat: 6,
      sun: 0,
    };
    return days.some(d => dayMap[d] === dayOfWeek);
  }

  if (scheduleType === 'monthly') {
    const dayOfMonth = new Date(date).getDate();
    const day = config.day as number | undefined;
    return day === dayOfMonth;
  }

  return false;
}

/**
 * Get recently completed tasks for a user
 */
async function getRecentlyCompletedTasks(
  db: ReturnType<typeof getDb>,
  userId: number,
  _hour: number,
  _minute: number
): Promise<Task[]> {
  // Get tasks completed in the last 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const threshold = fiveMinutesAgo.toISOString();

  return db
    .prepare(
      `
      SELECT t.*, l.name as list_name
      FROM tasks t
      LEFT JOIN lists l ON t.list_id = l.id
      WHERE t.user_id = ?
      AND t.completed = 1
      AND t.completed_at >= ?
      ORDER BY t.completed_at DESC
    `
    )
    .all(userId, threshold) as Task[];
}

/**
 * Get recently created tasks for a user
 */
async function getRecentlyCreatedTasks(
  db: ReturnType<typeof getDb>,
  userId: number,
  _hour: number,
  _minute: number
): Promise<Task[]> {
  // Get tasks created in the last 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const threshold = fiveMinutesAgo.toISOString();

  return db
    .prepare(
      `
      SELECT t.*, l.name as list_name
      FROM tasks t
      LEFT JOIN lists l ON t.list_id = l.id
      WHERE t.user_id = ?
      AND t.created_at >= ?
      ORDER BY t.created_at DESC
    `
    )
    .all(userId, threshold) as Task[];
}

/**
 * Get tasks due today
 */
async function getDueTodayTasks(
  db: ReturnType<typeof getDb>,
  userId: number,
  date: string
): Promise<Task[]> {
  return db
    .prepare(
      `
      SELECT t.*, l.name as list_name
      FROM tasks t
      LEFT JOIN lists l ON t.list_id = l.id
      WHERE t.user_id = ?
      AND date(t.deadline) = ?
      AND t.completed = 0
      ORDER BY t.priority DESC, t.deadline ASC
    `
    )
    .all(userId, date) as Task[];
}
