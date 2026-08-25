import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from 'vitest';
import {
  getUserSkills,
  getSkillById,
  createSkill,
  updateSkill,
  deleteSkill,
  incrementSkillExperience,
  getSkillRecommendations,
  getSkillStatistics,
} from '../skills';
import { setupTestDb, cleanupTestDb, createTestTasks } from '@/test/test-utils';
import { setDb } from '@/lib/db';

describe('Skills Actions', () => {
  beforeEach(async () => {
    const testDb = await setupTestDb();
    setDb(testDb);
    await createTestTasks();
  });

  afterEach(async () => {
    await cleanupTestDb();
  });

  describe('getUserSkills', () => {
    it('should return empty array when no skills exist', async () => {
      const skills = await getUserSkills(1);
      expect(skills).toEqual([]);
    });

    it('should return skills ordered by proficiency level', async () => {
      const db = (await setupTestDb());
      setDb(db);
      db.prepare(
        'INSERT INTO user_skills (user_id, skill_name, proficiency_level) VALUES (?, ?, ?)'
      ).run(1, 'Beginner Skill', 1);
      db.prepare(
        'INSERT INTO user_skills (user_id, skill_name, proficiency_level) VALUES (?, ?, ?)'
      ).run(1, 'Expert Skill', 5);

      const skills = await getUserSkills(1);
      expect(skills).toHaveLength(2);
      expect(skills[0].skill_name).toBe('Expert Skill');
      expect(skills[1].skill_name).toBe('Beginner Skill');
    });
  });

  describe('getSkillById', () => {
    it('should return undefined for non-existent skill', async () => {
      const skill = await getSkillById(999, 1);
      expect(skill).toBeUndefined();
    });

    it('should return skill for valid id and matching user', async () => {
      const db = (await setupTestDb());
      setDb(db);
      db.prepare(
        'INSERT INTO user_skills (user_id, skill_name, proficiency_level, evidence_task_ids, created_at) VALUES (?, ?, ?, \'[]\', datetime(\'now\'))'
      ).run(1, 'Test Skill', 3);

      const skill = await getSkillById(1, 1);
      expect(skill).toBeDefined();
      expect(skill?.skill_name).toBe('Test Skill');
      expect(skill?.user_id).toBe(1);
    });
  });

  describe('createSkill', () => {
    it('should create a new skill', async () => {
      const skill = await createSkill({
        user_id: 1,
        skill_name: 'Test Skill',
        proficiency_level: 3,
        evidence_task_ids: [1, 2, 3],
      });

      expect(skill.skill_name).toBe('Test Skill');
      expect(skill.proficiency_level).toBe(3);
      expect(skill.user_id).toBe(1);
      expect(skill.evidence_task_ids).toBe(JSON.stringify([1, 2, 3]));
    });

    it('should default proficiency level to 1', async () => {
      const skill = await createSkill({
        user_id: 1,
        skill_name: 'Default Skill',
      });

      expect(skill.proficiency_level).toBe(1);
    });

    it('should handle null evidence_task_ids', async () => {
      const skill = await createSkill({
        user_id: 1,
        skill_name: 'Skill Without Evidence',
      });

      expect(skill.evidence_task_ids).toBeNull();
    });
  });

  describe('updateSkill', () => {
    it('should return null for non-existent skill', async () => {
      const result = await updateSkill(999, 1, { proficiency_level: 3 });
      expect(result).toBeNull();
    });

    it('should update skill name', async () => {
      const db = (await setupTestDb());
      setDb(db);
      db.prepare(
        'INSERT INTO user_skills (user_id, skill_name, proficiency_level, evidence_task_ids, created_at) VALUES (?, ?, ?, \'[]\', datetime(\'now\'))'
      ).run(1, 'Original Name', 1);

      const updated = await updateSkill(1, 1, { skill_name: 'Updated Name' });
      expect(updated?.skill_name).toBe('Updated Name');
    });

    it('should update proficiency level', async () => {
      const db = (await setupTestDb());
      setDb(db);
      db.prepare(
        'INSERT INTO user_skills (user_id, skill_name, proficiency_level, evidence_task_ids, created_at) VALUES (?, ?, ?, \'[]\', datetime(\'now\'))'
      ).run(1, 'Test Skill', 1);

      const updated = await updateSkill(1, 1, { proficiency_level: 4 });
      expect(updated?.proficiency_level).toBe(4);
    });

    it('should return null when updating another user\'s skill', async () => {
      const db = (await setupTestDb());
      setDb(db);
      db.prepare(
        'INSERT INTO user_skills (user_id, skill_name, proficiency_level, evidence_task_ids, created_at) VALUES (?, ?, ?, \'[]\', datetime(\'now\'))'
      ).run(999, 'Other User Skill', 2);

      const result = await updateSkill(1, 1, { proficiency_level: 4 });
      expect(result).toBeNull();
    });
  });

  describe('deleteSkill', () => {
    it('should return false for non-existent skill', async () => {
      const result = await deleteSkill(999, 1);
      expect(result).toBe(false);
    });

    it('should delete existing skill', async () => {
      const db = (await setupTestDb());
      setDb(db);
      db.prepare(
        'INSERT INTO user_skills (user_id, skill_name, proficiency_level, evidence_task_ids, created_at) VALUES (?, ?, ?, \'[]\', datetime(\'now\'))'
      ).run(1, 'To Delete', 1);

      const result = await deleteSkill(1, 1);
      expect(result).toBe(true);

      // Verify skill is deleted by checking it can't be retrieved
      const deletedSkill = await getSkillById(1, 1);
      expect(deletedSkill).toBeUndefined();
    });

    it('should not delete another user\'s skill', async () => {
      const db = (await setupTestDb());
      setDb(db);
      db.prepare(
        'INSERT INTO user_skills (user_id, skill_name, proficiency_level, evidence_task_ids, created_at) VALUES (?, ?, ?, \'[]\', datetime(\'now\'))'
      ).run(999, 'Other User Skill', 1);

      const result = await deleteSkill(1, 1);
      expect(result).toBe(false);
    });
  });

  describe('incrementSkillExperience', () => {
    it('should create new skill if not exists', async () => {
      const skill = await incrementSkillExperience(1, 'New Skill', 1, 1);
      expect(skill).not.toBeNull();
      expect(skill!.skill_name).toBe('New Skill');
      expect(skill!.proficiency_level).toBe(1);
      expect(skill!.user_id).toBe(1);
      const evidence = typeof skill!.evidence_task_ids === 'string'
        ? JSON.parse(skill!.evidence_task_ids as string)
        : skill!.evidence_task_ids as number[] | [];
      expect(evidence).toContain(1);
    });

    it('should add task to evidence for existing skill', async () => {
      const db = (await setupTestDb());
      setDb(db);
      db.prepare(
        'INSERT INTO user_skills (user_id, skill_name, proficiency_level, evidence_task_ids, created_at) VALUES (?, ?, ?, \'[1]\', datetime(\'now\'))'
      ).run(1, 'Existing Skill', 1);

      const skill = await incrementSkillExperience(1, 'Existing Skill', 2, 1);
      expect(skill).not.toBeNull();
      const evidence = typeof skill!.evidence_task_ids === 'string'
        ? JSON.parse(skill!.evidence_task_ids as string)
        : skill!.evidence_task_ids as number[] | [];
      expect(evidence).toContain(1);
      expect(evidence).toContain(2);
      expect(skill!.proficiency_level).toBe(1);
    });

    it('should update evidence_task_ids when new taskId is added', async () => {
      const db = (await setupTestDb());
      setDb(db);
      db.prepare(
        'INSERT INTO user_skills (user_id, skill_name, proficiency_level, evidence_task_ids, created_at) VALUES (?, ?, ?, \'[99]\', datetime(\'now\'))'
      ).run(1, 'Skill to Update', 2);

      await incrementSkillExperience(1, 'Skill to Update', 1, 1);

      // Verify skill evidence was updated in database
      const updatedSkill = await getSkillById(1, 1);
      expect(updatedSkill).not.toBeNull();
      const evidence = typeof updatedSkill!.evidence_task_ids === 'string'
        ? JSON.parse(updatedSkill!.evidence_task_ids)
        : [];
      expect(evidence).toContain(99);
      expect(evidence).toContain(1);
    });

    it('should not duplicate taskId already in evidence', async () => {
      const db = (await setupTestDb());
      setDb(db);
      db.prepare(
        'INSERT INTO user_skills (user_id, skill_name, proficiency_level, evidence_task_ids, last_used_at, created_at) VALUES (?, ?, ?, \'[1, 2, 3]\', datetime(\'now\'), datetime(\'now\'))'
      ).run(1, 'Existing Task', 2);

      await incrementSkillExperience(1, 'Existing Task', 1, 1);

      // Evidence should still only contain 1, 2, 3
      const updatedSkill = await getSkillById(1, 1);
      const evidence = typeof updatedSkill!.evidence_task_ids === 'string'
        ? JSON.parse(updatedSkill!.evidence_task_ids)
        : [];
      expect(evidence).toEqual([1, 2, 3]);
    });

    it('should return updated skill with last_used_at timestamp', async () => {
      const db = (await setupTestDb());
      setDb(db);
      db.prepare(
        'INSERT INTO user_skills (user_id, skill_name, proficiency_level, evidence_task_ids, created_at) VALUES (?, ?, ?, \'[1]\', datetime(\'now\'))'
      ).run(1, 'Test Skill', 2);

      const skill = await incrementSkillExperience(1, 'Test Skill', 2, 1);
      expect(skill).not.toBeNull();
      expect(skill!.last_used_at).not.toBeNull();
      const evidence = typeof skill!.evidence_task_ids === 'string'
        ? JSON.parse(skill!.evidence_task_ids)
        : [];
      expect(evidence).toContain(1);
      expect(evidence).toContain(2);
    });
  });

  describe('getSkillStatistics', () => {
    it('should return zero stats for user without skills', async () => {
      const stats = await getSkillStatistics(1);
      expect(stats.totalSkills).toBe(0);
      expect(stats.averageLevel).toBe(0);
      expect(stats.topSkills).toEqual([]);
      expect(stats.skillDistribution).toHaveLength(5);
    });

    it('should calculate correct statistics', async () => {
      const db = (await setupTestDb());
      setDb(db);
      db.prepare(
        'INSERT INTO user_skills (user_id, skill_name, proficiency_level, evidence_task_ids, created_at) VALUES (?, ?, ?, \'[]\', datetime(\'now\'))'
      ).run(1, 'Skill 1', 3);
      db.prepare(
        'INSERT INTO user_skills (user_id, skill_name, proficiency_level, evidence_task_ids, created_at) VALUES (?, ?, ?, \'[]\', datetime(\'now\'))'
      ).run(1, 'Skill 2', 4);

      const stats = await getSkillStatistics(1);
      expect(stats.totalSkills).toBe(2);
      expect(stats.averageLevel).toBe(3.5);
    });

    it('should return skill distribution', async () => {
      const db = (await setupTestDb());
      setDb(db);
      db.prepare(
        'INSERT INTO user_skills (user_id, skill_name, proficiency_level, evidence_task_ids, created_at) VALUES (?, ?, ?, \'[]\', datetime(\'now\'))'
      ).run(1, 'Skill 1', 3);
      db.prepare(
        'INSERT INTO user_skills (user_id, skill_name, proficiency_level, evidence_task_ids, created_at) VALUES (?, ?, ?, \'[]\', datetime(\'now\'))'
      ).run(1, 'Skill 2', 4);
      db.prepare(
        'INSERT INTO user_skills (user_id, skill_name, proficiency_level, evidence_task_ids, created_at) VALUES (?, ?, ?, \'[]\', datetime(\'now\'))'
      ).run(1, 'Skill 3', 4);

      const stats = await getSkillStatistics(1);
      expect(stats.skillDistribution).toHaveLength(5);
      expect(stats.skillDistribution.find((d) => d.level === 3)?.count).toBe(1);
      expect(stats.skillDistribution.find((d) => d.level === 4)?.count).toBe(2);
    });

    it('should return top skills sorted by proficiency', async () => {
      const db = (await setupTestDb());
      setDb(db);
      db.prepare(
        'INSERT INTO user_skills (user_id, skill_name, proficiency_level, evidence_task_ids, created_at) VALUES (?, ?, ?, \'[]\', datetime(\'now\'))'
      ).run(1, 'Beginner Skill', 1);
      db.prepare(
        'INSERT INTO user_skills (user_id, skill_name, proficiency_level, evidence_task_ids, created_at) VALUES (?, ?, ?, \'[]\', datetime(\'now\'))'
      ).run(1, 'Expert Skill', 5);
      db.prepare(
        'INSERT INTO user_skills (user_id, skill_name, proficiency_level, evidence_task_ids, created_at) VALUES (?, ?, ?, \'[]\', datetime(\'now\'))'
      ).run(1, 'Intermediate Skill', 3);

      const stats = await getSkillStatistics(1);
      expect(stats.topSkills).toHaveLength(3);
      expect(stats.topSkills[0].name).toBe('Expert Skill');
      expect(stats.topSkills[0].level).toBe(5);
    });
  });

  describe('getSkillRecommendations', () => {
    it('should return recommended skills for new users', async () => {
      const recommendations = await getSkillRecommendations(1, 5);
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should not recommend skills user already has', async () => {
      const db = (await setupTestDb());
      setDb(db);
      db.prepare(
        'INSERT INTO user_skills (user_id, skill_name, proficiency_level, evidence_task_ids, created_at) VALUES (?, ?, ?, \'[]\', datetime(\'now\'))'
      ).run(1, 'design', 3);

      const recommendations = await getSkillRecommendations(1, 5);
      expect(recommendations).not.toContainEqual(
        expect.objectContaining({ skill_name: 'design' })
      );
    });

    it('should recommend based on task count', async () => {
      const recommendations = await getSkillRecommendations(1, 10);
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });
});