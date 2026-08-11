"use server";

import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getEnergyProfile, estimateEnergyCost, type EnergyProfileInput } from "./enhanced-productivity";
import type { Task, TaskWithRelations } from "@/types";

/**
 * Energy-Aware Task Scheduling Functions
 * Determines optimal scheduling based on user's energy profile and task characteristics
 */

export interface ScheduledTask {
  taskId: number;
  suggestedDate: string;
  suggestedStartTime: string;
  suggestedEndTime: string;
  confidence: number;
  reason: string;
  energyAllocation: number;
}

export interface ScheduleOptimization {
  scheduledTasks: ScheduledTask[];
  skippedDueToEnergy: Array<{ taskId: number; reason: string }>;
  totalEnergySpent: number;
  energyBalanceRemaining: number;
}

/**
 * Get energy level for a specific time of day
 */
export async function getEnergyAtTime(date: string, time: string): Promise<number> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) return 5; // Default medium energy

  const profile = await getEnergyProfile();
  if (!profile) return 5;

  // Parse time to minutes since midnight
  const [hours, minutes] = time.split(":").map(Number);
  const timeInMinutes = hours * 60 + minutes;

  // Check peak energy times
  for (const peak of profile.peak_energy_times) {
    const [startHours, startMins] = peak.start.split(":").map(Number);
    const [endHours, endMins] = peak.end.split(":").map(Number);
    const startMinutes = startHours * 60 + startMins;
    const endMinutes = endHours * 60 + endMins;

    if (timeInMinutes >= startMinutes && timeInMinutes <= endMinutes) {
      return 8; // High energy during peak times
    }
  }

  // Check if falling outside awake hours
  if (timeInMinutes < profile.work_hours.start * 60 || timeInMinutes > profile.work_hours.end * 60) {
    return 2; // Low energy outside work hours
  }

  // Default: interpolate within work hours
  const workStart = profile.work_hours.start * 60;
  const workEnd = profile.work_hours.end * 60;
  const totalWorkMinutes = workEnd - workStart;
  const minutesSinceStart = timeInMinutes - workStart;

  // Energy typically dips in the middle of the day (after lunch)
  const midWork = (workStart + workEnd) / 2;
  if (Math.abs(timeInMinutes - midWork) < 120) {
    return 4; // Slightly lower energy mid-day
  }

  // Morning and late afternoon are typically better
  return 6;
}

/**
 * Get optimal scheduling windows for a day
 */
export async function getOptimalSchedulingWindows(
  date: string,
  userEnergyBudget: number
): Promise<Array<{ start: string; end: string; energyScore: number; maxEnergySpend: number }>> {
  const windows: Array<{ start: string; end: string; energyScore: number; maxEnergySpend: number }> = [];

  // Generate 2-hour windows during work hours
  const workStart = 9; // Default
  const workEnd = 17; // Default

  for (let hour = workStart; hour < workEnd; hour++) {
    const startTime = `${hour.toString().padStart(2, "0")}:00`;
    const endTime = `${(hour + 2).toString().padStart(2, "0")}:00`;

    const energyScore = await getEnergyAtTime(date, startTime);
    const maxEnergySpend = Math.min(userEnergyBudget, energyScore * 10);

    windows.push({
      start: startTime,
      end: endTime,
      energyScore,
      maxEnergySpend
    });
  }

  return windows.sort((a, b) => b.energyScore - a.energyScore);
}

/**
 * Schedule a single task based on energy profile
 */
export async function suggestTaskSchedule(
  task: Task,
  date: string,
  energyBudget: number
): Promise<ScheduledTask | null> {
  const energyLevel = await getEnergyAtTime(date, "12:00"); // Default time
  const requiredEnergy = await estimateEnergyCost(task as TaskWithRelations);

  // Check if task can fit in available energy budget
  if (requiredEnergy > energyBudget) {
    return null;
  }

  // Determine suggested time based on priority
  const priorityWeights: Record<string, number> = {
    critical: 0.2, // Early morning
    high: 0.3, // Morning
    medium: 0.5, // Mid-day
    low: 0.7, // Afternoon
    none: 0.5,
  };

  const workStartHour = 9;
  const workEndHour = 17;
  const priorityMultiplier = priorityWeights[task.priority] ?? 0.5;
  const suggestedHour = Math.floor(workStartHour + (priorityMultiplier * (workEndHour - workStartHour)));

  const suggestedStart = `${suggestedHour.toString().padStart(2, "0")}:00`;
  const suggestedEnd = `${suggestedHour.toString().padStart(2, "0")}:30`;

  const confidence = calculateScheduleConfidence(energyLevel, requiredEnergy, task.priority);

  return {
    taskId: task.id,
    suggestedDate: date,
    suggestedStartTime: suggestedStart,
    suggestedEndTime: suggestedEnd,
    confidence,
    reason: getScheduleReason(task.priority, energyLevel),
    energyAllocation: requiredEnergy,
  };
}

/**
 * Optimize schedule for multiple tasks
 */
export async function optimizeTaskSchedule(
  taskIds: number[],
  date: string
): Promise<ScheduleOptimization> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    throw new Error("Authentication required");
  }

  // Get user's energy budget for the day
  const budgetResult = db
    .prepare("SELECT current_balance FROM energy_budget_logs WHERE user_id = ? AND date = ?")
    .get(user.id, date) as { current_balance: number } | undefined;

  const energyBudget = budgetResult?.current_balance ?? 100;

  // Get tasks
  const tasks = db
    .prepare("SELECT * FROM tasks WHERE id IN (" + taskIds.map(() => "?").join(",") + ")")
    .all(...taskIds) as Task[];

  const scheduledTasks: ScheduledTask[] = [];
  const skippedDueToEnergy: Array<{ taskId: number; reason: string }> = [];
  let totalEnergySpent = 0;

  // Sort tasks by priority
  const priorityOrder: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
    none: 4,
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    return (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
  });

  // Schedule each task
  for (const task of sortedTasks) {
    const suggestion = await suggestTaskSchedule(task, date, energyBudget - totalEnergySpent);

    if (suggestion) {
      scheduledTasks.push(suggestion);
      totalEnergySpent += suggestion.energyAllocation;
    } else {
      skippedDueToEnergy.push({
        taskId: task.id,
        reason: `Insufficient energy budget (${energyBudget - totalEnergySpent} remaining, high energy cost required)`
      });
    }
  }

  return {
    scheduledTasks,
    skippedDueToEnergy,
    totalEnergySpent,
    energyBalanceRemaining: Math.max(0, energyBudget - totalEnergySpent)
  };
}

/**
 * Bulk schedule tasks from a list, considering energy constraints
 */
export async function bulkScheduleTasks(
  listId: number,
  targetDate: string
): Promise<{ scheduledCount: number; messages: string[] }> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    throw new Error("Authentication required");
  }

  // Get tasks from the list
  const tasks = db
    .prepare("SELECT * FROM tasks WHERE list_id = ? AND user_id = ? AND completed = 0 ORDER BY sort_order")
    .all(user.id, listId) as Task[];

  if (tasks.length === 0) {
    return { scheduledCount: 0, messages: ["No incomplete tasks found in this list"] };
  }

  const schedule = await optimizeTaskSchedule(tasks.map(t => t.id), targetDate);

  // Log scheduling activity
  const activityResult = db
    .prepare(`
      INSERT INTO activity_logs (user_id, action, entity_type, details, created_at)
      VALUES (?, 'tasks_bulk_scheduled', 'task', ?, CURRENT_TIMESTAMP)
    `)
    .run(user.id, JSON.stringify({ taskIds: tasks.map(t => t.id), date: targetDate }));

  return {
    scheduledCount: schedule.scheduledTasks.length,
    messages: [
      `${schedule.scheduledTasks.length} tasks scheduled optimally`,
      ...schedule.skippedDueToEnergy.map(s => `Skipped task ${s.taskId}: ${s.reason}`)
    ]
  };
}

/**
 * Get energy-aware suggestions for a task
 */
export async function getEnergySuggestions(taskId: number): Promise<{
  preferredTimeSlots: string[];
  energyImpact: number;
  suggestedBreakBefore: boolean;
  suggestedBreakAfter: boolean;
  reason: string;
}> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    throw new Error("Authentication required");
  }

  const task = db
    .prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?")
    .get(taskId) as Task | undefined;

  if (!task) {
    throw new Error("Task not found");
  }

  const energyImpact = await estimateEnergyCost(task as TaskWithRelations);
  const profile = await getEnergyProfile();

  const preferredTimeSlots: string[] = [];

  if (profile?.peak_energy_times) {
    for (const peak of profile.peak_energy_times) {
      if (energyImpact > 15) {
        // High impact tasks only in peak times
        preferredTimeSlots.push(peak.start);
      } else if (energyImpact > 5) {
        // Medium impact in or around peak times
        preferredTimeSlots.push(peak.start, peak.end);
      } else {
        // Low impact can be done anytime
        preferredTimeSlots.push("09:00", "11:00", "13:00", "15:00");
      }
    }
  }

  // Determine break recommendations
  const isHighImpact = energyImpact > 15;
  const isMorning = new Date().getHours() < 12;

  const suggestedBreakBefore = isHighImpact && isMorning;
  const suggestedBreakAfter = isHighImpact || energyImpact > 10;

  const reason = isHighImpact
    ? "High-impact task - recommend scheduling during peak energy hours with buffer time"
    : energyImpact > 5
      ? "Medium-impact task - schedule during good energy periods"
      : "Low-impact task - can be scheduled flexibly";

  return {
    preferredTimeSlots: [...new Set(preferredTimeSlots)],
    energyImpact,
    suggestedBreakBefore,
    suggestedBreakAfter,
    reason
  };
}

/**
 * Calculate schedule confidence based on energy and task factors
 */
function calculateScheduleConfidence(
  energyLevel: number,
  requiredEnergy: number,
  priority: string
): number {
  let confidence = 0.7; // Base confidence

  // Higher confidence with adequate energy
  if (energyLevel >= 7 && requiredEnergy <= 15) {
    confidence += 0.2;
  }

  // Higher confidence for critical tasks scheduled early
  if (priority === "critical") {
    confidence += 0.1;
  }

  // Lower confidence if energy is low
  if (energyLevel < 4) {
    confidence -= 0.2;
  }

  return Math.max(0.1, Math.min(0.95, confidence));
}

/**
 * Get human-readable reason for scheduling suggestion
 */
function getScheduleReason(priority: string, energyLevel: number): string {
  const priorityReasons: Record<string, string> = {
    critical: "Critical task - scheduled for optimal morning focus",
    high: "High priority - scheduled during peak energy window",
    medium: "Medium priority - balanced with other commitments",
    low: "Low priority - scheduled during recovery period",
    none: "Routine task - flexible scheduling",
  };

  if (energyLevel < 4) {
    return "Note: Current energy is low - may need adjustment";
  }

  return priorityReasons[priority] ?? "Scheduled based on energy profile";
}

/**
 * Get today's energy-aware recommendations
 */
export async function getDailyEnergyRecommendations(): Promise<{
  energyBalance: number;
  recommendations: string[];
  optimalHours: number[];
  avoidHours: number[];
  energyForecast: Array<{ hour: number; energy: number }>;
}> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return {
      energyBalance: 100,
      recommendations: ["Set up your energy profile to get personalized recommendations"],
      optimalHours: [],
      avoidHours: [],
      energyForecast: [],
    };
  }

  const profile = await getEnergyProfile();
  const today = new Date().toISOString().split("T")[0];

  // Get budget
  const budgetResult = db
    .prepare("SELECT current_balance FROM energy_budget_logs WHERE user_id = ? AND date = ?")
    .get(user.id, today) as { current_balance: number } | undefined;

  const energyBalance = budgetResult?.current_balance ?? 100;

  const recommendations: string[] = [];
  const optimalHours: number[] = [];
  const avoidHours: number[] = [];
  const energyForecast: Array<{ hour: number; energy: number }> = [];

  if (!profile) {
    return { energyBalance, recommendations, optimalHours, avoidHours, energyForecast };
  }

  // Generate hourly forecast
  for (let hour = profile.work_hours.start; hour < profile.work_hours.end; hour++) {
    const energy = await getEnergyAtTime(today, `${hour}:00`);
    energyForecast.push({ hour, energy });

    if (energy >= 7) {
      optimalHours.push(hour);
    } else if (energy <= 3) {
      avoidHours.push(hour);
    }
  }

  // Generate recommendations
  if (energyBalance < 30) {
    recommendations.push("Low energy budget remaining - avoid scheduling high-impact tasks");
  }
  if (energyBalance > 80) {
    recommendations.push("High energy budget available - consider challenging tasks");
  }

  const avgEnergy = energyForecast.reduce((sum, f) => sum + f.energy, 0) / energyForecast.length;
  if (avgEnergy < 4) {
    recommendations.push("Overall low energy today - prioritize recovery activities");
  }

  return {
    energyBalance,
    recommendations,
    optimalHours,
    avoidHours,
    energyForecast
  };
}