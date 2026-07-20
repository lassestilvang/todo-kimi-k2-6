/**
 * Gamification System for TaskFlow
 * Achievements, streaks, and reward-based progression
 */
// @ts-nocheck


import type { Task, TaskWithRelations, Goal } from "@/types";

export type AchievementTier = "bronze" | "silver" | "gold" | "platinum" | "legendary";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: AchievementTier;
  unlockedAt?: Date;
  progress?: number;
  target?: number;
}

export interface AchievementContext {
  tasks: TaskWithRelations[];
  goals: Goal[];
  streakDays: number;
  totalCompleted: number;
  totalHoursLogged: number;
  currentSession?: {
    startTime: Date;
    tasksCompleted: number;
  };
}

// Achievement metadata
const ACHIEVEMENTS: Record<string, Omit<Achievement, "unlockedAt" | "progress" | "target">> = {
  "first-task": {
    id: "first-task",
    name: "First Step",
    description: "Complete your first task",
    icon: "🎯",
    tier: "bronze",
  },
  "ten-tasks": {
    id: "ten-tasks",
    name: "Getting Started",
    description: "Complete 10 tasks",
    icon: "🚀",
    tier: "bronze",
  },
  "hundred-tasks": {
    id: "hundred-tasks",
    name: "Taskmaster",
    description: "Complete 100 tasks",
    icon: "💯",
    tier: "silver",
  },
  "thousand-tasks": {
    id: "thousand-tasks",
    name: "Legendary",
    description: "Complete 1000 tasks",
    icon: "⚡",
    tier: "platinum",
  },
  "first-streak": {
    id: "first-streak",
    name: "Chain Started",
    description: "Start a task streak",
    icon: "🔗",
    tier: "bronze",
  },
  "seven-day-streak": {
    id: "seven-day-streak",
    name: "Weekly Warrior",
    description: "Complete tasks for 7 days straight",
    icon: "🔥",
    tier: "silver",
  },
  "thirty-day-streak": {
    id: "thirty-day-streak",
    name: "Monthly Champion",
    description: "Maintain a 30-day streak",
    icon: "🏆",
    tier: "gold",
  },
  "hundred-day-streak": {
    id: "hundred-day-streak",
    name: "Demigod",
    description: "Legendary 100-day streak",
    icon: "🌟",
    tier: "legendary",
  },
  "deep-work": {
    id: "deep-work",
    name: "Deep Work",
    description: "Log 1 hour of focused work",
    icon: "🧘",
    tier: "bronze",
  },
  "marathon": {
    id: "marathon",
    name: "Marathon",
    description: "Log 24 hours of work",
    icon: "🏃",
    tier: "silver",
  },
  "time-lord": {
    id: "time-lord",
    name: "Time Lord",
    description: "Log 100 hours of work",
    icon: "⏳",
    tier: "gold",
  },
  "goal-setter": {
    id: "goal-setter",
    name: "Goal Setter",
    description: "Set your first goal",
    icon: "📊",
    tier: "bronze",
  },
  "goal-achiever": {
    id: "goal-achiever",
    name: "Goal Crusher",
    description: "Achieve a goal target",
    icon: "🎖️",
    tier: "silver",
  },
  "perfect-day": {
    id: "perfect-day",
    name: "Perfect Day",
    description: "Complete all scheduled tasks for a day (5+ tasks)",
    icon: "✨",
    tier: "gold",
  },
};

/**
 * Calculate all achievements and their status
 */
export function calculateAchievements(context: AchievementContext): Achievement[] {
  const { tasks, goals, streakDays, totalCompleted, totalHoursLogged } = context;

  return Object.entries(ACHIEVEMENTS).map(([id, metadata]): Achievement => {
    let isUnlocked = false;
    let progress: number | undefined;
    let target: number | undefined;

    switch (id) {
      case "first-task":
        isUnlocked = totalCompleted >= 1;
        break;
      case "ten-tasks":
        isUnlocked = totalCompleted >= 10;
        break;
      case "hundred-tasks":
        isUnlocked = totalCompleted >= 100;
        break;
      case "thousand-tasks":
        isUnlocked = totalCompleted >= 1000;
        break;
      case "first-streak":
        isUnlocked = streakDays >= 1;
        break;
      case "seven-day-streak":
        isUnlocked = streakDays >= 7;
        break;
      case "thirty-day-streak":
        isUnlocked = streakDays >= 30;
        break;
      case "hundred-day-streak":
        isUnlocked = streakDays >= 100;
        break;
      case "deep-work":
        isUnlocked = totalHoursLogged >= 60; // 1 hour
        break;
      case "marathon":
        isUnlocked = totalHoursLogged >= 1440; // 24 hours
        break;
      case "time-lord":
        isUnlocked = totalHoursLogged >= 6000; // 100 hours
        break;
      case "goal-setter":
        isUnlocked = goals.length >= 1;
        break;
      case "goal-achiever":
        isUnlocked = goals.some((g) => g.current_count >= g.target_count);
        break;
      case "perfect-day":
        progress = calculatePerfectDayProgress(tasks);
        target = 100;
        isUnlocked = progress >= 100;
        break;
    }

    return {
      ...metadata,
      unlockedAt: isUnlocked ? new Date() : undefined,
      progress,
      target,
    };
  });
}

/**
 * Calculate perfect day progress (0-100)
 */
function calculatePerfectDayProgress(tasks: TaskWithRelations[]): number {
  const today = new Date().toISOString().split("T")[0];
  const todayTasks = tasks.filter((t) => t.date === today);
  const completedToday = todayTasks.filter((t) => t.completed).length;
  const totalToday = todayTasks.length;

  if (totalToday < 5) return 0;
  return (completedToday / totalToday) * 100;
}

/**
 * Get unlocked achievements
 */
export function getUnlockedAchievements(achievements: Achievement[]): Achievement[] {
  return achievements.filter((a) => !!a.unlockedAt);
}

/**
 * Get achievements by tier
 */
export function getAchievementsByTier(achievements: Achievement[], tier: AchievementTier): Achievement[] {
  return achievements.filter((a) => a.tier === tier);
}

/**
 * Calculate skill points based on tasks
 */
export function calculateSkillPoints(tasks: TaskWithRelations[]): Record<string, number> {
  const points: Record<string, number> = {
    consistency: 0,
    productivity: 0,
    planning: 0,
    execution: 0,
  };

  // Consistency: streak days
  const streakDays = calculateStreakDays(tasks);
  points.consistency = Math.min(streakDays * 5, 100);

  // Productivity: tasks per day average
  const daysActive = getActiveDays(tasks);
  const avgTasksPerDay = tasks.filter((t) => t.completed).length / Math.max(1, daysActive);
  points.productivity = Math.min(avgTasksPerDay * 10, 100);

  // Planning: tasks with future dates
  const plannedTasks = tasks.filter((t) => t.date && !t.completed).length;
  points.planning = Math.min(plannedTasks * 2, 100);

  // Execution: high-priority completions
  const highPriorityCompleted = tasks.filter((t) => t.completed && (t.priority === "high" || t.priority === "critical")).length;
  points.execution = Math.min(highPriorityCompleted * 3, 100);

  return points;
}

/**
 * Calculate streak days
 */
export function calculateStreakDays(tasks: TaskWithRelations[]): number {
  const completedDates = tasks
    .filter((t) => t.completed && t.completed_at)
    .map((t) => t.completed_at!.split("T")[0]);

  const uniqueDates = [...new Set(completedDates)].sort().reverse();

  let streak = 0;
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
    return 0;
  }

  for (let i = 0; i < uniqueDates.length; i++) {
    const expectedDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    if (uniqueDates[i] === expectedDate) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Get number of active days
 */
function getActiveDays(tasks: TaskWithRelations[]): number {
  const dates = tasks
    .filter((t) => t.completed && t.completed_at)
    .map((t) => t.completed_at!.split("T")[0]);

  return [...new Set(dates)].length;
}