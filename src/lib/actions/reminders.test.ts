 
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDb } from "../db/test-db";
import { setDb, resetDb, getDb } from "../db";
import {
  getReminders,
  createReminder,
  updateReminder,
  deleteReminder,
  deleteRemindersForTask,
  snoozeReminder,
} from "./reminders";

describe("Reminder Actions", () => {
  beforeEach(() => {
    const testDb = createTestDb();
    setDb(testDb);
  });

  afterEach(() => {
    resetDb();
  });

  describe("getReminders", () => {
    it("should return empty array when no reminders", async () => {
      const reminders = await getReminders(1);
      expect(reminders).toEqual([]);
    });

    it("should return reminders for a task", async () => {
      // Create a task first
      const db = getDb();
      db.prepare("INSERT INTO tasks (id, name) VALUES (1, 'Test Task')").run();

      await createReminder({ task_id: 1, remind_at: new Date().toISOString() });
      await createReminder({ task_id: 1, remind_at: new Date(Date.now() + 3600000).toISOString() });

      const reminders = await getReminders(1);
      expect(reminders.length).toBe(2);
    });
  });

  describe("createReminder", () => {
    it("should create a reminder for an existing task", async () => {
      const db = getDb();
      db.prepare("INSERT INTO tasks (id, name) VALUES (1, 'Test Task')").run();

      const reminder = await createReminder({
        task_id: 1,
        remind_at: "2024-12-31T10:00:00.000Z",
      });

      expect(reminder.task_id).toBe(1);
      expect(reminder.remind_at).toBe("2024-12-31T10:00:00.000Z");
      expect(reminder.id).toBeDefined();
    });

    it("should throw error for non-existent task", async () => {
      await expect(createReminder({
        task_id: 999,
        remind_at: new Date().toISOString(),
      })).rejects.toThrow("Task not found");
    });
  });

  describe("updateReminder", () => {
    it("should update reminder time", async () => {
      const db = getDb();
      db.prepare("INSERT INTO tasks (id, name) VALUES (1, 'Test Task')").run();

      const reminder = await createReminder({
        task_id: 1,
        remind_at: new Date().toISOString(),
      });

      const updated = await updateReminder(reminder.id, {
        remind_at: "2024-12-31T12:00:00.000Z",
      });

      expect(updated.remind_at).toBe("2024-12-31T12:00:00.000Z");
    });

    it("should throw error for non-existent reminder", async () => {
      await expect(updateReminder(999, { remind_at: new Date().toISOString() }))
        .rejects.toThrow("Reminder not found");
    });
  });

  describe("deleteReminder", () => {
    it("should delete a reminder", async () => {
      const db = getDb();
      db.prepare("INSERT INTO tasks (id, name) VALUES (1, 'Test Task')").run();

      const reminder = await createReminder({
        task_id: 1,
        remind_at: new Date().toISOString(),
      });

      await deleteReminder(reminder.id);

      const reminders = await getReminders(1);
      expect(reminders.length).toBe(0);
    });
  });

  describe("deleteRemindersForTask", () => {
    it("should delete all reminders for a task", async () => {
      const db = getDb();
      db.prepare("INSERT INTO tasks (id, name) VALUES (1, 'Test Task')").run();

      await createReminder({ task_id: 1, remind_at: new Date().toISOString() });
      await createReminder({ task_id: 1, remind_at: new Date(Date.now() + 3600000).toISOString() });

      await deleteRemindersForTask(1);

      const reminders = await getReminders(1);
      expect(reminders.length).toBe(0);
    });
  });

  describe("snoozeReminder", () => {
    it("should snooze reminder by specified minutes", async () => {
      const db = getDb();
      db.prepare("INSERT INTO tasks (id, name) VALUES (1, 'Test Task')").run();

      const originalTime = new Date();
      const reminder = await createReminder({
        task_id: 1,
        remind_at: originalTime.toISOString(),
      });

      await snoozeReminder(reminder.id, 30);

      const allReminders = await getReminders(1);
      const newTime = new Date(allReminders[0].remind_at);
      const diffMs = newTime.getTime() - originalTime.getTime();

      expect(diffMs).toBeCloseTo(30 * 60 * 1000, 0);
    });

    it("should throw error for non-existent reminder", async () => {
      await expect(snoozeReminder(999, 30)).rejects.toThrow("Reminder not found");
    });
  });
});