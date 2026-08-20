import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the database
vi.mock('@/lib/db', () => ({
  getDb: vi.fn(),
  setDb: vi.fn(),
  resetDb: vi.fn(),
}));

// Mock the session
vi.mock('@/lib/session', () => ({
  getCurrentUser: vi.fn(),
}));

import { getDb, setDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

describe('Enhanced Productivity Actions', () => {
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn().mockReturnThis(),
      run: vi.fn().mockReturnValue({ lastInsertRowid: 1, changes: 1 }),
      all: vi.fn().mockReturnValue([]),
      get: vi.fn().mockReturnValue(null),
      exec: vi.fn(),
    };
    (getDb as any).mockReturnValue(mockDb);
    (getCurrentUser as any).mockReturnValue({
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('logCognitiveLoad', () => {
    it('should log cognitive load data', async () => {
      const { logCognitiveLoad } = await import('../enhanced-productivity');

      await logCognitiveLoad({
        date: '2024-01-15',
        task_count: 10,
        completed_count: 8,
        focus_blocks: 3,
        interruption_count: 2,
      });

      expect(mockDb.run).toHaveBeenCalled();
    });

    it('should handle optional fields', async () => {
      const { logCognitiveLoad } = await import('../enhanced-productivity');

      await logCognitiveLoad({
        date: '2024-01-15',
        task_count: 5,
        completed_count: 3,
        focus_blocks: 2,
        interruption_count: 1,
        energy_level: 4,
        distraction_score: 0.3,
      });

      expect(mockDb.run).toHaveBeenCalled();
    });
  });

  describe('getCognitiveLoadAnalysis', () => {
    it('should return default analysis when no data', async () => {
      const { getCognitiveLoadAnalysis } =
        await import('../enhanced-productivity');
      mockDb.all.mockReturnValue([]);

      const analysis = await getCognitiveLoadAnalysis(1, 7);

      expect(analysis.avgTaskCount).toBe(0);
      expect(analysis.completionRate).toBe(0);
      expect(analysis.loadTrend).toBe('stable');
    });

    it('should analyze existing data', async () => {
      const { getCognitiveLoadAnalysis } =
        await import('../enhanced-productivity');

      mockDb.all.mockReturnValue([
        {
          task_count: 8,
          completed_count: 6,
          energy_level: 4,
          distraction_score: 0.3,
        },
      ]);

      const analysis = await getCognitiveLoadAnalysis(1, 7);
      expect(analysis.avgTaskCount).toBeGreaterThan(0);
    });
  });

  describe('logEnergyBudget', () => {
    it('should log energy budget for a date', async () => {
      const { logEnergyBudget } = await import('../enhanced-productivity');

      const result = await logEnergyBudget({
        date: '2024-01-15',
        energy_spent: 40,
        energy_recovered: 20,
      });

      expect(result.id).toBeGreaterThan(0);
    });

    it('should track activities', async () => {
      const { logEnergyBudget } = await import('../enhanced-productivity');

      const result = await logEnergyBudget({
        date: '2024-01-15',
        energy_spent: 30,
        activities: [
          { task_id: 1, energy_cost: 10, timestamp: '2024-01-15T09:00:00' },
        ],
      });

      expect(result).toBeDefined();
    });
  });

  describe('getEnergyBudget', () => {
    it('should return default budget when no data', async () => {
      const { getEnergyBudget } = await import('../enhanced-productivity');

      mockDb.get.mockReturnValue(null);

      const budget = await getEnergyBudget('2024-01-15');

      expect(budget.balance).toBe(100);
      expect(budget.spent).toBe(0);
      expect(budget.dailyLimit).toBe(100);
    });

    it('should return calculated budget from data', async () => {
      const { getEnergyBudget } = await import('../enhanced-productivity');

      mockDb.get.mockReturnValue({
        current_balance: 70,
        energy_spent: 30,
        energy_recovered: 20,
        energy_budget_daily: 80,
      });

      const budget = await getEnergyBudget('2024-01-15');
      expect(budget.spent).toBe(30);
    });
  });

  describe('energy profiles', () => {
    it('should upsert an energy profile', async () => {
      const { upsertEnergyProfile, getEnergyProfile } =
        await import('../enhanced-productivity');

      mockDb.get.mockReturnValue(null); // No existing profile

      await upsertEnergyProfile({
        wake_hour: 7,
        sleep_hour: 23,
        work_start_hour: 9,
        work_end_hour: 17,
        energy_budget_daily: 80,
      });

      expect(mockDb.run).toHaveBeenCalled();
    });

    it('should return null for non-existent profile', async () => {
      const { getEnergyProfile } = await import('../enhanced-productivity');

      mockDb.get.mockReturnValue(null);

      const profile = await getEnergyProfile();
      expect(profile).toBeNull();
    });

    it('should return profile when exists', async () => {
      const { getEnergyProfile } = await import('../enhanced-productivity');

      mockDb.get.mockReturnValue({
        wake_hour: 7,
        sleep_hour: 23,
        work_start_hour: 9,
        work_end_hour: 17,
        peak_energy_times: '[]',
        energy_levels: '[]',
        energy_budget_daily: 100,
        current_balance: 80,
      });

      const profile = await getEnergyProfile();
      expect(profile).toBeDefined();
      expect(profile?.wake_hour).toBe(7);
    });
  });

  describe('createSyncConnection', () => {
    it('should create a sync connection', async () => {
      const { createSyncConnection } = await import('../enhanced-productivity');

      const result = await createSyncConnection({
        app_type: 'google-calendar',
        app_name: 'Google Calendar',
        sync_direction: 'bidirectional',
      });

      expect(result.id).toBeGreaterThan(0);
    });
  });

  describe('getExternalTasks', () => {
    it('should return empty array when no authentication', async () => {
      const { getExternalTasks } = await import('../enhanced-productivity');

      (getCurrentUser as any).mockReturnValue(null);

      const tasks = await getExternalTasks();
      expect(tasks).toEqual([]);
    });

    it('should return external tasks for authenticated user', async () => {
      const { getExternalTasks } = await import('../enhanced-productivity');

      mockDb.all.mockReturnValue([
        {
          id: 1,
          external_id: 'ext_123',
          external_app_type: 'todoist',
          title: 'Import task',
          description: 'Test description',
          due_date: '2024-01-20',
          priority: 'high',
          confidence: 0.9,
          energy_cost_estimate: 5,
          created_at: '2024-01-15T00:00:00',
        },
      ]);

      const tasks = await getExternalTasks('pending');
      expect(tasks.length).toBeGreaterThan(0);
    });
  });

  describe('createDecisionShadow', () => {
    it('should create a decision shadow', async () => {
      const { createDecisionShadow } = await import('../enhanced-productivity');

      const result = await createDecisionShadow({
        decision_type: 'priority',
        question: 'Should I prioritize task A or B?',
        chosen_option_text: 'Priority A first',
        rationale: 'A has earlier deadline',
      });

      expect(result.id).toBeGreaterThan(0);
    });

    it('should create decision options for alternatives', async () => {
      const { createDecisionShadow } = await import('../enhanced-productivity');

      const result = await createDecisionShadow({
        decision_type: 'approach',
        question: 'How to implement this feature?',
        chosen_option_text: 'Option 1',
        rationale: 'Best approach',
        alternative_options: [
          {
            option_text: 'Option 2',
            pros: ['Fast'],
            cons: ['Risky'],
            estimated_impact: 8,
            estimated_effort: 4,
          },
        ],
      });

      expect(result).toBeDefined();
    });
  });

  describe('getDecisions', () => {
    it('should return empty array when no data', async () => {
      const { getDecisions } = await import('../enhanced-productivity');

      mockDb.all.mockReturnValue([]);

      const decisions = await getDecisions(1, 50);
      expect(decisions).toEqual([]);
    });
  });

  describe('getDecisionAnalysis', () => {
    it('should return default analysis when no data', async () => {
      const { getDecisionAnalysis } = await import('../enhanced-productivity');

      mockDb.all.mockReturnValue([]);

      const analysis = await getDecisionAnalysis(1);

      expect(analysis.totalDecisions).toBe(0);
      expect(analysis.avgOutcomeRating).toBe(0);
    });
  });

  describe('logMoodContext', () => {
    it('should log mood context', async () => {
      const { logMoodContext } = await import('../enhanced-productivity');

      const result = await logMoodContext({
        date: '2024-01-15',
        mood: 4,
        energy: 5,
        stress: 2,
        focus: 4,
      });

      expect(result.id).toBeGreaterThan(0);
    });

    it('should handle conflict (upsert)', async () => {
      const { logMoodContext } = await import('../enhanced-productivity');

      // First insert
      await logMoodContext({
        date: '2024-01-15',
        mood: 4,
        energy: 5,
        stress: 2,
        focus: 4,
      });

      // Update with different values
      const result = await logMoodContext({
        date: '2024-01-15',
        mood: 5,
        energy: 5,
        stress: 1,
        focus: 5,
      });

      expect(result).toBeDefined();
    });

    it('should throw error when not authenticated', async () => {
      const { logMoodContext } = await import('../enhanced-productivity');

      (getCurrentUser as any).mockReturnValue(null);

      await expect(
        logMoodContext({
          date: '2024-01-15',
          mood: 4,
          energy: 5,
          stress: 2,
          focus: 4,
        })
      ).rejects.toThrow('Authentication required');
    });
  });

  describe('getMoodBasedTaskRecommendations', () => {
    it('should return default when no mood data', async () => {
      const { getMoodBasedTaskRecommendations } =
        await import('../enhanced-productivity');

      mockDb.get.mockReturnValue(null);

      const result = await getMoodBasedTaskRecommendations(1, '2024-01-15');

      expect(result.recommendedTaskIds).toEqual([]);
      expect(result.reasoning).toBe('No mood data for today');
    });

    it('should recommend high energy tasks when mood is good', async () => {
      const { getMoodBasedTaskRecommendations } =
        await import('../enhanced-productivity');

      mockDb.get.mockReturnValue({
        mood: 5,
        energy: 5,
        stress: 1,
        focus: 5,
      });

      mockDb.all.mockReturnValue([
        { id: 1, priority: 'critical', estimate: '1:00' },
        { id: 2, priority: 'high', estimate: '0:30' },
        { id: 3, priority: 'low', estimate: '0:15' },
      ]);

      const result = await getMoodBasedTaskRecommendations(1, '2024-01-15');

      expect(result.recommendedTaskIds.length).toBeGreaterThan(0);
      expect(result.reasoning).toContain('High energy');
    });

    it('should recommend easy tasks when mood is low', async () => {
      const { getMoodBasedTaskRecommendations } =
        await import('../enhanced-productivity');

      mockDb.get.mockReturnValue({
        mood: 2,
        energy: 2,
        stress: 4,
        focus: 2,
      });

      mockDb.all.mockReturnValue([
        { id: 1, priority: 'critical', estimate: '1:00' },
        { id: 2, priority: 'low', estimate: '0:15' },
      ]);

      const result = await getMoodBasedTaskRecommendations(1, '2024-01-15');

      expect(result.reasoning).toContain('Lower energy');
    });
  });

  describe('convertExternalTaskToTask', () => {
    it('should throw error when not authenticated', async () => {
      const { convertExternalTaskToTask } =
        await import('../enhanced-productivity');

      (getCurrentUser as any).mockReturnValue(null);

      await expect(convertExternalTaskToTask(1)).rejects.toThrow(
        'Authentication required'
      );
    });
  });
});
