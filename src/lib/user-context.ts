/**
 * User context utilities for user isolation in multi-tenant applications.
 * All queries should use these helpers to ensure users only see their own data.
 */

import { getDb } from "./db";

/**
 * Ensure user owns a resource before allowing modification.
 * Checks database for ownership.
 */
export async function checkResourceOwnership(
  resourceType: "task" | "list" | "label" | "template",
  resourceId: number,
  userId: number
): Promise<boolean> {
  const db = getDb();
  const resource = db.prepare(
    `SELECT id FROM ${resourceType}s WHERE id = ? AND user_id = ? LIMIT 1`
  ).get(resourceId, userId);

  return !!resource;
}

/**
 * Apply user filter to queries that support user isolation.
 * This ensures users can only access their own data.
 */
export function withUserFilter(
  baseQuery: string,
  params: unknown[],
  userId: number | null
): { query: string; params: unknown[] } {
  if (!userId) {
    // No user context - might be in demo mode or shared views
    return { query: baseQuery, params };
  }

  // Add user_id filter for non-demo mode
  if (baseQuery.toUpperCase().startsWith("SELECT")) {
    // Check if WHERE clause already exists
    const hasWhere = /\bWHERE\b/i.test(baseQuery);
    const whereClause = hasWhere ? " AND" : " WHERE";
    const query = `${baseQuery}${whereClause} user_id = ?`;
    return { query, params: [...params, userId] };
  }

  return { query: baseQuery, params };
}