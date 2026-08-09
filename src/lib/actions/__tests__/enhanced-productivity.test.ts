import { describe, it, expect, beforeEach, vi } from "vitest";
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

import { getDb, setDb, resetDb } from "@/lib/db";
import { createTestDb } from "@/lib/db/test-db";

describe("Enhanced Productivity Actions", () => {
  beforeEach(() => {
    const testDb = createTestDb();
    setDb(testDb);

    // Create test user
    const db = getDb();
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT, name TEXT, created_at TEXT)
    `);
    db.exec(`
      INSERT INTO users (id, email, name, created_at) VALUES (1, 'test@example.com', 'Test User', '2024-01-01T00:00:00.000Z')
    `);
  });

  afterEach(() => {
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
      const result = await upsertEnergyProfile({
        wake_hour: 7,
        sleep_hour: 23,
        peak_energy_times: [{ start: "09:00", end: "11:00" }],
      });

      expect(result).toBeDefined();
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
      // Create test external task
      const db = getDb();
      db.exec(`
        INSERT INTO external_tasks (user_id, external_id, external_app_type, title, status)
        VALUES (1, 'ext-123', 'trello', 'Test External Task', 'pending')
      `);

      const result = await convertExternalTaskToTask(1);
      expect(result).toHaveProperty("taskId");
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

    it("should get mood-based recommendations", async () => {
      const recommendations = await getMoodBasedTaskRecommendations(1, "2024-01-15");

      expect(recommendations).toHaveProperty("recommendedTaskIds");
      expect(recommendations).toHaveProperty("reasoning");
    });
  });
});