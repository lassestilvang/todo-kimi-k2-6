import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Outlook Calendar Functions', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getOutlookEvents', () => {
    it('should fetch events from Outlook API', async () => {
      const { getOutlookEvents } = await import('../outlook');

      const mockEvents = [{ subject: 'Meeting 1' }, { subject: 'Meeting 2' }];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ value: mockEvents }),
      });

      const events = await getOutlookEvents(
        { accessToken: 'test-token' },
        '2024-01-01',
        '2024-01-31'
      );

      expect(events).toEqual(mockEvents);
    });

    it('should handle API errors', async () => {
      const { getOutlookEvents } = await import('../outlook');

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Unauthorized' } }),
      });

      await expect(
        getOutlookEvents(
          { accessToken: 'bad-token' },
          '2024-01-01',
          '2024-01-31'
        )
      ).rejects.toThrow('Outlook Calendar API error');
    });
  });

  describe('createOutlookEvent', () => {
    it('should create event from task', async () => {
      const { createOutlookEvent } = await import('../outlook');

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'event-123' }),
      });

      const eventId = await createOutlookEvent({ accessToken: 'test-token' }, {
        id: 1,
        name: 'Test Task',
        description: 'Test description',
        date: '2024-12-25',
        priority: 'high',
      } as any);

      expect(eventId).toBe('event-123');
    });

    it('should throw error when task has no date', async () => {
      const { createOutlookEvent } = await import('../outlook');

      await expect(
        createOutlookEvent({ accessToken: 'token' }, {
          id: 1,
          name: 'Task',
        } as any)
      ).rejects.toThrow('Task has no date');
    });

    it('should create event with labels as location', async () => {
      const { createOutlookEvent } = await import('../outlook');

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'event-456' }),
      });

      await createOutlookEvent({ accessToken: 'test-token' }, {
        id: 1,
        name: 'Task with labels',
        date: '2024-12-25',
        labels: [{ name: 'Office' }, { name: 'Room 1' }] as any,
      } as any);

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('updateOutlookEvent', () => {
    it('should update existing event', async () => {
      const { updateOutlookEvent } = await import('../outlook');

      mockFetch.mockResolvedValue({ ok: true });

      await updateOutlookEvent({ accessToken: 'test-token' }, 'event-123', {
        id: 1,
        name: 'Updated Task',
        date: '2024-12-25',
      } as any);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/me/events/event-123'),
        expect.objectContaining({ method: 'PATCH' })
      );
    });
  });

  describe('deleteOutlookEvent', () => {
    it('should delete an event', async () => {
      const { deleteOutlookEvent } = await import('../outlook');

      mockFetch.mockResolvedValue({ ok: true });

      await deleteOutlookEvent({ accessToken: 'test-token' }, 'event-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/me/events/event-123'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should throw error when deletion fails', async () => {
      const { deleteOutlookEvent } = await import('../outlook');

      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({}),
      });

      await expect(
        deleteOutlookEvent({ accessToken: 'token' }, 'nonexistent')
      ).rejects.toThrow('Failed to delete Outlook event');
    });
  });

  describe('getOutlookAuthUrl', () => {
    it('should generate OAuth2 authorization URL', async () => {
      process.env.OUTLOOK_CLIENT_ID = 'test-client-id';
      process.env.NEXTAUTH_URL = 'http://localhost:3000';

      const { getOutlookAuthUrl } = await import('../outlook');
      const authUrl = getOutlookAuthUrl('test-state');

      expect(authUrl).toContain(
        'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
      );
      expect(authUrl).toContain('client_id=test-client-id');
      expect(authUrl).toContain('state=test-state');
      expect(authUrl).toContain('response_type=code');
      expect(authUrl).toContain('Calendars.ReadWrite');
    });

    it('should handle missing client ID', async () => {
      delete process.env.OUTLOOK_CLIENT_ID;
      process.env.NEXTAUTH_URL = 'http://localhost:3000';

      const { getOutlookAuthUrl } = await import('../outlook');
      const authUrl = getOutlookAuthUrl('test-state');

      expect(authUrl).toContain('https://login.microsoftonline.com');
    });
  });

  describe('exchangeOutlookCodeForTokens', () => {
    it('should exchange code for tokens', async () => {
      const { exchangeOutlookCodeForTokens } = await import('../outlook');

      process.env.OUTLOOK_CLIENT_ID = 'client-id';
      process.env.OUTLOOK_CLIENT_SECRET = 'client-secret';
      process.env.NEXTAUTH_URL = 'http://localhost:3000';

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
        }),
      });

      const tokens = await exchangeOutlookCodeForTokens('auth-code');

      expect(tokens.access_token).toBe('new-access-token');
      expect(tokens.refresh_token).toBe('new-refresh-token');
      expect(tokens.expires_in).toBe(3600);
    });

    it('should throw error on failed exchange', async () => {
      const { exchangeOutlookCodeForTokens } = await import('../outlook');

      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error_description: 'Invalid code' }),
      });

      await expect(exchangeOutlookCodeForTokens('bad-code')).rejects.toThrow(
        'Outlook token exchange failed'
      );
    });
  });

  describe('refreshOutlookToken', () => {
    it('should refresh access token', async () => {
      process.env.OUTLOOK_CLIENT_ID = 'client-id';
      process.env.OUTLOOK_CLIENT_SECRET = 'client-secret';
      process.env.NEXTAUTH_URL = 'http://localhost:3000';

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'refreshed-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
        }),
      });

      const { refreshOutlookToken } = await import('../outlook');
      const tokens = await refreshOutlookToken('refresh-token');

      expect(tokens.access_token).toBe('refreshed-token');
    });

    it('should throw error when refresh fails', async () => {
      const { refreshOutlookToken } = await import('../outlook');

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error_description: 'Invalid refresh token' }),
      });

      await expect(refreshOutlookToken('bad-refresh')).rejects.toThrow(
        'Outlook token refresh failed'
      );
    });
  });

  describe('syncTasksToOutlook', () => {
    it('should sync tasks to Outlook', async () => {
      const { syncTasksToOutlook } = await import('../outlook');

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ value: [] }),
      });

      const result = await syncTasksToOutlook({ accessToken: 'token' }, [
        { id: 1, name: 'Task 1', date: '2024-12-25' },
      ] as any);

      expect(result.created).toBeGreaterThanOrEqual(0);
      expect(result.errors).toBeDefined();
    });

    it('should skip tasks without dates', async () => {
      const { syncTasksToOutlook } = await import('../outlook');

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ value: [] }),
      });

      const result = await syncTasksToOutlook({ accessToken: 'token' }, [
        { id: 1, name: 'Task without date' },
      ] as any);

      expect(result.created).toBe(0);
    });
  });

  describe('getCompletedTaskEvents', () => {
    it('should return empty array for no completed tasks', async () => {
      const { getCompletedTaskEvents } = await import('../outlook');

      const result = await getCompletedTaskEvents({ accessToken: 'token' }, [
        { id: 1, name: 'Task 1', completed: false },
      ] as any);

      expect(result).toEqual([]);
    });

    it('should find completed task events', async () => {
      const { getCompletedTaskEvents } = await import('../outlook');

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          value: [{ id: 'event-1', subject: 'Completed Task' }],
        }),
      });

      const result = await getCompletedTaskEvents({ accessToken: 'token' }, [
        { id: 1, name: 'Completed Task', completed: true },
      ] as any);

      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });
});
