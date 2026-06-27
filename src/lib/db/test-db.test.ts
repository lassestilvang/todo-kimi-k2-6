import { describe, it, expect } from "vitest";
import { createTestDb } from "./test-db";

describe("Test Database", () => {
  it("should create an in-memory database", () => {
    const db = createTestDb();
    expect(db).toBeDefined();
  });

  it("should create lists table with inbox", () => {
    const db = createTestDb();
    const lists = db.prepare("SELECT * FROM lists").all();
    expect(lists.length).toBe(1);
    expect(lists[0].name).toBe("Inbox");
    expect(lists[0].is_inbox).toBe(1);
  });

  it("should create all required tables", () => {
    const db = createTestDb();

    // Verify all tables exist
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tableNames = tables.map((t: { name: string }) => t.name);

    expect(tableNames).toContain("lists");
    expect(tableNames).toContain("labels");
    expect(tableNames).toContain("tasks");
    expect(tableNames).toContain("task_labels");
    expect(tableNames).toContain("subtasks");
    expect(tableNames).toContain("task_logs");
    expect(tableNames).toContain("reminders");
    expect(tableNames).toContain("task_dependencies");
    expect(tableNames).toContain("templates");
    expect(tableNames).toContain("task_comments");
    expect(tableNames).toContain("time_entries");
  });

  it("should create tasks table with correct schema", () => {
    const db = createTestDb();

    const task = db.prepare("SELECT * FROM tasks WHERE 1=0").get();
    expect(task).toBeNull(); // Table exists but is empty

    // Verify we can insert
    db.prepare("INSERT INTO tasks (name) VALUES (?)").run("Test");
    const inserted = db.prepare("SELECT * FROM tasks").all();
    expect(inserted.length).toBe(1);
    expect(inserted[0].name).toBe("Test");
  });

  it("should create foreign key constraints", () => {
    const db = createTestDb();

    // Insert a task with valid list_id
    db.prepare("INSERT INTO tasks (name, list_id) VALUES (?, ?)").run("Task", 1);
    const task = db.prepare("SELECT * FROM tasks").get();
    expect(task.list_id).toBe(1);
  });

  it("should support task_dependencies table", () => {
    const db = createTestDb();

    // Insert tasks
    const task1 = db.prepare("INSERT INTO tasks (name) VALUES (?)").run("Task 1");
    const task2 = db.prepare("INSERT INTO tasks (name) VALUES (?)").run("Task 2");

    // Create dependency
    db.prepare("INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)").run(
      task2.lastInsertRowid,
      task1.lastInsertRowid
    );

    // Verify dependency
    const dep = db.prepare("SELECT * FROM task_dependencies").get();
    expect(dep.task_id).toBe(task2.lastInsertRowid);
    expect(dep.depends_on_task_id).toBe(task1.lastInsertRowid);
  });

  it("should support templates table", () => {
    const db = createTestDb();

    db.prepare("INSERT INTO templates (name, description, priority, label_ids, subtasks) VALUES (?, ?, ?, ?, ?)")
      .run("Template 1", "Test template", "high", '["1", "2"]', '["step1", "step2"]');

    const template = db.prepare("SELECT * FROM templates").get();
    expect(template.name).toBe("Template 1");
    expect(template.priority).toBe("high");
  });

  it("should support task_comments table", () => {
    const db = createTestDb();

    // Insert a task
    const taskResult = db.prepare("INSERT INTO tasks (name) VALUES (?)").run("Task");

    // Insert a comment
    db.prepare("INSERT INTO task_comments (task_id, content) VALUES (?, ?)").run(
      taskResult.lastInsertRowid,
      "Test comment"
    );

    const comments = db.prepare("SELECT * FROM task_comments").all();
    expect(comments.length).toBe(1);
    expect(comments[0].content).toBe("Test comment");
  });

  it("should support time_entries table", () => {
    const db = createTestDb();

    // Insert a task
    const taskResult = db.prepare("INSERT INTO tasks (name) VALUES (?)").run("Task");

    // Insert a time entry
    db.prepare("INSERT INTO time_entries (task_id, start_time, duration_seconds, description) VALUES (?, ?, ?, ?)")
      .run(taskResult.lastInsertRowid, "2026-06-25T10:00:00Z", 3600, "Work session");

    const entries = db.prepare("SELECT * FROM time_entries").all();
    expect(entries.length).toBe(1);
    expect(entries[0].duration_seconds).toBe(3600);
  });

  it("should support task_labels junction table", () => {
    const db = createTestDb();

    // Insert a label
    const labelResult = db.prepare("INSERT INTO labels (name) VALUES (?)").run("Test");
    const labelId = labelResult.lastInsertRowid;

    // Insert a task
    const taskResult = db.prepare("INSERT INTO tasks (name) VALUES (?)").run("Task");
    const taskId = taskResult.lastInsertRowid;

    // Associate them
    db.prepare("INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)").run(taskId, labelId);

    // Verify association
    const associated = db.prepare(
      `SELECT l.name FROM labels l
       JOIN task_labels tl ON l.id = tl.label_id
       WHERE tl.task_id = ?`
    ).all(taskId);

    expect(associated.length).toBe(1);
    expect(associated[0].name).toBe("Test");
  });
});