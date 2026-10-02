'use server';

import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { logError } from '@/lib/logger';

export interface MarketplaceListing {
  id: number;
  task_id: number;
  task_name: string;
  task_description: string;
  seller_id: number;
  seller_name: string;
  price_xp: number;
  estimated_hours: number;
  required_skills: string[];
  status: 'available' | 'claimed' | 'completed' | 'cancelled';
  claimed_by: number | null;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMarketplaceListingInput {
  task_id: number;
  price_xp: number;
  estimated_hours: number;
  required_skills: string[];
  category: string;
}

/**
 * Create a marketplace listing
 */
export async function createMarketplaceListing(
  input: CreateMarketplaceListingInput
): Promise<MarketplaceListing> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    throw new Error('Authentication required');
  }

  const result = db
    .prepare(
      `INSERT INTO task_marketplace
       (task_id, seller_id, price_xp, estimated_hours, required_skills, status, category, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'available', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    )
    .run(
      input.task_id,
      user.id,
      input.price_xp,
      input.estimated_hours,
      JSON.stringify(input.required_skills),
      input.category
    );

  return db
    .prepare('SELECT * FROM task_marketplace WHERE id = ?')
    .get(Number(result.lastInsertRowid)) as MarketplaceListing;
}

/**
 * Get available marketplace listings
 */
export async function getMarketplaceListings(
  options?: { category?: string; skill?: string; limit?: number }
): Promise<MarketplaceListing[]> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return [];
  }

  let query = 'SELECT * FROM task_marketplace WHERE status = ?';
  const params: unknown[] = ['available'];

  if (options?.category) {
    query += ' AND category = ?';
    params.push(options.category);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(options?.limit || 50);

  interface MarketplaceListingRow {
    id: number;
    task_id: number;
    seller_id: number;
    price_xp: number;
    estimated_hours: number;
    required_skills: string;
    status: 'available' | 'claimed' | 'completed' | 'cancelled';
    claimed_by: number | null;
    category: string;
    created_at: string;
    updated_at: string;
  }

  const listings = db.prepare(query).all(...params) as MarketplaceListingRow[];

  // Enrich with task and user info
  return listings.map(listing => {
    const task = db
      .prepare('SELECT name, description FROM tasks WHERE id = ?')
      .get(listing.task_id) as { name: string; description: string } | undefined;

    const seller = db
      .prepare('SELECT name, email FROM users WHERE id = ?')
      .get(listing.seller_id) as { name: string; email: string } | undefined;

    return {
      ...listing,
      task_name: task?.name || 'Unknown task',
      task_description: task?.description || '',
      seller_name: seller?.name || seller?.email || 'Unknown',
      required_skills: listing.required_skills ? JSON.parse(listing.required_skills) : [],
    };
  });
}

/**
 * Claim a marketplace listing
 */
export async function claimMarketplaceListing(listingId: number): Promise<boolean> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return false;
  }

  try {
    // Update listing
    db.prepare(
      `UPDATE task_marketplace
       SET status = 'claimed', claimed_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'available'`
    ).run(user.id, listingId);

    // Update task assignee
    const listing = db
      .prepare('SELECT task_id FROM task_marketplace WHERE id = ?')
      .get(listingId) as { task_id: number } | undefined;

    if (listing) {
      db.prepare(
        'UPDATE tasks SET assignee_id = ? WHERE id = ?'
      ).run(user.id, listing.task_id);
    }

    return true;
  } catch (error) {
    logError('Failed to claim listing', undefined, error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Complete marketplace listing
 */
export async function completeMarketplaceListing(listingId: number): Promise<boolean> {
  const db = getDb();
  const user = await getCurrentUser();

  if (!user?.id) {
    return false;
  }

  try {
    // Get the listing
    const listing = db
      .prepare(
        'SELECT * FROM task_marketplace WHERE id = ? AND claimed_by = ?'
      )
      .get(listingId, user.id) as MarketplaceListing | undefined;

    if (!listing) return false;

    // Update listing
    db.prepare(
      `UPDATE task_marketplace
       SET status = 'completed', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(listingId);

    // Transfer XP from seller to claimer
    db.prepare(
      `INSERT INTO xp_transfers (from_user_id, to_user_id, amount, reason, created_at)
       VALUES (?, ?, ?, 'marketplace_completion', CURRENT_TIMESTAMP)`
    ).run(listing.seller_id, user.id, listing.price_xp);

    // Mark task as complete
    db.prepare(
      `UPDATE tasks SET completed = 1, completed_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(listing.task_id);

    return true;
  } catch (error) {
    logError('Failed to complete listing', undefined, error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Get user's listings
 */
export async function getUserListings(userId: number): Promise<MarketplaceListing[]> {
  const db = getDb();

  return db
    .prepare(
      `SELECT * FROM task_marketplace
       WHERE seller_id = ? OR claimed_by = ?
       ORDER BY updated_at DESC`
    )
    .all(userId, userId) as MarketplaceListing[];
}