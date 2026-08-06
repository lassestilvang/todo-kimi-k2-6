import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  connectIntegration,
  syncTasksFromIntegration,
  syncTasksToIntegration,
  updateIntegrationMapping,
  getUserTaskMappings,
  getIntegrationSyncStatus,
  disconnectIntegration
} from '../integrations';
import { setDb, resetDb, getDb } from '@/lib/db';
import { createTestDb } from '@/lib/db/test-db';

// Mock CSRF protection
vi.mock('@/lib/csrf', () => ({
  csrfProtection: () => null,
}));

// Mock rate limiter
vi.mock('@/lib/rate-limiter', () => ({
  rateLimits: { api: { windowMs: 60000, max: 100 } },
  getClientKey: () => 'test-client',
  checkRateLimit: () => Promise.resolve({ allowed: true, remaining: 99, resetTime: Date.now() + 60000 }),
}));

// Mock AI providers
vi.mock('@/lib/ai/providers', () => ({
  aiCache: {
    get: vi.fn(() => null),
    set: vi.fn(),
  },
  getAIManager: vi.fn(() => ({
    predictTaskDuration: vi.fn(),
    generateDecisionTemplate: vi.fn(),
  })),
}));

describe('Integration Actions', () => {
  beforeEach(() => {
    const testDb = createTestDb();
    setDb(testDb);

    // Create test user
    const db = getDb();
    db.exec(`
      INSERT INTO users (id, email, name, created_at) VALUES (1, 'test@example.com', 'Test User', datetime('now'))
    `);

    // Create test task
    db.exec(`
      INSERT INTO tasks (id, user_id, name, description, list_id, date, deadline, priority, recurring, completed, created_at, updated_at, sort_order, archived)
      VALUES (1, 1, 'Test Task', 'A test task', 1, '2024-01-15', '2024-01-20', 'high', 'none', 0, datetime('now'), datetime('now'), 0, 0)
    `);
  });

  afterEach(() => {
    resetDb();
  });

  describe('connectIntegration', () => {
    it('creates a new integration connection', async () => {
      const integration = await connectIntegration(
        { id: 1 },
        'github',
        'GitHub Repository Sync',
        { token: 'test-token', repository: 'user/repo' }
      );

      expect(integration).toBeDefined();
      expect(integration.user_id).toBe(1);
      expect(integration.type).toBe('github');
      expect(integration.name).toBe('GitHub Repository Sync');
      expect(integration.enabled).toBe(true);
      expect(integration.sync_direction).toBe('bidirectional');
    });

    it('throws error when integration already exists', async () => {
      await connectIntegration({ id: 1 }, 'github', 'GitHub', {});

      await expect(connectIntegration({ id: 1 }, 'github', 'GitHub 2', {}))
        .rejects.toThrow('Integration github is already connected');
    });

    it('creates trello integration', async () => {
      const integration = await connectIntegration(
        { id: 1 },
        'trello',
        'My Trello Board',
        { key: 'trello-key', token: 'trello-token' }
      );

      expect(integration.type).toBe('trello');
      expect(integration.name).toBe('My Trello Board');
    });

    it('creates slack integration', async () => {
      const integration = await connectIntegration(
        { id: 1 },
        'slack',
        'Team Slack',
        { webhookUrl: 'https://hooks.slack.com/test' }
      );

      expect(integration.type).toBe('slack');
    });

    it('creates notion integration', async () => {
      const integration = await connectIntegration(
        { id: 1 },
        'notion',
        'Project Notion',
        { pageId: 'notion-page-id' }
      );

      expect(integration.type).toBe('notion');
    });

    it('creates linear integration', async () => {
      const integration = await connectIntegration(
        { id: 1 },
        'linear',
        'Product Linear',
        { apiKey: 'linear-api-key' }
      );

      expect(integration.type).toBe('linear');
    });

    it('creates asana integration', async () => {
      const integration = await connectIntegration(
        { id: 1 },
        'asana',
        'Team Asana',
        { workspaceId: 'asana-workspace' }
      );

      expect(integration.type).toBe('asana');
    });

    it('creates clickup integration', async () => {
      const integration = await connectIntegration(
        { id: 1 },
        'clickup',
        'Team ClickUp',
        { workspaceId: 'clickup-workspace' }
      );

      expect(integration.type).toBe('clickup');
    });

    it('creates todoist integration', async () => {
      const integration = await connectIntegration(
        { id: 1 },
        'todoist',
        'Personal Todoist',
        { token: 'todoist-token' }
      );

      expect(integration.type).toBe('todoist');
    });
  });

  describe('syncTasksFromIntegration', () => {
    it('syncs tasks from enabled integration', async () => {
      const integration = await connectIntegration(
        { id: 1 },
        'trello',
        'Trello Board',
        {}
      );

      const result = await syncTasksFromIntegration({ id: 1 }, integration.id);

      expect(result.success).toBe(true);
      expect(result.tasksImported).toBeGreaterThanOrEqual(0);
    });

    it('throws error for non-existent integration', async () => {
      await expect(syncTasksFromIntegration({ id: 1 }, 9999))
        .rejects.toThrow('Integration not found or not accessible');
    });

    it('syncs from github integration', async () => {
      const integration = await connectIntegration(
        { id: 1 },
        'github',
        'GitHub integration',
        {}
      );

      const result = await syncTasksFromIntegration({ id: 1 }, integration.id);
      expect(result.success).toBe(true);
    });

    it('syncs from slack integration', async () => {
      const integration = await connectIntegration(
        { id: 1 },
        'slack',
        'Slack integration',
        {}
      );

      const result = await syncTasksFromIntegration({ id: 1 }, integration.id);
      expect(result.success).toBe(true);
    });

    it('syncs from notion integration', async () => {
      const integration = await connectIntegration(
        { id: 1 },
        'notion',
        'Notion integration',
        {}
      );

      const result = await syncTasksFromIntegration({ id: 1 }, integration.id);
      expect(result.success).toBe(true);
    });

    it('syncs from linear integration', async () => {
      const integration = await connectIntegration(
        { id: 1 },
        'linear',
        'Linear integration',
        {}
      );

      const result = await syncTasksFromIntegration({ id: 1 }, integration.id);
      expect(result.success).toBe(true);
    });

    it('throws error for unsupported integration type', async () => {
      // Create an integration directly in the database with an unsupported type
      const db = getDb();
      db.exec(`
        INSERT INTO integrations (id, user_id, type, name, config, enabled, sync_direction, created_at)
        VALUES (999, 1, 'unsupported_type', 'Unsupported', '{}', 1, 'bidirectional', datetime('now'))
      `);

      await expect(syncTasksFromIntegration({ id: 1 }, 999))
        .rejects.toThrow('Integration type unsupported_type not yet implemented');
    });
  });

  describe('syncTasksToIntegration', () => {
    it('exports tasks to integration', async () => {
      const integration = await connectIntegration(
        { id: 1 },
        'trello',
        'Trello Board',
        {}
      );

      const result = await syncTasksToIntegration({ id: 1 }, integration.id, [1]);

      expect(result.success).toBe(true);
      expect(result.tasksExported).toBeGreaterThanOrEqual(0);
    });

    it('throws error for non-existent integration', async () => {
      await expect(syncTasksToIntegration({ id: 1 }, 9999, [1]))
        .rejects.toThrow('Integration not found or not accessible');
    });

    it('exports to github integration', async () => {
      const integration = await connectIntegration(
        { id: 1 },
        'github',
        'GitHub integration',
        {}
      );

      const result = await syncTasksToIntegration({ id: 1 }, integration.id, [1]);
      expect(result.success).toBe(true);
    });

    it('exports to slack integration', async () => {
      const integration = await connectIntegration(
        { id: 1 },
        'slack',
        'Slack integration',
        {}
      );

      const result = await syncTasksToIntegration({ id: 1 }, integration.id, [1]);
      expect(result.success).toBe(true);
    });

    it('returns error for unsupported integration type', async () => {
      // Create an integration directly in the database with an unsupported type
      const db = getDb();
      db.exec(`
        INSERT INTO integrations (id, user_id, type, name, config, enabled, sync_direction, created_at)
        VALUES (999, 1, 'unsupported_type', 'Unsupported', '{}', 1, 'bidirectional', datetime('now'))
      `);

      const result = await syncTasksToIntegration({ id: 1 }, 999, [1]);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('updateIntegrationMapping', () => {
    it('throws error for non-existent mapping', async () => {
      await expect(updateIntegrationMapping(
        { id: 1 },
        1,
        { id: 9999, field_mappings: {} } as any
      )).rejects.toThrow('Task mapping not found or not accessible');
    });
  });

  describe('getUserTaskMappings', () => {
    it('returns user task mappings', async () => {
      const integration = await connectIntegration(
        { id: 1 },
        'github',
        'GitHub',
        {}
      );

      // Create a mapping
      const db = getDb();
      db.exec(`
        INSERT INTO task_mappings (integration_id, local_task_id, external_task_id, field_mappings, created_at)
        VALUES (${integration.id}, 1, 'ext-123', '{}', datetime('now'))
      `);

      const mappings = await getUserTaskMappings({ id: 1 }, integration.id);

      expect(Array.isArray(mappings)).toBe(true);
    });

    it('returns empty array when no mappings', async () => {
      const mappings = await getUserTaskMappings({ id: 1 });

      expect(Array.isArray(mappings)).toBe(true);
    });
  });

  describe('getIntegrationSyncStatus', () => {
    it('returns sync status for user integrations', async () => {
      const statuses = await getIntegrationSyncStatus({ id: 1 });

      expect(Array.isArray(statuses)).toBe(true);
    });

    it('includes sync metrics', async () => {
      const statuses = await getIntegrationSyncStatus({ id: 1 });

      statuses.forEach(status => {
        expect(status.sync_status).toBeDefined();
        expect(status.task_count).toBeGreaterThanOrEqual(0);
      });
    });

    it('shows sync status for integrations', async () => {
      await connectIntegration({ id: 1 }, 'github', 'GitHub', {});

      const statuses = await getIntegrationSyncStatus({ id: 1 });

      expect(statuses.length).toBeGreaterThan(0);
      expect(statuses[0].sync_status).toBeDefined();
    });
  });

  describe('disconnectIntegration', () => {
    it('removes integration and mappings', async () => {
      const integration = await connectIntegration({ id: 1 }, 'github', 'Test', {});

      // Create a mapping
      const db = getDb();
      db.exec(`
        INSERT INTO task_mappings (integration_id, local_task_id, external_task_id, field_mappings, created_at)
        VALUES (${integration.id}, 1, 'ext-123', '{}', datetime('now'))
      `);

      // Should not throw
      await expect(disconnectIntegration({ id: 1 }, integration.id)).resolves.toBeUndefined();

      // Verify integration is deleted
      const result = db.prepare("SELECT id FROM integrations WHERE id = ?").get(integration.id);
      expect(result).toBeUndefined();
    });

    it('throws error for non-existent integration', async () => {
      await expect(disconnectIntegration({ id: 1 }, 9999))
        .rejects.toThrow('Integration not found or not accessible');
    });

    it('throws error for integration not owned by user', async () => {
      const integration = await connectIntegration({ id: 2 }, 'github', 'Test', {});

      await expect(disconnectIntegration({ id: 1 }, integration.id))
        .rejects.toThrow('Integration not found or not accessible');
    });
  });
});