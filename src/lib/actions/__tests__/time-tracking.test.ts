import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { setDb, resetDb } from "@/lib/db";
import { createTestDb } from "@/lib/db/test-db";
import { getTimeEntries, getWeeklyTimeSummary } from "@/lib/actions/tasks";

describe("Time Tracking Actions", () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    resetDb();
    db = createTestDb();
    setDb(db);

    db.exec("INSERT INTO tasks (id, name) VALUES (1, 'Test Task')");
  });

  afterEach(() => {
    db.close();
  });

  describe("getTimeEntries", () => {
    it("should return empty array when no entries", async () => {
      const entries = await getTimeEntries();
      expect(entries).toEqual([]);
    });

    it("should return entries for specific task", async () => {
      db.exec("INSERT INTO time_entries (task_id, start_time, duration_seconds) VALUES (1, '2024-01-01T09:00:00Z', 3600)");
      const entries = await getTimeEntries({ taskId: 1 });
      expect(entries.length).toBe(1);
    });

    it("should filter by date range", async () => {
      db.exec("INSERT INTO time_entries (task_id, start_time, duration_seconds, created_at) VALUES (1, '2024-01-01T09:00:00Z', 3600, '2024-01-01')");
      const entries = await getTimeEntries({ startDate: "2024-01-01", endDate: "2024-01-31" });
      expect(entries.length).toBe(1);
    });
  });

  describe("getWeeklyTimeSummary", () => {
    it("should return zero values when no entries", async () => {
      const summary = await getWeeklyTimeSummary();
      expect(summary.totalSeconds).toBe(0);
      expect(summary.byDay).toEqual({});
      expect(summary.topTasks).toEqual([]);
    });
  });
});