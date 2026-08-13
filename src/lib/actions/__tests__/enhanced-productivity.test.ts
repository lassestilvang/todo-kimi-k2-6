import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  logCognitiveLoad,
  getCognitiveLoadAnalysis,
  getEnergyBudget,
  getEnergyProfile,
  logEnergyBudget,
  upsertEnergyProfile,
  getExternalTasks,
  convertExternalTaskToTask,
  createDecisionShadow,
  getDecisionAnalysis,
  logMoodContext,
  getMoodBasedTaskRecommendations,
} from "../enhanced-productivity";

// Mock the database
vi.mock("@/lib/db/driver", () => ({
  createDatabase: () => ({
    prepare: vi.fn().mockReturnThis(),
    get: vi.fn(),
    all: vi.fn(),
    run: vi.fn(),
    exec: vi.fn(),
  }),
}));

// Mock session
vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));

import { getDb, setDb, resetDb } from "@/lib/db";
import { createTestDb } from "@/lib/db/test-db";
import { getCurrentUser } from "@/lib/session";

describe("Enhanced Productivity Actions", () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    db = createTestDb();
    setDb(db);
    vi.clearAllMocks();

    // Set up test user
    (getCurrentUser as any).mockReturnValue({ id: 1 });

    // Create all required tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT, name TEXT, created_at TEXT)
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS cognitive_load_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        date TEXT,
        task_count INTEGER,
        completed_count INTEGER,
        avg_time_to_complete REAL,
        energy_level INTEGER,
        distraction_score REAL,
        focus_blocks INTEGER,
        interruption_count INTEGER,
        created_at TEXT,
        updated_at TEXT
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS energy_budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        date TEXT,
        balance REAL,
        daily_limit REAL,
        created_at TEXT
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS energy_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        wake_hour INTEGER,
        sleep_hour INTEGER,
        peak_energy_times TEXT,
        created_at TEXT,
        updated_at TEXT
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS decision_shadows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        parent_task_id INTEGER,
        decision_type TEXT,
        question TEXT,
        chosen_option_id INTEGER,
        chosen_option_text TEXT,
        rationale TEXT,
        opportunity_cost TEXT,
        outcome TEXT,
        outcome_rating REAL,
        alternative_options TEXT,
        time_spent_minutes INTEGER,
        context_tags TEXT,
        created_at TEXT,
        updated_at TEXT
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS external_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        external_id TEXT,
        external_app_type TEXT,
        title TEXT,
        description TEXT,
        due_date TEXT,
        status TEXT,
        priority TEXT,
        confidence REAL,
        energy_cost_estimate REAL,
        created_at TEXT
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS mood_contexts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        date TEXT,
        mood INTEGER,
        energy INTEGER,
        stress INTEGER,
        focus INTEGER,
        notes TEXT,
        created_at TEXT
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT,
        description TEXT,
        date TEXT,
        deadline TEXT,
        priority TEXT,
        recurring TEXT DEFAULT 'none',
        completed INTEGER DEFAULT 0,
        created_at TEXT,
        updated_at TEXT,
        sort_order INTEGER
      )
    `);
    db.exec(`
      INSERT INTO users (id, email, name, created_at) VALUES (1, 'test@example.com', 'Test User', '2024-01-01T00:00:00.000Z')
    `);
  });

  afterEach(() => {
    db.close();
    resetDb();
  });

  describe("Cognitive Load", () => {
    it("should log cognitive load data", async () => {
      const result = await logCognitiveLoad({
        date: "2024-01-15",
        task_count: 5,
        completed_count: 3,
        focus_blocks: 2,
        interruption_count: 1,
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it("should return cognitive load analysis", async () => {
      const analysis = await getCognitiveLoadAnalysis(1, 7);

      expect(analysis).toHaveProperty("avgTaskCount");
      expect(analysis).toHaveProperty("completionRate");
    });
  });

  describe("Energy Budget", () => {
    it("should get user energy budget", async () => {
      const budget = await getEnergyBudget("2024-01-15");

      expect(budget).toHaveProperty("balance");
      expect(budget).toHaveProperty("dailyLimit");
    });

    it("should log energy usage", async () => {
      const result = await logEnergyBudget({
        date: "2024-01-15",
        energy_spent: 5,
        activities: [],
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it("should update user energy profile", async () => {
      // upsertEnergyProfile returns void, just verify it doesn't throw
      await expect(upsertEnergyProfile({
        wake_hour: 7,
        sleep_hour: 23,
        peak_energy_times: [{ start: "09:00", end: "11:00" }],
      })).resolves.toBeUndefined();
    });
  });

  describe("Decision Shadow", () => {
    it("should create a decision entry", async () => {
      const decision = await createDecisionShadow({
        decision_type: "approach",
        question: "Test decision",
        chosen_option_text: "Option A",
        rationale: "Because reasons",
      });

      expect(decision).toHaveProperty("id");
    });

    it("should get decision analysis", async () => {
      const analysis = await getDecisionAnalysis(1, 20);

      expect(analysis).toHaveProperty("totalDecisions");
    });
  });

  describe("External Tasks", () => {
    it("should get external tasks", async () => {
      const tasks = await getExternalTasks("pending");

      expect(Array.isArray(tasks)).toBe(true);
    });

    it("should convert external task to local task", async () => {
      // Create test external task with all required columns
      const database = getDb();
      database.prepare(`
        INSERT INTO external_tasks
        (user_id, external_id, external_app_type, title, description, due_date, status, priority, confidence, energy_cost_estimate, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        1, 'ext-123', 'trello', 'Test External Task', 'Test description', null, 'pending', 'medium', 0.8, 5, '2024-01-15T00:00:00.000Z'
      );

      // Get the actual ID that was generated
      const externalTask = database.prepare("SELECT id FROM external_tasks WHERE user_id = ? AND external_id = ?").get(1, 'ext-123') as { id: number };

      const result = await convertExternalTaskToTask(externalTask.id);
      expect(result).toHaveProperty("taskId");
      expect(result.taskId).toBeGreaterThan(0);
    });
  });

  describe("Mood Tracking", () => {
    it("should log mood context", async () => {
      const result = await logMoodContext({
        date: "2024-01-15",
        mood: 4,
        energy: 3,
        stress: 2,
        focus: 5,
        notes: "Feeling productive today",
      });

      expect(result).toHaveProperty("id");
    });

    it("should throw authentication error when user is not authenticated (line 754)", async () => {
      // This tests line 754: throw new Error("Authentication required")
      (getCurrentUser as any).mockReturnValue(null);

      await expect(logMoodContext({
        date: "2024-01-15",
        mood: 4,
        energy: 3,
        stress: 2,
        focus: 5,
      })).rejects.toThrow("Authentication required");
    });

    it("should get mood-based recommendations", async () => {
      const recommendations = await getMoodBasedTaskRecommendations(1, "2024-01-15");

      expect(recommendations).toHaveProperty("recommendedTaskIds");
      expect(recommendations).toHaveProperty("reasoning");
    });

    it("should return no recommendations when user is not authenticated", async () => {
      (getCurrentUser as any).mockImplementation(async () => null);
      const recommendations = await getMoodBasedTaskRecommendations(999, "2024-01-15");

      expect(recommendations.recommendedTaskIds).toEqual([]);
      expect(recommendations.reasoning).toBe("No mood data available");
      expect(recommendations.energyAdjustment).toBe(0);
    });

    it("should recommend tasks based on high mood and energy", async () => {
      // Insert mood data for today
      db.exec(`
        INSERT INTO mood_contexts (user_id, date, mood, energy, stress, focus)
        VALUES (1, '2024-01-15', 4, 4, 2, 3)
      `);

      // Insert task
      db.exec(`
        INSERT INTO tasks (user_id, name, priority, date, deadline, completed, created_at, sort_order)
        VALUES (1, 'Critical Task', 'critical', '2024-01-15', null, 0, datetime('now'), 0)
      `);

      const recommendations = await getMoodBasedTaskRecommendations(1, "2024-01-15");

      expect(recommendations.recommendedTaskIds.length).toBeGreaterThan(0);
      expect(recommendations.reasoning).toContain("High energy");
    });

    it("should recommend easy tasks for low mood", async () => {
      db.exec(`
        INSERT INTO mood_contexts (user_id, date, mood, energy, stress, focus)
        VALUES (1, '2024-01-15', 1, 2, 3, 2)
      `);

      db.exec(`
        INSERT INTO tasks (user_id, name, priority, date, deadline, completed, created_at, sort_order)
        VALUES (1, 'Easy Task', 'low', '2024-01-15', null, 0, datetime('now'), 0)
      `);

      const recommendations = await getMoodBasedTaskRecommendations(1, "2024-01-15");

      expect(recommendations.reasoning).toContain("Lower energy");
    });

    it("should recommend medium priority tasks for medium mood and energy", async () => {
      // This tests line 838-843: the else branch for medium energy/mood
      db.exec(`
        INSERT INTO mood_contexts (user_id, date, mood, energy, stress, focus)
        VALUES (1, '2024-01-15', 3, 3, 2, 3)
      `);

      db.exec(`
        INSERT INTO tasks (user_id, name, priority, date, deadline, completed, created_at, sort_order)
        VALUES (1, 'Medium Task', 'medium', '2024-01-15', null, 0, datetime('now'), 0)
      `);

      const recommendations = await getMoodBasedTaskRecommendations(1, "2024-01-15");

      expect(recommendations.reasoning).toContain("Moderate energy");
      expect(recommendations.recommendedTaskIds.length).toBeGreaterThan(0);
    });

    it("should recommend medium priority tasks for low mood high energy (medium energy branch)", async () => {
      // Tests the else branch: mood=2 (low) but energy=4 (high) => falls into elif or else
      db.exec(`
        INSERT INTO mood_contexts (user_id, date, mood, energy, stress, focus)
        VALUES (1, '2024-01-15', 2, 4, 3, 3)
      `);

      db.exec(`
        INSERT INTO tasks (user_id, name, priority, date, deadline, completed, created_at, sort_order)
        VALUES (1, 'Medium Task', 'medium', '2024-01-15', null, 0, datetime('now'), 0)
      `);

      const recommendations = await getMoodBasedTaskRecommendations(1, "2024-01-15");

      // mood=2 (low) triggers the elif branch for low energy
      expect(recommendations.reasoning).toContain("Lower energy");
    });

    it("should detect high stress and append warning to reasoning (line 847)", async () => {
      // This tests line 847: stress >= 4 triggers high stress warning
      db.exec(`
        INSERT INTO mood_contexts (user_id, date, mood, energy, stress, focus)
        VALUES (1, '2024-01-15', 5, 5, 4, 5)
      `);

      db.exec(`
        INSERT INTO tasks (user_id, name, priority, date, deadline, completed, created_at, sort_order)
        VALUES (1, 'High Stress Task', 'high', '2024-01-15', null, 0, datetime('now'), 0)
      `);

      const recommendations = await getMoodBasedTaskRecommendations(1, "2024-01-15");

      expect(recommendations.reasoning).toContain("High stress detected - consider taking a break before starting");
    });

    it("should append high stress warning for medium energy when stress >= 4", async () => {
      // High stress with medium energy/mood
      db.exec(`
        INSERT INTO mood_contexts (user_id, date, mood, energy, stress, focus)
        VALUES (1, '2024-01-15', 3, 3, 4, 3)
      `);

      db.exec(`
        INSERT INTO tasks (user_id, name, priority, date, deadline, completed, created_at, sort_order)
        VALUES (1, 'Medium Task', 'medium', '2024-01-15', null, 0, datetime('now'), 0)
      `);

      const recommendations = await getMoodBasedTaskRecommendations(1, "2024-01-15");

      expect(recommendations.reasoning).toContain("Moderate energy");
      expect(recommendations.reasoning).toContain("High stress detected");
    });
  });

  describe("estimateEnergyCost", () => {
    it("should calculate energy cost for critical priority task", async () => {
      const { estimateEnergyCost } = await import("../enhanced-productivity");

      const cost = await estimateEnergyCost({
        id: 1,
        user_id: 1,
        name: "Critical Task",
        priority: "critical",
        completed: 0,
      } as any);

      expect(cost).toBe(15); // Base cost for critical
    });

    it("should add cost for task with estimate", async () => {
      const { estimateEnergyCost } = await import("../enhanced-productivity");

      const cost = await estimateEnergyCost({
        id: 1,
        user_id: 1,
        name: "Task with estimate",
        priority: "medium",
        estimate: "2:30", // 2.5 hours
        completed: 0,
      } as any);

      expect(cost).toBeGreaterThan(5); // base + estimate cost
    });

    it("should cap energy cost at 30", async () => {
      const { estimateEnergyCost } = await import("../enhanced-productivity");

      const cost = await estimateEnergyCost({
        id: 1,
        user_id: 1,
        name: "Very long task",
        priority: "critical",
        estimate: "20:00", // 20 hours
        completed: 0,
      } as any);

      expect(cost).toBeLessThanOrEqual(30);
    });

    it("should add cost for task with blockers", async () => {
      const { estimateEnergyCost } = await import("../enhanced-productivity");

      const cost = await estimateEnergyCost({
        id: 1,
        user_id: 1,
        name: "Task with blockers",
        priority: "high",
        blockers: [{ depends_on_task_id: 1, task_id: 1 }],
        completed: 0,
      } as any);

      expect(cost).toBeGreaterThan(10); // high=10 + 5 for blockers
    });

    it("should add cost for task with subtasks", async () => {
      const { estimateEnergyCost } = await import("../enhanced-productivity");

      const cost = await estimateEnergyCost({
        id: 1,
        user_id: 1,
        name: "Task with subtasks",
        priority: "medium",
        subtasks: [{ id: 1 }, { id: 2 }, { id: 3 }],
        completed: 0,
      } as any);

      expect(cost).toBeGreaterThanOrEqual(11); // medium=5 + 3*2=6
    });

    it("should handle task with no priority", async () => {
      const { estimateEnergyCost } = await import("../enhanced-productivity");

      const cost = await estimateEnergyCost({
        id: 1,
        user_id: 1,
        name: "Task",
        priority: "unknown" as any,
        completed: 0,
      } as any);

      expect(cost).toBe(5); // default weight
    });
  });
});