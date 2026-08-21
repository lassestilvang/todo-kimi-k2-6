'use server';

import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import type { TaskWithRelations, Priority } from '@/types';
import { aiCache } from '@/lib/ai/providers';

/**
 * Generate an optimal time-blocking schedule for a list of tasks
 * Takes into account user energy patterns, deadlines, and task dependencies
 */
export async function generateTimeBlockedSchedule(
  tasks: TaskWithRelations[],
  constraints: {
    userId: number;
    workHours?: { start: number; end: number };
    deadline?: string;
    energyProfile?: any;
    existingTasks?: TaskWithRelations[];
  }
): Promise<any> {
  const cacheKey = `time-blocked-schedule:${constraints.userId}`;
  const cached = aiCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Get user's circadian rhythm data if available
  const energyProfile =
    constraints.energyProfile ||
    (await getUserEnergyProfile(constraints.userId));
  const workHours = constraints.workHours || { start: 9, end: 17 };

  // Sort tasks by priority, deadline urgency, and dependencies
  const sortedTasks = sortTasksForScheduling(tasks, constraints);

  // Generate schedule slots
  const schedule = await createTimeBlocks(
    sortedTasks,
    workHours,
    energyProfile,
    constraints.deadline
  );

  aiCache.set(cacheKey, schedule); // Cache for default TTL
  return schedule;
}

/**
 * Detect and resolve scheduling conflicts between tasks
 */
export async function detectScheduleConflicts(
  tasks: TaskWithRelations[],
  existingSchedule?: any[]
): Promise<{ conflicts: any[]; suggestions: any[] }> {
  const conflicts: any[] = [];
  const suggestions: any[] = [];

  if (!existingSchedule) {
    return { conflicts, suggestions };
  }

  // Check for time overlaps
  for (const task of tasks) {
    for (const existingSlot of existingSchedule) {
      if (timeOverlap(task, existingSlot)) {
        conflicts.push({
          taskId: task.id,
          taskName: task.name,
          conflictingSlot: existingSlot,
          overlapType: 'time_overlap',
        });

        // Generate suggestions
        const suggestion = generateConflictResolution(task, existingSlot);
        if (suggestion) {
          suggestions.push(suggestion);
        }
      }
    }
  }

  return { conflicts, suggestions };
}

/**
 * Reschedule tasks with buffer time to prevent overload
 */
export async function rescheduleWithBuffer(
  tasks: TaskWithRelations[],
  bufferMinutes = 15,
  constraints?: {
    workHours?: { start: number; end: number };
    userId?: number;
  }
): Promise<any[]> {
  const workHours = constraints?.workHours || { start: 9, end: 17 };
  let currentTime = workHours.start * 60; // Convert to minutes

  const scheduledTasks = [];

  for (const task of tasks) {
    // Create a time block for the task
    const duration = estimateTaskDuration(task);
    let startTime = currentTime;
    let endTime = startTime + duration + bufferMinutes;

    // If end time exceeds work hours, move to next day or adjust
    if (endTime > workHours.end * 60) {
      // Move to next day
      startTime = workHours.start * 60;
      endTime = startTime + duration + bufferMinutes;
    }

    scheduledTasks.push({
      taskId: task.id,
      taskName: task.name,
      startTime: minutesToTime(startTime),
      endTime: minutesToTime(endTime),
      durationMinutes: duration,
      bufferMinutes,
      energyRequirement: getTaskEnergyRequirement(task, startTime),
    });

    // Add buffer time before next task
    currentTime = endTime + bufferMinutes * 2; // 2-minute transitions
  }

  return scheduledTasks;
}

/**
 * Predict task duration based on task characteristics and user patterns
 */
export async function predictTaskDuration(
  task: TaskWithRelations,
  context?: {
    userId: number;
    taskHistory?: TaskWithRelations[];
    factors?: {
      taskComplexity?: 'simple' | 'moderate' | 'complex';
      energyLevel?: 'high' | 'medium' | 'low';
      deadlineUrgency?: number;
    };
  }
): Promise<any> {
  const cacheKey = `task-duration-prediction:${task.id}`;
  const cached = aiCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // AI-powered duration prediction
  const ai = await getAIManager();
  const prediction = await ai.predictTaskDuration(task, context || {});

  aiCache.set(cacheKey, prediction); // Cache for default TTL
  return prediction;
}

/**
 * Generate optimal time suggestions for a specific task based on user patterns
 */
export async function suggestOptimalTimes(
  taskId: number,
  constraints: {
    userId: number;
    date?: string;
    energyProfile?: any;
    existingTasks?: TaskWithRelations[];
  }
): Promise<any[]> {
  const cacheKey = `optimal-times:${taskId}`;
  const cached = aiCache.get<any[]>(cacheKey);
  if (cached) {
    return cached;
  }

  // Get task details
  const task = await getTaskById(taskId);
  if (!task) {
    return [];
  }

  // Get user energy profile
  const energyProfile =
    constraints.energyProfile ||
    (await getUserEnergyProfile(constraints.userId));

  // Generate optimal time suggestions
  const suggestions = generateTimeSuggestions(task, energyProfile, constraints);

  aiCache.set(cacheKey, suggestions); // Cache for default TTL
  return suggestions;
}

/**
 * Analyze user availability patterns and suggest optimal scheduling windows
 */
export async function analyzeAvailability(
  userId: number,
  timeRange: { start: string; end: string },
  tasks?: TaskWithRelations[]
): Promise<any> {
  const cacheKey = `availability-analysis:${userId}`;
  const cached = aiCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Get user calendar/events if available
  const events = await getUserCalendarEvents(userId, timeRange);

  // Analyze patterns
  const analysis = {
    peakHours: identifyPeakHours(events, tasks || []),
    availableWindows: findAvailableWindows(events, timeRange),
    optimalSchedulingPeriods: calculateOptimalPeriods(events, tasks || []),
    energyRecommendations: generateEnergyRecommendations(events, tasks || []),
  };

  aiCache.set(cacheKey, analysis); // Cache for default TTL
  return analysis;
}

/**
 * Get user's energy profile for scheduling purposes
 */
async function getUserEnergyProfile(userId: number): Promise<any> {
  const cacheKey = `energy-profile:${userId}`;
  const cached = aiCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Generate energy profile based on task history
  const profile = await generateEnergyProfile(userId);

  aiCache.set(cacheKey, profile); // Cache for default TTL
  return profile;
}

/**
 * Get user calendar events for availability analysis
 */
async function getUserCalendarEvents(
  userId: number,
  timeRange: { start: string; end: string }
): Promise<any[]> {
  // In a real implementation, this would call calendar APIs
  // For now, return mock data
  return [
    {
      date: timeRange.start,
      startTime: '09:00',
      endTime: '10:00',
      type: 'meeting',
    },
    {
      date: timeRange.start,
      startTime: '14:00',
      endTime: '15:00',
      type: 'focus',
    },
    {
      date: timeRange.start,
      startTime: '16:00',
      endTime: '17:00',
      type: 'collaboration',
    },
  ];
}

/**
 * Get task by ID
 */
async function getTaskById(
  taskId: number
): Promise<TaskWithRelations | undefined> {
  const { getTaskById } = await import('@/lib/actions/tasks');
  return getTaskById(taskId);
}

/**
 * Sort tasks for optimal scheduling based on priority, deadline urgency, and dependencies
 */
function sortTasksForScheduling(
  tasks: TaskWithRelations[],
  constraints?: any
): TaskWithRelations[] {
  return tasks.sort((a, b) => {
    // Primary: Critical priority tasks first
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }

    // Secondary: Deadline urgency (sooner deadlines first)
    if (a.deadline && b.deadline) {
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    }
    if (a.deadline) return -1;
    if (b.deadline) return 1;

    // Tertiary: Task ID for consistency
    return a.id - b.id;
  });
}

/**
 * Create time blocks for tasks based on duration and constraints
 */
async function createTimeBlocks(
  tasks: TaskWithRelations[],
  workHours: { start: number; end: number },
  energyProfile: any,
  deadline?: string
): Promise<any[]> {
  const schedule = [];
  let currentTime = workHours.start * 60; // Convert to minutes

  for (const task of tasks) {
    const duration = estimateTaskDuration(task);
    const optimalSlot = findOptimalTimeSlot(
      task,
      currentTime,
      workHours,
      energyProfile,
      deadline
    );

    schedule.push({
      taskId: task.id,
      taskName: task.name,
      startTime: minutesToTime(optimalSlot.start),
      endTime: minutesToTime(optimalSlot.end),
      durationMinutes: optimalSlot.duration,
      priority: task.priority,
      energyRequirement: optimalSlot.energyRequirement,
      confidence: optimalSlot.confidence,
      reason: optimalSlot.reason,
    });

    // Move current time forward
    currentTime = optimalSlot.end + 15; // 15-minute transition
  }

  return schedule;
}

/**
 * Estimate task duration based on task characteristics
 */
function estimateTaskDuration(task: TaskWithRelations): number {
  // Base duration based on priority
  const baseDuration =
    {
      critical: 120, // 2 hours
      high: 90, // 1.5 hours
      medium: 60, // 1 hour
      low: 30, // 0.5 hour
      none: 15, // 0.25 hour
    }[task.priority] || 45;

  // Adjust based on time entries if available
  if (task.time_entries && task.time_entries.length > 0) {
    const avgDuration =
      task.time_entries.reduce(
        (sum, entry) => sum + (entry.duration_seconds || 0),
        0
      ) / task.time_entries.length;
    return Math.max(baseDuration, avgDuration / 60); // Convert seconds to minutes
  }

  // Consider task name and description for better estimation
  const textLength = (task.name + (task.description || '')).length;
  const textMultiplier = Math.min(textLength / 100, 2); // Longer descriptions = more complex

  return Math.round(baseDuration * (1 + textMultiplier * 0.2));
}

/**
 * Find optimal time slot for a task
 */
function findOptimalTimeSlot(
  task: TaskWithRelations,
  currentTime: number,
  workHours: { start: number; end: number },
  energyProfile: any,
  deadline?: string
): {
  start: number;
  end: number;
  duration: number;
  energyRequirement: number;
  confidence: number;
  reason: string;
} {
  const duration = estimateTaskDuration(task);

  // Find the best time based on energy levels and task requirements
  let optimalTime = currentTime;
  let optimalConfidence = 0;
  let optimalReason = 'Default time slot';

  // Try different times throughout the day
  const timeOptions = [
    { hour: 8, weight: 0.8 }, // Early morning - focused work
    { hour: 10, weight: 1.0 }, // Peak morning - high priority
    { hour: 14, weight: 0.9 }, // Afternoon - medium priority
    { hour: 16, weight: 0.7 }, // Late afternoon - low priority
    { hour: 19, weight: 0.5 }, // Evening - relaxed pace
  ];

  for (const option of timeOptions) {
    const startTime = option.hour * 60;
    const endTime = startTime + duration;

    if (startTime >= workHours.start * 60 && endTime <= workHours.end * 60) {
      const confidence = calculateSlotConfidence(
        task,
        option.hour,
        energyProfile,
        deadline
      );
      const energyRequirement = getTaskEnergyRequirement(task, option.hour);

      if (confidence > optimalConfidence) {
        optimalTime = startTime;
        optimalConfidence = confidence;
        optimalReason = generateSlotReason(task, option.hour, confidence);
      }
    }
  }

  return {
    start: optimalTime,
    end: optimalTime + duration,
    duration,
    energyRequirement: getTaskEnergyRequirement(task, optimalTime / 60),
    confidence: Math.round(optimalConfidence * 100) / 100,
    reason: optimalReason,
  };
}

/**
 * Check if two time ranges overlap
 */
function timeOverlap(task: TaskWithRelations, existingSlot: any): boolean {
  const taskStart =
    parseTimeToMinutes(task.date || '') +
    (task.estimate ? parseTimeToMinutes(task.estimate) : 0);
  const taskEnd = taskStart + estimateTaskDuration(task);

  const slotStart = parseTimeToMinutes(existingSlot.startTime);
  const slotEnd = parseTimeToMinutes(existingSlot.endTime);

  return taskStart < slotEnd && taskEnd > slotStart;
}

/**
 * Generate conflict resolution suggestion
 */
function generateConflictResolution(
  task: TaskWithRelations,
  existingSlot: any
): any {
  const taskDuration = estimateTaskDuration(task);
  const slotDuration =
    parseTimeToMinutes(existingSlot.endTime) -
    parseTimeToMinutes(existingSlot.startTime);

  // Suggest rescheduling the task
  const newTime =
    parseTimeToMinutes(existingSlot.startTime) + slotDuration + 15; // 15-minute gap

  if (newTime <= 24 * 60) {
    // Not past midnight
    return {
      type: 'reschedule',
      originalTime: existingSlot,
      suggestedTime: {
        startTime: minutesToTime(newTime),
        endTime: minutesToTime(newTime + taskDuration),
        reason: 'Move to avoid time conflict with existing meeting',
      },
    };
  }

  return null;
}

/**
 * Calculate confidence for a time slot
 */
function calculateSlotConfidence(
  task: TaskWithRelations,
  hour: number,
  energyProfile: any,
  deadline?: string
): number {
  let confidence = 0.5; // Base confidence

  // Higher confidence for critical tasks during peak hours
  if (task.priority === 'critical' && hour >= 9 && hour <= 12) {
    confidence += 0.3;
  }

  // Higher confidence for deadline-driven tasks
  if (deadline) {
    const daysUntilDeadline = Math.ceil(
      (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilDeadline <= 1) confidence += 0.4;
    else if (daysUntilDeadline <= 3) confidence += 0.2;
  }

  // Consider energy profile
  if (energyProfile) {
    const hourEnergy = energyProfile.peak_hours?.find(
      (h: any) => h.hour === hour
    );
    if (hourEnergy) {
      confidence += hourEnergy.productivity_score / 100;
    }
  }

  return Math.min(confidence, 0.95);
}

/**
 * Get energy requirement for a task at a specific time
 */
function getTaskEnergyRequirement(
  task: TaskWithRelations,
  hour: number
): number {
  const priorityMultiplier =
    {
      critical: 1.0,
      high: 0.8,
      medium: 0.6,
      low: 0.4,
      none: 0.2,
    }[task.priority] || 0.5;

  // Peak energy hours (9 AM - 12 PM)
  const isPeakHour = hour >= 9 && hour <= 12;
  const energyMultiplier = isPeakHour ? 1.2 : 1.0;

  return priorityMultiplier * energyMultiplier;
}

/**
 * Generate reason for time slot selection
 */
function generateSlotReason(
  task: TaskWithRelations,
  hour: number,
  confidence: number
): string {
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  if (task.priority === 'critical') {
    return `Critical task scheduled for ${timeOfDay} (${hour}:00) - high priority window`;
  } else if (task.priority === 'high') {
    return `High-priority task scheduled for ${timeOfDay} (${hour}:00) - optimal timing`;
  } else {
    return `${timeOfDay} slot (${hour}:00) with ${Math.round(confidence * 100)}% confidence`;
  }
}

/**
 * Generate time suggestions based on task and user patterns
 */
function generateTimeSuggestions(
  task: TaskWithRelations,
  energyProfile: any,
  constraints: any
): any[] {
  const suggestions = [];

  // Use energy profile to find optimal times
  const optimalHours = energyProfile?.peak_hours?.map((h: any) => h.hour) || [
    9, 10, 11, 14, 15,
  ];

  // Generate 3 different time suggestions
  for (let i = 0; i < Math.min(3, optimalHours.length); i++) {
    const hour = optimalHours[i];
    const duration = estimateTaskDuration(task);

    // Check if this time works with existing tasks
    const worksWithExisting = checkTimeSlot(
      task,
      hour,
      duration,
      constraints.existingTasks || []
    );

    if (worksWithExisting) {
      suggestions.push({
        time: `${hour.toString().padStart(2, '0')}:00`,
        confidence:
          Math.round(
            ((energyProfile?.peak_hours?.find((h: any) => h.hour === hour)
              ?.productivity_score || 80) /
              100) *
              100
          ) / 100,
        energyRequirement: getTaskEnergyRequirement(task, hour),
        reason: generateSlotReason(task, hour, suggestions.length + 1),
        deadlineCompatible: constraints.deadline
          ? isTimeCompatibleWithDeadline(hour, duration, constraints.deadline)
          : true,
      });
    }
  }

  return suggestions;
}

/**
 * Check if a time slot is compatible with existing tasks
 */
function checkTimeSlot(
  task: TaskWithRelations,
  hour: number,
  duration: number,
  existingTasks: TaskWithRelations[]
): boolean {
  const startTime = hour * 60;
  const endTime = startTime + duration;

  // Simple check for conflicts with existing completed or in-progress tasks
  for (const existing of existingTasks) {
    if (
      existing.completed ||
      (existing.date && new Date(existing.date) <= new Date())
    ) {
      const existingStart =
        parseTimeToMinutes(existing.date || '') +
        (existing.estimate ? parseTimeToMinutes(existing.estimate) : 0);
      const existingEnd = existingStart + estimateTaskDuration(existing);

      if (startTime < existingEnd && endTime > existingStart) {
        return false; // Conflict found
      }
    }
  }

  return true; // No conflicts
}

/**
 * Check if a time slot is compatible with deadline
 */
function isTimeCompatibleWithDeadline(
  hour: number,
  duration: number,
  deadline: string
): boolean {
  const taskDate = new Date(deadline);
  const taskDateHour = taskDate.getHours();

  // Allow scheduling up to 2 hours before deadline
  const hoursUntilDeadline = taskDateHour - hour;
  const taskDurationHours = duration / 60;

  return hoursUntilDeadline >= taskDurationHours + 2;
}

/**
 * Parse time string to minutes
 */
function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;

  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes to time string
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Find peak hours from user activity
 */
function identifyPeakHours(events: any[], tasks: TaskWithRelations[]): any[] {
  const hourCounts: Record<number, number> = {};

  // Count task completions by hour
  tasks.forEach(task => {
    if (task.completed && task.date) {
      const date = new Date(task.date);
      const hour = date.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }
  });

  // Convert to peak hours with productivity scores
  const peakHours = Object.entries(hourCounts)
    .sort(([a], [b]) => hourCounts[parseInt(a)] - hourCounts[parseInt(b)])
    .slice(-5) // Top 5 hours
    .reverse()
    .map(([hour, count]) => ({
      hour: parseInt(hour),
      productivity_score: Math.round((count / tasks.length) * 100),
    }));

  return peakHours;
}

/**
 * Find available time windows
 */
function findAvailableWindows(
  events: any[],
  timeRange: { start: string; end: string }
): any[] {
  const windows = [];

  // Simplified: find gaps in calendar events
  const startTime = parseTimeToMinutes(timeRange.start);
  const endTime = parseTimeToMinutes(timeRange.end);

  // Create mock windows (in real implementation, would use actual calendar data)
  const windowStart = startTime + 60; // 1 hour after start
  const windowEnd = Math.max(windowStart + 120, endTime - 60); // 2 hour window

  if (windowStart < windowEnd) {
    windows.push({
      startTime: minutesToTime(windowStart),
      endTime: minutesToTime(windowEnd),
      capacity: 'high',
    });
  }

  return windows;
}

/**
 * Calculate optimal scheduling periods
 */
function calculateOptimalPeriods(
  events: any[],
  tasks: TaskWithRelations[]
): any[] {
  const periods = [
    {
      period: 'Morning Focus',
      startHour: 9,
      endHour: 12,
      suitability: 'high',
      taskTypes: ['critical', 'high'],
    },
    {
      period: 'Afternoon Deep Work',
      startHour: 14,
      endHour: 17,
      suitability: 'medium',
      taskTypes: ['medium', 'low'],
    },
    {
      period: 'Evening Wrap-up',
      startHour: 18,
      endHour: 20,
      suitability: 'low',
      taskTypes: ['low', 'none'],
    },
  ];

  return periods;
}

/**
 * Generate energy recommendations
 */
function generateEnergyRecommendations(
  events: any[],
  tasks: TaskWithRelations[]
): any[] {
  const recommendations = [
    {
      type: 'focus_time',
      description:
        'Schedule critical tasks during peak energy hours (9 AM - 12 PM)',
      impact: 'high',
    },
    {
      type: 'breaks',
      description: 'Plan regular breaks to maintain energy levels',
      impact: 'medium',
    },
    {
      type: 'task_order',
      description: 'Order tasks by energy requirements throughout the day',
      impact: 'high',
    },
  ];

  return recommendations;
}

/**
 * Generate user energy profile
 */
async function generateEnergyProfile(userId: number): Promise<any> {
  // Mock energy profile generation
  return {
    peak_hours: [
      { hour: 9, productivity_score: 95 },
      { hour: 10, productivity_score: 92 },
      { hour: 14, productivity_score: 88 },
      { hour: 15, productivity_score: 85 },
      { hour: 16, productivity_score: 82 },
    ],
    energy_cycles: {
      morning_boost: true,
      afternoon_dip: true,
      recovery_needed: true,
    },
    recommendations: [
      'Schedule critical tasks before 12 PM',
      'Use afternoon for deep work',
      'Reserve evening for lighter tasks',
    ],
  };
}

/**
 * AI Manager helper
 */
async function getAIManager() {
  const { AIManager } = await import('@/lib/ai/providers');
  return new AIManager();
}
