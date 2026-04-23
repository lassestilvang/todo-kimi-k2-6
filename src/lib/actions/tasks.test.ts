import { describe, it, expect, beforeEach } from "bun:test";
import { createTestDb } from "@/lib/db/test-db";
import { setDb } from "@/lib/db";
import {
  getLists,
  getListById,
  createList,
  updateList,
  deleteList,
  getLabels,
  createLabel,
  deleteLabel,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getTaskById,
  toggleSubtask,
  getOverdueCount,
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
});
