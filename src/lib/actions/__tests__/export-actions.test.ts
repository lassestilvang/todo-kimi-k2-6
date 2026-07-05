import { describe, it, expect, beforeEach } from "vitest";
import { setDb, resetDb } from "@/lib/db";
import { createTestDb } from "@/lib/db/test-db";

describe("Export Actions", () => {
  beforeEach(() => {
    resetDb();
    const testDb = createTestDb();
    setDb(testDb);
  });

  describe("exportData", () => {
    it("should export empty state with just inbox", async () => {
      const { exportData } = await import("../export");
      const data = await exportData();
      expect(data.lists.length).toBeGreaterThanOrEqual(1);
      expect(data.labels.length).toBe(0);
      expect(data.tasks.length).toBe(0);
      expect(data.templates.length).toBe(0);
      expect(data.time_entries.length).toBe(0);
    });

    it("should export data successfully with tasks", async () => {
      const { exportData } = await import("../export");
      const data = await exportData();
      expect(data).toHaveProperty("lists");
      expect(data).toHaveProperty("labels");
      expect(data).toHaveProperty("tasks");
      expect(data).toHaveProperty("templates");
      expect(data).toHaveProperty("time_entries");
    });
  });

  describe("exportCsv", () => {
    it("should export empty tasks as CSV", async () => {
      const { exportCsv } = await import("../export");
      const csv = await exportCsv();
      expect(csv).toContain("id,name,description");
    });

    it("should export CSV with header row", async () => {
      const { exportCsv } = await import("../export");
      const csv = await exportCsv();
      const lines = csv.split("\n");
      expect(lines[0]).toContain("id,name");
    });
  });

  describe("exportJson", () => {
    it("should export data as JSON blob", async () => {
      const { exportJson } = await import("../export");
      const blob = await exportJson();
      expect(blob.type).toContain("application/json");
    });

    it("should return valid JSON from blob", async () => {
      const { exportJson } = await import("../export");
      const blob = await exportJson();
      const text = await blob.text();
      expect(() => JSON.parse(text)).not.toThrow();
    });
  });

  describe("exportIcal", () => {
    it("should export as iCal blob", async () => {
      const { exportIcal } = await import("../export");
      const blob = await exportIcal();
      expect(blob.type).toBe("text/calendar");
    });

    it("should include VCALENDAR wrapper", async () => {
      const { exportIcal } = await import("../export");
      const blob = await exportIcal();
      const text = await blob.text();
      expect(text).toContain("BEGIN:VCALENDAR");
      expect(text).toContain("END:VCALENDAR");
    });
  });

  describe("exportPdf", () => {
    it("should export data as text blob", async () => {
      const { exportPdf } = await import("../export");
      const blob = await exportPdf();
      expect(blob.type).toBe("text/plain");
    });

    it("should include header in PDF export", async () => {
      const { exportPdf } = await import("../export");
      const blob = await exportPdf();
      const text = await blob.text();
      expect(text).toContain("TaskFlow Export");
    });
  });

  describe("importData validation", () => {
    it("should validate that import data is an object", async () => {
      const { importData } = await import("../export");
      expect(typeof importData).toBe("function");
    });

    it("should import empty data successfully", async () => {
      const { importData } = await import("../export");
      const result = await importData({
        lists: [],
        labels: [],
        tasks: [],
        templates: [],
        time_entries: [],
      });
      expect(result.lists).toBe(0);
      expect(result.labels).toBe(0);
      expect(result.tasks).toBe(0);
      expect(result.templates).toBe(0);
      expect(result.time_entries).toBe(0);
    });

    it("should import data with arrays", async () => {
      const { importData } = await import("../export");
      const data = {
        lists: [{ id: 1, name: "Test List", emoji: "📦", color: "#000", is_inbox: 0, created_at: "" }],
        labels: [{ id: 1, name: "Test Label", icon: "🏷️", color: "#000", created_at: "" }],
        tasks: [{
          id: 1,
          name: "Test Task",
          description: null,
          list_id: 1,
          date: null,
          deadline: null,
          estimate: null,
          actual_time: null,
          priority: "none",
          recurring: "none",
          recurring_config: null,
          completed: 0,
          completed_at: null,
          created_at: "",
          updated_at: "",
          sort_order: 0,
          labels: [],
          subtasks: [],
          reminders: [],
          logs: [],
          comments: [],
          attachments: [],
          blockers: [],
          blocked_by: [],
          time_entries: [],
        }],
        templates: [{ id: 1, name: "Template", description: null, list_id: null, priority: "none", label_ids: [], subtasks: [], created_at: "" }],
        time_entries: [{ id: 1, task_id: 1, start_time: "", end_time: null, duration_seconds: null, description: null, created_at: "" }],
      };

      const result = await importData(data);
      expect(result.lists).toBe(1);
      expect(result.labels).toBe(1);
    });
  });

  describe("taskToCsvRow function", () => {
    it("should format CSV values correctly", () => {
      const escape = (val: string | number | null | undefined) => {
        if (val === null || val === undefined) return "";
        const str = String(val);
        return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      };

      expect(escape("Task, with comma")).toBe('"Task, with comma"');
      expect(escape("Task with quotes")).toBe("Task with quotes");
      expect(escape('Task "quoted"')).toBe('"Task ""quoted"""');
      expect(escape(null)).toBe("");
    });
  });
});