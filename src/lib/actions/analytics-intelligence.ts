/**
 * Advanced Analytics Intelligence Dashboard
 */

'use server';

import { getDb } from '@/lib/db';

export interface ProductivityPattern {
  patternType:
    'morning_person' | 'night_owl' | 'batcher' | 'spreader' | 'cyclist';
  confidence: number;
  description: string;
  recommendation: string;
}

export interface CognitiveLoadMetrics {
  currentLoad: number;
  optimalCapacity: number;
  overloadRisk: number;
  recommendedBreaks: number;
}

export interface TaskDNA {
  complexity: number;
  cognitiveLoad: number;
  timeEstimateAccuracy: number;
  completionTrend: 'improving' | 'declining' | 'stable';
  energyMatch: number;
}

export interface PredictionResult {
  completionProbability: number;
  estimatedCompletionDate: string;
  riskFactors: string[];
  optimizationSuggestions: string[];
}

export interface PerformanceInsight {
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  suggestedAction: string;
}

/**
 * Analyze productivity patterns for a user
 */
export async function analyzeProductivityPatterns(
  userId: number
): Promise<ProductivityPattern> {
  const db = getDb();

  // Get completed tasks with timestamps
  const completedTasks = db
    .prepare(
      `
    SELECT completed_at, actual_minutes
    FROM tasks
    WHERE user_id = ? AND completed = 1 AND completed_at IS NOT NULL
    ORDER BY completed_at DESC
    LIMIT 100
  `
    )
    .all(userId) as any[];

  if (completedTasks.length < 5) {
    return {
      patternType: 'spreader',
      confidence: 0.3,
      description: 'Not enough data to determine pattern',
      recommendation:
        'Complete more tasks to identify your productivity patterns',
    };
  }

  // Analyze completion times
  const byHour = new Map<number, number>();
  completedTasks.forEach(task => {
    const hour = new Date(task.completed_at).getHours();
    const current = byHour.get(hour) || 0;
    byHour.set(hour, current + 1);
  });

  // Find peak hours
  const hours = Array.from(byHour.entries()).sort((a, b) => b[1] - a[1]);
  const topHours = hours.slice(0, 3).map(h => h[0]);

  // Determine pattern type
  const morningScore = topHours.filter(h => h < 12).length;
  const afternoonScore = topHours.filter(h => h >= 12 && h < 18).length;
  const eveningScore = topHours.filter(h => h >= 18).length;

  let patternType: ProductivityPattern['patternType'] = 'spreader';
  const confidence = 0.7;

  if (morningScore > afternoonScore && morningScore > eveningScore) {
    patternType = 'morning_person';
  } else if (eveningScore > morningScore && eveningScore > afternoonScore) {
    patternType = 'night_owl';
  } else if (
    topHours.length > 0 &&
    topHours[0] - (topHours[topHours.length - 1] || 0) > 4
  ) {
    patternType = 'batcher';
  }

  return {
    patternType,
    confidence,
    description: `Peak productivity at ${topHours.map(h => `${h}:00`).join(', ')}`,
    recommendation: getPatternRecommendation(patternType, patternType),
  };
}

function getPatternRecommendation(
  type: ProductivityPattern['patternType'],
  patternType: string
): string {
  const recommendations: Record<string, string> = {
    morning_person:
      'Schedule critical work between 8 AM - 12 PM, batch meetings in the afternoon',
    night_owl:
      'Tackle complex tasks after 2 PM, schedule deep work in the evening',
    batcher: 'Group similar tasks together, schedule 2-3 hour focused blocks',
    spreader:
      'Distribute workload evenly, take short breaks every 30-45 minutes',
    cyclist:
      'Work early morning, take midday break, return in late afternoon for a second peak',
  };

  return recommendations[type] || recommendations.spreader;
}

/**
 * Get cognitive load metrics for a user
 */
export async function getCognitiveLoadMetrics(
  userId: number
): Promise<CognitiveLoadMetrics> {
  const db = getDb();

  // Get active tasks
  const activeTasks = db
    .prepare(
      `
    SELECT id, status, due_date
    FROM tasks
    WHERE user_id = ? AND completed = 0
  `
    )
    .all(userId) as any[];

  // Get recent completion rate
  const recentCompleted = db
    .prepare(
      `
    SELECT COUNT(*) as count
    FROM tasks
    WHERE user_id = ? AND completed = 1 AND completed_at >= datetime('now', '-7 days')
  `
    )
    .get(userId) as { count: number };

  const recentTotal = db
    .prepare(
      `
    SELECT COUNT(*) as count
    FROM tasks
    WHERE user_id = ? AND completed_at >= datetime('now', '-7 days')
  `
    )
    .get(userId) as { count: number };

  const completionRate =
    recentTotal.count > 0 ? recentCompleted.count / recentTotal.count : 0;

  // Calculate current load (4-5 tasks = 100%, each additional task adds 20%)
  const taskCount = activeTasks.length;
  const currentLoad = Math.min(1, taskCount / 5);

  // Optimal capacity
  const optimalCapacity = 0.8;

  // Overload risk
  const overloadRisk =
    currentLoad > optimalCapacity
      ? Math.min(1, (currentLoad - optimalCapacity) / 0.2)
      : 0;

  // Recommended breaks (1 per 3 hours of work, minimum 1)
  const recommendedBreaks = Math.max(1, Math.floor(taskCount / 3));

  return {
    currentLoad,
    optimalCapacity,
    overloadRisk,
    recommendedBreaks,
  };
}

/**
 * Generate Task DNA for a task
 */
export async function generateTaskDNA(
  taskId: number,
  userId: number
): Promise<TaskDNA> {
  const db = getDb();

  const task = db
    .prepare(
      `
    SELECT * FROM tasks
    WHERE id = ? AND user_id = ?
  `
    )
    .get(taskId, userId) as any | undefined;

  if (!task) {
    throw new Error('Task not found');
  }

  // Calculate complexity based on description length and dependencies
  const descriptionLength = task.description?.length || 0;
  const dependencyCount = db
    .prepare(
      `
    SELECT COUNT(*) as count FROM task_dependencies
    WHERE task_id = ?
  `
    )
    .get(taskId) as { count: number };

  const complexity = Math.min(
    1,
    (descriptionLength / 200 + dependencyCount.count / 5) / 2
  );

  // Cognitive load
  const hasLabels = task.labels ? JSON.parse(task.labels).length : 0;
  const cognitiveLoad = Math.min(
    1,
    3 - task.priority_score / 30 + hasLabels * 0.1
  );

  // Time estimate accuracy
  const actualMinutes = task.actual_minutes || 0;
  const estimatedMinutes = parseDurationToMinutes(task.estimate) || 30;
  const timeEstimateAccuracy =
    actualMinutes > 0
      ? Math.max(
          0,
          1 - Math.abs(actualMinutes - estimatedMinutes) / actualMinutes
        )
      : 0;

  // Completion trend (would need historical data)
  const completedTasks = db
    .prepare(
      `
    SELECT COUNT(*) as count FROM tasks
    WHERE user_id = ? AND completed = 1 AND completed_at >= datetime('now', '-30 days')
  `
    )
    .get(userId) as { count: number };

  const totalTasks = db
    .prepare(
      `
    SELECT COUNT(*) as count FROM tasks
    WHERE user_id = ? AND completed_at >= datetime('now', '-30 days')
  `
    )
    .get(userId) as { count: number };

  const completionRate =
    totalTasks.count > 0 ? completedTasks.count / totalTasks.count : 0;
  const completionTrend: TaskDNA['completionTrend'] =
    completionRate > 0.8
      ? 'improving'
      : completionRate < 0.5
        ? 'declining'
        : 'stable';

  // Energy match (would need energy profile data)
  const energyMatch = 0.7; // Placeholder

  return {
    complexity,
    cognitiveLoad,
    timeEstimateAccuracy,
    completionTrend,
    energyMatch,
  };
}

/**
 * Predict task completion
 */
export async function predictTaskCompletion(
  taskId: number,
  userId: number
): Promise<PredictionResult> {
  const db = getDb();

  const task = db
    .prepare(
      `
    SELECT t.*, u.name as assignee_name
    FROM tasks t
    LEFT JOIN users u ON t.assignee_id = u.id
    WHERE t.id = ? AND t.user_id = ?
  `
    )
    .get(taskId, userId) as any | undefined;

  if (!task) {
    throw new Error('Task not found');
  }

  const taskDNA = await generateTaskDNA(taskId, userId);
  const patterns = await analyzeProductivityPatterns(userId);

  // Calculate probability
  let probability = 0.5;

  // Priority factor
  const priorityFactor = (task.priority_score || 50) / 100;
  probability = (probability + priorityFactor) / 2;

  // Age factor (older tasks more likely to be done)
  const createdDate = new Date(task.created_at);
  const ageDays = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
  const ageFactor = Math.min(1, ageDays / 30);
  probability = (probability + ageFactor) / 2;

  // Due date factor
  if (task.deadline) {
    const dueDate = new Date(task.deadline);
    const daysUntil = (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysUntil <= 0) {
      probability = Math.min(1, probability + 0.3); // Overdue boost
    } else if (daysUntil <= 3) {
      probability = Math.min(1, probability + 0.2);
    }
  }

  // Estimate completion date
  const estimatedMinutes = parseDurationToMinutes(task.estimate) || 60;
  const created = new Date(task.created_at);
  const estimatedDays = estimatedMinutes / 60 / 8; // Divide by 8 hours per day
  const estimatedCompletion = new Date(created);
  estimatedCompletion.setDate(estimatedCompletion.getDate() + estimatedDays);

  // Risk factors
  const riskFactors: string[] = [];
  if (taskDNA.complexity > 0.7) riskFactors.push('High task complexity');
  if (taskDNA.cognitiveLoad > 0.7) riskFactors.push('High cognitive load');
  if (ageDays > 14) riskFactors.push('Task is aging');
  if (!task.deadline) riskFactors.push('No deadline set');

  // Optimization suggestions
  const suggestions: string[] = [];
  if (taskDNA.complexity > 0.5)
    suggestions.push('Break task into smaller subtasks');
  if (
    patterns.patternType === 'morning_person' &&
    new Date().getHours() >= 18
  ) {
    suggestions.push('Schedule this task for tomorrow morning');
  }
  if (taskDNA.timeEstimateAccuracy < 0.7)
    suggestions.push('Review time estimates based on actual completion times');

  return {
    completionProbability: Math.round(probability * 100),
    estimatedCompletionDate: estimatedCompletion.toISOString().split('T')[0],
    riskFactors,
    optimizationSuggestions: suggestions,
  };
}

/**
 * Generate performance insights
 */
export async function generatePerformanceInsights(
  userId: number
): Promise<PerformanceInsight[]> {
  const db = getDb();

  const insights: PerformanceInsight[] = [];

  // Completion rate insight
  const completed = db
    .prepare(
      `
    SELECT COUNT(*) as count FROM tasks
    WHERE user_id = ? AND completed = 1 AND completed_at >= datetime('now', '-30 days')
  `
    )
    .get(userId) as { count: number };

  const total = db
    .prepare(
      `
    SELECT COUNT(*) as count FROM tasks
    WHERE user_id = ? AND created_at >= datetime('now', '-30 days')
  `
    )
    .get(userId) as { count: number };

  const completionRate = total.count > 0 ? completed.count / total.count : 0;

  if (completionRate < 0.5) {
    insights.push({
      title: 'Low Completion Rate',
      description: `Only ${Math.round(completionRate * 100)}% of tasks completed in the last 30 days`,
      impact: 'high',
      actionable: true,
      suggestedAction:
        'Review task prioritization and consider breaking large tasks into smaller pieces',
    });
  } else if (completionRate > 0.8) {
    insights.push({
      title: 'High Productivity',
      description: `Excellent ${Math.round(completionRate * 100)}% task completion rate!`,
      impact: 'medium',
      actionable: true,
      suggestedAction:
        'Maintain current workflow and consider mentoring others',
    });
  }

  // Pattern insight
  const patterns = await analyzeProductivityPatterns(userId);
  if (patterns.confidence > 0.7 && patterns.recommendation) {
    insights.push({
      title: 'Productivity Pattern Detected',
      description: patterns.description,
      impact: 'medium',
      actionable: true,
      suggestedAction: patterns.recommendation,
    });
  }

  // Cognitive load insight
  const load = await getCognitiveLoadMetrics(userId);
  if (load.overloadRisk > 0.5) {
    insights.push({
      title: 'Risk of Overwhelm',
      description: `Current task load (${Math.round(load.currentLoad * 100)}%) exceeds optimal capacity`,
      impact: 'high',
      actionable: true,
      suggestedAction: `Take ${load.recommendedBreaks} break(s) today and limit new task intake`,
    });
  }

  return insights;
}

/**
 * Get trend analysis for a metric over time
 */
export async function getTrendAnalysis(
  userId: number,
  metric: 'completion_rate' | 'velocity' | 'priority' | 'time_spent',
  days = 30
): Promise<{
  data: Array<{ date: string; value: number }>;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
}> {
  const db = getDb();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get daily completion data
  const dailyData = db
    .prepare(
      `
    SELECT
      date(completed_at) as date,
      COUNT(*) as completed,
      (SELECT COUNT(*) FROM tasks t2 WHERE date(t2.created_at) = date(completed_at) AND t2.user_id = ?) as created
    FROM tasks
    WHERE user_id = ?
    AND completed = 1
    AND completed_at >= ?
    GROUP BY date(completed_at)
    ORDER BY date
  `
    )
    .all(userId, userId, startDate.toISOString()) as any[];

  const data = dailyData.map(d => ({
    date: d.date,
    value: d.completed,
  }));

  // Calculate trend
  if (data.length < 2) {
    return { data, trend: 'stable', trendValue: 0 };
  }

  const firstHalf = data.slice(0, Math.floor(data.length / 2));
  const secondHalf = data.slice(Math.floor(data.length / 2));

  const firstAvg =
    firstHalf.reduce((sum, d) => sum + d.value, 0) / firstHalf.length;
  const secondAvg =
    secondHalf.reduce((sum, d) => sum + d.value, 0) / secondHalf.length;

  const trendValue = Math.round(((secondAvg - firstAvg) / firstAvg) * 100);
  const trend: 'up' | 'down' | 'stable' =
    trendValue > 5 ? 'up' : trendValue < -5 ? 'down' : 'stable';

  return { data, trend, trendValue };
}

/**
 * Helper to parse duration string to minutes
 */
function parseDurationToMinutes(
  duration: string | null | undefined
): number | null {
  if (!duration) return null;

  const match = duration.match(/(\d+)(min|hr|h)?/);
  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2] || 'min';

  if (unit.startsWith('h') || unit === 'hr') {
    return value * 60;
  }
  return value;
}
