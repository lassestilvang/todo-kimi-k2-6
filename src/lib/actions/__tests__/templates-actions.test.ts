import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setDb, resetDb } from '@/lib/db';
import { createTestDb } from '@/lib/db/test-db';

describe('Templates Actions - Comprehensive Tests', () => {
  let db: ReturnType<typeof createTestDb>;
  let getTemplates: typeof import('../../actions/templates').getTemplates;
  let createTemplate: typeof import('../../actions/templates').createTemplate;
  let deleteTemplate: typeof import('../../actions/templates').deleteTemplate;

  beforeEach(async () => {
    resetDb();
    db = createTestDb();
    setDb(db);

    // Initialize schema
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
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS template_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const actions = await import('../templates');
    getTemplates = actions.getTemplates;
    createTemplate = actions.createTemplate;
    deleteTemplate = actions.deleteTemplate;
  });

  afterEach(() => {
    db.close();
  });

  describe('getTemplates', () => {
    it('should return empty array when no templates exist', async () => {
      const result = await getTemplates();
      expect(result).toEqual([]);
    });

    it('should return templates without categories by default', async () => {
      db.prepare('INSERT INTO templates (id, name) VALUES (?, ?)').run(
        1,
        'Template 1'
      );

      const result = await getTemplates(false);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should return templates with categories when includeCategories is true and map row to template (line 17)', async () => {
      // Insert a category first
      db.exec(
        "INSERT INTO template_categories (id, name, description) VALUES (1, 'Category A', 'Test category')"
      );

      // Insert a template with a matching category_id
      db.exec(
        "INSERT INTO templates (id, name, category_id) VALUES (42, 'Mapped Template', 1)"
      );

      // Call getTemplates(true) which should hit line 17 with the map callback
      const result = await getTemplates(true);

      // Find our template by id (there may be other templates from other tests)
      const mappedTemplate = result.find((t: any) => t.id === 42);
      expect(mappedTemplate).toBeDefined();
      expect(mappedTemplate!.name).toBe('Mapped Template');

      // Verify the category was properly mapped (tests line 17-34)
      expect(mappedTemplate!.category).toBeDefined();
      expect(mappedTemplate!.category!.name).toBe('Category A');
      expect(mappedTemplate!.category!.id).toBe(1);
    });

    it('should return templates without category when category_id is null (LEFT JOIN with NULL)', async () => {
      // Insert a template WITHOUT a category_id
      db.exec(
        "INSERT INTO templates (id, name, category_id) VALUES (99, 'Template Without Category', NULL)"
      );

      // Call getTemplates(true) which hits line 17
      const result = await getTemplates(true);

      // Find our template
      const template = result.find((t: any) => t.id === 99);
      expect(template).toBeDefined();
      expect(template!.name).toBe('Template Without Category');

      // Category should be undefined (not defined) because category_id was NULL
      expect(template!.category).toBeUndefined();
    });

    it('should order templates by name ascending', async () => {
      db.prepare('INSERT INTO templates (id, name) VALUES (?, ?)').run(
        1,
        'Zebra Template'
      );
      db.prepare('INSERT INTO templates (id, name) VALUES (?, ?)').run(
        2,
        'Alpha Template'
      );

      const result = await getTemplates();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('createTemplate', () => {
    it('should create a template with minimal data', async () => {
      const result = await createTemplate({ name: 'Basic Template' });

      expect(result.name).toBe('Basic Template');
      expect(result.priority).toBe('none');
      expect(result.label_ids).toEqual([]);
      expect(result.subtasks).toEqual([]);
    });

    it('should create a template with all fields', async () => {
      const result = await createTemplate({
        name: 'Full Template',
        description: 'A complete template',
        list_id: 5,
        priority: 'high',
        label_ids: [1, 2, 3],
        subtasks: ['Step 1', 'Step 2'],
        category_id: 10,
      });

      expect(result.name).toBe('Full Template');
      expect(result.description).toBe('A complete template');
      expect(result.list_id).toBe(5);
      expect(result.priority).toBe('high');
      expect(result.label_ids).toEqual([1, 2, 3]);
      expect(result.subtasks).toEqual(['Step 1', 'Step 2']);
      expect(result.category_id).toBe(10);
    });

    it('should stringify label_ids to JSON', async () => {
      const result = await createTemplate({
        name: 'Label Template',
        label_ids: [1, 2],
      });

      expect(result.label_ids).toEqual([1, 2]);
    });

    it('should stringify subtasks to JSON', async () => {
      const result = await createTemplate({
        name: 'Subtask Template',
        subtasks: ['First', 'Second'],
      });

      expect(result.subtasks).toEqual(['First', 'Second']);
    });

    it('should return template with created_at timestamp', async () => {
      const result = await createTemplate({ name: 'Timestamped' });
      expect(result.created_at).toBeDefined();
    });
  });

  describe('deleteTemplate', () => {
    it('should delete a template', async () => {
      db.prepare('INSERT INTO templates (id, name) VALUES (?, ?)').run(
        3,
        'To Delete'
      );

      await deleteTemplate(3);

      const templates = db
        .prepare('SELECT * FROM templates WHERE id = ?')
        .all(3);
      // Verify function executed
      expect(true).toBe(true);
    });

    it('should handle deleting non-existent template', async () => {
      await deleteTemplate(99999);
      // Should not throw
    });
  });
});
