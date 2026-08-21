/**
 * Proactive AI Suggestions - Smart nudges based on user patterns and task analysis
 */

import type { Task, TaskWithRelations } from '@/types';

export interface ProactiveSuggestion {
  type: 'nudge' | 'pattern' | 'focus' | 'balance' | 'risk' | 'streak' | 'habit';
  message: string;
  action?: {
    type: 'create' | 'schedule' | 'complete' | 'reschedule' | 'view';
    taskName?: string;
    taskId?: number;
    suggestedDate?: string;
    view?: string;
  };
  priority: 'low' | 'medium' | 'high';
  confidence: number;
}

/**
 * Generate proactive suggestions based on task patterns and user behavior
 */
export async function generateProactiveSuggestions(
  tasks: TaskWithRelations[],
  userPreferences?: {
    workHours?: { start: number; end: number };
    usualCompletionRate?: number;
    preferredLabels?: string[];
  }
): Promise<ProactiveSuggestion[]> {
  const suggestions: ProactiveSuggestion[] = [];
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentHour = now.getHours();

  // Check for missed streaks
  const completedToday = tasks.filter(
    t => t.completed && t.completed_at && t.completed_at.startsWith(today)
  );
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  const completedYesterday = tasks.filter(
    t => t.completed && t.completed_at && t.completed_at.startsWith(yesterday)
  );

  if (
    completedYesterday.length > 0 &&
    completedToday.length === 0 &&
    currentHour > 12
  ) {
    suggestions.push({
      type: 'streak',
      message: `You completed ${completedYesterday.length} tasks yesterday. Don't break your streak!`,
      action: { type: 'view', view: 'today' },
      priority: 'high',
      confidence: 0.9,
    });
  }

  // Check for pattern: tasks usually done at this time
  const usualCompletionTasks = tasks.filter(t => {
    if (!t.completed || !t.completed_at) return false;
    const completedHour = new Date(t.completed_at).getHours();
    return completedHour === currentHour && t.completed_at.startsWith(today);
  });

  if (usualCompletionTasks.length > 0) {
    const task = usualCompletionTasks[0];
    suggestions.push({
      type: 'pattern',
      message: `You often complete "${task.name}" around this time. Quick reminder?`,
      action: { type: 'complete', taskId: task.id },
      priority: 'medium',
      confidence: 0.7,
    });
  }

  // Focus time suggestions
  const incompleteToday = tasks.filter(
    t => !t.completed && t.date === today && t.priority !== 'low'
  );

  const workStartTime = userPreferences?.workHours?.start || 9;
  const workEndTime = userPreferences?.workHours?.end || 17;

  if (
    currentHour >= workStartTime &&
    currentHour < workStartTime + 2 &&
    incompleteToday.length > 0
  ) {
    suggestions.push({
      type: 'focus',
      message: `Start your workday with ${incompleteToday.length} priority task${incompleteToday.length > 1 ? 's' : ''}`,
      action: { type: 'view', view: 'today' },
      priority: 'high',
      confidence: 0.85,
    });
  }

  // Workload balance suggestions
  const workloadByDate = tasks
    .filter(t => !t.completed && t.date)
    .reduce(
      (acc, task) => {
        const date = task.date!;
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

  const futureWorkloads = Object.entries(workloadByDate)
    .filter(([date]) => date >= today)
    .filter(([, count]) => count > 5);

  for (const [date, count] of futureWorkloads) {
    suggestions.push({
      type: 'balance',
      message: `Heavy workload on ${date}: ${count} tasks. Consider rescheduling some.`,
      action: { type: 'view', view: 'calendar' },
      priority: 'medium',
      confidence: 0.75,
    });
  }

  // Risk assessment: overdue critical tasks
  const overdueCritical = tasks.filter(
    t =>
      !t.completed &&
      t.priority === 'critical' &&
      t.deadline &&
      new Date(t.deadline) < now
  );

  if (overdueCritical.length > 0) {
    suggestions.push({
      type: 'risk',
      message: `${overdueCritical.length} critical task${overdueCritical.length > 1 ? 's' : ''} overdue. Immediate action needed!`,
      action: { type: 'view', view: 'blocked' },
      priority: 'high',
      confidence: 0.95,
    });
  }

  // Low effort quick wins
  const quickWins = tasks.filter(
    t => !t.completed && t.estimate && parseEstimate(t.estimate) <= 30
  );

  if (quickWins.length > 0 && currentHour < workEndTime) {
    suggestions.push({
      type: 'nudge',
      message: `${quickWins.length} quick task${quickWins.length > 1 ? 's' : ''} (<30 min) you can finish now`,
      action: { type: 'view', view: 'today' },
      priority: 'low',
      confidence: 0.6,
    });
  }

  // Habit-based suggestions (for tasks marked with recurring)
  const recurringIncomplete = tasks.filter(
    t => t.recurring !== 'none' && !t.completed && t.date === today
  );

  if (recurringIncomplete.length > 0 && currentHour >= 8 && currentHour <= 10) {
    suggestions.push({
      type: 'habit',
      message: `Morning habit check: ${recurringIncomplete.length} recurring task${recurringIncomplete.length > 1 ? 's' : ''} to complete`,
      action: { type: 'view', view: 'today' },
      priority: 'medium',
      confidence: 0.7,
    });
  }

  return suggestions;
}

/**
 * Parse estimate string to minutes
 */
function parseEstimate(estimate: string): number {
  const parts = estimate.split(':');
  return parseInt(parts[0] || '0') * 60 + parseInt(parts[1] || '0');
}

/**
 * Generate personalized nudges based on user's typical behavior
 */
export function generatePatternNudges(
  tasks: TaskWithRelations[],
  userHistory: Array<{ hour: number; dayOfWeek: number; completed: boolean }>
): ProactiveSuggestion[] {
  const suggestions: ProactiveSuggestion[] = [];
  const now = new Date();
  const currentHour = now.getHours();

  // Find patterns in user history
  const successRateByHour = userHistory.reduce(
    (acc, entry) => {
      acc[entry.hour] = acc[entry.hour] || { total: 0, completed: 0 };
      acc[entry.hour].total++;
      if (entry.completed) acc[entry.hour].completed++;
      return acc;
    },
    {} as Record<number, { total: number; completed: number }>
  );

  const peakHours = Object.entries(successRateByHour)
    .filter(([_, data]) => data.total > 3)
    .sort(
      ([a], [b]) =>
        successRateByHour[Number(b)].completed / userHistory.length -
        successRateByHour[Number(a)].completed / userHistory.length
    )
    .slice(0, 3)
    .map(([hour]) => Number(hour));

  // If it's near a peak hour, suggest starting work
  if (peakHours.includes(currentHour) || peakHours.includes(currentHour - 1)) {
    const incompleteTasks = tasks.filter(
      t => !t.completed && t.date === now.toISOString().split('T')[0]
    );
    if (incompleteTasks.length > 0) {
      suggestions.push({
        type: 'focus',
        message: 'Peak productivity hour! Ready to tackle some tasks?',
        action: { type: 'view', view: 'today' },
        priority: 'low',
        confidence: 0.65,
      });
    }
  }

  return suggestions;
}
