 
 
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDb } from "../db/test-db";
import { setDb, resetDb } from "../db";
import {
  getLists,
  getListById,
  createList,
  updateList,
  deleteList,
  getLabels,
  getLabelById,
  createLabel,
  deleteLabel,
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  toggleSubtask,
  getOverdueCount,
  generateRecurringTasks,
  addTaskDependency,
  removeTaskDependency,
  getBlockedTasks,
  createTemplate,
  getTemplates,
  deleteTemplate,
  saveTemplateFromTask,
  addTaskComment,
  getTaskComments,
  exportData,
  importData,
  exportCsv,
  exportJson,
  exportIcal,
  getTimeReport,
  getWeeklyTimeSummary,
  reorderTasks,
  bulkUpdateTasks,
  bulkDeleteTasks,
} from "./tasks";

describe("Task Actions", () => {
  beforeEach(() => {
    const testDb = createTestDb();
    setDb(testDb);
  });

  describe("Lists", () => {
    it("should get lists including inbox", async () => {
      const lists = await getLists();
      expect(lists.length).toBe(1);
      expect(lists[0].name).toBe("Inbox");
      expect(lists[0].is_inbox).toBe(1);
    });

    it("should create a new list", async () => {
      const list = await createList({
        name: "Work",
        emoji: "💼",
        color: "#3b82f6",
      });
      expect(list.name).toBe("Work");
      expect(list.emoji).toBe("💼");

      const lists = await getLists();
      expect(lists.length).toBe(2);
    });

    it("should update a list", async () => {
      const created = await createList({ name: "Old Name" });
      const updated = await updateList(created.id, { name: "New Name" });
      expect(updated.name).toBe("New Name");
    });

    it("should delete a list and move tasks to inbox", async () => {
      const list = await createList({ name: "Temp" });
      await createTask({ name: "Task in temp list", list_id: list.id });

      await deleteList(list.id);

      const lists = await getLists();
      expect(lists.find((l) => l.id === list.id)).toBeUndefined();

      const tasks = await getTasks();
      expect(tasks[0].list_id).toBe(1);
    });
  });

  describe("Labels", () => {
    it("should create and get labels", async () => {
      const label = await createLabel({
        name: "Urgent",
        icon: "🔥",
        color: "#ef4444",
      });
      expect(label.name).toBe("Urgent");

      const labels = await getLabels();
      expect(labels.length).toBe(1);
    });

    it("should delete a label", async () => {
      const label = await createLabel({ name: "Temp" });
      await deleteLabel(label.id);

      const labels = await getLabels();
      expect(labels.length).toBe(0);
    });
  });

  describe("Tasks", () => {
    it("should create a task", async () => {
      const task = await createTask({
        name: "Test Task",
        description: "A test description",
        priority: "high",
      });

      expect(task.name).toBe("Test Task");
      expect(task.description).toBe("A test description");
      expect(task.priority).toBe("high");
      expect(task.completed).toBe(0);
      expect(task.logs.length).toBe(1);
      expect(task.logs[0].action).toBe("created");
    });

    it("should create a task with subtasks and labels", async () => {
      const label = await createLabel({ name: "Work" });
      const task = await createTask({
        name: "Complex Task",
        label_ids: [label.id],
        subtasks: ["Step 1", "Step 2"],
      });

      expect(task.labels.length).toBe(1);
      expect(task.subtasks.length).toBe(2);
    });

    it("should get tasks by view", async () => {
      const today = new Date().toISOString().split("T")[0];
      await createTask({ name: "Today Task", date: today });
      await createTask({ name: "No Date Task" });

      const todayTasks = await getTasks({ view: "today" });
      expect(todayTasks.length).toBe(1);
      expect(todayTasks[0].name).toBe("Today Task");

      const allTasks = await getTasks({ view: "all" });
      expect(allTasks.length).toBe(2);
    });

    it("should update a task", async () => {
      const task = await createTask({ name: "Original" });
      const updated = await updateTask(task.id, { name: "Updated" });

      expect(updated.name).toBe("Updated");
      expect(updated.logs.length).toBeGreaterThanOrEqual(2);
    });

    it("should toggle task completion", async () => {
      const task = await createTask({ name: "Toggle Me" });
      expect(task.completed).toBe(0);

      const completed = await updateTask(task.id, { completed: true });
      expect(completed.completed).toBe(1);
      expect(completed.completed_at).not.toBeNull();

      const uncompleted = await updateTask(task.id, { completed: false });
      expect(uncompleted.completed).toBe(0);
    });

    it("should delete a task", async () => {
      const task = await createTask({ name: "Delete Me" });
      await deleteTask(task.id);

      const found = await getTaskById(task.id);
      expect(found).toBeUndefined();
    });

    it("should toggle subtask completion", async () => {
      const task = await createTask({
        name: "With Subtasks",
        subtasks: ["Sub 1"],
      });

      const subtask = task.subtasks[0];
      expect(subtask.completed).toBe(0);

      const toggled = await toggleSubtask(subtask.id);
      expect(toggled.completed).toBe(true);
    });

    it("should search tasks", async () => {
      await createTask({ name: "Alpha Task", description: "Something" });
      await createTask({ name: "Beta Task", description: "Else" });

      const results = await getTasks({ searchQuery: "Alpha" });
      expect(results.length).toBe(1);
      expect(results[0].name).toBe("Alpha Task");
    });

    it("should get overdue count", async () => {
      const yesterday = new Date(Date.now() - 86400000)
        .toISOString()
        .split("T")[0];
      await createTask({ name: "Overdue", date: yesterday });

      const count = await getOverdueCount();
      expect(count).toBe(1);
    });

    it("should get tasks by list", async () => {
      const list = await createList({ name: "Custom" });
      await createTask({ name: "In Custom", list_id: list.id });
      await createTask({ name: "In Inbox" });

      const listTasks = await getTasks({ listId: list.id });
      expect(listTasks.length).toBe(1);
      expect(listTasks[0].name).toBe("In Custom");
    });
  });

  describe("Additional Coverage", () => {
    it("should handle updateTask with empty string name", async () => {
      const task = await createTask({ name: "Valid" });
      const updated = await updateTask(task.id, { name: "" });
      expect(updated.name).toBe("");
    });

    it("should handle null values in updateTask", async () => {
      const task = await createTask({ name: "Task", description: "Original" });
      const updated = await updateTask(task.id, { description: null as unknown as string });
      expect(updated.description).toBeNull();
    });

    it("should handle updating only completed status", async () => {
      const task = await createTask({ name: "Task" });
      const updated = await updateTask(task.id, { completed: true });
      expect(updated.completed).toBe(1);
      expect(updated.completed_at).not.toBeNull();
    });

    it("should handle clearing completed status", async () => {
      const task = await createTask({ name: "Task" });
      await updateTask(task.id, { completed: true });
      const updated = await updateTask(task.id, { completed: false });
      expect(updated.completed).toBe(0);
      expect(updated.completed_at).toBeNull();
    });

    it("should handle deleteList for non-existent list", async () => {
      await deleteList(99999);
    });

    it("should handle deleteLabel for non-existent label", async () => {
      await deleteLabel(99999);
    });

    it("should handle getLabelById for non-existent label", async () => {
      const found = await getLabelById(99999);
      expect(found).toBeNull();
    });
  });

  describe("Import/Export", () => {
    it("should export data with empty state", async () => {
      const data = await exportData();
      expect(data.lists.length).toBe(1); // Just Inbox
      expect(data.labels.length).toBe(0);
      expect(data.tasks.length).toBe(0);
      expect(data.templates.length).toBe(0);
      expect(data.time_entries.length).toBe(0);
    });

    it("should import empty data", async () => {
      const result = await importData({
        lists: [],
        labels: [],
        tasks: [],
        templates: [],
        time_entries: [],
      });
      expect(result.lists).toBe(0);
      expect(result.tasks).toBe(0);
    });

    it("should export CSV with tasks", async () => {
      await createTask({ name: "Task 1" });
      const csv = await exportCsv();
      expect(csv).toContain("id,name,description,date,deadline,priority,completed,list_id");
      expect(csv).toContain("Task 1");
    });

    it("should handle CSV export with special characters", async () => {
      await createTask({ name: "Task, with comma", description: 'Has "quotes"' });
      const csv = await exportCsv();
      expect(csv).toContain('"Task, with comma"');
    });

    it("should import tasks and preserve data", async () => {
      await createTask({ name: "Original Task" });
      const data = await exportData();
      await importData(data);

      const tasks = await getTasks({ includeCompleted: true });
      expect(tasks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Export Formats", () => {
    it("should export JSON data", async () => {
      await createTask({ name: "JSON Task" });
      const blob = await exportJson();
      expect(blob.type).toContain("application/json");
      const text = await blob.text();
      const data = JSON.parse(text);
      expect(data.tasks.length).toBeGreaterThanOrEqual(1);
    });

    it("should export iCal data", async () => {
      await createTask({ name: "iCal Task", deadline: "2024-12-31" });
      const blob = await exportIcal();
      expect(blob.type).toBe("text/calendar");
      const text = await blob.text();
      expect(text).toContain("BEGIN:VCALENDAR");
      expect(text).toContain("iCal Task");
    });
  });

  describe("Time Tracking", () => {
    it("should get time report for tasks", async () => {
      const task = await createTask({ name: "Time Tracking Task" });
      const reports = await getTimeReport({ taskId: task.id });
      expect(Array.isArray(reports)).toBe(true);
    });

    it("should get weekly time summary", async () => {
      const summary = await getWeeklyTimeSummary();
      expect(summary).toHaveProperty("totalSeconds");
      expect(summary).toHaveProperty("byDay");
      expect(summary).toHaveProperty("topTasks");
    });
  });

  describe("Bulk Operations", () => {
    it("should bulk update task priorities", async () => {
      const task1 = await createTask({ name: "Task 1", priority: "low" });
      const task2 = await createTask({ name: "Task 2", priority: "low" });

      await bulkUpdateTasks([task1.id, task2.id], { priority: "high" });

      const updated1 = await getTaskById(task1.id);
      const updated2 = await getTaskById(task2.id);
      expect(updated1?.priority).toBe("high");
      expect(updated2?.priority).toBe("high");
    });

    it("should bulk complete tasks", async () => {
      const task1 = await createTask({ name: "Task 1" });
      const task2 = await createTask({ name: "Task 2" });

      await bulkUpdateTasks([task1.id, task2.id], { completed: true });

      const updated1 = await getTaskById(task1.id);
      const updated2 = await getTaskById(task2.id);
      expect(updated1?.completed).toBe(1);
      expect(updated2?.completed).toBe(1);
      expect(updated1?.completed_at).not.toBeNull();
    });

    it("should bulk delete tasks", async () => {
      const task1 = await createTask({ name: "Task 1" });
      const task2 = await createTask({ name: "Task 2" });

      await bulkDeleteTasks([task1.id, task2.id]);

      const found1 = await getTaskById(task1.id);
      const found2 = await getTaskById(task2.id);
      expect(found1).toBeUndefined();
      expect(found2).toBeUndefined();
    });

    it("should handle empty bulk operations", async () => {
      await bulkUpdateTasks([], { priority: "high" });
      await bulkDeleteTasks([]);
    });
  });
});
