'use server';

import { getCurrentUser } from '@/lib/session';
import type { UserSkill, TaskWithRelations } from '@/types';
import type { GetTasksOptions } from './tasks';

/**
 * Get user skills (server action wrapper for client components)
 */
export async function fetchUserSkills(userId?: number): Promise<UserSkill[]> {
  const { getUserSkills } = await import('./skills');
  const uid = userId || (await getCurrentUser())?.id;
  if (!uid) return [];
  return getUserSkills(uid);
}

/**
 * Get skill statistics
 */
export async function fetchSkillStatistics(userId?: number): Promise<{
  totalSkills: number;
  averageLevel: number;
  skillDistribution: Array<{ level: number; count: number }>;
  topSkills: Array<{ name: string; level: number }>;
}> {
  const { getSkillStatistics } = await import('./skills');
  const uid = userId || (await getCurrentUser())?.id;
  if (!uid) {
    return {
      totalSkills: 0,
      averageLevel: 0,
      skillDistribution: Array(5)
        .fill(0)
        .map((_, i) => ({ level: i + 1, count: 0 })),
      topSkills: [],
    };
  }
  return getSkillStatistics(uid);
}

/**
 * Get tasks for current user
 */
export async function fetchTasks(options?: { view?: GetTasksOptions['view']; limit?: number }): Promise<TaskWithRelations[]> {
  const { getTasks } = await import('./tasks');
  const tasks = await getTasks({
    view: options?.view,
    limit: options?.limit || 50,
  });
  return tasks;
}