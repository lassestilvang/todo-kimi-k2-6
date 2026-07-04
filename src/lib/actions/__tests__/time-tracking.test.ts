import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDb } from "@/lib/db/test-db";
import { setDb, resetDb, getDb } from "@/lib/db";
import {
  getTimeReport,
  getWeeklyTimeSummary,
} from "../time-tracking";
import { addTimeEntry } from "../time";

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

  describe("getTimeReport", () => {
    it("should return empty array when no entries", async () => {
      const report = await getTimeReport();
      expect(report).toEqual([]);
    });

    it("should return entries for specific task", async () => {
      await addTimeEntry({ task_id: 1, start_time: "2024-01-01T09:00:00Z", duration_seconds: 3600 });
      const report = await getTimeReport({ taskId: 1 });
      expect(report.length).toBe(1);
    });

    it("should filter by date range", async () => {
      await addTimeEntry({ task_id: 1, start_time: "2024-01-01T09:00:00Z", duration_seconds: 3600 });
      const report = await getTimeReport({ startDate: "2024-01-01", endDate: "2024-01-31" });
      expect(report.length).toBe(1);
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