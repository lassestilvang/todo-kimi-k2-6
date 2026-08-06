"use server";

import { getCurrentUser } from "@/lib/session";
import { aiCache } from "./providers";

/**
 * Analyze user's energy patterns based on task completion data
 */
export async function analyzeUserEnergyPatterns(
  userId: number,
  tasks: any[],
  dateRange?: { start: string; end: string }
): Promise<any> {
  const cacheKey = `energy-patterns:${userId}:${dateRange?.start || 'all'}`;
  const cached = aiCache.get<any>(cacheKey);
  if (cached) {
    return cached;
  }

  // Process tasks to extract energy patterns
  const tasksByDate = groupTasksByDate(tasks);
  const dailyPatterns: any[] = [];

  for (const [date, dayTasks] of Object.entries(tasksByDate)) {
    const pattern = analyzeDayPattern(dayTasks, date);
    dailyPatterns.push(pattern);
  }

  // Calculate comprehensive energy profile
  const energyProfile = {
    peak_hours: identifyPeakHours(dailyPatterns),
    preferred_task_types_by_time: analyzeTaskTypesByTime(dailyPatterns),
    energy_cycles: detectEnergyCycles(dailyPatterns),
    burnout_risks: calculateBurnoutRisk(dailyPatterns),
    productivity_windows: identifyOptimalWorkWindows(dailyPatterns),
    recovery_needs: analyzeRecoveryNeeds(dailyPatterns),
  };

  aiCache.set(cacheKey, energyProfile);
  return energyProfile;
}

/**
 * Suggest optimal times for specific task types based on user patterns
 */
export async function suggestOptimalTaskTimes(
  task: any,
  userId: number,
  constraints?: {
    workHours?: { start: number; end: number };
    existingTasks?: any[];
    energyLevel?: "high" | "medium" | "low";
    deadlinePressure?: number; // 0-1 scale
  }
): Promise<any[]> {
  const cacheKey = `optimal-times:${userId}:${task.id}`;
  const cached = aiCache.get<any[]>(cacheKey);
  if (cached) {
    return cached;
  }

  // Get energy patterns for user
  const patterns = await analyzeUserEnergyPatterns(
    userId,
    [], // Would pass actual tasks
    constraints?.existingTasks?.length ? { start: new Date().toISOString(), end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() } : undefined
  );

  // Generate optimal time suggestions
  const suggestions = generateTimeSuggestions(task, patterns, constraints);

  aiCache.set(cacheKey, suggestions);
  return suggestions;
}

/**
 * Detect energy peaks and valleys from task data
 */
export async function detectEnergyPeaks(
  userId: number,
  tasks: any[],
  timeWindow: 'day' | 'week' | 'month' = 'day'
): Promise<any> {
  const cacheKey = `energy-peaks:${userId}:${timeWindow}`;
  const cached = aiCache.get<any>(cacheKey);
  if (cached) {
    return cached;
  }

  const patterns = await analyzeUserEnergyPatterns(userId, tasks);
  const peaks = {
    strongest_productivity_hours: patterns.peak_hours,
    energy_fluctuation_patterns: patterns.energy_cycles,
    optimal_task_scheduling: patterns.productivity_windows,
    recommended_breaks: calculateOptimalBreakTimes(patterns),
    energy_recovery_recommendations: patterns.recovery_needs,
  };

  aiCache.set(cacheKey, peaks);
  return peaks;
}

/**
 * Analyze task completion patterns to extract circadian rhythms
 */
function analyzeDayPattern(dayTasks: any[], date: string): any {
  const completedTasks = dayTasks.filter(task => task.completed);
  const pendingTasks = dayTasks.filter(task => !task.completed);

  // Extract time-based patterns from task logs
  const taskTimes = dayTasks.map(task => {
    if (task.logs && task.logs.length > 0) {
      return extractTaskTimeFromLogs(task);
    } else if (task.date) {
      return new Date(task.date).getHours();
    }
    return null;
  }).filter((time): time is number => time !== null);

  // Calculate pattern metrics
  const pattern = {
    date,
    total_tasks: dayTasks.length,
    completed_tasks: completedTasks.length,
    completion_rate: completedTasks.length / Math.max(dayTasks.length, 1),
    average_task_duration: calculateAverageTaskDuration(completedTasks),
    peak_productivity_hour: taskTimes.length > 0 ? mostFrequent(taskTimes) : null,
    task_types_completed: completedTasks.map(t => t.priority).filter(Boolean),
    energy_indicators: {
      high_tasks_completed: completedTasks.filter(t => t.priority === 'critical' || t.priority === 'high').length,
      complex_tasks_handled: completedTasks.filter(t => t.priority === 'medium' || t.priority === 'low').length,
    },
  };

  return pattern;
}

/**
 * Group tasks by date for pattern analysis
 */
function groupTasksByDate(tasks: any[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {};

  tasks.forEach(task => {
    let date: string;

    if (task.date) {
      date = task.date;
    } else if (task.logs && task.logs.length > 0) {
      // Extract date from task logs (most recent completion)
      const completionLogs = task.logs.filter((log: { action: string }) => log.action === 'completed');
      if (completionLogs.length > 0) {
        date = new Date(completionLogs[0].created_at).toISOString().split('T')[0];
      } else {
        date = new Date().toISOString().split('T')[0]; // Today
      }
    } else {
      date = new Date().toISOString().split('T')[0]; // Default to today
    }

    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(task);
  });

  return grouped;
}

/**
 * Extract task completion time from logs
 */
function extractTaskTimeFromLogs(task: any): number | null {
  if (!task.logs || task.logs.length === 0) return null;

  // Find completion time
  const completionLog = task.logs.find((log: { action: string }) => log.action === 'completed');
  if (completionLog) {
    return new Date(completionLog.created_at).getHours();
  }

  // Find last update time
  const lastLog = task.logs[task.logs.length - 1];
  if (lastLog) {
    return new Date(lastLog.created_at).getHours();
  }

  return null;
}

/**
 * Calculate average task duration from time entries
 */
function calculateAverageTaskDuration(tasks: any[]): number {
  if (tasks.length === 0) return 0;

  let totalDuration = 0;
  let tasksWithDuration = 0;

  tasks.forEach(task => {
    if (task.time_entries && task.time_entries.length > 0) {
      const taskDuration = task.time_entries.reduce((sum: number, entry: { duration_seconds?: number }) => {
        if (entry.duration_seconds) {
          return sum + entry.duration_seconds;
        }
        return sum;
      }, 0);

      if (taskDuration > 0) {
        totalDuration += taskDuration;
        tasksWithDuration++;
      }
    }
  });

  return tasksWithDuration > 0 ? totalDuration / tasksWithDuration : 0;
}

/**
 * Find most frequent value in array
 */
function mostFrequent(arr: number[]): number | null {
  if (arr.length === 0) return null;

  const frequency: Record<number, number> = {};
  let maxFreq = 0;
  let mostFrequent: number = 0;

  arr.forEach(value => {
    frequency[value] = (frequency[value] || 0) + 1;

    if (frequency[value] > maxFreq) {
      maxFreq = frequency[value];
      mostFrequent = value;
    }
  });

  return mostFrequent;
}

/**
 * Identify peak productivity hours from daily patterns
 */
function identifyPeakHours(dailyPatterns: any[]): any {
  // Count task completions by hour across all days
  const hourCounts: Record<number, number> = {};

  dailyPatterns.forEach(pattern => {
    if (pattern.peak_productivity_hour !== null) {
      const hour = pattern.peak_productivity_hour;
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }
  });

  // Sort by frequency
  const sortedHours = Object.entries(hourCounts)
    .sort(([a], [b]) => hourCounts[parseInt(a)] - hourCounts[parseInt(b)])
    .slice(-5) // Top 5 hours
    .reverse();

  return sortedHours.map(([hour, count]) => ({
    hour: parseInt(hour),
    productivity_score: Math.round((count / dailyPatterns.length) * 100),
  }));
}

/**
 * Analyze task types by time of day
 */
function analyzeTaskTypesByTime(dailyPatterns: any[]): any {
  const taskTypesByHour: Record<number, Record<string, number>> = {};

  dailyPatterns.forEach(pattern => {
    if (pattern.peak_productivity_hour !== null) {
      const hour = pattern.peak_productivity_hour;
      if (!taskTypesByHour[hour]) {
        taskTypesByHour[hour] = {};
      }

      if (pattern.energy_indicators) {
        taskTypesByHour[hour].high_priority = (taskTypesByHour[hour].high_priority || 0) + pattern.energy_indicators.high_tasks_completed;
        taskTypesByHour[hour].complex_tasks = (taskTypesByHour[hour].complex_tasks || 0) + pattern.energy_indicators.complex_tasks_handled;
      }
    }
  });

  return Object.entries(taskTypesByHour).map(([hour, tasks]) => ({
    hour: parseInt(hour),
    typical_tasks: tasks,
  }));
}

/**
 * Detect energy cycles and patterns
 */
function detectEnergyCycles(dailyPatterns: any[]): any {
  // Look for weekly patterns
  const dayOfWeekPatterns: Record<number, any> = {};

  dailyPatterns.forEach(pattern => {
    const date = new Date(pattern.date);
    const dayOfWeek = date.getDay(); // 0-6 (Sunday to Saturday)

    if (!dayOfWeekPatterns[dayOfWeek]) {
      dayOfWeekPatterns[dayOfWeek] = [];
    }

    dayOfWeekPatterns[dayOfWeek].push(pattern);
  });

  // Analyze weekly cycles
  const weeklyCycles = Object.entries(dayOfWeekPatterns).map(([dayOfWeek, patterns]) => {
    const avgCompletionRate = patterns.reduce((sum: number, p: { completion_rate: number }) => sum + p.completion_rate, 0) / patterns.length;

    return {
      day_of_week: parseInt(dayOfWeek),
      average_completion_rate: Math.round(avgCompletionRate * 100),
      typical_task_count: patterns.reduce((sum: number, p: { total_tasks: number }) => sum + p.total_tasks, 0) / patterns.length,
    };
  });

  // Identify recovery days (lower task load, higher completion rate)
  const recoveryDays = weeklyCycles
    .filter(day => day.average_completion_rate > 80 && day.typical_task_count < 5)
    .map(day => {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return {
        day_name: dayNames[day.day_of_week],
        recovery_score: day.average_completion_rate - (day.typical_task_count * 10),
      };
    });

  return {
    weekly_patterns: weeklyCycles,
    recovery_days: recoveryDays,
    suggested_rest_days: recoveryDays.slice(0, 2).map((d: any) => d.day_name),
  };
}

/**
 * Calculate burnout risk based on daily patterns
 */
function calculateBurnoutRisk(dailyPatterns: any[]): any {
  // High risk factors:
  // 1. Consistently high task load with low completion
  // 2. Very long working hours
  // 3. Little recovery time between intense days

  const burnoutIndicators = dailyPatterns.map(pattern => {
    let riskScore = 0;

    // Task load vs completion
    if (pattern.total_tasks > 10 && pattern.completion_rate < 0.6) {
      riskScore += 3;
    }

    // Too many high-priority tasks
    if (pattern.energy_indicators?.high_tasks_completed > 5) {
      riskScore += 2;
    }

    // Consecutive intense days (simplified)
    return {
      date: pattern.date,
      risk_score: riskScore,
      risk_level: riskScore > 5 ? 'high' : riskScore > 2 ? 'medium' : 'low',
      contributing_factors: [],
    };
  });

  const totalRisk = burnoutIndicators.reduce((sum, indicator) => sum + indicator.risk_score, 0);

  return {
    daily_risk_assessments: burnoutIndicators,
    overall_burnout_risk: totalRisk > 20 ? 'high' : totalRisk > 10 ? 'medium' : 'low',
    recommendations: generateBurnoutRecommendations(burnoutIndicators),
  };
}

/**
 * Identify optimal work windows for productivity
 */
function identifyOptimalWorkWindows(dailyPatterns: any[]): any {
  const allHours: number[] = [];

  dailyPatterns.forEach(pattern => {
    if (pattern.peak_productivity_hour !== null) {
      allHours.push(pattern.peak_productivity_hour);
    }
  });

  // Find most common hours and time ranges
  const hourlyFrequency: Record<number, number> = {};

  allHours.forEach(hour => {
    hourlyFrequency[hour] = (hourlyFrequency[hour] || 0) + 1;
  });

  const sortedHours = Object.entries(hourlyFrequency)
    .sort(([a], [b]) => hourlyFrequency[parseInt(a)] - hourlyFrequency[parseInt(b)])
    .reverse();

  const optimalHours = sortedHours.slice(0, 4).map(([hour, count]) => ({
    hour: parseInt(hour),
    productivity_rating: Math.round((count / allHours.length) * 100),
  }));

  // Identify pattern: morning vs afternoon vs evening preferences
  const morningHours = optimalHours.filter(h => h.hour >= 6 && h.hour <= 12);
  const afternoonHours = optimalHours.filter(h => h.hour >= 13 && h.hour <= 17);
  const eveningHours = optimalHours.filter(h => h.hour >= 18 && h.hour <= 22);

  const preferredPattern = morningHours.length > afternoonHours.length && morningHours.length > eveningHours.length ? 'morning' :
    afternoonHours.length > morningHours.length && afternoonHours.length > eveningHours.length ? 'afternoon' :
      eveningHours.length > morningHours.length && eveningHours.length > afternoonHours.length ? 'evening' : 'balanced';

  return {
    optimal_hours: optimalHours,
    preferred_pattern: preferredPattern,
    suggested_work_hours: preferredPattern === 'morning' ? { start: 8, end: 12 } :
                         preferredPattern === 'afternoon' ? { start: 13, end: 17 } :
                         preferredPattern === 'evening' ? { start: 14, end: 20 } :
                         { start: 9, end: 17 },
    recommended_breaks: calculateOptimalBreakTimes({ peak_hours: optimalHours }),
  };
}

/**
 * Analyze recovery needs based on task patterns
 */
function analyzeRecoveryNeeds(dailyPatterns: any[]): any {
  const recoveryRecommendations: any[] = [];

  dailyPatterns.forEach(pattern => {
    // Days with high completion but little rest
    if (pattern.completion_rate > 0.9 && pattern.total_tasks > 8) {
      recoveryRecommendations.push({
        date: pattern.date,
        type: 'active_recovery',
        recommendation: 'Schedule lighter tasks tomorrow to prevent burnout',
        reason: 'High productivity day with many tasks - need recovery',
      });
    }

    // Days with low completion and many high-priority tasks
    if (pattern.completion_rate < 0.5 && pattern.energy_indicators?.high_tasks_completed > 0) {
      recoveryRecommendations.push({
        date: pattern.date,
        type: 'immediate_recovery',
        recommendation: 'Prioritize rest and lower-priority tasks tomorrow',
        reason: 'Tiresome day with incomplete critical tasks',
      });
    }
  });

  return {
    daily_recommendations: recoveryRecommendations,
    general_recovery_strategies: [
      'Schedule tasks in energy blocks (high energy tasks together)',
      'Take regular breaks during deep work sessions',
      'Plan lighter days after intensive work periods',
      'Use completion time to assess tomorrow workload',
    ],
  };
}

/**
 * Calculate optimal break times based on productivity patterns
 */
function calculateOptimalBreakTimes(energyProfile: any): any[] {
  const breakTimes: any[] = [];

  // If user has identified peak hours, schedule breaks around them
  if (energyProfile.peak_hours && energyProfile.peak_hours.length > 0) {
    energyProfile.peak_hours.forEach((peak: any) => {
      const hour = peak.hour;
      const suggestedBreakHour = hour + 2; // 2 hours after peak

      breakTimes.push({
        hour: suggestedBreakHour,
        duration: 15, // 15 minutes
        type: 'recovery_break',
        reason: `After peak productivity hour ${hour}:00`,
      });
    });
  }

  // Always include mid-day break (around 2 PM)
  breakTimes.push({
    hour: 14,
    duration: 20,
    type: 'mid_day_break',
    reason: 'Prevent afternoon energy dip',
  });

  return breakTimes;
}

/**
 * Generate burnout recommendations based on risk assessments
 */
function generateBurnoutRecommendations(burnoutIndicators: any[]): any[] {
  const recommendations: any[] = [];

  const highRiskDays = burnoutIndicators.filter(indicator => indicator.risk_level === 'high');

  if (highRiskDays.length > 0) {
    recommendations.push({
      priority: 'immediate',
      message: 'Consider reducing workload and planning recovery',
      actions: [
        'Take a day off or schedule light tasks tomorrow',
        'Increase break frequency and duration',
        'Delegate high-priority tasks if possible',
        'Practice brief meditation or mindfulness exercises',
      ],
    });
  }

  recommendations.push({
    priority: 'ongoing',
    message: 'Implement sustainable work habits',
    actions: [
      'Schedule breaks every 90 minutes',
      'Set realistic daily task limits',
      'Track energy levels and adjust accordingly',
      'Establish clear work-life boundaries',
    ],
  });

  return recommendations;
}

/**
 * Generate time suggestions for a task based on patterns and constraints
 */
function generateTimeSuggestions(
  task: any,
  energyProfile: any,
  constraints?: any
): any[] {
  const suggestions: any[] = [];

  // Base suggestion using optimal work hours
  const optimalHours = energyProfile.optimal_work_hours || { start: 9, end: 17 };

  // Calculate suggested date and time
  let suggestedDate = new Date().toISOString().split('T')[0];
  let suggestedHour = optimalHours.start;

  // Adjust based on deadline pressure
  if (constraints?.deadlinePressure && constraints.deadlinePressure > 0.7) {
    // Urgent task - schedule earlier
    suggestedHour = Math.max(optimalHours.start, 8);
  }

  // Adjust based on task priority
  if (task.priority === 'critical') {
    suggestedHour = Math.max(optimalHours.start, 7);
  } else if (task.priority === 'high') {
    suggestedHour = Math.max(optimalHours.start, 8);
  }

  // Calculate estimated duration
  const estimatedDuration = task.estimated_duration || 60; // 1 hour default

  // Generate 3 different time options
  for (let i = 0; i < 3; i++) {
    const startHour = suggestedHour + (i * 2); // 2-hour intervals
    const endHour = startHour + Math.ceil(estimatedDuration / 60);

    const confidence = calculateTimeConfidence(task, energyProfile, constraints);

    suggestions.push({
      date: suggestedDate,
      start_time: `${startHour.toString().padStart(2, '0')}:00`,
      end_time: `${endHour.toString().padStart(2, '0')}:00`,
      confidence,
      reason: generateTimeReason(task, energyProfile, constraints, i),
    });
  }

  return suggestions;
}

/**
 * Calculate confidence score for time suggestion
 */
function calculateTimeConfidence(task: any, energyProfile: any, constraints?: any): number {
  let confidence = 0.7; // Base confidence

  // Higher confidence for clear deadlines
  if (task.deadline) confidence += 0.2;

  // Higher confidence for realistic durations
  if (task.estimated_duration && task.estimated_duration > 0) confidence += 0.1;

  // Lower confidence for high deadline pressure
  if (constraints?.deadlinePressure && constraints.deadlinePressure > 0.8) {
    confidence -= 0.2;
  }

  return Math.max(0.1, Math.min(0.95, confidence));
}

/**
 * Generate human-readable reason for time suggestion
 */
function generateTimeReason(task: any, energyProfile: any, constraints?: any, suggestionIndex?: number): string {
  const reasons: string[] = [];

  if (task.priority === 'critical') {
    reasons.push('Critical task prioritized early');
  }

  if (task.deadline) {
    const daysUntilDeadline = Math.ceil((new Date(task.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilDeadline <= 1) {
      reasons.push('Urgent deadline approaching');
    } else if (daysUntilDeadline <= 3) {
      reasons.push('Near-term deadline');
    }
  }

  if (constraints?.energyLevel === 'high') {
    reasons.push('High energy level optimal for challenging tasks');
  } else if (constraints?.energyLevel === 'low') {
    reasons.push('Lower energy level good for less complex tasks');
  }

  if (suggestionIndex === 0) {
    reasons.push('Best time based on your energy patterns');
  } else if (suggestionIndex === 1) {
    reasons.push('Alternative time slot');
  } else {
    reasons.push('Later option for flexibility');
  }

  return reasons.join(', ');
}