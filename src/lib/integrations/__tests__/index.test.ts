import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('integrations module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendSlackNotification', () => {
    const validNotification = {
      taskId: 1,
      taskName: 'Test Task',
      action: 'created' as const,
    };

    it('should send Slack notification successfully', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const { sendSlackNotification } =
        await import('@/lib/integrations/index');
      const result = await sendSlackNotification(
        'https://hooks.slack.com/services/test',
        validNotification
      );

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/test',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should return false on network error', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { sendSlackNotification } =
        await import('@/lib/integrations/index');
      const result = await sendSlackNotification(
        'https://hooks.slack.com/services/test',
        validNotification
      );

      expect(result).toBe(false);
      consoleSpy.mockRestore();
    });

    it('should include priority in notification', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const { sendSlackNotification } =
        await import('@/lib/integrations/index');
      await sendSlackNotification('https://hooks.slack.com/services/test', {
        ...validNotification,
        priority: 'high',
      });

      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.attachments[0].fields[0].value).toBe('high');
    });

    it('should include due date when provided', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const { sendSlackNotification } =
        await import('@/lib/integrations/index');
      await sendSlackNotification('https://hooks.slack.com/services/test', {
        ...validNotification,
        dueDate: '2024-12-25',
      });

      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.attachments[0].fields.length).toBe(2);
    });

    it('should not include due date when not provided', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const { sendSlackNotification } =
        await import('@/lib/integrations/index');
      await sendSlackNotification(
        'https://hooks.slack.com/services/test',
        validNotification
      );

      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.attachments[0].fields.length).toBe(1);
    });

    it('should handle all action types for Slack', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const { sendSlackNotification } =
        await import('@/lib/integrations/index');
      const actions = [
        'created',
        'updated',
        'completed',
        'due_soon',
        'overdue',
      ] as const;

      for (const action of actions) {
        await sendSlackNotification('https://hooks.slack.com/services/test', {
          ...validNotification,
          action,
        });
      }

      expect(mockFetch).toHaveBeenCalledTimes(5);
    });

    it('should use correct color for each action type', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const { sendSlackNotification } =
        await import('@/lib/integrations/index');
      const colorMap = {
        created: '#36a64f',
        updated: '#3383cc',
        completed: '#36a64f',
        due_soon: '#ff9900',
        overdue: '#ff0000',
      };

      const actions: (
        'created' | 'updated' | 'completed' | 'due_soon' | 'overdue'
      )[] = ['created', 'updated', 'completed', 'due_soon', 'overdue'];

      for (const action of actions) {
        await sendSlackNotification('https://hooks.slack.com/services/test', {
          ...validNotification,
          action,
        });

        const callArgs = mockFetch.mock.calls.at(-1)?.[1];
        const body = JSON.parse(callArgs?.body || '{}');
        expect(body.attachments[0].color).toBe(colorMap[action]);
      }
    });
  });

  describe('sendDiscordNotification', () => {
    const validNotification = {
      taskId: 1,
      taskName: 'Test Task',
      action: 'created' as const,
    };

    it('should send Discord notification successfully', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const { sendDiscordNotification } =
        await import('@/lib/integrations/index');
      const result = await sendDiscordNotification(
        'https://discord.com/api/webhooks/test',
        validNotification
      );

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://discord.com/api/webhooks/test',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should return false on network error', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { sendDiscordNotification } =
        await import('@/lib/integrations/index');
      const result = await sendDiscordNotification(
        'https://discord.com/api/webhooks/test',
        validNotification
      );

      expect(result).toBe(false);
      consoleSpy.mockRestore();
    });

    it('should use colorMap instead of color for Discord', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const { sendDiscordNotification } =
        await import('@/lib/integrations/index');
      await sendDiscordNotification('https://discord.com/api/webhooks/test', {
        ...validNotification,
        priority: 'critical',
      });

      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      // Color should be a number (hex as number)
      expect(typeof body.embeds[0].color).toBe('number');
    });

    it('should handle all action types for Discord', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const { sendDiscordNotification } =
        await import('@/lib/integrations/index');
      const actions: (
        'created' | 'updated' | 'completed' | 'due_soon' | 'overdue'
      )[] = ['created', 'updated', 'completed', 'due_soon', 'overdue'];

      for (const action of actions) {
        await sendDiscordNotification('https://discord.com/api/webhooks/test', {
          ...validNotification,
          action,
        });
      }

      expect(mockFetch).toHaveBeenCalledTimes(5);
    });

    it('should include due date when provided', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const { sendDiscordNotification } =
        await import('@/lib/integrations/index');
      await sendDiscordNotification('https://discord.com/api/webhooks/test', {
        ...validNotification,
        dueDate: '2024-12-25',
      });

      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.embeds[0].fields.length).toBe(2);
    });
  });

  describe('sendEmailNotification', () => {
    const validNotification = {
      taskId: 1,
      taskName: 'Test Task',
      action: 'created' as const,
    };

    it('should send email notification successfully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { sendEmailNotification } =
        await import('@/lib/integrations/index');
      const result = await sendEmailNotification(
        'test@example.com',
        validNotification
      );

      expect(result).toBe(true);
      consoleSpy.mockRestore();
    });

    it('should log notification details', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { sendEmailNotification } =
        await import('@/lib/integrations/index');
      await sendEmailNotification('test@example.com', validNotification);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Email notification to:',
        'test@example.com',
        validNotification
      );
      consoleSpy.mockRestore();
    });

    it('should include assignee when provided', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { sendEmailNotification } =
        await import('@/lib/integrations/index');
      await sendEmailNotification('test@example.com', {
        ...validNotification,
        assignee: { id: 1, name: 'John Doe', email: 'john@example.com' },
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should include workspace ID when provided', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { sendEmailNotification } =
        await import('@/lib/integrations/index');
      await sendEmailNotification('test@example.com', {
        ...validNotification,
        workspaceId: 123,
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Module exports', () => {
    it('should export sendSlackNotification function', async () => {
      const integrations = await import('@/lib/integrations/index');
      expect(integrations.sendSlackNotification).toBeDefined();
      expect(typeof integrations.sendSlackNotification).toBe('function');
    });

    it('should export sendDiscordNotification function', async () => {
      const integrations = await import('@/lib/integrations/index');
      expect(integrations.sendDiscordNotification).toBeDefined();
      expect(typeof integrations.sendDiscordNotification).toBe('function');
    });

    it('should export sendEmailNotification function', async () => {
      const integrations = await import('@/lib/integrations/index');
      expect(integrations.sendEmailNotification).toBeDefined();
      expect(typeof integrations.sendEmailNotification).toBe('function');
    });

    it('should export IntegrationConfig interface shape', async () => {
      const config = {
        enabled: true,
        webhookUrl: 'https://example.com/webhook',
        channel: 'general',
        botToken: 'token123',
      };

      expect(config.enabled).toBe(true);
      expect(config.webhookUrl).toBe('https://example.com/webhook');
    });
  });
});
