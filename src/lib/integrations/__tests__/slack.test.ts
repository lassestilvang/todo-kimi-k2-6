import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SlackConnector } from '../slack';

// Mock fetch
global.fetch = vi.fn();

describe('SlackConnector', () => {
  let connector: SlackConnector;

  beforeEach(() => {
    vi.resetAllMocks();
    connector = new SlackConnector({
      id: 'test-slack',
      type: 'slack',
      name: 'Slack',
      enabled: true,
      apiToken: 'test-token',
      defaultChannelId: 'C01234567',
      syncDirection: 'import',
    });
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      expect(connector.id).toBe('slack');
      expect(connector.type).toBe('slack');
      expect(connector.name).toBe('Slack');
    });

    it('should store default channel ID', () => {
      const customConnector = new SlackConnector({
        id: 'custom-slack',
        type: 'slack',
        name: 'Slack',
        enabled: true,
        apiToken: 'token',
        defaultChannelId: 'C99999999',
        syncDirection: 'import',
      });

      expect((customConnector as any).defaultChannelId).toBe('C99999999');
    });
  });

  describe('authenticate', () => {
    it('should store access token and return auth result', async () => {
      const result = await connector.authenticate({
        accessToken: 'new-test-token',
      });

      expect(result.accessToken).toBe('new-test-token');
      expect(result.expiresAt).toBeDefined();
    });

    it('should include refresh token if provided', async () => {
      const result = await connector.authenticate({
        accessToken: 'test-token',
        refreshToken: 'refresh-token',
      });

      expect(result.refreshToken).toBe('refresh-token');
    });

    it('should throw error when no access token provided', async () => {
      await expect(connector.authenticate({})).rejects.toThrow(
        'Slack integration requires an access token',
      );
    });
  });

  describe('testConnection', () => {
    it('should return true when auth.test response is ok', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          user_id: 'U01234567',
        }),
      });

      const result = await connector.testConnection();
      expect(result).toBe(true);
    });

    it('should return false when auth.test response is not ok', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: false,
          error: 'invalid_auth',
        }),
      });

      const result = await connector.testConnection();
      expect(result).toBe(false);
    });

    it('should return false on fetch error', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await connector.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('fetchRecords', () => {
    it('should throw error when no channel specified', async () => {
      const noChannelConnector = new SlackConnector({
        id: 'no-channel',
        type: 'slack',
        name: 'Slack',
        enabled: true,
        apiToken: 'token',
        syncDirection: 'import',
      });

      await expect(noChannelConnector.fetchRecords()).rejects.toThrow(
        'No channel specified for Slack integration',
      );
    });

    it('should fetch messages from configured channel', async () => {
      const mockMessage = {
        ts: '1234567890.123456',
        text: 'todo: Review the authentication module',
        user: 'U01234567',
        username: 'john.doe',
        reactions: [],
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: [mockMessage],
        }),
      });

      const records = await connector.fetchRecords();

      expect(records).toHaveLength(1);
      expect(records[0].title).toBe('Review the authentication module');
      expect(records[0].channel).toBe('C01234567');
    });

    it('should extract messages with action verbs', async () => {
      const mockMessage = {
        ts: '1234567890.123456',
        text: 'Jane, please complete the API integration by Friday',
        user: 'U01234567',
        reactions: [],
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: [mockMessage],
        }),
      });

      const records = await connector.fetchRecords();

      expect(records).toHaveLength(1);
      expect(records[0].assignee).toBe('U01234567');
    });

    it('should skip messages without task markers', async () => {
      const mockMessage = {
        ts: '1234567890.123456',
        text: 'Team lunch at 1pm today',
        user: 'U01234567',
        reactions: [],
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: [mockMessage],
        }),
      });

      const records = await connector.fetchRecords();
      expect(records).toHaveLength(0);
    });

    it('should throw error when Slack API returns error', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'Forbidden',
      });

      await expect(connector.fetchRecords()).rejects.toThrow('Slack API error');
    });

    it('should extract priority from emoji reactions', async () => {
      const mockMessage = {
        ts: '1234567890.123456',
        text: 'todo: Fix the critical bug',
        user: 'U01234567',
        reactions: [
          { name: '🔥', count: 5 },
          { name: '🚀', count: 3 },
        ],
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: [mockMessage],
        }),
      });

      const records = await connector.fetchRecords();

      expect(records).toHaveLength(1);
      expect(records[0].labels).toContain('urgent');
    });

    it('should throw error when data.ok is false', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: false,
          error: 'channel_not_found',
        }),
      });

      await expect(connector.fetchRecords()).rejects.toThrow(
        "Slack API error: channel_not_found",
      );
    });

    it('should handle messages that fail to map', async () => {
      const mockMessages = [
        {
          ts: '1234567890.123456',
          text: 'Regular message without task marker',
          user: 'U01234567',
          reactions: [],
        },
        {
          ts: '1234567890.789012',
          text: 'todo: Valid task message',
          user: 'U01234567',
          reactions: [],
        },
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: mockMessages,
        }),
      });

      const records = await connector.fetchRecords();

      // Only the valid task message should be included
      expect(records).toHaveLength(1);
      expect(records[0].title).toBe('Valid task message');
    });

    it('should extract labels from channel name', async () => {
      const mockMessage = {
        ts: '1234567890.123456',
        text: 'todo: Task in project channel',
        user: 'U01234567',
        channel: 'project-alpha',
        reactions: [],
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: [mockMessage],
        }),
      });

      const records = await connector.fetchRecords();

      expect(records).toHaveLength(1);
      expect(records[0].labels).toContain('project alpha');
    });

    it('should handle channel name fetch errors', async () => {
      const mockMessage = {
        ts: '1234567890.123456',
        text: 'todo: Task in channel',
        user: 'U01234567',
        reactions: [],
      };

      // First call for messages, second call for channel name (will fail)
      (fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ok: true,
            messages: [mockMessage],
          }),
        })
        .mockRejectedValue(new Error('Network error'));

      // Should not throw - channel name errors are caught and channelId is used instead
      const records = await connector.fetchRecords();

      expect(records).toHaveLength(1);
      expect(records[0].title).toBe('Task in channel');
    });
  });

  describe('isTaskCandidate', () => {
    it('should return true for todo: prefix', async () => {
      const isTask = await (connector as any).isTaskCandidate({
        text: 'todo: Implement feature X',
      });
      expect(isTask).toBe(true);
    });

    it('should return true for task: prefix', async () => {
      const isTask = await (connector as any).isTaskCandidate({
        text: 'task: Fix the bug',
      });
      expect(isTask).toBe(true);
    });

    it('should return true for @todo mention', async () => {
      const isTask = await (connector as any).isTaskCandidate({
        text: '@todo review this code',
      });
      expect(isTask).toBe(true);
    });

    it('should return true for action verbs', async () => {
      const isTask = await (connector as any).isTaskCandidate({
        text: 'please assign this to John',
      });
      expect(isTask).toBe(true);
    });

    it('should return false for regular messages', async () => {
      const isTask = await (connector as any).isTaskCandidate({
        text: 'Good morning team!',
      });
      expect(isTask).toBe(false);
    });
  });

  describe('extractTitle', () => {
    it('should extract title from todo: prefix', () => {
      const title = (connector as any).extractTitle('todo: Implement login page', '123456');
      expect(title).toBe('Implement login page');
    });

    it('should extract title from @todo mention', () => {
      const title = (connector as any).extractTitle('@todo fix the memory leak', '123456');
      expect(title).toBe('fix the memory leak');
    });

    it('should extract title from reminder:', () => {
      const title = (connector as any).extractTitle('reminder: Update documentation', '123456');
      expect(title).toBe('Update documentation');
    });

    it('should return null for non-task messages', () => {
      const title = (connector as any).extractTitle('Good morning everyone!', '123456');
      expect(title).toBeNull();
    });
  });

  describe('sendMessage', () => {
    it('should send message to channel', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, ts: '1234567890.123456' }),
      });

      const result = await connector.sendMessage('C01234567', 'Test message');

      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'https://slack.com/api/chat.postMessage',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String),
        }),
      );
    });

    it('should send threaded reply when threadTs provided', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, ts: '1234567890.789012' }),
      });

      const result = await connector.sendMessage('C01234567', 'Reply', {
        threadTs: '1234567890.123456',
      });

      expect(result).toBe(true);
      const body = JSON.parse((fetch as any).mock.calls[0][1].body);
      expect(body.thread_ts).toBe('1234567890.123456');
    });
  });

  describe('updateMessage', () => {
    it('should update a message', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

      const result = await connector.updateMessage('C01234567', '1234567890.123456', 'Updated text');

      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'https://slack.com/api/chat.update',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });
  });

  describe('getChannelList', () => {
    it('should fetch channel list', async () => {
      const mockChannels = [
        { id: 'C01234567', name: 'general', is_private: false },
        { id: 'C02345678', name: 'random', is_private: false },
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          channels: mockChannels,
        }),
      });

      const channels = await connector.getChannelList();

      expect(channels).toHaveLength(2);
      expect(channels[0].name).toBe('general');
    });
  });

  describe('getUserInfo', () => {
    it('should fetch user info', async () => {
      const mockUser = {
        id: 'U01234567',
        name: 'john.doe',
        profile: {
          email: 'john@example.com',
          real_name: 'John Doe',
          image_48: 'https://example.com/image.png',
        },
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          user: mockUser,
        }),
      });

      const user = await connector.getUserInfo('U01234567');

      expect(user.id).toBe('U01234567');
      expect(user.name).toBe('john.doe');
      expect(user.profile?.email).toBe('john@example.com');
    });

    it('should throw error on API failure', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: false,
          error: 'user_not_found',
        }),
      });

      await expect(connector.getUserInfo('UNOTFOUND')).rejects.toThrow('Slack API error');
    });
  });

  describe('getReactions', () => {
    it('should fetch reactions for a message', async () => {
      const mockReactions = [
        { name: 'thumbsup', users: 'U01234567,U08765432', count: 2 },
        { name: 'rocket', users: 'U01234567', count: 1 },
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          message: { reactions: mockReactions },
        }),
      });

      const reactions = await connector.getReactions('C01234567', '1234567890.123456');

      expect(reactions).toHaveLength(2);
      expect(reactions[0].name).toBe('thumbsup');
    });
  });

  describe('addReaction', () => {
    it('should add reaction to message', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

      const result = await connector.addReaction('C01234567', '1234567890.123456', 'thumbsup');

      expect(result).toBe(true);
    });
  });

  describe('removeReaction', () => {
    it('should remove reaction from message', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

      const result = await connector.removeReaction('C01234567', '1234567890.123456', 'thumbsup');

      expect(result).toBe(true);
    });
  });

  describe('getUserInfo', () => {
    it('should get user info', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          user: {
            id: 'U01234567',
            name: 'Test User',
            profile: {
              email: 'test@example.com',
              real_name: 'Test User',
              image_48: 'https://example.com/image.png',
            },
          },
        }),
      });

      const userInfo = await connector.getUserInfo('U01234567');

      expect(userInfo.id).toBe('U01234567');
      expect(userInfo.name).toBe('Test User');
      expect(userInfo.profile?.email).toBe('test@example.com');
    });

    it('should throw error when API fails', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(connector.getUserInfo('U01234567')).rejects.toThrow('Slack API error');
    });
  });

  describe('getReactions', () => {
    it('should return empty array when API fails', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
      });

      const reactions = await connector.getReactions('C01234567', '1234567890.123456');

      expect(reactions).toEqual([]);
    });
  });

  describe('getMentions', () => {
    it('should fetch mentions for user via subteam link', async () => {
      const mockMessages = [
        {
          ts: '1234567890.123456',
          text: '<!subteam^S12345678> todo: please review this documentation',
          user: 'U01234567',
          reactions: [],
        },
      ];

      (fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ok: true,
            messages: mockMessages,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ok: true,
            channel: { name: 'general' },
          }),
        });

      const records = await connector.getMentions({ userId: 'U12345678', channelId: 'C01234567' });

      expect(records).toHaveLength(1);
      expect(records[0].title).toBe('please review this documentation');
      expect(fetch).toHaveBeenCalledWith(
        'https://slack.com/api/conversations.history?channel=C01234567&exclude_archived=true',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        }),
      );
    });

    it('should throw error when no channel specified', async () => {
      const noChannelConnector = new SlackConnector({
        id: 'no-channel',
        type: 'slack',
        name: 'Slack',
        enabled: true,
        apiToken: 'token',
        syncDirection: 'import',
      });

      await expect(noChannelConnector.getMentions({ userId: 'U12345678' })).rejects.toThrow(
        'No channel specified for Slack mentions',
      );
    });

    it('should return empty array when no mentions match', async () => {
      const mockMessages = [
        {
          ts: '1234567890.123456',
          text: 'Regular message without mentions',
          user: 'U01234567',
          reactions: [],
        },
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: mockMessages,
        }),
      });

      const records = await connector.getMentions({ userId: 'U99988877', channelId: 'C01234567' });

      expect(records).toHaveLength(0);
    });

    it('should throw error when API response is not ok', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(
        connector.getMentions({ userId: 'U12345678', channelId: 'C01234567' }),
      ).rejects.toThrow('Slack API error: 500');
    });
  });

  describe('getChannelList pagination', () => {
    it('should handle pagination with cursor', async () => {
      const mockChannelsPage1 = [
        { id: 'C01234567', name: 'general', is_private: false },
      ];
      const mockChannelsPage2 = [
        { id: 'C02345678', name: 'random', is_private: false },
      ];

      (fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ok: true,
            channels: mockChannelsPage1,
            response_metadata: { next_cursor: 'cursor123' },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ok: true,
            channels: mockChannelsPage2,
            response_metadata: {},
          }),
        });

      const channels = await connector.getChannelList(['public_channel']);

      expect(channels).toHaveLength(2);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle response without next_cursor', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          channels: [{ id: 'C01234567', name: 'general', is_private: false }],
        }),
      });

      const channels = await connector.getChannelList();

      expect(channels).toHaveLength(1);
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getChannelName error handling', () => {
    it('should return channelId when API fails', async () => {
      (fetch as any).mockRejectedValue(new Error('Network error'));

      const channelName = await (connector as any).getChannelName('C01234567');

      expect(channelName).toBe('C01234567');
    });

    it('should return channelId when API response is not ok', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const channelName = await (connector as any).getChannelName('C01234567');

      expect(channelName).toBe('C01234567');
    });

    it('should return channelId when data.ok is false', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: false,
          error: 'channel_not_found',
        }),
      });

      const channelName = await (connector as any).getChannelName('C01234567');

      expect(channelName).toBe('C01234567');
    });
  });

  describe('pushTask', () => {
    it('should throw error when pushTask not implemented', async () => {
      await expect(connector.pushTask({ title: 'Test Task' })).rejects.toThrow(
        'pushTask not implemented for Slack connector'
      );
    });
  });
});