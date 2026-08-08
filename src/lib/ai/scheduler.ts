/**
 * Smart Scheduler - Energy-aware time blocking and scheduling suggestions
 */

import { getDb } from "@/lib/db";
import { parseNaturalLanguageTask } from "./index";
import { getAIManager } from "./providers";

export interface EnergyLevel {
  time: string; // "09:00"
  level: 1 | 2 | 3 | 4 | 5; // 1 = low, 5 = high
  type: "morning_energy" | "afternoon_focus" | "creative_window" | "recovery_time" | "morning_routine" | "lunch_break" | "end_of_day";
}

export interface BlockSuggestion {
  taskId: number;
  startTime: string; // "09:00"
  endTime: string; // "10:30"
  confidence: number; // 0-1
  reasoning: string;
}

export interface ScheduleAnalysis {
  optimalTimes: BlockSuggestion[];
  conflicts: Array<{
    task1Id: number;
    task2Id: number;
    reason: string;
  }>;
  availableSlots: Array<{
    startTime: string;
    endTime: string;
    durationMinutes: number;
  }>;
  energyEfficiency: number; // 0-100
}

export interface UserEnergyPreferences {
  wakeUpHour: number;
  sleepHour: number;
  peakEnergyTimes: Array<{ start: string; end: string }>;
  energyLevels: EnergyLevel[];
}

/**
 * Get or create default energy profile for a user
 */
export async function getUserEnergyProfile(userId: number): Promise<UserEnergyPreferences> {
  const db = getDb();

  // Check for existing profile
  const profile = db
    .prepare("SELECT profile_data FROM user_energy_profiles WHERE user_id = ?")
    .get(userId) as { profile_data: string } | undefined;

  if (profile) {
    const data = JSON.parse(profile.profile_data);
    return data;
  }

  // Create default profile
  const defaultProfile: UserEnergyPreferences = {
    wakeUpHour: 8,
    sleepHour: 23,
    peakEnergyTimes: [
      { start: "09:00", end: "11:00" },
      { start: "14:00", end: "16:00" }
    ],
    energyLevels: [
      { time: "08:00", level: 2, type: "morning_routine" },
      { time: "09:00", level: 4, type: "morning_energy" },
      { time: "10:00", level: 5, type: "morning_energy" },
      { time: "11:00", level: 3, type: "afternoon_focus" },
      { time: "12:00", level: 2, type: "lunch_break" },
      { time: "13:00", level: 3, type: "afternoon_focus" },
      { time: "14:00", level: 4, type: "afternoon_focus" },
      { time: "15:00", level: 3, type: "creative_window" },
      { time: "16:00", level: 3, type: "creative_window" },
      { time: "17:00", level: 2, type: "end_of_day" },
      { time: "18:00", level: 1, type: "recovery_time" }
    ]
  };

  db.prepare(`
    INSERT INTO user_energy_profiles (user_id, profile_data, created_at, updated_at)
    VALUES (?, ?, datetime('now'), datetime('now'))
  `).run(userId, JSON.stringify(defaultProfile));

  return defaultProfile;
}

/**
 * Calculate optimal time slots based on energy levels and task requirements
 */
export async function calculateOptimalSchedule(
  userId: number,
  taskIds: number[],
  options?: {
    date?: string;
    durationPreference?: "focused" | "balanced" | "spread";
  }
): Promise<ScheduleAnalysis> {
  const db = getDb();
  const energyProfile = await getUserEnergyProfile(userId);
  const targetDate = options?.date || new Date().toISOString().split("T")[0];

  // Get tasks
  const tasks = db
    .prepare(`
      SELECT * FROM tasks
      WHERE id IN (${taskIds.map(() => "?").join(",")})
      AND user_id = ?
    `)
    .all(...taskIds, userId) as any[];

  if (tasks.length === 0) {
    return {
      optimalTimes: [],
      conflicts: [],
      availableSlots: [],
      energyEfficiency: 0
    };
  }

  // Get calendar events for the date
  const calendarEvents = db
    .prepare(`
      SELECT * FROM calendar_events
      WHERE user_id = ? AND date = ?
    `)
    .all(userId, targetDate) as any[];

  // Calculate blocked time
  const blockedTime: { start: string; end: string }[] = [];

  // Add user preferences (work hours)
  const workStart = energyProfile.wakeUpHour.toString().padStart(2, "0") + ":00";
  const workEnd = (energyProfile.sleepHour - 1).toString().padStart(2, "0") + ":00";
  blockedTime.push({ start: workStart, end: workEnd });

  // Add calendar events
  calendarEvents.forEach(event => {
    if (event.start_time && event.end_time) {
      blockedTime.push({ start: event.start_time, end: event.end_time });
    }
  });

  // Score each time slot based on energy level
  const energyScores = energyProfile.energyLevels
    .filter(level => {
      const hour = parseInt(level.time.split(":")[0]);
      const isBlocked = blockedTime.some(block => {
        const blockStart = parseInt(block.start.split(":")[0]);
        const blockEnd = parseInt(block.end.split(":")[0]);
        return hour >= blockStart && hour < blockEnd;
      });
      return !isBlocked;
    })
    .map(level => ({
      time: level.time,
      score: level.level as number,
      available: true
    }));

  // Generate suggestions for each task
  const suggestions: BlockSuggestion[] = [];

  for (const task of tasks) {
    const estimatedMinutes = parseDuration(task.estimate || task.actual_time || "30");
    const priority = task.priority || "medium";

    // Find best time slot
    let bestSlot: BlockSuggestion | null = null;
    let bestScore = 0;

    for (const item of energyScores) {
      const slotScore = item.score;
      const adjustedScore = priorityScore(priority) * slotScore;

      if (adjustedScore > bestScore) {
        bestScore = adjustedScore;
        const startTime = item.time;
        const endTime = addMinutes(startTime, estimatedMinutes);

        bestSlot = {
          taskId: task.id,
          startTime: startTime,
          endTime: endTime,
          confidence: Math.min(0.95, adjustedScore / 100 + 0.3),
          reasoning: generateReasoning(priority, task.name, startTime, endTime, slotScore)
        };
      }
    }

    if (bestSlot) {
      suggestions.push(bestSlot);
    }
  }

  // Generate available slots
  const availableSlots = generateAvailableSlots(energyProfile, blockedTime);

  // Calculate energy efficiency
  const energyEfficiency = tasks.length > 0
    ? Math.round(suggestions.filter(s => s.confidence > 0.7).length / tasks.length * 100)
    : 0;

  return {
    optimalTimes: suggestions,
    conflicts: [], // Would need more complex logic to detect
    availableSlots,
    energyEfficiency
  };
}

/**
 * Parse duration string to minutes
 */
function parseDuration(duration: string): number {
  if (!duration) return 30;

  const match = duration.match(/(\d+)(min|hr|h)?/);
  if (!match) return 30;

  const value = parseInt(match[1]);
  const unit = match[2] || "min";

  if (unit.startsWith("h") || unit === "hr") {
    return value * 60;
  }
  return value;
}

/**
 * Get priority score
 */
function priorityScore(priority: string): number {
  const scores: Record<string, number> = {
    critical: 100,
    high: 75,
    medium: 50,
    low: 25,
    none: 10
  };
  return scores[priority] || 50;
}

/**
 * Add minutes to time string
 */
function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const newHours = Math.floor(totalMinutes / 60);
  const newMinutes = totalMinutes % 60;
  return `${newHours.toString().padStart(2, "0")}:${newMinutes.toString().padStart(2, "0")}`;
}

/**
 * Generate human-readable reasoning
 */
function generateReasoning(
  priority: string,
  taskName: string,
  startTime: string,
  endTime: string,
  energyScore: number
): string {
  const priorityText = priority === "critical" ? "urgent" : priority === "high" ? "important" : "routine";
  return `Scheduled during ${energyScore}-level energy window (${startTime}-${endTime}) for optimal ${priorityText} task execution.`;
}

/**
 * Generate available slots
 */
function generateAvailableSlots(
  profile: UserEnergyPreferences,
  blockedTime: { start: string; end: string }[]
): Array<{ startTime: string; endTime: string; durationMinutes: number }> {
  const slots: Array<{ startTime: string; endTime: string; durationMinutes: number }> = [];

  // Define standard time slots
  const standardSlots = [
    { start: "09:00", end: "10:00" },
    { start: "10:00", end: "11:00" },
    { start: "11:00", end: "12:00" },
    { start: "13:00", end: "14:00" },
    { start: "14:00", end: "15:00" },
    { start: "15:00", end: "16:00" },
    { start: "16:00", end: "17:00" }
  ];

  standardSlots.forEach(slot => {
    const isBlocked = blockedTime.some(block => {
      const blockStart = block.start;
      const blockEnd = block.end;
      return !(slot.end <= blockStart || slot.start >= blockEnd);
    });

    if (!isBlocked) {
      slots.push({
        startTime: slot.start,
        endTime: slot.end,
        durationMinutes: 60
      });
    }
  });

  return slots;
}

/**
 * Reschedule tasks based on conflicts and priority
 */
export async function rescheduleTask(
  userId: number,
  taskId: number,
  newStartTime: string,
  newDate: string
): Promise<{ success: boolean; message: string }> {
  const db = getDb();

  const task = db
    .prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?")
    .get(taskId, userId) as any | undefined;

  if (!task) {
    return { success: false, message: "Task not found" };
  }

  // Update task schedule
  db.prepare(`
    UPDATE tasks
    SET date = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(newDate, taskId);

  return { success: true, message: "Task rescheduled successfully" };
}