import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getTeamVelocityReport, getSprintHistory } from '../team-metrics';

// Mock the database module
const mockDb = {
  prepare: vi.fn().mockReturnThis(),
  all: vi.fn().mockReturnValue([]),
  get: vi.fn(() => ({ count: 0 })),
  run: vi.fn().mockReturnValue({ changes: 0, lastInsertRowid: 1 }),
};

vi.mock('@/lib/db', () => ({
  getDb: () => mockDb,
}));

// Mock the session module
vi.mock('@/lib/session', () => ({
  getCurrentUser: () => ({ id: 1, email: 'test@test.com', name: 'Test User' }),
}));

describe('team-metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.all.mockReturnValue([]);
    mockDb.get.mockReturnValue({ count: 0 });
    mockDb.run.mockReturnValue({ changes: 0, lastInsertRowid: 1 });
  });

  describe('getTeamVelocityReport', () => {
    it('returns team velocity report structure', async () => {
      const result = await getTeamVelocityReport();
      expect(result).toHaveProperty('teamMembers');
      expect(result).toHaveProperty('avgCompletionRate');
      expect(result).toHaveProperty('velocityTrend');
      expect(result).toHaveProperty('capacityUtilization');
      expect(result).toHaveProperty('upcomingDeadlines');
      expect(result).toHaveProperty('blockers');
    });

    it('handles workspace filtering', async () => {
      const result = await getTeamVelocityReport(1);
      expect(result).toBeDefined();
    });

    it('calculates velocity trend correctly', async () => {
      mockDb.all.mockReturnValue([
        { id: 1, name: 'User 1', email: 'user1@test.com', avatar_url: null, task_count: 5, completion_rate: 85.5, last_active: '2024-01-01' },
      ]);
      mockDb.get.mockReturnValue({ count: 0 });

      const report = await getTeamVelocityReport();
      expect(report.velocityTrend).toBeGreaterThanOrEqual(-100);
      expect(report.velocityTrend).toBeLessThanOrEqual(100);
    });

    it('returns utilization percentage', async () => {
      mockDb.all.mockReturnValue([
        { id: 1, name: 'User 1', email: 'user1@test.com', avatar_url: null, task_count: 5, completion_rate: 85.5, last_active: '2024-01-01' },
      ]);
      mockDb.get.mockReturnValue({ count: 0 });

      const report = await getTeamVelocityReport();
      expect(report.capacityUtilization).toBeGreaterThanOrEqual(0);
    });

    it('includes upcoming deadlines', async () => {
      const report = await getTeamVelocityReport();
      expect(Array.isArray(report.upcomingDeadlines)).toBe(true);
    });

    it('includes blockers information', async () => {
      const report = await getTeamVelocityReport();
      expect(Array.isArray(report.blockers)).toBe(true);
    });

    it('returns team members with required fields', async () => {
      mockDb.all.mockReturnValue([
        { id: 1, name: 'User 1', email: 'user1@test.com', avatar_url: null, task_count: 5, completion_rate: 85.5, last_active: '2024-01-01' },
      ]);

      const report = await getTeamVelocityReport();
      if (report.teamMembers.length > 0) {
        const member = report.teamMembers[0];
        expect(member).toHaveProperty('id');
        expect(member).toHaveProperty('name');
        expect(member).toHaveProperty('email');
        // TeamMember interface uses snake_case from database
        expect(member).toHaveProperty('task_count');
        expect(member).toHaveProperty('completion_rate');
      }
    });
  });

  describe('getSprintHistory', () => {
    it('returns sprint history with correct structure', async () => {
      const sprints = await getSprintHistory(undefined, 3);
      expect(Array.isArray(sprints)).toBe(true);
    });

    it('limits sprints to requested amount', async () => {
      const sprints = await getSprintHistory(undefined, 3);
      expect(sprints.length).toBeLessThanOrEqual(3);
    });

    it('includes required sprint fields', async () => {
      const sprints = await getSprintHistory(undefined, 3);
      if (sprints.length > 0) {
        const sprint = sprints[0];
        expect(sprint).toHaveProperty('sprint_id');
        expect(sprint).toHaveProperty('name');
        expect(sprint).toHaveProperty('start_date');
        expect(sprint).toHaveProperty('end_date');
        expect(sprint).toHaveProperty('planned');
        expect(sprint).toHaveProperty('completed');
        expect(sprint).toHaveProperty('completion_rate');
      }
    });
  });
});

describe('Team Metrics Type Safety', () => {
  beforeEach(() => {
    mockDb.all.mockReturnValue([]);
    mockDb.get.mockReturnValue({ count: 0 });
  });

  it('returns consistent data structure', async () => {
    const report = await getTeamVelocityReport();

    expect(typeof report.teamMembers).toBe('object');
    expect(typeof report.avgCompletionRate).toBe('number');
    expect(typeof report.velocityTrend).toBe('number');
    expect(typeof report.capacityUtilization).toBe('number');
    expect(Array.isArray(report.upcomingDeadlines)).toBe(true);
    expect(Array.isArray(report.blockers)).toBe(true);
  });
});

describe('team-metrics coverage - workspaceId branches', () => {
  beforeEach(() => {
    mockDb.all.mockReturnValue([]);
    mockDb.get.mockReturnValue({ count: 0 });
  });

  describe('getTeamVelocityReport with workspaceId', () => {
    it('returns team velocity report for specific workspace', async () => {
      // This tests the workspaceId branch in the queries
      const result = await getTeamVelocityReport(1);

      expect(result).toBeDefined();
      expect(Array.isArray(result.teamMembers)).toBe(true);
    });
  });

  describe('getTeamVelocityReport without workspaceId', () => {
    it('returns team velocity report for all users', async () => {
      mockDb.all.mockReturnValue([
        { id: 1, name: 'User 1', email: 'user1@test.com', avatar_url: null, task_count: 5, completion_rate: 85.5, last_active: '2024-01-01' },
      ]);

      const result = await getTeamVelocityReport();

      expect(result).toBeDefined();
      expect(Array.isArray(result.teamMembers)).toBe(true);
    });
  });

  describe('getTeamVelocityReport - different timeframes', () => {
    it('calculates velocity trend for week timeframe', async () => {
      mockDb.all.mockReturnValue([
        { id: 1, name: 'User 1', email: 'user1@test.com', avatar_url: null, task_count: 5, completion_rate: 85.5, last_active: '2024-01-01' },
      ]);

      const result = await getTeamVelocityReport(undefined, 'week');
      expect(result).toBeDefined();
      expect(result.velocityTrend).toBeGreaterThanOrEqual(-100);
    });

    it('calculates velocity trend for quarter timeframe', async () => {
      mockDb.all.mockReturnValue([
        { id: 1, name: 'User 1', email: 'user1@test.com', avatar_url: null, task_count: 5, completion_rate: 85.5, last_active: '2024-01-01' },
      ]);

      const result = await getTeamVelocityReport(undefined, 'quarter');
      expect(result).toBeDefined();
    });

    it('calculates velocity trend for year timeframe', async () => {
      mockDb.all.mockReturnValue([
        { id: 1, name: 'User 1', email: 'user1@test.com', avatar_url: null, task_count: 5, completion_rate: 85.5, last_active: '2024-01-01' },
      ]);

      const result = await getTeamVelocityReport(undefined, 'year');
      expect(result).toBeDefined();
    });
  });

  describe('getTeamVelocityReport - sprint history with workspaceId', () => {
    it('returns sprint history for specific workspace', async () => {
      mockDb.all.mockReturnValue([
        { sprint_id: '1', start_date: '2024-01-01', end_date: '2024-01-07', planned: 10, completed: 8, completion_rate: 80 },
      ]);

      const result = await getSprintHistory(1, 3);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getVelocityTrend trend calculation when previousResult.count > 0', () => {
    it('calculates trend percentage when there is previous period data', async () => {
      // Test lines 182-183: trend calculation when previousResult.count > 0
      mockDb.all.mockReturnValue([
        { id: 1, name: 'User 1', email: 'user1@test.com', avatar_url: null, task_count: 5, completion_rate: 85.5, last_active: '2024-01-01' },
      ]);

      // Mock get() to return different values for current vs previous period
      // First call: currentResult (should have some count)
      // Second call: previousResult (should have non-zero count to test trend calculation)
      mockDb.get
        .mockReturnValueOnce({ count: 10 })  // currentResult.count
        .mockReturnValueOnce({ count: 5 });   // previousResult.count

      const result = await getTeamVelocityReport(1);

      // Trend should be ((10 - 5) / 5) * 100 = 100%
      expect(result.velocityTrend).toBe(100);
    });

    it('calculates negative trend when current count is lower than previous', async () => {
      mockDb.all.mockReturnValue([
        { id: 1, name: 'User 1', email: 'user1@test.com', avatar_url: null, task_count: 5, completion_rate: 85.5, last_active: '2024-01-01' },
      ]);

      mockDb.get
        .mockReturnValueOnce({ count: 2 })   // currentResult.count
        .mockReturnValueOnce({ count: 10 });  // previousResult.count

      const result = await getTeamVelocityReport(1);

      // Trend should be ((2 - 10) / 10) * 100 = -80%
      expect(result.velocityTrend).toBe(-80);
    });

    it('caps negative trend at -100%', async () => {
      mockDb.all.mockReturnValue([
        { id: 1, name: 'User 1', email: 'user1@test.com', avatar_url: null, task_count: 5, completion_rate: 85.5, last_active: '2024-01-01' },
      ]);

      // Very negative trend scenario
      mockDb.get
        .mockReturnValueOnce({ count: 0 })   // currentResult.count
        .mockReturnValueOnce({ count: 100 });  // previousResult.count

      const result = await getTeamVelocityReport(1);

      // Trend should be capped at -100%
      expect(result.velocityTrend).toBe(-100);
    });

    it('caps positive trend at 100%', async () => {
      mockDb.all.mockReturnValue([
        { id: 1, name: 'User 1', email: 'user1@test.com', avatar_url: null, task_count: 5, completion_rate: 85.5, last_active: '2024-01-01' },
      ]);

      // Very positive trend scenario
      mockDb.get
        .mockReturnValueOnce({ count: 1000 })  // currentResult.count
        .mockReturnValueOnce({ count: 10 });   // previousResult.count

      const result = await getTeamVelocityReport(1);

      // Trend should be capped at 100%
      expect(result.velocityTrend).toBe(100);
    });
  });

  describe('getTeamVelocityReport - name fallback to email', () => {
    it('falls back to email when name is null', async () => {
      // This tests lines 88 and 114-116 - the name || email fallback
      mockDb.all.mockReturnValue([
        { id: 1, name: null, email: 'usernameless@test.com', avatar_url: null, task_count: 5, completion_rate: 85.5, last_active: '2024-01-01' },
      ]);
      mockDb.get.mockReturnValue({ count: 0 });

      const report = await getTeamVelocityReport(1);

      expect(report.teamMembers[0].name).toBe('usernameless@test.com');
    });

    it('falls back to email when name is undefined', async () => {
      mockDb.all.mockReturnValue([
        { id: 1, email: 'user@test.com', avatar_url: null, task_count: 5, completion_rate: 85.5, last_active: '2024-01-01' },
      ]);
      mockDb.get.mockReturnValue({ count: 0 });

      const report = await getTeamVelocityReport(1);

      expect(report.teamMembers[0].name).toBe('user@test.com');
    });

    it('falls back to email when name is empty string', async () => {
      mockDb.all.mockReturnValue([
        { id: 1, name: '', email: 'empty-name@test.com', avatar_url: null, task_count: 5, completion_rate: 85.5, last_active: '2024-01-01' },
      ]);
      mockDb.get.mockReturnValue({ count: 0 });

      const report = await getTeamVelocityReport(1);

      // Empty string is falsy, so should fall back to email
      expect(report.teamMembers[0].name).toBe('empty-name@test.com');
    });

    it('returns 0 trend when previousResult.count is 0', async () => {
      mockDb.all.mockReturnValue([
        { id: 1, name: 'User 1', email: 'user1@test.com', avatar_url: null, task_count: 5, completion_rate: 85.5, last_active: '2024-01-01' },
      ]);

      // Mock get() to return currentResult with count > 0, but previousResult with count = 0
      mockDb.get
        .mockReturnValueOnce({ count: 10 })  // currentResult.count
        .mockReturnValueOnce({ count: 0 });   // previousResult.count = 0

      const result = await getTeamVelocityReport(1);

      // When previousResult.count is 0, should return currentResult.count > 0 ? 100 : 0
      expect(result.velocityTrend).toBe(100);
    });
  });
});

describe('team-metrics - getUsersWithTaskCounts without workspaceId', () => {
  beforeEach(() => {
    mockDb.all.mockReturnValue([]);
    mockDb.get.mockReturnValue({ count: 0 });
  });

  it('calls the else branch when workspaceId is not provided', async () => {
    const report = await getTeamVelocityReport();

    // Should work without a workspaceId (undefined)
    expect(report).toBeDefined();
    expect(Array.isArray(report.teamMembers)).toBe(true);
  });
});