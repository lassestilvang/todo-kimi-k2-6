import { describe, it, expect } from 'vitest';
import {
  BaseConnector,
  type IntegrationConfig,
  type ExternalRecord,
} from '../base-connector';

// Concrete implementation for testing the abstract class
class TestConnector extends BaseConnector {
  readonly id = 'test';
  readonly type = 'test';
  readonly name = 'Test';

  async fetchRecords(): Promise<ExternalRecord[]> {
    return [];
  }

  async pushTask(_task: {
    title: string;
    description?: string;
    dueDate?: string;
    labels?: string[];
    assignee?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<ExternalRecord> {
    return {
      id: 'test-id',
      title: 'Test Task',
      createdAt: new Date().toISOString(),
    };
  }
}

describe('BaseConnector', () => {
  const mockConfig: IntegrationConfig = {
    id: 'test-connector',
    type: 'test',
    name: 'Test Connector',
    enabled: true,
    syncDirection: 'import',
  };

  describe('constructor', () => {
    it('should store config and access token', () => {
      const connector = new TestConnector({
        ...mockConfig,
        accessToken: 'test-token',
      });

      expect(connector['accessToken']).toBe('test-token');
    });

    it('should set accessToken to null when not provided', () => {
      const connector = new TestConnector(mockConfig);

      expect(connector['accessToken']).toBeNull();
    });
  });

  describe('authenticate', () => {
    it('should authenticate with access token', async () => {
      const connector = new TestConnector(mockConfig);

      const result = await connector.authenticate({
        accessToken: 'new-token',
      });

      expect(result.accessToken).toBe('new-token');
      expect(result.expiresAt).toBeDefined();
      expect(connector['accessToken']).toBe('new-token');
    });

    it('should include refresh token when provided', async () => {
      const connector = new TestConnector(mockConfig);

      const result = await connector.authenticate({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      expect(result.refreshToken).toBe('refresh-token');
    });

    it('should throw error when no access token provided', async () => {
      const connector = new TestConnector(mockConfig);

      await expect(connector.authenticate({})).rejects.toThrow(
        'Authentication failed'
      );
    });
  });

  describe('mapToTask', () => {
    it('should map record to task with default values', () => {
      const connector = new TestConnector(mockConfig);

      const record: ExternalRecord = {
        id: 'external-123',
        title: 'Test Record',
        createdAt: '2024-01-01',
      };

      const result = connector.mapToTask(record);

      expect(result.title).toBe('Test Record');
      expect(result.title).toBe('Test Record');
    });

    it('should map record with all fields', () => {
      const connector = new TestConnector(mockConfig);

      const record: ExternalRecord = {
        id: 'external-123',
        title: 'Complete project',
        description: 'Finish the new feature',
        dueDate: '2024-12-31',
        labels: ['urgent', 'review'],
        assignee: 'user@example.com',
        priority: 'high',
        createdAt: '2024-01-01',
      };

      const result = connector.mapToTask(record);

      expect(result.title).toBe('Complete project');
      expect(result.description).toBe('Finish the new feature');
      expect(result.dueDate).toBe('2024-12-31');
      expect(result.labels).toEqual(['urgent', 'review']);
      expect(result.assignee).toBe('user@example.com');
      expect(result.priority).toBe('high');
    });

    it('should return Untitled for records without title', () => {
      const connector = new TestConnector(mockConfig);

      const record: ExternalRecord = {
        id: 'external-123',
        title: '',
        createdAt: '2024-01-01',
      };

      const result = connector.mapToTask(record);

      expect(result.title).toBe('Untitled');
    });
  });

  describe('testConnection', () => {
    it('should return true on successful fetchRecords', async () => {
      class SuccessConnector extends BaseConnector {
        readonly id = 'success';
        readonly type = 'success';
        readonly name = 'Success';

        async fetchRecords(): Promise<ExternalRecord[]> {
          return [
            { id: '1', title: 'Test', createdAt: new Date().toISOString() },
          ];
        }
        async pushTask(): Promise<ExternalRecord> {
          throw new Error('Not implemented');
        }
      }

      const connector = new SuccessConnector(mockConfig);
      const result = await connector.testConnection();

      expect(result).toBe(true);
    });

    it('should return false on fetchRecords error', async () => {
      class ErrorConnector extends BaseConnector {
        readonly id = 'error';
        readonly type = 'error';
        readonly name = 'Error';

        async fetchRecords(): Promise<ExternalRecord[]> {
          throw new Error('Network error');
        }
        async pushTask(): Promise<ExternalRecord> {
          throw new Error('Not implemented');
        }
      }

      const connector = new ErrorConnector(mockConfig);
      const result = await connector.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('getSyncStatus', () => {
    it('should return sync status with default values', async () => {
      const connector = new TestConnector(mockConfig);
      const result = await connector.getSyncStatus();

      expect(result.lastSync).toBeInstanceOf(Date);
      expect(result.pendingChanges).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it('should return lastSync from config when provided', async () => {
      const connector = new TestConnector({
        ...mockConfig,
        lastSyncAt: '2024-06-15T10:30:00Z',
      });
      const result = await connector.getSyncStatus();

      expect(result.lastSync).toEqual(new Date('2024-06-15T10:30:00Z'));
    });
  });

  describe('pushTask', () => {
    it('should push task and return external record', async () => {
      const connector = new TestConnector(mockConfig);

      const result = await connector.pushTask({
        title: 'New Task',
        description: 'Task description',
        dueDate: '2024-12-31',
        labels: ['important'],
        assignee: 'user@example.com',
        priority: 'high',
      });

      expect(result).toEqual({
        id: 'test-id',
        title: 'Test Task',
        createdAt: expect.any(String),
      });
    });
  });
});
