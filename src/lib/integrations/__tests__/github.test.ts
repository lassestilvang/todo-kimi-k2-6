import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitHubConnector } from '../github';

// Mock fetch
global.fetch = vi.fn();

describe('GitHubConnector', () => {
  let connector: GitHubConnector;

  beforeEach(() => {
    vi.resetAllMocks();
    connector = new GitHubConnector({
      id: 'test-github',
      type: 'github',
      name: 'Test GitHub Integration',
      enabled: true,
      apiToken: 'test-token',
      repositories: ['owner/repo1'],
      syncDirection: 'import',
    });
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      expect(connector.id).toBe('github');
      expect(connector.type).toBe('github');
      expect(connector.name).toBe('GitHub Issues');
    });

    it('should parse comma-separated repositories', () => {
      const multiRepoConnector = new GitHubConnector({
        id: 'multi-github',
        type: 'github',
        name: 'Multi Repo GitHub',
        enabled: true,
        apiToken: 'token',
        repositories: 'repo1,repo2,repo3',
        syncDirection: 'import',
      });

      expect((multiRepoConnector as any).repositories).toEqual(['repo1', 'repo2', 'repo3']);
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
        'GitHub integration requires an access token',
      );
    });
  });

  describe('testConnection', () => {
    it('should return true when API response is ok', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
      });

      const result = await connector.testConnection();
      expect(result).toBe(true);
    });

    it('should return false when API response fails', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
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
    it('should fetch issues from configured repositories', async () => {
      const mockIssue = {
        id: 123456,
        title: 'Test Issue',
        body: 'Issue description',
        state: 'open',
        labels: [{ name: 'bug' }, { name: 'urgent' }],
        assignee: { login: 'testuser' },
        html_url: 'https://github.com/owner/repo/issues/1',
        created_at: '2024-01-10T10:00:00Z',
        updated_at: '2024-01-10T10:00:00Z',
        comments: 5,
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [mockIssue],
      });

      const records = await connector.fetchRecords();

      expect(records).toHaveLength(1);
      expect(records[0].title).toBe('Test Issue');
      expect(records[0].labels).toContain('bug');
      expect(records[0].labels).toContain('urgent');
      expect(records[0].assignee).toBe('testuser');
      expect(records[0].state).toBe('open');
    });

    it('should handle multiple repositories', async () => {
      const mockIssue1 = {
        id: 1,
        title: 'Issue 1',
        state: 'open',
        labels: [],
        html_url: 'https://github.com/owner/repo1/issues/1',
        created_at: '2024-01-10T10:00:00Z',
        updated_at: '2024-01-10T10:00:00Z',
        comments: 0,
      };
      const mockIssue2 = {
        id: 2,
        title: 'Issue 2',
        state: 'open',
        labels: [],
        html_url: 'https://github.com/owner/repo2/issues/1',
        created_at: '2024-01-10T10:00:00Z',
        updated_at: '2024-01-10T10:00:00Z',
        comments: 0,
      };

      (fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [mockIssue1],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [mockIssue2],
        });

      const multiRepoConnector = new GitHubConnector({
        id: 'multi-github',
        type: 'github',
        name: 'Multi Repo GitHub',
        enabled: true,
        apiToken: 'token',
        repositories: ['owner/repo1', 'owner/repo2'],
        syncDirection: 'import',
      });

      const records = await multiRepoConnector.fetchRecords();
      expect(records).toHaveLength(2);
    });

    it('should log warning for invalid repository format', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const invalidRepoConnector = new GitHubConnector({
        id: 'invalid',
        type: 'github',
        name: 'Invalid',
        enabled: true,
        apiToken: 'token',
        repositories: ['invalid-repo-format'],
        syncDirection: 'import',
      });

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await invalidRepoConnector.fetchRecords();

      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should throw error when API response fails', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'Forbidden',
      });

      await expect(connector.fetchRecords()).rejects.toThrow('GitHub API error');
    });
  });

  describe('pushTask', () => {
    it('should create an issue in GitHub repository', async () => {
      const mockCreatedIssue = {
        id: 789012,
        title: 'New Task',
        body: 'Task description\n\n**Due:** 2024-01-20',
        state: 'open',
        labels: [{ name: 'Development' }, { name: 'P2' }],
        html_url: 'https://github.com/owner/repo/issues/1',
        created_at: '2024-01-10T11:00:00Z',
        updated_at: '2024-01-10T11:00:00Z',
        comments: 0,
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCreatedIssue,
      });

      const result = await connector.pushTask({
        title: 'New Task',
        description: 'Task description',
        dueDate: '2024-01-20',
        labels: ['Development'],
        priority: 'medium',
        repository: 'owner/repo1',
      });

      expect(result.title).toBe('New Task');
      expect(fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo1/issues',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });

    it('should throw error when no repository configured', async () => {
      await expect(connector.pushTask({ title: 'Test' })).rejects.toThrow(
        'Repository is required to create a GitHub issue',
      );
    });

    it('should throw error when repository format is invalid', async () => {
      await expect(
        connector.pushTask({ title: 'Test', repository: 'invalid-format' }),
      ).rejects.toThrow('Invalid repository format');
    });

    it('should include priority label', async () => {
      const mockCreatedIssue = {
        id: 1,
        title: 'Critical Task',
        labels: [],
        html_url: 'https://github.com/owner/repo/issues/1',
        state: 'open',
        created_at: '2024-01-10T11:00:00Z',
        updated_at: '2024-01-10T11:00:00Z',
        comments: 0,
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCreatedIssue,
      });

      await connector.pushTask({
        title: 'Critical Task',
        priority: 'critical',
        repository: 'owner/repo1',
      });

      const body = JSON.parse((fetch as any).mock.calls[0][1].body);
      expect(body.labels).toContain('P3');
    });

    it('should throw error when API response fails', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 422,
        text: async () => 'Validation Failed',
      });

      await expect(
        connector.pushTask({ title: 'Test', repository: 'owner/repo1' }),
      ).rejects.toThrow('GitHub API error');
    });
  });

  describe('mapToTask', () => {
    it('should map GitHub issue to task fields', () => {
      const record = {
        id: '123',
        title: 'GitHub Issue',
        description: 'Detailed description',
        labels: ['bug', 'high-priority'],
        assignee: 'developer',
        state: 'open' as const,
        comments: 10,
        repository: 'owner/repo',
        url: 'https://github.com/owner/repo/issues/123',
        createdAt: '2024-01-10',
        updatedAt: '2024-01-10',
      };

      const result = connector.mapToTask(record);

      expect(result.title).toBe('GitHub Issue');
      expect(result.description).toBe('Detailed description');
      expect(result.labels).toContain('bug');
      expect(result.assignee).toBe('developer');
    });
  });

  describe('extractLabels', () => {
    it('should extract labels from GitHub issue', () => {
      const issue = {
        labels: [
          { name: 'bug' },
          { name: 'enhancement' },
          { name: 'documentation' },
        ],
      };

      const result = (connector as any).extractLabels(issue);
      expect(result).toEqual(['bug', 'enhancement', 'documentation']);
    });

    it('should return empty array for missing labels', () => {
      const result = (connector as any).extractLabels({});
      expect(result).toEqual([]);
    });

    it('should filter out non-object labels', () => {
      const issue = {
        labels: ['string-label', { name: 'object-label' }],
      };

      const result = (connector as any).extractLabels(issue);
      expect(result).toEqual(['object-label']);
    });
  });

  describe('extractAssignee', () => {
    it('should extract assignee login', () => {
      const issue = {
        assignee: { login: 'testuser', email: 'user@example.com' },
      };

      const result = (connector as any).extractAssignee(issue);
      expect(result).toBe('testuser');
    });

    it('should return undefined for missing assignee', () => {
      const result = (connector as any).extractAssignee({});
      expect(result).toBeUndefined();
    });

    it('should return undefined for null assignee', () => {
      const result = (connector as any).extractAssignee({ assignee: null });
      expect(result).toBeUndefined();
    });
  });

  describe('mapPriority', () => {
    it('should map critical labels to critical priority', () => {
      const result = (connector as any).mapPriority(['critical', 'urgent', 'blocker', 'p0']);
      expect(result).toBe('critical');
    });

    it('should map high priority labels', () => {
      const result = (connector as any).mapPriority(['high', 'important', 'p1']);
      expect(result).toBe('high');
    });

    it('should map medium priority labels', () => {
      const result = (connector as any).mapPriority(['medium', 'normal', 'p2']);
      expect(result).toBe('medium');
    });

    it('should map low priority labels', () => {
      const result = (connector as any).mapPriority(['low', 'p3', 'trivial']);
      expect(result).toBe('low');
    });

    it('should return undefined for unknown labels', () => {
      const result = (connector as any).mapPriority(['enhancement', 'refactor']);
      expect(result).toBeUndefined();
    });
  });

  describe('priorityToLevel', () => {
    it('should map priorities to levels', () => {
      expect((connector as any).priorityToLevel('low')).toBe(0);
      expect((connector as any).priorityToLevel('medium')).toBe(1);
      expect((connector as any).priorityToLevel('high')).toBe(2);
      expect((connector as any).priorityToLevel('critical')).toBe(3);
    });
  });

  describe('searchIssues', () => {
    it('should search issues with query', async () => {
      const mockSearchResult = {
        items: [
          {
            id: 123,
            title: 'Found Issue',
            body: 'Description',
            state: 'open',
            labels: [],
            html_url: 'https://github.com/owner/repo/issues/1',
            created_at: '2024-01-10T10:00:00Z',
            updated_at: '2024-01-10T10:00:00Z',
            comments: 0,
            repository_url: 'https://api.github.com/repos/owner/repo',
          },
        ],
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResult,
      });

      const results = await connector.searchIssues('query', { state: 'open', labels: ['bug'] });

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Found Issue');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('search/issues'),
        expect.any(Object),
      );
    });

    it('should throw error when no repositories configured', async () => {
      const noRepoConnector = new GitHubConnector({
        id: 'no-repo',
        type: 'github',
        name: 'No Repo',
        enabled: true,
        apiToken: 'token',
        repositories: '',
        syncDirection: 'import',
      });

      await expect(noRepoConnector.searchIssues('query')).rejects.toThrow('No repositories configured');
    });
  });

  describe('updateIssue', () => {
    it('should update an issue', async () => {
      const mockUpdatedIssue = {
        id: 123,
        title: 'Updated Title',
        state: 'open',
        labels: [{ name: 'updated' }],
        html_url: 'https://github.com/owner/repo/issues/1',
        created_at: '2024-01-10T10:00:00Z',
        updated_at: '2024-01-10T12:00:00Z',
        comments: 0,
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUpdatedIssue,
      });

      await connector.updateIssue('123', { title: 'Updated Title' });

      expect(fetch).toHaveBeenCalledWith(
        'https://api.github.com/issues/123',
        expect.objectContaining({
          method: 'PATCH',
        }),
      );
    });

    it('should throw error when API fails', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      });

      await expect(connector.updateIssue('999', { title: 'Test' })).rejects.toThrow('GitHub API error');
    });
  });

  describe('closeIssue', () => {
    it('should close an issue', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
      });

      const result = await connector.closeIssue('123');
      expect(result).toBe(true);
    });

    it('should return false on failure', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await connector.closeIssue('123');
      expect(result).toBe(false);
    });
  });

  describe('addComment', () => {
    it('should add a comment to an issue', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
      });

      await connector.addComment('123', 'New comment');

      expect(fetch).toHaveBeenCalledWith(
        'https://api.github.com/issues/123/comments',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });

    it('should throw error on failure', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'Forbidden',
      });

      await expect(connector.addComment('123', 'comment')).rejects.toThrow('GitHub API error');
    });
  });

  describe('getUserProfile', () => {
    it('should fetch and return user profile', async () => {
      const mockUser = {
        login: 'testuser',
        name: 'Test User',
        email: 'user@example.com',
        avatar_url: 'https://avatars.githubusercontent.com/u/123',
        bio: 'Developer',
        public_repos: 42,
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      });

      const profile = await connector.getUserProfile();

      expect(profile.login).toBe('testuser');
      expect(profile.name).toBe('Test User');
      expect(profile.avatarUrl).toBe('https://avatars.githubusercontent.com/u/123');
      expect(profile.publicRepos).toBe(42);
    });

    it('should throw error on failure', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      await expect(connector.getUserProfile()).rejects.toThrow('GitHub API error');
    });
  });

  describe('getRepositoryInfo', () => {
    it('should fetch repository information', async () => {
      const mockRepo = {
        name: 'repo1',
        full_name: 'owner/repo1',
        description: 'Test repository',
        private: false,
        stargazers_count: 100,
        forks_count: 20,
        open_issues_count: 50,
        pull_requests_count: 30,
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRepo,
      });

      const info = await connector.getRepositoryInfo('owner', 'repo1');

      expect(info.name).toBe('repo1');
      expect(info.full_name).toBe('owner/repo1');
      expect(info.stars).toBe(100);
    });
  });
});