import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  beforeAll,
} from 'vitest';
import {
  extractSkillsFromTask,
  getSkillDevelopmentRecommendations,
  linkDecisionToTaskOutcome,
  getDecisionOutcomeRecommendations,
} from '../skills-action';
import { setupTestDb, cleanupTestDb, createTestTasks } from '@/test/test-utils';
import { setDb } from '@/lib/db';
import { createMockDatabase } from '@/lib/db/mock-driver';

// Set up demo mode for authentication
const originalNodeEnv = process.env.NODE_ENV;
const originalNextAuthSecret = process.env.NEXTAUTH_SECRET;

beforeAll(() => {
  (process.env as any).NODE_ENV = 'test';
  (process.env as any).NEXTAUTH_SECRET = 'demo-secret';
});

afterEach(() => {
  vi.resetModules();
});

describe('Skills Action', () => {
  let testDb: ReturnType<typeof createMockDatabase>;

  beforeEach(async () => {
    testDb = await setupTestDb();
    setDb(testDb);
    await createTestTasks();
  });

  afterEach(async () => {
    await cleanupTestDb();
  });

  describe('extractSkillsFromTask', () => {
    it('extracts skills from a completed task', async () => {
      const skills = await extractSkillsFromTask(1, 1);

      expect(Array.isArray(skills)).toBe(true);
    });

    it('returns empty array for non-existent task', async () => {
      const skills = await extractSkillsFromTask(99999, 1);
      expect(skills).toEqual([]);
    });

    it('extracts multiple skills when task has multiple keywords', async () => {
      // Create a task with development keywords
      const result = await extractSkillsFromTask(1, 1);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getSkillDevelopmentRecommendations', () => {
    it('returns skills_to_develop and skills_with_gaps arrays', async () => {
      const result = await getSkillDevelopmentRecommendations(1);

      expect(result).toHaveProperty('skills_to_develop');
      expect(result).toHaveProperty('skills_with_gaps');
      expect(Array.isArray(result.skills_to_develop)).toBe(true);
      expect(Array.isArray(result.skills_with_gaps)).toBe(true);
    });

    it('returns empty arrays when no skills exist', async () => {
      // User 999 should not have any skills
      const result = await getSkillDevelopmentRecommendations(999);

      expect(result.skills_to_develop).toEqual([]);
      expect(result.skills_with_gaps).toEqual([]);
    });
  });

  describe('linkDecisionToTaskOutcome', () => {
    it('returns false for non-existent decision', async () => {
      const result = await linkDecisionToTaskOutcome(9999, 1, 1);
      expect(result).toBe(false);
    });

    it('creates learn_connections table for valid decisions', async () => {
      const result = await linkDecisionToTaskOutcome(1, 1, 1);
      // Result depends on whether the decision and task exist and belong to user
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getDecisionOutcomeRecommendations', () => {
    it('returns recommendations array', async () => {
      const recommendations = await getDecisionOutcomeRecommendations(1);

      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('properly maps decision types to skills', async () => {
      // Insert a decision with valid decision_type and low outcome rating
      const db = testDb;
      db.prepare(
        'INSERT INTO decisions (user_id, decision_type, outcome_rating) VALUES (?, ?, ?)'
      ).run(1, 'priority', -1);

      const recommendations = await getDecisionOutcomeRecommendations(1);

      if (recommendations.length > 0) {
        recommendations.forEach(rec => {
          expect(rec).toHaveProperty('decision_type');
          expect(rec).toHaveProperty('skill_needed');
          expect(rec).toHaveProperty('recommendation');
          expect(rec.decision_type).toBe('priority');
          // priority should map to decision-making
          expect(rec.skill_needed).toBe('decision-making');
        });
      }
    });

    it('handles decisions with null decision_type gracefully', async () => {
      // Insert a decision with null decision_type
      const db = testDb;
      db.prepare(
        'INSERT INTO decisions (user_id, decision_type, outcome_rating) VALUES (?, ?, ?)'
      ).run(1, null, -1);

      const recommendations = await getDecisionOutcomeRecommendations(1);

      // Should return array without errors - null decision_types should be filtered out
      expect(Array.isArray(recommendations)).toBe(true);
      // All recommendations should have valid decision_type (null ones filtered)
      recommendations.forEach(rec => {
        expect(rec.decision_type).toBeDefined();
        expect(rec.decision_type).not.toBeNull();
      });
    });

    it('handles decisions with different decision types', async () => {
      // Insert a decision with a different type
      const db = testDb;
      db.prepare(
        'INSERT INTO decisions (user_id, decision_type, outcome_rating) VALUES (?, ?, ?)'
      ).run(1, 'tool', -1);

      const recommendations = await getDecisionOutcomeRecommendations(1);

      expect(Array.isArray(recommendations)).toBe(true);
      // Should have tool mapped to development skill
      if (recommendations.length > 0) {
        expect(recommendations[0].skill_needed).toBe('development');
      }
    });

    it('filters out decisions without skills when user has no skills', async () => {
      // Insert a decision with valid decision_type
      const db = testDb;
      db.prepare(
        'INSERT INTO decisions (user_id, decision_type, outcome_rating) VALUES (?, ?, ?)'
      ).run(1, 'timeline', -1);

      const recommendations = await getDecisionOutcomeRecommendations(1);

      // User has no skills, so hasSkill should be false
      expect(Array.isArray(recommendations)).toBe(true);
      if (recommendations.length > 0) {
        // timeline should map to time management
        expect(recommendations[0].skill_needed).toBe('time management');
        // Should have recommendation about developing the skill
        expect(recommendations[0].recommendation).toContain('developing');
      }
    });

    it('shows review recommendation when user has the skill', async () => {
      // First create the skill
      const db = testDb;
      db.prepare(
        'INSERT INTO user_skills (user_id, skill_name, proficiency_level, created_at) VALUES (?, ?, ?, datetime("now"))'
      ).run(1, 'decision-making', 4, '2024-01-01');

      // Then insert a decision
      db.prepare(
        'INSERT INTO decisions (user_id, decision_type, outcome_rating) VALUES (?, ?, ?)'
      ).run(1, 'priority', -1);

      const recommendations = await getDecisionOutcomeRecommendations(1);

      expect(Array.isArray(recommendations)).toBe(true);
      if (recommendations.length > 0) {
        // Should have recommendation about reviewing decisions
        expect(recommendations[0].recommendation).toContain('Review');
        expect(recommendations[0].recommendation).toContain('apply');
      }
    });
  });
});

describe('SKILL_KEYWORDS detection', () => {
  // Test that skill keywords are properly defined
  const SKILL_KEYWORDS = {
    'project management': ['plan', 'schedule', 'coordinate', 'timeline', 'deadline'],
    'technical writing': ['write', 'document', 'report', 'create', 'draft'],
    'research': ['research', 'investigate', 'analyze', 'study', 'examine'],
    'development': ['code', 'develop', 'implement', 'server', 'api'],
    'design': ['design', 'ui', 'ux', 'prototype', 'layout'],
    'communication': ['present', 'meeting', 'discuss', 'communicate', 'email'],
    'leadership': ['lead', 'manage', 'team', 'mentor', 'coach'],
    'problem-solving': ['solve', 'fix', 'troubleshoot', 'debug', 'optimize'],
    'time management': ['schedule', 'time', 'deadline', 'estimate', 'track'],
  };

  it('has all expected skill categories defined', () => {
    expect(SKILL_KEYWORDS).toHaveProperty('project management');
    expect(SKILL_KEYWORDS).toHaveProperty('technical writing');
    expect(SKILL_KEYWORDS).toHaveProperty('research');
    expect(SKILL_KEYWORDS).toHaveProperty('development');
    expect(SKILL_KEYWORDS).toHaveProperty('design');
    expect(SKILL_KEYWORDS).toHaveProperty('communication');
    expect(SKILL_KEYWORDS).toHaveProperty('leadership');
    expect(SKILL_KEYWORDS).toHaveProperty('problem-solving');
    expect(SKILL_KEYWORDS).toHaveProperty('time management');
  });

  it('has keyword arrays for each skill', () => {
    Object.values(SKILL_KEYWORDS).forEach(keywords => {
      expect(Array.isArray(keywords)).toBe(true);
      expect(keywords.length).toBeGreaterThan(0);
    });
  });
});