/**
 * GitHub Issues Integration Connector
 * Sync GitHub issues with TaskFlow tasks
 *
 * Requires: GitHub Personal Access Token or OAuth
 * Scope: repo (read/write)
 */

import { BaseConnector, IntegrationConfig, ExternalRecord, GitHubIssueRecord } from './base-connector';

export class GitHubConnector extends BaseConnector {
  readonly id = 'github';
  readonly type = 'github';
  readonly name = 'GitHub Issues';

  private apiToken: string;
  private repositories: string[];

  constructor(config: IntegrationConfig & { apiToken: string; repositories?: string | string[] }) {
    super(config);
    this.apiToken = config.apiToken;
    if (typeof config.repositories === 'string') {
      this.repositories = config.repositories
        ?.split(',')
        .map(r => r.trim())
        .filter(r => r.length > 0) || [];
    } else if (Array.isArray(config.repositories)) {
      this.repositories = config.repositories.filter(r => r.length > 0);
    } else {
      this.repositories = [];
    }
  }

  async authenticate(credentials: {
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
  } = {}): Promise<{ accessToken: string; refreshToken?: string; expiresAt: string }> {
    if (!credentials.accessToken) {
      throw new Error('GitHub integration requires an access token');
    }

    this.apiToken = credentials.accessToken;
    this.accessToken = credentials.accessToken;

    // GitHub tokens can have custom expiration, default to 1 hour
    const expiresAt =
      credentials.refreshToken && credentials.accessToken
        ? new Date(Date.now() + 3600000).toISOString()
        : new Date(Date.now() + 86400000 * 30).toISOString(); // 30 days if PAT

    return {
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      expiresAt,
    };
  }

  async fetchRecords(since?: Date, options?: { limit?: number; cursor?: string; labels?: string[] }): Promise<GitHubIssueRecord[]> {
    const records: GitHubIssueRecord[] = [];

    for (const repo of this.repositories) {
      const [owner, repoName] = repo.split('/');
      if (!owner || !repoName) {
        console.warn(`Invalid repository format: ${repo}. Expected "owner/repo"`);
        continue;
      }

      const sinceParam = since ? `&since=${since.toISOString()}` : '';
      const labelsParam = options?.labels?.length
        ? `&labels=${options.labels.join(',')}`
        : '';

      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/issues?state=all&sort=updated${sinceParam}${labelsParam}`,
        {
          headers: {
            Authorization: `token ${this.apiToken}`,
            Accept: 'application/vnd.github.v3+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`GitHub API error: ${response.status} ${error}`);
      }

      const issues = await response.json();

      for (const issue of issues) {
        try {
          const mappedRecord = this.mapGitHubIssueToTask(issue, owner, repoName);
          records.push(mappedRecord);
        } catch (error) {
          console.warn(`Failed to map issue ${issue.id}:`, error);
        }
      }
    }

    return records;
  }

  mapToTask(record: GitHubIssueRecord): {
    title: string;
    description?: string;
    dueDate?: string;
    labels?: string[];
    assignee?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  } {
    return {
      title: record.title,
      description: record.description,
      labels: record.labels,
      assignee: record.assignee || undefined,
      priority: this.mapPriority(record.labels),
    };
  }

  private mapGitHubIssueToTask(issue: Record<string, unknown>, owner: string, repoName: string): GitHubIssueRecord {
    return {
      id: String(issue.id),
      title: String(issue.title || 'Untitled'),
      description: issue.body ? String(issue.body) : undefined,
      labels: this.extractLabels(issue),
      assignee: this.extractAssignee(issue) || '',
      priority: this.mapPriority(this.extractLabels(issue)),
      state: (issue.state as 'open' | 'closed') || 'open',
      comments: issue.comments as number,
      url: issue.html_url as string,
      repository: `${owner}/${repoName}`,
      createdAt: issue.created_at as string,
      updatedAt: issue.updated_at as string,
    };
  }

  private extractLabels(issue: Record<string, unknown>): string[] {
    const labels = issue.labels;
    if (!Array.isArray(labels)) return [];

    return labels
      .filter((label) => typeof label === 'object' && label !== null)
      .map((label) => {
        const l = label as Record<string, unknown>;
        return String(l.name || '');
      })
      .filter(Boolean);
  }

  private extractAssignee(issue: Record<string, unknown>): string | undefined {
    const assignee = issue.assignee;
    if (!assignee || typeof assignee !== 'object') return undefined;

    const a = assignee as Record<string, unknown>;
    return (a.login as string) || (a.email as string) || undefined;
  }

  private mapPriority(labels: string[]): 'low' | 'medium' | 'high' | 'critical' | undefined {
    const priorityLabels = {
      critical: ['critical', 'urgent', 'blocker', 'p0'],
      high: ['high', 'important', 'p1'],
      medium: ['medium', 'normal', 'p2'],
      low: ['low', 'p3', 'trivial'],
    };

    const lowerLabels = labels.map((l) => l.toLowerCase());

    for (const [priority, keywords] of Object.entries(priorityLabels)) {
      if (lowerLabels.some((label) => keywords.includes(label))) {
        return priority as 'low' | 'medium' | 'high' | 'critical';
      }
    }

    return undefined;
  }

  private priorityToLevel(priority: 'low' | 'medium' | 'high' | 'critical'): 0 | 1 | 2 | 3 {
    const map: Record<string, number> = {
      low: 0,
      medium: 1,
      high: 2,
      critical: 3,
    };
    return map[priority] as 0 | 1 | 2 | 3;
  }

  async searchIssues(query: string, options?: { state?: 'open' | 'closed' | 'all'; labels?: string[] }): Promise<GitHubIssueRecord[]> {
    if (this.repositories.length === 0) {
      throw new Error('No repositories configured');
    }

    let searchQuery = `q=${encodeURIComponent(query)}`;
    if (options?.state) {
      searchQuery += `+is:${options.state}`;
    }
    searchQuery += `+repo:${this.repositories.map((r) => `repo:${r}`).join('+repo:')}`;
    if (options?.labels?.length) {
      searchQuery += `+labels:${options.labels.join(',')}`;
    }

    const response = await fetch(`https://api.github.com/search/issues?${searchQuery}`, {
      headers: {
        Authorization: `token ${this.apiToken}`,
        Accept: 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub Search API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    const items = data.items || [];

    return items.map((issue: Record<string, unknown>) => ({
      id: String(issue.id),
      title: String(issue.title || 'Untitled'),
      description: issue.body ? String(issue.body) : undefined,
      labels: this.extractLabels(issue),
      assignee: this.extractAssignee(issue),
      priority: this.mapPriority(this.extractLabels(issue)),
      status: issue.state as 'open' | 'closed',
      comments: issue.comments as number,
      externalUrl: issue.html_url as string,
      repository: issue.repository_url
        ? (issue.repository_url as string).split('/').slice(-2).join('/')
        : this.repositories[0],
      createdAt: issue.created_at as string,
      updatedAt: issue.updated_at as string,
    }));
  }

  async getPullRequests(options?: { state?: 'open' | 'closed' | 'all'; since?: Date }): Promise<ExternalRecord[]> {
    const records: ExternalRecord[] = [];

    for (const repo of this.repositories) {
      const [owner, repoName] = repo.split('/');
      if (!owner || !repoName) continue;

      let url = `https://api.github.com/repos/${owner}/${repoName}/pulls?state=${options?.state || 'all'}`;
      if (options?.since) {
        url += `&since=${options.since.toISOString()}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `token ${this.apiToken}`,
          Accept: 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });

      if (!response.ok) continue;

      const prs = await response.json();

      for (const pr of prs) {
        records.push({
          id: String(pr.id),
          title: String(pr.title || 'Untitled PR'),
          description: pr.body ? String(pr.body) : undefined,
          labels: this.extractLabels(pr),
          status: pr.state as string,
          externalUrl: pr.html_url as string,
          createdAt: pr.created_at as string,
          updatedAt: pr.updated_at as string,
          assignee: this.extractAssignee(pr),
        });
      }
    }

    return records;
  }

  async updateIssue(issueId: string, updates: { title?: string; description?: string; labels?: string[]; assignee?: string }): Promise<GitHubIssueRecord> {
    const response = await fetch(`https://api.github.com/issues/${issueId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `token ${this.apiToken}`,
        Accept: 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${response.status} ${error}`);
    }

    const updatedIssue = await response.json();
    // Repository info would need to be extracted from issue URL
    return this.mapGitHubIssueToTask(updatedIssue, 'unknown', 'unknown');
  }

  async closeIssue(issueId: string): Promise<boolean> {
    try {
      const response = await fetch(`https://api.github.com/issues/${issueId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `token ${this.apiToken}`,
          Accept: 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ state: 'closed' }),
      });

      if (!response.ok) {
        return false;
      }

      return response.ok;
    } catch {
      return false;
    }
  }

  async pushTask(task: {
    title: string;
    description?: string;
    dueDate?: string;
    labels?: string[];
    assignee?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    repository?: string;
  }): Promise<GitHubIssueRecord> {
    if (!task.repository) {
      throw new Error('Repository is required to create a GitHub issue');
    }

    const [owner, repoName] = task.repository.split('/');
    if (!owner || !repoName) {
      throw new Error(`Invalid repository format: ${task.repository}. Expected "owner/repo"`);
    }

    // Combine labels with priority label
    const labels: string[] = [...(task.labels || [])];
    if (task.priority) {
      labels.push(`P${this.priorityToLevel(task.priority)}`);
    }

    const issueData: Record<string, unknown> = {
      title: task.title,
      body: task.description,
      labels,
    };

    const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `token ${this.apiToken}`,
        Accept: 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(issueData),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${response.status} ${error}`);
    }

    const createdIssue = await response.json();
    return this.mapGitHubIssueToTask(createdIssue, owner, repoName);
  }

  async addComment(issueId: string, comment: string): Promise<void> {
    const response = await fetch(`https://api.github.com/issues/${issueId}/comments`, {
      method: 'POST',
      headers: {
        Authorization: `token ${this.apiToken}`,
        Accept: 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body: comment }),
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `token ${this.apiToken}`,
          Accept: 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getUserProfile(): Promise<{
    login: string;
    name?: string;
    email?: string;
    avatarUrl: string;
    bio?: string;
    publicRepos: number;
  }> {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${this.apiToken}`,
        Accept: 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const user = await response.json();
    return {
      login: user.login,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatar_url,
      bio: user.bio,
      publicRepos: user.public_repos,
    };
  }

  async getRepositoryInfo(owner: string, repoName: string): Promise<{
    name: string;
    full_name: string;
    description?: string;
    private: boolean;
    stars: number;
    forks: number;
    issues_count: number;
    pull_requests_count: number;
  }> {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
      headers: {
        Authorization: `token ${this.apiToken}`,
        Accept: 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      name: data.name,
      full_name: data.full_name,
      description: data.description,
      private: data.private,
      stars: data.stargazers_count || 0,
      forks: data.forks_count || 0,
      issues_count: data.open_issues_count || 0,
      pull_requests_count: data.pulls_count || 0,
    };
  }
}