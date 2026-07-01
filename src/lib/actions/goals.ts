"use server";

import { getDb } from "@/lib/db";
import { type Goal, type CreateGoalInput } from "@/types";

export async function getGoals(): Promise<Goal[]> {
  const db = getDb();
  return db.prepare("SELECT * FROM goals ORDER BY created_at DESC").all() as Goal[];
}

export async function getGoalById(id: number): Promise<Goal | undefined> {
  const db = getDb();
  return db.prepare("SELECT * FROM goals WHERE id = ?").get(id) as Goal | undefined;
}

export async function createGoal(input: CreateGoalInput & { user_id: number }): Promise<Goal> {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO goals (user_id, name, description, target_count, target_unit, period)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(input.user_id, input.name, input.description || null, input.target_count, input.target_unit, input.period);

  return {
    id: Number(result.lastInsertRowid),
    user_id: input.user_id,
    name: input.name,
    description: input.description || null,
    target_count: input.target_count,
    target_unit: input.target_unit,
    period: input.period,
    current_count: 0,
    streak_count: 0,
    last_updated: null,
    created_at: new Date().toISOString(),
  };
}

export async function updateGoalProgress(id: number, increment: number): Promise<Goal> {
  const db = getDb();
  const goal = await getGoalById(id);
  if (!goal) throw new Error("Goal not found");

  const newCount = Math.min(goal.current_count + increment, goal.target_count);
  const isCompleted = newCount >= goal.target_count;

  db.prepare(
    "UPDATE goals SET current_count = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(newCount, id);

  const updated = await getGoalById(id);
  if (!updated) throw new Error("Failed to update goal");

  return updated;
}

export async function resetGoal(id: number): Promise<Goal> {
  const db = getDb();
  db.prepare("UPDATE goals SET current_count = 0, streak_count = 0, last_updated = CURRENT_TIMESTAMP WHERE id = ?").run(id);
  const goal = await getGoalById(id);
  if (!goal) throw new Error("Goal not found");
  return goal;
}

export async function deleteGoal(id: number): Promise<void> {
  const db = getDb();
  db.prepare("DELETE FROM goals WHERE id = ?").run(id);
}

export async function getGoalProgress(goalId: number): Promise<{
  goal: Goal;
  progress_percent: number;
  is_completed: boolean;
  days_remaining: number;
}> {
  const db = getDb();
  const goal = await getGoalById(goalId);
  if (!goal) throw new Error("Goal not found");

  const progressPercent = goal.target_count > 0 ? Math.round((goal.current_count / goal.target_count) * 100) : 0;
  const isCompleted = goal.current_count >= goal.target_count;

  // Calculate days remaining based on period
  let daysRemaining = 0;
  const now = new Date();
  switch (goal.period) {
    case "daily":
      daysRemaining = 1;
      break;
    case "weekly":
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() + (7 - now.getDay()));
      daysRemaining = Math.ceil((weekEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      break;
    case "monthly":
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      daysRemaining = Math.ceil((monthEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      break;
    case "yearly":
      const yearEnd = new Date(now.getFullYear(), 11, 31);
      daysRemaining = Math.ceil((yearEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      break;
  }

  return { goal, progress_percent: progressPercent, is_completed: isCompleted, days_remaining: daysRemaining };
}

// Bulk update goal progress based on task completions
export async function updateGoalsFromTaskCompletion(taskCount: number = 1) {
  const db = getDb();

  // Update daily goals
  const dailyGoals = db.prepare("SELECT * FROM goals WHERE period = 'daily'").all() as Goal[];
  for (const goal of dailyGoals) {
    const newCount = goal.current_count + taskCount;
    db.prepare("UPDATE goals SET current_count = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?").run(
      Math.min(newCount, goal.target_count),
      goal.id
    );
  }
}

// ============================================
// Goal Milestones
// ============================================

import { type GoalMilestone } from "@/types";

export async function getGoalMilestones(goalId: number): Promise<GoalMilestone[]> {
  const db = getDb();
  return db
    .prepare("SELECT * FROM goal_milestones WHERE goal_id = ? ORDER BY due_date ASC, created_at DESC")
    .all(goalId) as GoalMilestone[];
}

export async function createGoalMilestone(
  goalId: number,
  input: { name: string; target_count: number; due_date?: string }
): Promise<GoalMilestone> {
  const db = getDb();
  const result = db
    .prepare(
      "INSERT INTO goal_milestones (goal_id, name, target_count, due_date) VALUES (?, ?, ?, ?)"
    )
    .run(goalId, input.name, input.target_count, input.due_date || null);

  return {
    id: Number(result.lastInsertRowid),
    goal_id: goalId,
    name: input.name,
    target_count: input.target_count,
    current_count: 0,
    due_date: input.due_date || null,
    completed: false,
    created_at: new Date().toISOString(),
  };
}

export async function updateMilestoneProgress(id: number, increment: number): Promise<GoalMilestone> {
  const db = getDb();
  const milestone = db.prepare("SELECT * FROM goal_milestones WHERE id = ?").get(id) as GoalMilestone | undefined;
  if (!milestone) throw new Error("Milestone not found");

  const newCount = Math.min(milestone.current_count + increment, milestone.target_count);
  const isCompleted = newCount >= milestone.target_count;

  db.prepare("UPDATE goal_milestones SET current_count = ?, completed = ? WHERE id = ?").run(
    newCount,
    isCompleted ? 1 : 0,
    id
  );

  const updated = db.prepare("SELECT * FROM goal_milestones WHERE id = ?").get(id) as GoalMilestone;
  return updated;
}

export async function deleteGoalMilestone(id: number): Promise<void> {
  const db = getDb();
  db.prepare("DELETE FROM goal_milestones WHERE id = ?").run(id);
}