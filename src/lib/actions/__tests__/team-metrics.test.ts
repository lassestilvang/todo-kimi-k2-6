import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTeamVelocityReport, getSprintHistory } from '../team-metrics';

// Mock the database module
vi.mock('@/lib/db', () => ({
  getDb: () => ({
    prepare: vi.fn().mockReturnThis(),
    all: vi.fn().mockReturnValue([]),
    get: vi.fn().mockReturnValue({ count: 0 }),
    run: vi.fn().mockReturnValue({ changes: 0, lastInsertRowid: 1 }),
  }),
}));

// Mock the session module
vi.mock('@/lib/session', () => ({
  getCurrentUser: () => ({ id: 1, email: 'test@test.com', name: 'Test User' }),
}));

describe('team-metrics', () => {
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
      const report = await getTeamVelocityReport();
      expect(report.velocityTrend).toBeGreaterThanOrEqual(-100);
      expect(report.velocityTrend).toBeLessThanOrEqual(100);
    });

    it('returns utilization percentage', async () => {
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
      const report = await getTeamVelocityReport();
      if (report.teamMembers.length > 0) {
        const member = report.teamMembers[0];
        expect(member).toHaveProperty('id');
        expect(member).toHaveProperty('name');
        expect(member).toHaveProperty('email');
        expect(member).toHaveProperty('taskCount');
        expect(member).toHaveProperty('completionRate');
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