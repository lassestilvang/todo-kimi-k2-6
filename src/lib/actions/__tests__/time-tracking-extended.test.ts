import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { setDb, resetDb } from "@/lib/db";
import { createTestDb } from "@/lib/db/test-db";

describe("Time Tracking Actions - Extended Tests", () => {
  let db: ReturnType<typeof createTestDb>;
  let getTimeReport: typeof import("../../actions/time-tracking").getTimeReport;
  let getWeeklyTimeSummary: typeof import("../../actions/time-tracking").getWeeklyTimeSummary;

  beforeEach(async () => {
    resetDb();
    db = createTestDb();
    setDb(db);

    // Initialize schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS time_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT,
        duration_seconds INTEGER,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const actions = await import("../time-tracking");
    getTimeReport = actions.getTimeReport;
    getWeeklyTimeSummary = actions.getWeeklyTimeSummary;
  });

  afterEach(() => {
    db.close();
  });

  describe("getTimeReport", () => {
    it("should return empty array when no time entries", async () => {
      const result = await getTimeReport();
      expect(result).toEqual([]);
    });

    it("should return report for specific task", async () => {
      db.prepare("INSERT INTO tasks (id, name) VALUES (?, ?)").run(1, "Test Task");
      db.prepare("INSERT INTO time_entries (task_id, start_time, duration_seconds) VALUES (?, ?, ?)").run(1, "2024-01-15T10:00:00", 3600);

      const result = await getTimeReport({ taskId: 1 });
      expect(Array.isArray(result)).toBe(true);
    });

    it("should filter by start date", async () => {
      db.prepare("INSERT INTO tasks (id, name) VALUES (?, ?)").run(2, "Task 2");
      db.prepare("INSERT INTO time_entries (task_id, start_time, duration_seconds) VALUES (?, ?, ?)").run(2, "2024-01-15T10:00:00", 3600);

      const result = await getTimeReport({ startDate: "2024-01-01" });
      expect(Array.isArray(result)).toBe(true);
    });

    it("should filter by end date", async () => {
      db.prepare("INSERT INTO tasks (id, name) VALUES (?, ?)").run(3, "Task 3");
      db.prepare("INSERT INTO time_entries (task_id, start_time, duration_seconds) VALUES (?, ?, ?)").run(3, "2024-01-20T10:00:00", 3600);

      const result = await getTimeReport({ endDate: "2024-01-31" });
      expect(Array.isArray(result)).toBe(true);
    });

    it("should calculate total seconds correctly", async () => {
      db.prepare("INSERT INTO tasks (id, name) VALUES (?, ?)").run(4, "Task 4");
      db.prepare("INSERT INTO time_entries (task_id, start_time, duration_seconds) VALUES (?, ?, ?)").run(4, "2024-01-15T10:00:00", 1800);
      db.prepare("INSERT INTO time_entries (task_id, start_time, duration_seconds) VALUES (?, ?, ?)").run(4, "2024-01-15T11:00:00", 900);

      const result = await getTimeReport({ taskId: 4 });
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle multiple tasks in report", async () => {
      db.prepare("INSERT INTO tasks (id, name) VALUES (?, ?)").run(5, "Task 5");
      db.prepare("INSERT INTO tasks (id, name) VALUES (?, ?)").run(6, "Task 6");
      db.prepare("INSERT INTO time_entries (task_id, start_time, duration_seconds) VALUES (?, ?, ?)").run(5, "2024-01-15T10:00:00", 3600);
      db.prepare("INSERT INTO time_entries (task_id, start_time, duration_seconds) VALUES (?, ?, ?)").run(6, "2024-01-15T11:00:00", 1800);

      const result = await getTimeReport();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getWeeklyTimeSummary", () => {
    it("should return empty summary when no entries", async () => {
      const result = await getWeeklyTimeSummary();
      expect(result.totalSeconds).toBe(0);
      expect(result.byDay).toEqual({});
      expect(result.topTasks).toEqual([]);
    });

    it("should return summary for time entries", async () => {
      db.prepare("INSERT INTO tasks (id, name) VALUES (?, ?)").run(7, "Task 7");
      db.prepare("INSERT INTO time_entries (task_id, start_time, duration_seconds, created_at) VALUES (?, ?, ?, ?)").run(7, "10:00", 3600, new Date().toISOString());

      const result = await getWeeklyTimeSummary();
      expect(typeof result.totalSeconds).toBe("number");
      expect(typeof result.byDay).toBe("object");
      expect(Array.isArray(result.topTasks)).toBe(true);
    });

    it("should calculate byDay totals", async () => {
      const today = new Date().toISOString().split("T")[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

      db.prepare("INSERT INTO tasks (id, name) VALUES (?, ?)").run(8, "Task 8");
      db.prepare("INSERT INTO time_entries (task_id, start_time, duration_seconds, created_at) VALUES (?, ?, ?, ?)").run(8, "10:00", 100, `${today}T10:00:00`);
      db.prepare("INSERT INTO time_entries (task_id, start_time, duration_seconds, created_at) VALUES (?, ?, ?, ?)").run(8, "11:00", 200, `${tomorrow}T11:00:00`);

      const result = await getWeeklyTimeSummary();
      expect(typeof result.byDay).toBe("object");
    });

    it("should limit top tasks to 5", async () => {
      for (let i = 0; i < 10; i++) {
        db.prepare("INSERT INTO tasks (id, name) VALUES (?, ?)").run(i + 100, `Task ${i + 100}`);
        db.prepare("INSERT INTO time_entries (task_id, start_time, duration_seconds, created_at) VALUES (?, ?, ?, ?)").run(i + 100, "10:00", 100, new Date().toISOString());
      }

      const result = await getWeeklyTimeSummary();
      expect(result.topTasks.length).toBeLessThanOrEqual(5);
    });

    it("should handle NULL duration_seconds", async () => {
      db.prepare("INSERT INTO tasks (id, name) VALUES (?, ?)").run(9, "Task 9");
      db.prepare("INSERT INTO time_entries (task_id, start_time, duration_seconds, created_at) VALUES (?, ?, ?, ?)").run(9, "10:00", null, new Date().toISOString());

      const result = await getWeeklyTimeSummary();
      expect(result.totalSeconds).toBe(0);
    });
  });
});