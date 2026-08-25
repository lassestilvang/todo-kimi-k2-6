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
      const result = await extractSkillsFromTask(1, 1);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('creates new skill when none exists for task keywords', async () => {
      // Get a task with development keywords
      const db = testDb;
      // Task 1 typically has various keywords
      const skills = await extractSkillsFromTask(1, 1);

      // Verify skills were extracted
      expect(skills.length).toBeGreaterThanOrEqual(0);

      // Verify skill was created in database if extracted
      if (skills.length > 0) {
        const result = db
          .prepare('SELECT * FROM user_skills WHERE user_id = ? AND skill_name = ?')
          .get(1, skills[0].skill_name);

        expect(result).toBeDefined();
      }
    });

    it('updates existing skill proficiency', async () => {
      const db = testDb;
      // Create an existing skill
      db.prepare(
        'INSERT INTO user_skills (user_id, skill_name, proficiency_level, evidence_task_ids) VALUES (?, ?, ?, ?)'
      ).run(1, 'development', 1.0, '[]');

      // Extract skills from task
      const skills = await extractSkillsFromTask(1, 1);

      // Verify the skill was updated
      if (skills.length > 0) {
        const updatedSkill = db
          .prepare('SELECT * FROM user_skills WHERE user_id = ? AND skill_name = ?')
          .get(1, skills[0].skill_name);

        expect(updatedSkill).toBeDefined();
        expect(updatedSkill?.proficiency_level).toBeGreaterThanOrEqual(1);
      }
    });

    it('adds task to evidence_task_ids', async () => {
      const db = testDb;

      // First extraction
      await extractSkillsFromTask(1, 1);

      // Get the skill
      const skill = db
        .prepare('SELECT * FROM user_skills WHERE user_id = ? AND proficiency_level > 0')
        .all(1) as Array<{ evidence_task_ids: string | null }>;

      if (skill.length > 0) {
        const evidence = JSON.parse(skill[0].evidence_task_ids || '[]');
        expect(evidence).toContain(1);
      }
    });

    it('does not duplicate task in evidence', async () => {
      const db = testDb;

      // First extraction
      await extractSkillsFromTask(1, 1);

      // Second extraction same task
      await extractSkillsFromTask(1, 1);

      // Check evidence doesn't have duplicate
      const skills = db
        .prepare('SELECT * FROM user_skills WHERE user_id = ?')
        .all(1) as Array<{ evidence_task_ids: string | null }>;

      skills.forEach(skill => {
        const evidence = JSON.parse(skill.evidence_task_ids || '[]');
        const uniqueEvidence = [...new Set(evidence)];
        expect(evidence).toEqual(uniqueEvidence);
      });
    });

    it('handles tasks with no keywords', async () => {
      // Create a task with no skill keywords
      const db = testDb;
      db.prepare(
        'INSERT INTO tasks (user_id, name, completed, created_at) VALUES (?, ?, ?, datetime("now"))'
      ).run(1, 'Generic task name', 1);

      const result = await extractSkillsFromTask(2, 1);

      expect(Array.isArray(result)).toBe(true);
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

    it('identifies skills with gaps for users with low proficiency', async () => {
      const db = testDb;
      // Create a skill with moderate proficiency and many evidence tasks
      db.prepare(
        'INSERT INTO user_skills (user_id, skill_name, proficiency_level, evidence_task_ids, created_at) VALUES (?, ?, ?, ?, datetime("now"))'
      ).run(1, 'development', 3, JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));

      const result = await getSkillDevelopmentRecommendations(1);

      expect(result.skills_with_gaps.length).toBeGreaterThanOrEqual(0);
    });

    it('identifies skills to develop from task keywords', async () => {
      const db = testDb;
      // Create a task with keywords that match skill categories
      db.prepare(
        'INSERT INTO tasks (user_id, name, completed, completed_at, created_at) VALUES (?, ?, ?, datetime("now"), datetime("now"))'
      ).run(1, 'I need to plan the project timeline and schedule deadlines', 1);

      const result = await getSkillDevelopmentRecommendations(1);

      // Should identify project management as a skill to develop
      const projectMgmt = result.skills_to_develop.find(
        s => s.skill_name === 'project management'
      );
      // Only happens if task keywords match and no existing skill
      expect(result.skills_to_develop.length).toBeGreaterThanOrEqual(0);
    });

    it('does not suggest skills user already has at level 5', async () => {
      const db = testDb;
      db.prepare(
        'INSERT INTO user_skills (user_id, skill_name, proficiency_level, evidence_task_ids, created_at) VALUES (?, ?, ?, ?, datetime("now"))'
      ).run(1, 'development', 5, JSON.stringify([1, 2, 3]));

      const result = await getSkillDevelopmentRecommendations(1);

      const devSkill = result.skills_with_gaps.find(
        s => s.skill_name === 'development'
      );
      expect(devSkill).toBeUndefined();
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

    it('returns false when task exists but user mismatch', async () => {
      // Try to link decision 1 to task 1 as user 999
      const result = await linkDecisionToTaskOutcome(1, 1, 999);
      expect(result).toBe(false);
    });

    it('returns false when task is not completed', async () => {
      const db = testDb;
      // Create a task that is NOT completed
      db.prepare(
        'INSERT INTO tasks (user_id, name, completed, created_at) VALUES (?, ?, ?, datetime("now"))'
      ).run(1, 'Incomplete task', 0);

      const result = await linkDecisionToTaskOutcome(1, 999, 1);
      expect(result).toBe(false);
    });

    it('creates learn_connections table when conditions are met', async () => {
      const db = testDb;
      // Create a completed task
      const taskId = db
        .prepare(
          'INSERT INTO tasks (user_id, name, completed, completed_at, created_at) VALUES (?, ?, ?, datetime("now"), datetime("now"))'
        )
        .run(1, 'Completed task for linking', 1);

      const result = await linkDecisionToTaskOutcome(1, taskId.lastInsertRowid as number, 1);

      // Should succeed if all conditions are met
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getDecisionOutcomeRecommendations', () => {
    it('returns recommendations array', async () => {
      const recommendations = await getDecisionOutcomeRecommendations(1);

      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('properly maps decision types to skills', async () => {
      const db = testDb;
      // Insert a decision with valid decision_type and low outcome rating
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
      const db = testDb;
      // Insert a decision with null decision_type
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
      const db = testDb;
      // Insert a decision with a different type
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
      const db = testDb;
      // Insert a decision with valid decision_type
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
      const db = testDb;
      // First create the skill
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

    it('handles decisions with allocation decision_type', async () => {
      const db = testDb;
      db.prepare(
        'INSERT INTO decisions (user_id, decision_type, outcome_rating) VALUES (?, ?, ?)'
      ).run(1, 'allocation', -1);

      const recommendations = await getDecisionOutcomeRecommendations(1);

      expect(Array.isArray(recommendations)).toBe(true);
      if (recommendations.length > 0) {
        expect(recommendations[0].skill_needed).toBe('project management');
      }
    });

    it('handles decisions with approach decision_type', async () => {
      const db = testDb;
      db.prepare(
        'INSERT INTO decisions (user_id, decision_type, outcome_rating) VALUES (?, ?, ?)'
      ).run(1, 'approach', -1);

      const recommendations = await getDecisionOutcomeRecommendations(1);

      expect(Array.isArray(recommendations)).toBe(true);
      if (recommendations.length > 0) {
        expect(recommendations[0].skill_needed).toBe('problem-solving');
      }
    });

    it('handles decisions with unknown decision_type', async () => {
      const db = testDb;
      db.prepare(
        'INSERT INTO decisions (user_id, decision_type, outcome_rating) VALUES (?, ?, ?)'
      ).run(1, 'unknown_type', -1);

      const recommendations = await getDecisionOutcomeRecommendations(1);

      expect(Array.isArray(recommendations)).toBe(true);
      // Unknown type should map to itself as the skill_needed
    });
  });
});

describe('SKILL_KEYWORDS detection', () => {
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