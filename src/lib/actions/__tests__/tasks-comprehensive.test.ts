import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setDb, resetDb } from "@/lib/db";
import { createTestDb } from "@/lib/db/test-db";

// Import all the action functions
import {
  getLists,
  createList,
  updateList,
  deleteList,
  getLabels,
  createLabel,
  deleteLabel,
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  bulkUpdateTasks,
  reorderTasks,
  toggleSubtask,
  getOverdueCount,
  generateRecurringTasks,
  addTaskDependency,
  removeTaskDependency,
  getBlockedTasks,
  getTemplates,
  createTemplate,
  deleteTemplate,
  getTaskComments,
  addTaskComment,
  exportData,
  exportCsv,
  exportJson,
  exportIcal,
  exportPdf,
  importData,
} from "@/lib/actions/tasks";

describe("Task Actions - Comprehensive Tests", () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    resetDb();
    db = createTestDb();
    setDb(db);

    // Initialize schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS lists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        emoji TEXT DEFAULT '📋',
        color TEXT DEFAULT '#6366f1',
        is_inbox INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS labels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        icon TEXT DEFAULT '🏷️',
        color TEXT DEFAULT '#8b5cf6',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        notes TEXT,
        list_id INTEGER REFERENCES lists(id),
        date TEXT,
        deadline TEXT,
        estimate TEXT,
        actual_time TEXT,
        priority TEXT DEFAULT 'none',
        recurring TEXT DEFAULT 'none',
        recurring_config TEXT,
        completed INTEGER DEFAULT 0,
        completed_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        sort_order INTEGER DEFAULT 0,
        assignee_id INTEGER,
        created_by INTEGER
      );

      CREATE TABLE IF NOT EXISTS task_labels (
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        label_id INTEGER REFERENCES labels(id) ON DELETE CASCADE,
        PRIMARY KEY (task_id, label_id)
      );

      CREATE TABLE IF NOT EXISTS subtasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS task_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        details TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        remind_at TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS task_dependencies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        depends_on_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(task_id, depends_on_task_id)
      );

      CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        list_id INTEGER,
        priority TEXT DEFAULT 'none',
        label_ids TEXT,
        subtasks TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS task_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS time_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        start_time TEXT NOT NULL,
        end_time TEXT,
        duration_seconds INTEGER,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert default inbox list
    db.exec("INSERT INTO lists (id, name, emoji, color, is_inbox) VALUES (1, 'Inbox', '📥', '#6366f1', 1)");
  });

  afterEach(() => {
    db.close();
  });

  describe("List Operations", () => {
    describe("getLists", () => {
      it("should return empty array when no lists", async () => {
        const lists = await getLists();
        expect(lists).toEqual([]);
      });

      it("should return all lists ordered by is_inbox and name", async () => {
        await createList({ name: "Work" });
        await createList({ name: "Personal" });

        const lists = await getLists();
        expect(lists.length).toBe(3); // Includes default Inbox
        expect(lists[0].name).toBe("Inbox");
      });
    });

    describe("createList", () => {
      it("should create a list with default values", async () => {
        const list = await createList({ name: "Work" });
        expect(list.name).toBe("Work");
        expect(list.emoji).toBe("📋");
      });

      it("should create a list with custom values", async () => {
        const list = await createList({
          name: "Projects",
          emoji: "📁",
          color: "#ff0000",
        });
        expect(list.emoji).toBe("📁");
        expect(list.color).toBe("#ff0000");
      });

      it("should throw error for invalid name", async () => {
        await expect(createList({ name: "" })).rejects.toThrow();
      });
    });

    describe("updateList", () => {
      it("should update list name", async () => {
        const list = await createList({ name: "Work" });
        const updated = await updateList(list.id, { name: "Work Updated" });
        expect(updated.name).toBe("Work Updated");
      });

      it("should throw error for non-existent list", async () => {
        await expect(updateList(999, { name: "Test" })).rejects.toThrow();
      });
    });

    describe("deleteList", () => {
      it("should delete a list", async () => {
        const list = await createList({ name: "Work" });
        await deleteList(list.id);
        const lists = await getLists();
        expect(lists.find(l => l.id === list.id)).toBeUndefined();
      });

      it("should reassign tasks to inbox when list is deleted", async () => {
        const list = await createList({ name: "Work" });
        await createTask({ name: "Test", list_id: list.id });
        await deleteList(list.id);

        const tasks = await getTasks();
        expect(tasks[0].list_id).toBe(1); // Inbox
      });
    });
  });

  describe("Label Operations", () => {
    describe("getLabels", () => {
      it("should return empty array when no labels", async () => {
        const labels = await getLabels();
        expect(labels).toEqual([]);
      });

      it("should return all labels ordered by name", async () => {
        await createLabel({ name: "Urgent" });
        await createLabel({ name: "Work" });

        const labels = await getLabels();
        expect(labels.length).toBe(2);
        expect(labels[0].name).toBe("Urgent");
        expect(labels[1].name).toBe("Work");
      });
    });

    describe("createLabel", () => {
      it("should create a label with default values", async () => {
        const label = await createLabel({ name: "Work" });
        expect(label.name).toBe("Work");
        expect(label.icon).toBe("🏷️");
      });

      it("should throw error for duplicate name", async () => {
        await createLabel({ name: "Work" });
        await expect(createLabel({ name: "Work" })).rejects.toThrow();
      });
    });

    describe("deleteLabel", () => {
      it("should delete a label", async () => {
        const label = await createLabel({ name: "Work" });
        await deleteLabel(label.id);
        const labels = await getLabels();
        expect(labels.find(l => l.id === label.id)).toBeUndefined();
      });
    });
  });

  describe("Task Operations", () => {
    describe("getTasks", () => {
      it("should return empty array when no tasks", async () => {
        const tasks = await getTasks();
        expect(tasks).toEqual([]);
      });

      it("should return tasks with all relations", async () => {
        await createTask({ name: "Test Task" });
        const tasks = await getTasks({ includeCompleted: true });
        expect(tasks[0].labels).toBeDefined();
        expect(tasks[0].subtasks).toBeDefined();
      });

      it("should filter by view", async () => {
        const today = new Date().toISOString().split("T")[0];
        await createTask({ name: "Today Task", date: today });
        await createTask({ name: "Future Task", date: "2099-01-01" });

        const todayTasks = await getTasks({ view: "today" });
        expect(todayTasks.length).toBe(1);
        expect(todayTasks[0].name).toBe("Today Task");
      });

      it("should filter by list", async () => {
        const list = await createList({ name: "Work" });
        await createTask({ name: "Work Task", list_id: list.id });
        await createTask({ name: "Personal Task" });

        const tasks = await getTasks({ listId: list.id });
        expect(tasks.length).toBe(1);
        expect(tasks[0].name).toBe("Work Task");
      });

      it("should search tasks", async () => {
        await createTask({ name: "Buy groceries" });
        await createTask({ name: "Walk the dog" });

        const results = await getTasks({ searchQuery: "groceries" });
        expect(results.length).toBe(1);
        expect(results[0].name).toBe("Buy groceries");
      });
    });

    describe("createTask", () => {
      it("should create a task with minimal data", async () => {
        const task = await createTask({ name: "Test Task" });
        expect(task.name).toBe("Test Task");
        expect(task.priority).toBe("none");
      });

      it("should create a task with all fields", async () => {
        const list = await createList({ name: "Work" });
        const label = await createLabel({ name: "Urgent" });

        const task = await createTask({
          name: "Complete Project",
          description: "Finish the project report",
          list_id: list.id,
          date: "2024-01-15",
          deadline: "2024-01-20",
          priority: "high",
          label_ids: [label.id],
          subtasks: ["Research", "Write", "Review"],
        });

        expect(task.name).toBe("Complete Project");
        expect(task.description).toBe("Finish the project report");
        expect(task.priority).toBe("high");
        expect(task.labels?.length).toBe(1);
        expect(task.subtasks?.length).toBe(3);
      });

      it("should assign sort order automatically", async () => {
        const task1 = await createTask({ name: "Task 1" });
        const task2 = await createTask({ name: "Task 2" });
        expect(task2.sort_order).toBeGreaterThan(task1.sort_order);
      });

      it("should assign specific sort order", async () => {
        const task = await createTask({ name: "Test", sort_order: 100 });
        expect(task.sort_order).toBe(100);
      });
    });

    describe("updateTask", () => {
      it("should update task name", async () => {
        const task = await createTask({ name: "Original Name" });
        const updated = await updateTask(task.id, { name: "New Name" });
        expect(updated.name).toBe("New Name");
      });

      it("should mark task as completed", async () => {
        const task = await createTask({ name: "Test" });
        const completed = await updateTask(task.id, { completed: true });
        expect(completed.completed).toBe(true);
        expect(completed.completed_at).toBeDefined();
      });

      it("should uncomplete a task", async () => {
        const task = await createTask({ name: "Test", completed: true });
        const updated = await updateTask(task.id, { completed: false });
        expect(updated.completed).toBe(false);
        expect(updated.completed_at).toBeNull();
      });

      it("should update labels", async () => {
        const label1 = await createLabel({ name: "Label 1" });
        const label2 = await createLabel({ name: "Label 2" });
        const task = await createTask({ name: "Test", label_ids: [label1.id] });

        const updated = await updateTask(task.id, { label_ids: [label1.id, label2.id] });
        expect(updated.labels?.length).toBe(2);
      });

      it("should throw error for non-existent task", async () => {
        await expect(updateTask(999, { name: "Test" })).rejects.toThrow();
      });
    });

    describe("deleteTask", () => {
      it("should delete a task", async () => {
        const task = await createTask({ name: "Test" });
        await deleteTask(task.id);
        const tasks = await getTasks({ includeCompleted: true });
        expect(tasks.find(t => t.id === task.id)).toBeUndefined();
      });
    });

    describe("bulkUpdateTasks", () => {
      it("should update multiple tasks", async () => {
        const task1 = await createTask({ name: "Task 1", priority: "none" });
        const task2 = await createTask({ name: "Task 2", priority: "none" });

        await bulkUpdateTasks([task1.id, task2.id], { priority: "high" });

        const tasks = await getTasks({ includeCompleted: true });
        expect(tasks.find(t => t.id === task1.id)?.priority).toBe("high");
        expect(tasks.find(t => t.id === task2.id)?.priority).toBe("high");
      });

      it("should handle empty array", async () => {
        await expect(bulkUpdateTasks([], { priority: "high" })).resolves.not.toThrow();
      });

      it("should mark tasks as completed", async () => {
        const task1 = await createTask({ name: "Task 1", completed: false });
        const task2 = await createTask({ name: "Task 2", completed: false });

        await bulkUpdateTasks([task1.id, task2.id], { completed: true });

        const tasks = await getTasks({ includeCompleted: true });
        expect(tasks.find(t => t.id === task1.id)?.completed).toBe(true);
        expect(tasks.find(t => t.id === task2.id)?.completed).toBe(true);
      });
    });

    describe("reorderTasks", () => {
      it("should reorder tasks", async () => {
        const task1 = await createTask({ name: "Task 1" });
        const task2 = await createTask({ name: "Task 2" });
        const task3 = await createTask({ name: "Task 3" });

        await reorderTasks([
          { id: task2.id, sort_order: 0 },
          { id: task1.id, sort_order: 1 },
          { id: task3.id, sort_order: 2 },
        ]);

        const tasks = await getTasks();
        expect(tasks[0].id).toBe(task2.id);
        expect(tasks[1].id).toBe(task1.id);
        expect(tasks[2].id).toBe(task3.id);
      });
    });

    describe("toggleSubtask", () => {
      it("should toggle subtask completion", async () => {
        const task = await createTask({
          name: "Test",
          subtasks: ["Subtask 1"],
        });

        const result = await toggleSubtask(1);
        expect(result.completed).toBe(true);
      });
    });

    describe("getOverdueCount", () => {
      it("should count overdue tasks", async () => {
        const pastDate = new Date(Date.now() - 86400000).toISOString().split("T")[0];
        await createTask({ name: "Overdue", date: pastDate });
        await createTask({ name: "Not Overdue", date: new Date().toISOString().split("T")[0] });

        const count = await getOverdueCount();
        expect(count).toBe(1);
      });
    });
  });

  describe("Task Dependencies", () => {
    describe("addTaskDependency", () => {
      it("should add a dependency", async () => {
        const task1 = await createTask({ name: "Task 1" });
        const task2 = await createTask({ name: "Task 2" });

        const dep = await addTaskDependency(task2.id, task1.id);
        expect(dep.task_id).toBe(task2.id);
        expect(dep.depends_on_task_id).toBe(task1.id);
      });
    });

    describe("removeTaskDependency", () => {
      it("should remove a dependency", async () => {
        const task1 = await createTask({ name: "Task 1" });
        const task2 = await createTask({ name: "Task 2" });

        await addTaskDependency(task2.id, task1.id);
        await removeTaskDependency(task2.id, task1.id);

        const blocked = await getBlockedTasks();
        expect(blocked.length).toBe(0);
      });
    });

    describe("getBlockedTasks", () => {
      it("should return blocked tasks", async () => {
        const task1 = await createTask({ name: "Task 1" });
        const task2 = await createTask({ name: "Task 2" });

        await addTaskDependency(task2.id, task1.id);

        const blocked = await getBlockedTasks();
        expect(blocked.length).toBe(1);
        expect(blocked[0].id).toBe(task2.id);
      });
    });
  });

  describe("Templates", () => {
    describe("getTemplates", () => {
      it("should return empty array when no templates", async () => {
        const templates = await getTemplates();
        expect(templates).toEqual([]);
      });

      it("should return templates with categories", async () => {
        const templates = await getTemplates(true);
        expect(templates).toBeDefined();
      });
    });

    describe("createTemplate", () => {
      it("should create a template", async () => {
        const template = await createTemplate({
          name: "Meeting Template",
          description: "Standard meeting structure",
          priority: "medium",
          subtasks: ["Agenda", "Notes", "Action Items"],
        });

        expect(template.name).toBe("Meeting Template");
        expect(template.subtasks).toEqual(["Agenda", "Notes", "Action Items"]);
      });
    });
  });

  describe("Comments", () => {
    describe("addTaskComment", () => {
      it("should add a comment to a task", async () => {
        const task = await createTask({ name: "Test" });
        const comment = await addTaskComment(task.id, { content: "This is a comment" });
        expect(comment.content).toBe("This is a comment");
      });
    });

    describe("getTaskComments", () => {
      it("should return comments for a task", async () => {
        const task = await createTask({ name: "Test" });
        await addTaskComment(task.id, { content: "Comment 1" });
        await addTaskComment(task.id, { content: "Comment 2" });

        const comments = await getTaskComments(task.id);
        expect(comments.length).toBe(2);
      });
    });
  });

  describe("Export/Import", () => {
    describe("exportData", () => {
      it("should export all data", async () => {
        await createList({ name: "Work" });
        await createLabel({ name: "Urgent" });
        await createTask({ name: "Test Task" });

        const data = await exportData();
        expect(data.lists.length).toBeGreaterThan(0);
        expect(data.labels.length).toBeGreaterThan(0);
        expect(data.tasks.length).toBeGreaterThan(0);
      });
    });

    describe("exportCsv", () => {
      it("should export tasks as CSV", async () => {
        await createTask({ name: "Task 1" });
        const csv = await exportCsv();
        expect(csv).toContain("id,name,description");
        expect(csv).toContain("Task 1");
      });
    });

    describe("exportJson", () => {
      it("should export as JSON blob", async () => {
        const blob = await exportJson();
        expect(blob.type).toBe("application/json");
      });
    });

    describe("exportIcal", () => {
      it("should export as iCal blob", async () => {
        await createTask({ name: "Meeting", deadline: "2024-01-15" });
        const blob = await exportIcal();
        expect(blob.type).toBe("text/calendar");
      });
    });

    describe("importData", () => {
      it("should import data", async () => {
        const data = {
          lists: [{ id: 5, name: "Imported", emoji: "📦", color: "#000", is_inbox: 0, created_at: "" }],
          labels: [{ id: 5, name: "Imported", icon: "📦", color: "#000", created_at: "" }],
          tasks: [{ id: 100, name: "Imported Task", description: null, list_id: 5, date: null, deadline: null, estimate: null, actual_time: null, priority: "none", recurring: "none", recurring_config: null, completed: 0, completed_at: null, created_at: "", updated_at: "", sort_order: 0, labels: [], subtasks: [], reminders: [], logs: [], comments: [], attachments: [], blockers: [], blocked_by: [], time_entries: [] }],
          templates: [],
          time_entries: [],
        };

        const result = await importData(data);
        expect(result.tasks).toBe(1);
        expect(result.lists).toBe(1);
        expect(result.labels).toBe(1);
      });
    });
  });
});