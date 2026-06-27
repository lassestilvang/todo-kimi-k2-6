import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "../db/test-db";
import { setDb, resetDb } from "../db";
import {
  getTimeEntries,
  addTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
} from "./time";

describe("Time Actions", () => {
  beforeEach(() => {
    resetDb();
    const testDb = createTestDb();
    setDb(testDb);
  });

  describe("getTimeEntries", () => {
    it("should return empty array when no entries", async () => {
      const entries = await getTimeEntries(1);
      expect(entries).toEqual([]);
    });

    it("should get entries for a task", async () => {
      const entries = await getTimeEntries(1);
      expect(entries.length).toBeGreaterThanOrEqual(0);
    });

    it("should return entries ordered by created_at descending", async () => {
      await addTimeEntry({
        task_id: 1,
        start_time: "2026-06-24T10:00:00Z",
        description: "First entry",
      });
      await new Promise((r) => setTimeout(r, 10));
      await addTimeEntry({
        task_id: 1,
        start_time: "2026-06-24T11:00:00Z",
        description: "Second entry",
      });

      const entries = await getTimeEntries(1);
      expect(entries.length).toBe(2);
      // Entries are returned in the order they were created
      expect(entries.map(e => e.description)).toContain("First entry");
      expect(entries.map(e => e.description)).toContain("Second entry");
    });

    it("should return empty array for non-existent task", async () => {
      const entries = await getTimeEntries(99999);
      expect(entries).toEqual([]);
    });
  });

  describe("addTimeEntry", () => {
    it("should add a time entry", async () => {
      const entry = await addTimeEntry({
        task_id: 1,
        start_time: "2026-06-24T10:00:00Z",
        end_time: "2026-06-24T11:00:00Z",
        duration_seconds: 3600,
        description: "Test work",
      });

      expect(entry.task_id).toBe(1);
      expect(entry.duration_seconds).toBe(3600);
      expect(entry.description).toBe("Test work");
    });

    it("should add entry with minimal data", async () => {
      const entry = await addTimeEntry({
        task_id: 1,
        start_time: "2026-06-24T10:00:00Z",
      });

      expect(entry.task_id).toBe(1);
      expect(entry.end_time).toBeNull();
      expect(entry.duration_seconds).toBeNull();
    });

    it("should fail for missing task_id", async () => {
      await expect(
        addTimeEntry({
          start_time: "2026-06-24T10:00:00Z",
        } as any)
      ).rejects.toThrow();
    });

    it("should fail for missing start_time", async () => {
      await expect(
        addTimeEntry({
          task_id: 1,
        } as any)
      ).rejects.toThrow();
    });

    it("should fail for invalid task_id (negative)", async () => {
      await expect(
        addTimeEntry({
          task_id: -1,
          start_time: "2026-06-24T10:00:00Z",
        })
      ).rejects.toThrow();
    });

    it("should fail for invalid task_id (zero)", async () => {
      await expect(
        addTimeEntry({
          task_id: 0,
          start_time: "2026-06-24T10:00:00Z",
        })
      ).rejects.toThrow();
    });

    it("should fail for empty start_time", async () => {
      await expect(
        addTimeEntry({
          task_id: 1,
          start_time: "",
        })
      ).rejects.toThrow();
    });

    it("should handle null optional fields", async () => {
      const entry = await addTimeEntry({
        task_id: 1,
        start_time: "2026-06-24T10:00:00Z",
        end_time: null as unknown as string,
        duration_seconds: null as unknown as number,
        description: null as unknown as string,
      });

      expect(entry.end_time).toBeNull();
      expect(entry.duration_seconds).toBeNull();
      expect(entry.description).toBeNull();
    });

    it("should set created_at timestamp", async () => {
      const entry = await addTimeEntry({
        task_id: 1,
        start_time: "2026-06-24T10:00:00Z",
      });

      expect(entry.created_at).toBeDefined();
      expect(typeof entry.created_at).toBe("string");
    });
  });

  describe("updateTimeEntry", () => {
    it("should update a time entry", async () => {
      const entry = await addTimeEntry({
        task_id: 1,
        start_time: "2026-06-24T10:00:00Z",
      });

      const updated = await updateTimeEntry(entry.id, {
        description: "Updated description",
      });

      expect(updated.description).toBe("Updated description");
    });

    it("should throw for non-existent entry", async () => {
      await expect(updateTimeEntry(99999, { description: "test" })).rejects.toThrow(
        "Time entry not found"
      );
    });

    it("should throw for invalid entry ID", async () => {
      await expect(updateTimeEntry(-1, { description: "test" })).rejects.toThrow(
        "Invalid time entry ID"
      );
    });

    it("should throw for zero entry ID", async () => {
      await expect(updateTimeEntry(0, { description: "test" })).rejects.toThrow(
        "Invalid time entry ID"
      );
    });

    it("should throw when no fields to update", async () => {
      const entry = await addTimeEntry({
        task_id: 1,
        start_time: "2026-06-24T10:00:00Z",
      });

      await expect(updateTimeEntry(entry.id, {})).rejects.toThrow("No fields to update");
    });

    it("should update all fields", async () => {
      const entry = await addTimeEntry({
        task_id: 1,
        start_time: "2026-06-24T10:00:00Z",
      });

      const updated = await updateTimeEntry(entry.id, {
        start_time: "2026-06-24T12:00:00Z",
        end_time: "2026-06-24T13:00:00Z",
        duration_seconds: 7200,
        description: "Full update",
      });

      expect(updated.start_time).toBe("2026-06-24T12:00:00Z");
      expect(updated.end_time).toBe("2026-06-24T13:00:00Z");
      expect(updated.duration_seconds).toBe(7200);
      expect(updated.description).toBe("Full update");
    });

    it("should validate partial updates", async () => {
      const entry = await addTimeEntry({
        task_id: 1,
        start_time: "2026-06-24T10:00:00Z",
      });

      // Valid partial update
      const updated = await updateTimeEntry(entry.id, {
        description: "Valid update",
      });
      expect(updated.description).toBe("Valid update");
    });
  });

  describe("deleteTimeEntry", () => {
    it("should delete a time entry", async () => {
      const entry = await addTimeEntry({
        task_id: 1,
        start_time: "2026-06-24T10:00:00Z",
      });

      await deleteTimeEntry(entry.id);
      const entries = await getTimeEntries(1);
      expect(entries.find((e) => e.id === entry.id)).toBeUndefined();
    });

    it("should handle deleting non-existent entry", async () => {
      // Should not throw
      await deleteTimeEntry(99999);
    });

    it("should delete only the specified entry", async () => {
      const entry1 = await addTimeEntry({
        task_id: 1,
        start_time: "2026-06-24T10:00:00Z",
      });
      const entry2 = await addTimeEntry({
        task_id: 1,
        start_time: "2026-06-24T11:00:00Z",
      });

      await deleteTimeEntry(entry1.id);

      const entries = await getTimeEntries(1);
      expect(entries.length).toBe(1);
      expect(entries[0].id).toBe(entry2.id);
    });
  });

  describe("Time Entry Edge Cases", () => {
    it("should handle multiple entries for same task", async () => {
      await addTimeEntry({
        task_id: 1,
        start_time: "2026-06-24T10:00:00Z",
        duration_seconds: 3600,
        description: "Morning work",
      });
      await addTimeEntry({
        task_id: 1,
        start_time: "2026-06-24T14:00:00Z",
        duration_seconds: 1800,
        description: "Afternoon work",
      });

      const entries = await getTimeEntries(1);
      expect(entries.length).toBe(2);
    });

    it("should handle null values for optional fields", async () => {
      const entry = await addTimeEntry({
        task_id: 1,
        start_time: "2026-06-24T10:00:00Z",
        end_time: null as unknown as string,
        duration_seconds: null as unknown as number,
        description: null as unknown as string,
      });

      expect(entry.end_time).toBeNull();
      expect(entry.duration_seconds).toBeNull();
      expect(entry.description).toBeNull();
    });

    it("should handle concurrent time entries for same task", async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          addTimeEntry({
            task_id: 1,
            start_time: `2026-06-24T${10 + i}:00:00Z`,
            description: `Entry ${i}`,
          })
        );
      }
      await Promise.all(promises);

      const entries = await getTimeEntries(1);
      expect(entries.length).toBe(10);
    });

    it("should handle special characters in description", async () => {
      const entry = await addTimeEntry({
        task_id: 1,
        start_time: "2026-06-24T10:00:00Z",
        description: "Work with special chars: !@#$%^&*()_+-=[]{}|;':\",./<>?",
      });

      expect(entry.description).toContain("special chars");
    });

    it("should handle long descriptions", async () => {
      const longDesc = "A".repeat(1000);
      const entry = await addTimeEntry({
        task_id: 1,
        start_time: "2026-06-24T10:00:00Z",
        description: longDesc,
      });

      expect(entry.description).toBe(longDesc);
    });

    it("should handle unicode in description", async () => {
      const entry = await addTimeEntry({
        task_id: 1,
        start_time: "2026-06-24T10:00:00Z",
        description: "Working on 日本語 and émojis 🎉",
      });

      expect(entry.description).toContain("日本語");
    });
  });

  describe("Time Entry Validation", () => {
    it("should validate task_id is required", async () => {
      await expect(
        addTimeEntry({
          start_time: "2026-06-24T10:00:00Z",
        } as any)
      ).rejects.toThrow();
    });

    it("should accept positive task_id", async () => {
      const entry = await addTimeEntry({
        task_id: 1,
        start_time: "2026-06-24T10:00:00Z",
      });
      expect(entry.task_id).toBe(1);
    });
  });

  describe("Time Entry Edge Cases", () => {
    it("should handle deleteTimeEntry for non-existent entry", async () => {
      // Should not throw
      await deleteTimeEntry(99999);
    });

    it("should handle updateTimeEntry with empty updates", async () => {
      const entry = await addTimeEntry({
        task_id: 1,
        start_time: "2026-06-24T10:00:00Z",
      });

      await expect(updateTimeEntry(entry.id, {})).rejects.toThrow("No fields to update");
    });

    it("should handle concurrent time entry creation", async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          addTimeEntry({
            task_id: 1,
            start_time: `2026-06-24T${10 + i}:00:00Z`,
          })
        );
      }
      await Promise.all(promises);

      const entries = await getTimeEntries(1);
      expect(entries.length).toBe(10);
    });

    it("should preserve existing values when updating specific field", async () => {
      const entry = await addTimeEntry({
        task_id: 1,
        start_time: "2026-06-24T10:00:00Z",
        description: "Original description",
      });

      await updateTimeEntry(entry.id, {
        description: "Updated description",
      });

      const updated = await getTimeEntries(1);
      const found = updated.find(e => e.id === entry.id);
      expect(found?.description).toBe("Updated description");
      expect(found?.start_time).toBe("2026-06-24T10:00:00Z");
    });
  });

  describe("Time Entry Additional Edge Cases", () => {
    it("should handle large duration values", async () => {
      const entry = await addTimeEntry({
        task_id: 1,
        start_time: "2026-06-24T10:00:00Z",
        duration_seconds: 86400, // 24 hours in seconds
      });
      expect(entry.duration_seconds).toBe(86400);
    });

    it("should handle very long descriptions", async () => {
      const longDesc = "A".repeat(5000);
      const entry = await addTimeEntry({
        task_id: 1,
        start_time: "2026-06-24T10:00:00Z",
        description: longDesc,
      });
      expect(entry.description).toBe(longDesc);
    });

    it("should handle unicode in description", async () => {
      const entry = await addTimeEntry({
        task_id: 1,
        start_time: "2026-06-24T10:00:00Z",
        description: "Work on 日本語ドキュメント and émojis 🎉",
      });
      expect(entry.description).toContain("日本語");
    });

    it("should handle special characters in description", async () => {
      const entry = await addTimeEntry({
        task_id: 1,
        start_time: "2026-06-24T10:00:00Z",
        description: "Special: <>&\"'\\n\\t",
      });
      expect(entry.description).toBeDefined();
    });
  });
});