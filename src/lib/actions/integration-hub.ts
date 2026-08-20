/**
 * Integration Marketplace Hub
 */

'use server';

import { getDb } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export interface Integration {
  id: number;
  user_id: number;
  name: string;
  type:
    | 'calendar'
    | 'email'
    | 'project_mgmt'
    | 'communication'
    | 'analytics'
    | 'other';
  provider: string;
  status: 'active' | 'pending' | 'error' | 'disconnected';
  config: string; // JSON string
  last_synced_at?: string;
  sync_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface IntegrationCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  integrations: Integration[];
}

export interface SyncResult {
  success: boolean;
  items_synced: number;
  errors: string[];
  duration_ms: number;
  next_sync: string;
}

export interface MarketplaceIntegration {
  id: string;
  name: string;
  type: string;
  description: string;
  icon: string;
  provider: string;
  featured: boolean;
  auth_methods: string[];
  status: 'available' | 'installed' | 'incompatible';
  ratings?: {
    average: number;
    count: number;
  };
  last_updated: string;
}

export interface SyncSchedule {
  frequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  time?: string; // "09:00" for daily/weekly
  days?: string[]; // ["mon", "tue", "wed"] for weekly
  enabled: boolean;
}

/**
 * Get all integrations for a user
 */
export async function getUserIntegrations(
  userId: number
): Promise<Integration[]> {
  const db = getDb();

  return db
    .prepare(
      `
    SELECT * FROM integrations
    WHERE user_id = ?
    ORDER BY created_at DESC
  `
    )
    .all(userId) as Integration[];
}

/**
 * Get a specific integration
 */
export async function getIntegration(
  id: number,
  userId: number
): Promise<Integration | null> {
  const db = getDb();

  return db
    .prepare(
      `
    SELECT * FROM integrations
    WHERE id = ? AND user_id = ?
  `
    )
    .get(id, userId) as Integration | null;
}

/**
 * Install/connect an integration
 */
export async function connectIntegration(
  userId: number,
  data: {
    name: string;
    type: string;
    provider: string;
    config?: Record<string, any>;
    syncEnabled?: boolean;
  }
): Promise<Integration> {
  const db = getDb();

  const result = db
    .prepare(
      `
    INSERT INTO integrations (user_id, name, type, provider, config, sync_enabled, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))
  `
    )
    .run(
      userId,
      data.name,
      data.type,
      data.provider,
      JSON.stringify(data.config || {}),
      data.syncEnabled !== false
    );

  revalidatePath(`/integrations`);
  return db
    .prepare('SELECT * FROM integrations WHERE id = ?')
    .get(result.lastInsertRowid) as Integration;
}

/**
 * Update an integration
 */
export async function updateIntegration(
  userId: number,
  id: number,
  updates: Partial<{
    name: string;
    type: string;
    config: Record<string, any>;
    sync_enabled: boolean;
    status: 'active' | 'pending' | 'error' | 'disconnected';
  }>
): Promise<Integration | null> {
  const db = getDb();

  const setClauses: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) {
    setClauses.push('name = ?');
    values.push(updates.name);
  }

  if (updates.type !== undefined) {
    setClauses.push('type = ?');
    values.push(updates.type);
  }

  if (updates.config !== undefined) {
    setClauses.push('config = ?');
    values.push(JSON.stringify(updates.config));
  }

  if (updates.sync_enabled !== undefined) {
    setClauses.push('sync_enabled = ?');
    values.push(updates.sync_enabled);
  }

  if (updates.status !== undefined) {
    setClauses.push('status = ?');
    values.push(updates.status);
  }

  if (setClauses.length === 0) {
    return getIntegration(id, userId);
  }

  values.push(id, userId);

  db.prepare(
    `
    UPDATE integrations
    SET ${setClauses.join(', ')}, last_synced_at = CASE WHEN status = 'active' THEN datetime('now') ELSE last_synced_at END, updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `
  ).run(...values);

  revalidatePath(`/integrations`);
  return getIntegration(id, userId);
}

/**
 * Disconnect an integration
 */
export async function disconnectIntegration(
  id: number,
  userId: number
): Promise<boolean> {
  const db = getDb();

  const result = db
    .prepare(
      `
    UPDATE integrations SET status = 'disconnected', updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `
    )
    .run(id, userId);

  revalidatePath(`/integrations`);
  return result.changes > 0;
}

/**
 * Delete an integration
 */
export async function deleteIntegration(
  id: number,
  userId: number
): Promise<boolean> {
  const db = getDb();

  const result = db
    .prepare('DELETE FROM integrations WHERE id = ? AND user_id = ?')
    .run(id, userId);

  revalidatePath(`/integrations`);
  return result.changes > 0;
}

/**
 * Trigger a manual sync
 */
export async function triggerSync(
  userId: number,
  integrationId: number,
  options?: { skipQueue?: boolean }
): Promise<SyncResult> {
  const db = getDb();

  const integration = getIntegration(integrationId, userId);
  if (!integration) {
    return {
      success: false,
      items_synced: 0,
      errors: ['Integration not found'],
      duration_ms: 0,
      next_sync: '',
    };
  }

  const startTime = Date.now();

  try {
    // In a real implementation, this would call the integration's sync function
    // For now, simulate a successful sync
    const itemsSynced = Math.floor(Math.random() * 50) + 10;

    db.prepare(
      `
      UPDATE integrations
      SET last_synced_at = datetime('now'), status = 'active'
      WHERE id = ?
    `
    ).run(integrationId);

    const nextSync = await calculateNextSync('hourly');

    return {
      success: true,
      items_synced: itemsSynced,
      errors: [],
      duration_ms: Date.now() - startTime,
      next_sync: nextSync,
    };
  } catch (error) {
    return {
      success: false,
      items_synced: 0,
      errors: [error instanceof Error ? error.message : 'Sync failed'],
      duration_ms: Date.now() - startTime,
      next_sync: '',
    };
  }
}

/**
 * Get marketplace integrations (available to install)
 */
export async function getMarketplaceIntegrations(
  category?: string,
  query?: string
): Promise<MarketplaceIntegration[]> {
  // In a real implementation, this would come from a remote API
  const allIntegrations: MarketplaceIntegration[] = [
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      type: 'calendar',
      description:
        'Sync tasks with Google Calendar, create events automatically from deadlines',
      icon: 'calendar',
      provider: 'google',
      featured: true,
      auth_methods: ['oauth2'],
      status: 'available',
      ratings: { average: 4.8, count: 1247 },
      last_updated: '2024-01-15',
    },
    {
      id: 'outlook-calendar',
      name: 'Outlook Calendar',
      type: 'calendar',
      description: 'Sync with Microsoft Outlook and Office 365 calendars',
      icon: 'calendar',
      provider: 'microsoft',
      featured: true,
      auth_methods: ['oauth2'],
      status: 'available',
      ratings: { average: 4.5, count: 892 },
      last_updated: '2024-01-10',
    },
    {
      id: 'gmail-email',
      name: 'Gmail Email',
      type: 'email',
      description:
        'Convert emails to tasks, extract due dates and priorities from email content',
      icon: 'email',
      provider: 'google',
      featured: true,
      auth_methods: ['oauth2'],
      status: 'available',
      ratings: { average: 4.7, count: 1523 },
      last_updated: '2024-01-20',
    },
    {
      id: 'slack-integration',
      name: 'Slack',
      type: 'communication',
      description:
        'Create tasks from Slack messages, get notifications in Slack channels',
      icon: 'slack',
      provider: 'slack',
      featured: true,
      auth_methods: ['oauth2'],
      status: 'available',
      ratings: { average: 4.3, count: 634 },
      last_updated: '2024-01-12',
    },
    {
      id: 'github-issues',
      name: 'GitHub Issues',
      type: 'project_mgmt',
      description:
        'Sync GitHub issues as tasks, automatically link commits and pull requests',
      icon: 'github',
      provider: 'github',
      featured: false,
      auth_methods: ['oauth2'],
      status: 'available',
      ratings: { average: 4.6, count: 456 },
      last_updated: '2024-01-18',
    },
    {
      id: 'notion',
      name: 'Notion',
      type: 'project_mgmt',
      description:
        'Sync tasks with Notion databases, create bidirectional links',
      icon: 'notion',
      provider: 'notion',
      featured: false,
      auth_methods: ['token'],
      status: 'available',
      ratings: { average: 4.4, count: 389 },
      last_updated: '2024-01-14',
    },
    {
      id: 'asana',
      name: 'Asana',
      type: 'project_mgmt',
      description: 'Sync tasks with Asana projects and tasks',
      icon: 'asana',
      provider: 'asana',
      featured: false,
      auth_methods: ['oauth2'],
      status: 'available',
      ratings: { average: 4.2, count: 234 },
      last_updated: '2024-01-11',
    },
  ];

  let result = allIntegrations;

  // Filter by category if provided
  if (category) {
    result = result.filter(i => i.type === category || i.type === 'other');
  }

  // Filter by search query if provided
  if (query) {
    const q = query.toLowerCase();
    result = result.filter(
      i =>
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.provider.toLowerCase().includes(q)
    );
  }

  return result;
}

/**
 * Get popular integrations
 */
export async function getPopularIntegrations(
  limit = 6
): Promise<MarketplaceIntegration[]> {
  const all = await getMarketplaceIntegrations();
  return all
    .filter(i => i.featured)
    .sort((a, b) => (b.ratings?.average || 0) - (a.ratings?.average || 0))
    .slice(0, limit);
}

/**
 * Calculate next sync time
 */
export async function calculateNextSync(
  frequency: string,
  time?: string,
  days?: string[]
): Promise<string> {
  const now = new Date();

  switch (frequency) {
    case 'realtime':
      return new Date(now.getTime() + 5 * 60 * 1000).toISOString(); // 5 minutes
    case 'hourly':
      return new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour
    case 'daily':
      const nextDay = new Date(now);
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(0, 0, 0, 0);
      return nextDay.toISOString();
    case 'weekly':
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      nextWeek.setHours(0, 0, 0, 0);
      return nextWeek.toISOString();
    default:
      return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  }
}

/**
 * Get integration categories
 */
export async function getIntegrationCategories(): Promise<
  IntegrationCategory[]
> {
  return [
    {
      id: 'calendar',
      name: 'Calendar',
      description: 'Sync with your calendar to see deadlines as events',
      icon: 'calendar',
      integrations: [], // Would be populated from marketplace
    },
    {
      id: 'email',
      name: 'Email',
      description: 'Convert emails to tasks, extract action items',
      icon: 'mail',
      integrations: [],
    },
    {
      id: 'project_mgmt',
      name: 'Project Management',
      description: 'Sync with project management tools',
      icon: 'folders',
      integrations: [],
    },
    {
      id: 'communication',
      name: 'Communication',
      description: 'Connect with Slack, Discord, and other chat tools',
      icon: 'message-circle',
      integrations: [],
    },
    {
      id: 'analytics',
      name: 'Analytics',
      description: 'Connect with analytics and reporting tools',
      icon: 'bar-chart-3',
      integrations: [],
    },
    {
      id: 'other',
      name: 'Other',
      description: 'Other integrations and utilities',
      icon: 'settings',
      integrations: [],
    },
  ];
}

/**
 * Test integration connection
 */
export async function testIntegrationConnection(
  userId: number,
  integrationId: number
): Promise<{ success: boolean; message: string }> {
  const db = getDb();

  const integration = await getIntegration(integrationId, userId);
  if (!integration) {
    return { success: false, message: 'Integration not found' };
  }

  // Simulate connection test
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        success: integration.status !== 'error',
        message:
          integration.status === 'active'
            ? 'Connection successful'
            : 'Connection test failed',
      });
    }, 1000);
  });
}

/**
 * Get integration sync status
 */
export async function getIntegrationSyncStatus(userId: number): Promise<{
  total: number;
  active: number;
  pending: number;
  errors: number;
  lastSync: string | null;
}> {
  const db = getDb();

  const stats = db
    .prepare(
      `
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors,
      MAX(last_synced_at) as last_sync
    FROM integrations
    WHERE user_id = ?
  `
    )
    .get(userId) as {
    total: number;
    active: number;
    pending: number;
    errors: number;
    last_sync: string | null;
  };

  return {
    total: stats.total,
    active: stats.active,
    pending: stats.pending,
    errors: stats.errors,
    lastSync: stats.last_sync,
  };
}
