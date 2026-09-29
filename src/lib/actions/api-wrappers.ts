'use server';

import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import type { UserSkill } from '@/types';

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
export async function fetchTasks(options?: {
  view?: string;
  limit?: number;
}): Promise<any[]> {
  const { getTasks } = await import('./tasks');
  const tasks = await getTasks({
    view: options?.view as any,
    limit: options?.limit || 50,
  });
  return tasks;
}