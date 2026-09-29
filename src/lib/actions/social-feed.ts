'use server';

import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { logError } from '@/lib/logger';

export interface FeedPost {
  id: number;
  user_id: number;
  activity_type: 'task_completed' | 'streak' | 'milestone' | 'achievement' | 'level_up' | 'goal_completed';
  title: string;
  description: string;
  metadata: string | null;
  visibility: 'public' | 'team' | 'private';
  likes_count: number;
  comments_count: number;
  created_at: string;
}

export interface FeedLike {
  id: number;
  post_id: number;
  user_id: number;
  created_at: string;
}

export interface FeedComment {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  created_at: string;
}

/**
 * Create a feed post
 */
export async function createFeedPost(
  activityType: FeedPost['activity_type'],
  title: string,
  description: string,
  metadata?: Record<string, unknown>,
  visibility: 'public' | 'team' | 'private' = 'team'
): Promise<FeedPost> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    throw new Error('Authentication required');
  }

  const result = db
    .prepare(
      `INSERT INTO feed_posts
       (user_id, activity_type, title, description, metadata, visibility, likes_count, comments_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, 0, CURRENT_TIMESTAMP)`
    )
    .run(
      user.id,
      activityType,
      title,
      description,
      metadata ? JSON.stringify(metadata) : null,
      visibility
    );

  return db
    .prepare('SELECT * FROM feed_posts WHERE id = ?')
    .get(Number(result.lastInsertRowid)) as FeedPost;
}

/**
 * Get personalized feed
 */
export async function getFeed(
  options?: { limit?: number; offset?: number; filter?: 'all' | 'team' | 'following' }
): Promise<FeedPost[]> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return [];
  }

  const limit = options?.limit || 20;
  const offset = options?.offset || 0;

  return db
    .prepare(
      `SELECT * FROM feed_posts
       WHERE visibility IN ('public', 'team')
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(limit, offset) as FeedPost[];
}

/**
 * Like a feed post
 */
export async function likeFeedPost(postId: number): Promise<boolean> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return false;
  }

  try {
    // Check if already liked
    const existing = db
      .prepare('SELECT id FROM feed_likes WHERE post_id = ? AND user_id = ?')
      .get(postId, user.id);

    if (existing) {
      return false;
    }

    db.prepare(
      `INSERT INTO feed_likes (post_id, user_id, created_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)`
    ).run(postId, user.id);

    db.prepare(
      `UPDATE feed_posts SET likes_count = likes_count + 1 WHERE id = ?`
    ).run(postId);

    return true;
  } catch (error) {
    logError('Failed to like post', undefined, error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Unlike a feed post
 */
export async function unlikeFeedPost(postId: number): Promise<boolean> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return false;
  }

  try {
    const result = db
      .prepare('DELETE FROM feed_likes WHERE post_id = ? AND user_id = ?')
      .run(postId, user.id);

    if (result.changes > 0) {
      db.prepare(
        `UPDATE feed_posts SET likes_count = MAX(0, likes_count - 1) WHERE id = ?`
      ).run(postId);
      return true;
    }
    return false;
  } catch (error) {
    logError('Failed to unlike post', undefined, error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Comment on a feed post
 */
export async function commentOnFeedPost(
  postId: number,
  content: string
): Promise<FeedComment> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    throw new Error('Authentication required');
  }

  const result = db
    .prepare(
      `INSERT INTO feed_comments (post_id, user_id, content, created_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`
    )
    .run(postId, user.id, content);

  // Increment comment count
  db.prepare(
    `UPDATE feed_posts SET comments_count = comments_count + 1 WHERE id = ?`
  ).run(postId);

  return db
    .prepare('SELECT * FROM feed_comments WHERE id = ?')
    .get(Number(result.lastInsertRowid)) as FeedComment;
}

/**
 * Get comments for a feed post
 */
export async function getFeedComments(postId: number): Promise<FeedComment[]> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return [];
  }

  return db
    .prepare(
      `SELECT * FROM feed_comments
       WHERE post_id = ?
       ORDER BY created_at ASC`
    )
    .all(postId) as FeedComment[];
}

/**
 * Auto-post task completion to feed
 */
export async function autoPostTaskCompletion(
  taskName: string,
  priority: string
): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.id) return;

  const title = priority === 'critical' || priority === 'high'
    ? `🎯 Completed high-priority task: ${taskName}`
    : `✅ Completed: ${taskName}`;

  await createFeedPost(
    'task_completed',
    title,
    `Just completed task "${taskName}"`,
    { taskName, priority },
    'team'
  );
}

/**
 * Auto-post milestone to feed
 */
export async function autoPostMilestone(
  milestone: string,
  value: number
): Promise<void> {
  const user = await getCurrentUser();
  if (!user?.id) return;

  await createFeedPost(
    'milestone',
    `🏆 Milestone: ${milestone}`,
    `Reached ${value} ${milestone}!`,
    { milestone, value }
  );
}