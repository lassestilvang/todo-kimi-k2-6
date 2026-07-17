import { describe, it, expect, beforeEach, vi } from 'vitest';
import { connectIntegration, syncTasksFromIntegration, getIntegrationSyncStatus, disconnectIntegration } from '../integrations';
import { setupTestDb, cleanupTestDb } from '@/test/test-utils';

describe('Integration Actions', () => {
  beforeEach(async () => {
    await setupTestDb();
  });

  afterEach(async () => {
    await cleanupTestDb();
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
  });

  describe('syncTasksFromIntegration', () => {
    it('syncs tasks from enabled integration', async () => {
      // First create an integration
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
  });

  describe('disconnectIntegration', () => {
    it('removes integration and mappings', async () => {
      // Create integration first
      const integration = await connectIntegration({ id: 1 }, 'github', 'Test', {});

      const result = await disconnectIntegration(integration.id, 1);

      expect(result).toBe(true);
    });

    it('throws error for non-owned integration', async () => {
      await expect(disconnectIntegration(9999, 1))
        .rejects.toThrow('Integration not found or not accessible');
    });
  });
});