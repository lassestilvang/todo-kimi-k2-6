/**
 * Contextual AI Assistant features
 * Enhances the basic AI parsing with calendar context, user preferences, and prediction
 */

import type { TaskWithRelations, UserSettings } from '@/types';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
}

export interface MorningBriefing {
  topTasks: Array<{
    task: TaskWithRelations;
    reasoning: string;
    suggestedTime: string;
  }>;
  scheduleConflicts: Array<{
    task: string;
    conflict: string;
  }>;
  energyMatch: Array<{
    task: string;
    suggestedTime: string;
    confidence: number;
  }>;
  insights: string[];
}

export interface EndOfDaySummary {
  completed: string[];
  inProgress: string[];
  upcoming: string[];
  reflectionPrompt: string;
  nextDayPreview: string;
}

export interface EventTask {
  task: Partial<TaskWithRelations>;
  extractionMethod: string;
  confidence: number;
  suggestedAssignee?: string;
}

/**
 * Analyze calendar events and extract action items
 */
export async function analyzeCalendarContext(
  events: CalendarEvent[],
  userTasks: TaskWithRelations[]
): Promise<EventTask[]> {
  const actionVerbs = [
    'follow up',
    'review',
    'prepare',
    'create',
    'update',
    'send',
    'schedule',
    'discuss',
    'complete',
    'finalize',
    'call',
    'meeting',
    'presentation',
    'presentation',
  ];

  const results: EventTask[] = [];

  for (const event of events) {
    const needsAction = actionVerbs.some(
      verb =>
        event.title.toLowerCase().includes(verb) ||
        event.description?.toLowerCase().includes(verb)
    );

    if (!needsAction) continue;

    // Check if a related task already exists
    const existingTask = userTasks.find(
      t =>
        t.name.toLowerCase().includes(event.title.toLowerCase()) && !t.completed
    );

    if (existingTask) continue;

    // Extract due date from event
    const dueDate = event.start.toISOString().split('T')[0];

    results.push({
      task: {
        name: event.title,
        description: event.description?.substring(0, 500),
        date: dueDate,
        deadline: dueDate,
        priority: 'high', // Events are typically important
        assignee_id: undefined,
      },
      extractionMethod: 'calendar_event',
      confidence: 0.8,
      suggestedAssignee: event.location ? 'present' : undefined,
    });
  }

  return results;
}

/**
 * Generate a morning briefing for the user
 */
export async function generateMorningBriefing(
  userId: number,
  tasks: TaskWithRelations[],
  settings?: UserSettings,
  calendarEvents?: CalendarEvent[]
): Promise<MorningBriefing> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Get today's tasks
  const todaysTasks = tasks
    .filter(
      t =>
        t.date === todayStr ||
        (t.deadline && new Date(t.deadline) <= today) ||
        (t.deadline && new Date(t.deadline) >= new Date(todayStr))
    )
    .sort((a, b) => {
      // Sort by priority and deadline
      const priorityOrder = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3,
        none: 4,
      };
      const aPriority =
        priorityOrder[a.priority as keyof typeof priorityOrder] || 4;
      const bPriority =
        priorityOrder[b.priority as keyof typeof priorityOrder] || 4;

      if (aPriority !== bPriority) return aPriority - bPriority;

      // Then by deadline
      if (a.deadline && b.deadline) {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      if (a.deadline) return -1;
      if (b.deadline) return 1;

      return 0;
    });

  // Get top 3 tasks
  const topTasks = todaysTasks.slice(0, 3).map(task => {
    let reasoning = '';
    if (task.priority === 'critical') {
      reasoning = 'Critical priority';
    } else if (task.deadline) {
      const daysUntil = Math.ceil(
        (new Date(task.deadline).getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      reasoning = `Due in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}`;
    } else {
      reasoning = 'Scheduled for today';
    }

    // Suggest optimal time based on user's work hours
    const workStart = settings?.work_start_hour || 9;
    const workEnd = settings?.work_end_hour || 17;
    const hour = Math.floor(workStart + (task.priority === 'critical' ? 0 : 2));

    return {
      task,
      reasoning,
      suggestedTime: `${hour.toString().padStart(2, '0')}:00`,
    };
  });

  // Generate insights
  const insights: string[] = [];

  // Energy insight
  if (todaysTasks.length > 8) {
    insights.push('You have many tasks today. Consider batching similar ones.');
  }

  // Deadline insight
  const overdue = tasks.filter(
    t => t.deadline && new Date(t.deadline) < today && !t.completed
  );
  if (overdue.length > 0) {
    insights.push(
      `${overdue.length} task(s) are overdue. Quick review recommended`
    );
  }

  // Productivity pattern insight
  const completionRate =
    tasks.length > 0
      ? (tasks.filter(t => t.completed).length / tasks.length) * 100
      : 0;

  if (completionRate > 70) {
    insights.push('Great start yesterday! Keep this momentum going.');
  } else if (completionRate < 50) {
    insights.push('Consider breaking down large tasks for better progress.');
  }

  return {
    topTasks,
    scheduleConflicts: [], // Would be populated from calendar sync
    energyMatch: [], // Would be populated from circadian analysis
    insights,
  };
}

/**
 * Generate an end-of-day summary
 */
export async function generateEndOfDaySummary(
  userId: number,
  tasks: TaskWithRelations[]
): Promise<EndOfDaySummary> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Completed today
  const completedToday = tasks
    .filter(
      t =>
        t.completed &&
        t.completed_at &&
        new Date(t.completed_at).toISOString().split('T')[0] === todayStr
    )
    .map(t => t.name);

  // In progress
  const inProgress = tasks.filter(t => !t.completed).map(t => t.name);

  // Upcoming
  const tomorrowStr = new Date(today.getTime() + 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  const upcoming = tasks
    .filter(t => t.date === tomorrowStr && !t.completed)
    .map(t => t.name);

  // Generate reflection prompt based on today's work
  const reflectionPrompt =
    completedToday.length > 0
      ? `What helped you complete ${completedToday.length} task(s) today?`
      : "Ready to tackle tomorrow's tasks?";

  // Next day preview
  const nextDayPreview =
    upcoming.length > 0
      ? `${upcoming.length} task(s) scheduled for tomorrow`
      : 'No specific tasks scheduled for tomorrow';

  return {
    completed: completedToday,
    inProgress,
    upcoming,
    reflectionPrompt,
    nextDayPreview,
  };
}

/**
 * Predict task completion time
 */
export interface TaskPrediction {
  taskId: number;
  estimatedCompletion: Date;
  confidence: number;
  reasoning: string;
}

export async function predictTaskCompletion(
  tasks: TaskWithRelations[],
  userHistoricalData?: Array<{
    task_type: string;
    estimated_time: number;
    actual_time: number;
    completed: boolean;
  }>
): Promise<TaskPrediction[]> {
  const predictions: TaskPrediction[] = [];

  for (const task of tasks) {
    if (task.completed) continue;

    let estimatedMinutes = 30; // Default
    let confidence = 0.5;
    let reasoning = 'Default estimate';

    // Use historical data for better predictions
    if (userHistoricalData && userHistoricalData.length > 0) {
      const similarTasks = userHistoricalData.filter(
        h =>
          !h.completed &&
          h.task_type === task.name.substring(0, 10).toLowerCase()
      );

      if (similarTasks.length > 0) {
        const avgActual =
          similarTasks.reduce((sum, h) => sum + h.actual_time, 0) /
          similarTasks.length;
        estimatedMinutes = avgActual;
        confidence = 0.8;
        reasoning = `Based on ${similarTasks.length} similar task(s)`;
      }
    }

    // Adjust for priority
    const priorityMultiplier: Record<string, number> = {
      critical: 0.5, // Critical tasks get scheduled first
      high: 0.7,
      medium: 1.0,
      low: 1.3,
      none: 1.5,
    };

    const multiplier = priorityMultiplier[task.priority] || 1.0;
    estimatedMinutes = Math.round(estimatedMinutes * multiplier);

    // Calculate completion date based on deadline
    let estimatedCompletion = new Date();
    if (task.deadline) {
      estimatedCompletion = new Date(task.deadline);
    } else if (task.date) {
      estimatedCompletion = new Date(task.date);
    }

    predictions.push({
      taskId: task.id,
      estimatedCompletion,
      confidence,
      reasoning,
    });
  }

  return predictions;
}

/**
 * Find schedule conflicts
 */
export interface ScheduleConflict {
  taskId: number;
  taskName: string;
  deadline: Date;
  existingSchedule: Array<{
    taskName: string;
    startTime: Date;
    endTime: Date;
  }>;
}

export function detectScheduleConflicts(
  tasks: TaskWithRelations[],
  calendarSlots: Array<{
    start: Date;
    end: Date;
    title: string;
  }>
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];

  for (const task of tasks) {
    if (!task.deadline) continue;

    const taskDeadline = new Date(task.deadline);

    const conflictingSlots = calendarSlots.filter(slot => {
      const slotStart = new Date(slot.start);
      const slotEnd = new Date(slot.end);
      const deadlineTime = taskDeadline.getTime();

      // Check if conflict exists near deadline
      return (
        (taskDeadline >= slotStart && taskDeadline <= slotEnd) ||
        (slotStart >= new Date(deadlineTime - 24 * 60 * 60 * 1000) &&
          slotStart <= new Date(deadlineTime + 24 * 60 * 60 * 1000))
      );
    });

    if (conflictingSlots.length > 0) {
      conflicts.push({
        taskId: task.id,
        taskName: task.name,
        deadline: taskDeadline,
        existingSchedule: conflictingSlots.map(slot => ({
          taskName: slot.title,
          startTime: new Date(slot.start),
          endTime: new Date(slot.end),
        })),
      });
    }
  }

  return conflicts;
}
