import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestDb } from '@/lib/db/test-db';
import { setDb, resetDb } from '@/lib/db';
import {
  getTemplates,
  createTemplate,
  deleteTemplate,
  saveTemplateFromTask,
} from '../templates';

describe('Templates Actions', () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    resetDb();
    db = createTestDb();
    setDb(db);

    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        list_id INTEGER,
        priority TEXT DEFAULT 'none',
        label_ids TEXT,
        subtasks TEXT,
        category_id INTEGER,
        created_at TEXT
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS template_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at TEXT
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        list_id INTEGER,
        priority TEXT DEFAULT 'none',
        completed INTEGER DEFAULT 0
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS subtasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER,
        name TEXT NOT NULL
      )
    `);

    // Create a category
    db.exec(`
      INSERT INTO template_categories (id, name, description, created_at) VALUES (1, 'Work', 'Work related templates', '2024-01-01')
    `);
  });

  afterEach(() => {
    db.close();
    resetDb();
  });

  describe('getTemplates', () => {
    it('should return templates without categories when includeCategories is false', async () => {
      db.exec(`
        INSERT INTO templates (name, description, priority) VALUES ('Test Template', 'A test template', 'high')
      `);

      const templates = await getTemplates(false);
      expect(templates.length).toBe(1);
      expect(templates[0].name).toBe('Test Template');
    });

    it('should return templates with categories when includeCategories is true', async () => {
      db.exec(`
        INSERT INTO templates (name, description, priority, category_id, created_at)
        VALUES ('Category Template', 'Template with category', 'medium', 1, '2024-01-01')
      `);

      const templates = await getTemplates(true);
      expect(Array.isArray(templates)).toBe(true);
    });

    it('should return templates without category when no category assigned', async () => {
      db.exec(`
        INSERT INTO templates (name, description, priority, created_at)
        VALUES ('No Category Template', 'No category', 'low', '2024-01-01')
      `);

      const templates = await getTemplates(true);
      expect(Array.isArray(templates)).toBe(true);
    });

    it('should handle empty templates table', async () => {
      const templates = await getTemplates(true);
      expect(templates).toEqual([]);
    });

    it('should default includeCategories to false', async () => {
      db.exec(`
        INSERT INTO templates (name, description, created_at) VALUES ('Default Template', 'Default test', '2024-01-01')
      `);

      const templates = await getTemplates();
      expect(templates.length).toBe(1);
    });
  });

  describe('createTemplate', () => {
    it('should create a basic template', async () => {
      const template = await createTemplate({
        name: 'New Template',
        description: 'A new template',
      });

      expect(template.name).toBe('New Template');
      expect(template.id).toBeDefined();
    });

    it('should create a template with subtasks', async () => {
      const template = await createTemplate({
        name: 'Template with Subtasks',
        subtasks: ['Subtask 1', 'Subtask 2'],
      });

      expect(template.subtasks).toBeDefined();
    });

    it('should create a template with label_ids', async () => {
      const template = await createTemplate({
        name: 'Template with Labels',
        label_ids: [1, 2, 3],
      });

      expect(template.label_ids).toBeDefined();
    });

    it('should create a template with category_id', async () => {
      const template = await createTemplate({
        name: 'Categorized Template',
        category_id: 1,
      });

      expect(template.category_id).toBe(1);
    });
  });

  describe('deleteTemplate', () => {
    it('should delete a template by id', async () => {
      db.exec(`
        INSERT INTO templates (name, description, created_at) VALUES ('Template to Delete', 'Will be deleted', '2024-01-01')
      `);

      // Get the inserted id
      const result = db
        .prepare("SELECT id FROM templates WHERE name = 'Template to Delete'")
        .get();

      await deleteTemplate(result.id);

      const template = db
        .prepare('SELECT * FROM templates WHERE id = ?')
        .get(result.id);
      expect(template).toBeUndefined();
    });
  });

  describe('saveTemplateFromTask', () => {
    it('should save a task as a template', async () => {
      // Create a task first
      db.exec(`
        INSERT INTO tasks (name, description, priority, created_at)
        VALUES ('My Task', 'Task description', 'high', '2024-01-01')
      `);
      const task = db
        .prepare("SELECT id FROM tasks WHERE name = 'My Task'")
        .get();

      const template = await saveTemplateFromTask(task.id);

      expect(template.name).toBe('My Task');
      expect(template.description).toBe('Task description');
      expect(template.priority).toBe('high');
    });

    it('should save a task with subtasks', async () => {
      // Create a task with subtasks
      db.exec(`
        INSERT INTO tasks (name, description, priority, created_at)
        VALUES ('Task with Subtasks', 'Description', 'medium', '2024-01-01')
      `);
      const task = db
        .prepare("SELECT id FROM tasks WHERE name = 'Task with Subtasks'")
        .get();

      const subtaskStmt = db.prepare(
        'INSERT INTO subtasks (task_id, name) VALUES (?, ?)'
      );
      subtaskStmt.run(task.id, 'Subtask 1');
      subtaskStmt.run(task.id, 'Subtask 2');

      const template = await saveTemplateFromTask(task.id, {
        include_subtasks: true,
      });

      expect(template.subtasks.length).toBe(2);
      expect(template.subtasks).toContain('Subtask 1');
      expect(template.subtasks).toContain('Subtask 2');
    });

    it('should save a task with a custom name', async () => {
      db.exec(`
        INSERT INTO tasks (name, description, created_at)
        VALUES ('Original Name', 'Description', '2024-01-01')
      `);
      const task = db
        .prepare("SELECT id FROM tasks WHERE name = 'Original Name'")
        .get();

      const template = await saveTemplateFromTask(task.id, {
        name: 'Custom Name',
      });

      expect(template.name).toBe('Custom Name');
    });

    it('should save a task with a category', async () => {
      db.exec(`
        INSERT INTO tasks (name, priority, created_at)
        VALUES ('Task for Category', 'high', '2024-01-01')
      `);
      const task = db
        .prepare("SELECT id FROM tasks WHERE name = 'Task for Category'")
        .get();

      const template = await saveTemplateFromTask(task.id, { category_id: 1 });

      expect(template.category_id).toBe(1);
    });

    it('should throw error for non-existent task', async () => {
      await expect(saveTemplateFromTask(99999)).rejects.toThrow(
        'Task not found'
      );
    });
  });
});
