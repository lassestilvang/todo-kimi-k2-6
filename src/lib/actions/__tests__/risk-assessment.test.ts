import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  vi,
} from 'vitest';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/session', async () => {
  const actual = await vi.importActual<typeof import('@/lib/session')>(
    '@/lib/session'
  );
  return {
    ...actual,
    getCurrentUser: vi.fn(async () => ({ id: 1, name: 'Tester', email: 't@example.com' })),
  };
});

import { setDb, resetDb } from '@/lib/db';
import { createTestDb } from '@/lib/db/test-db';
import { initializeSchema } from '@/lib/db/index';
import { migrations } from '@/lib/db/migrations';

beforeAll(() => {
  (process.env as Record<string, string>).NODE_ENV = 'test';
  (process.env as Record<string, string>).NEXTAUTH_SECRET = 'demo-secret';
});

describe('risk-assessment actions', () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    resetDb();
    db = createTestDb();
    setDb(db);
    initializeSchema(db);
    try {
      for (const sql of Object.values(migrations)) {
        db.exec(sql);
      }
    } catch {
      /* ignore */
    }
    try {
      db.exec(
        `INSERT INTO users (id, name, email) VALUES (1, 'Tester', 't@example.com')`
      );
    } catch {
      /* ignore */
    }
  });

  afterEach(() => {
    db.close();
  });

  describe('analyzeTaskRisk', () => {
    it('returns null for non-existent task', async () => {
      const { analyzeTaskRisk } = await import('@/lib/actions/risk-assessment');
      const result = await analyzeTaskRisk(9999);
      expect(result).toBeNull();
    });

    it('returns null when not authenticated', async () => {
      const sessionModule = await import('@/lib/session');
      (sessionModule.getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
      const { analyzeTaskRisk } = await import('@/lib/actions/risk-assessment');
      const result = await analyzeTaskRisk(1);
      expect(result).toBeNull();
    });
  });

  describe('analyzeAllTaskRisks', () => {
    it('returns array', async () => {
      const { analyzeAllTaskRisks } = await import('@/lib/actions/risk-assessment');
      const results = await analyzeAllTaskRisks();
      expect(Array.isArray(results)).toBe(true);
    });

    it('returns empty array when not authenticated', async () => {
      const sessionModule = await import('@/lib/session');
      (sessionModule.getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
      const { analyzeAllTaskRisks } = await import('@/lib/actions/risk-assessment');
      const results = await analyzeAllTaskRisks();
      expect(results).toEqual([]);
    });
  });

  describe('getRiskAlerts', () => {
    it('returns array', async () => {
      const { getRiskAlerts } = await import('@/lib/actions/risk-assessment');
      const alerts = await getRiskAlerts();
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('returns empty when not authenticated', async () => {
      const sessionModule = await import('@/lib/session');
      (sessionModule.getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
      const { getRiskAlerts } = await import('@/lib/actions/risk-assessment');
      const alerts = await getRiskAlerts();
      expect(alerts).toEqual([]);
    });

    it('accepts read filter', async () => {
      const { getRiskAlerts } = await import('@/lib/actions/risk-assessment');
      const alerts = await getRiskAlerts({ read: false });
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('accepts limit', async () => {
      const { getRiskAlerts } = await import('@/lib/actions/risk-assessment');
      const alerts = await getRiskAlerts({ limit: 5 });
      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  describe('getRiskDashboard', () => {
    it('returns dashboard object', async () => {
      const { getRiskDashboard } = await import('@/lib/actions/risk-assessment');
      const dashboard = await getRiskDashboard();
      expect(dashboard).toHaveProperty('total_risks');
      expect(dashboard).toHaveProperty('high_risks');
      expect(dashboard).toHaveProperty('medium_risks');
      expect(dashboard).toHaveProperty('low_risks');
    });

    it('returns empty dashboard when not authenticated', async () => {
      const sessionModule = await import('@/lib/session');
      (sessionModule.getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
      const { getRiskDashboard } = await import('@/lib/actions/risk-assessment');
      const dashboard = await getRiskDashboard();
      expect(dashboard.total_risks).toBe(0);
    });
  });

  describe('generateWeeklyRiskReport', () => {
    it('returns report object', async () => {
      const { generateWeeklyRiskReport } = await import('@/lib/actions/risk-assessment');
      const report = await generateWeeklyRiskReport();
      expect(report).toHaveProperty('period_start');
      expect(report).toHaveProperty('period_end');
    });

    it('returns empty report when not authenticated', async () => {
      const sessionModule = await import('@/lib/session');
      (sessionModule.getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
      const { generateWeeklyRiskReport } = await import('@/lib/actions/risk-assessment');
      const report = await generateWeeklyRiskReport();
      expect(report.total_assessments).toBe(0);
    });
  });
});
