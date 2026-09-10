import { describe, it, expect } from 'vitest';
import { validateExportData, previewImportConflicts } from '../export';

describe('Export Validation', () => {
  describe('validateExportData', () => {
    it('should return invalid for null data', () => {
      const result = validateExportData(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Data must be an object');
    });

    it('should return invalid for non-object data', () => {
      const result = validateExportData('string');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Data must be an object');
    });

    it('should return invalid for missing arrays', () => {
      const result = validateExportData({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('lists must be an array');
      expect(result.errors).toContain('labels must be an array');
      expect(result.errors).toContain('tasks must be an array');
      expect(result.errors).toContain('templates must be an array');
      expect(result.errors).toContain('time_entries must be an array');
    });

    it('should validate valid data structure', () => {
      const validData = {
        lists: [{ id: 1, name: 'Test List' }],
        labels: [{ id: 1, name: 'Test Label' }],
        tasks: [{ id: 1, name: 'Test Task' }],
        templates: [{ id: 1, name: 'Test Template' }],
        time_entries: [{ id: 1, task_id: 1 }],
      };
      const result = validateExportData(validData);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate lists with valid IDs', () => {
      const data = {
        lists: [
          { id: 1, name: 'Valid List' },
          { id: 2, name: 'Another List' },
        ],
        labels: [],
        tasks: [],
        templates: [],
        time_entries: [],
      };
      const result = validateExportData(data);
      expect(result.valid).toBe(true);
    });

    it('should return invalid for list with invalid ID', () => {
      const data = {
        lists: [{ id: -1, name: 'Invalid List' }],
        labels: [],
        tasks: [],
        templates: [],
        time_entries: [],
      };
      const result = validateExportData(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('List 0:'))).toBe(true);
    });

    it('should return invalid for list without name', () => {
      const data = {
        lists: [{ id: 1 }],
        labels: [],
        tasks: [],
        templates: [],
        time_entries: [],
      };
      const result = validateExportData(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('List 0: name is required'))).toBe(true);
    });

    it('should validate labels with valid IDs', () => {
      const data = {
        lists: [],
        labels: [{ id: 1, name: 'Valid Label' }],
        tasks: [],
        templates: [],
        time_entries: [],
      };
      const result = validateExportData(data);
      expect(result.valid).toBe(true);
    });

    it('should return invalid for label with invalid ID', () => {
      const data = {
        lists: [],
        labels: [{ id: 0, name: 'Invalid Label' }],
        tasks: [],
        templates: [],
        time_entries: [],
      };
      const result = validateExportData(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Label 0:'))).toBe(true);
    });

    it('should validate tasks with required fields', () => {
      const data = {
        lists: [],
        labels: [],
        tasks: [{ id: 1, name: 'Valid Task' }],
        templates: [],
        time_entries: [],
      };
      const result = validateExportData(data);
      expect(result.valid).toBe(true);
    });

    it('should return invalid for task without name', () => {
      const data = {
        lists: [],
        labels: [],
        tasks: [{ id: 1 }],
        templates: [],
        time_entries: [],
      };
      const result = validateExportData(data);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return invalid for task with empty name', () => {
      const data = {
        lists: [],
        labels: [],
        tasks: [{ id: 1, name: '' }],
        templates: [],
        time_entries: [],
      };
      const result = validateExportData(data);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return invalid for task with invalid ID', () => {
      const data = {
        lists: [],
        labels: [],
        tasks: [{ id: 'invalid', name: 'Task' }],
        templates: [],
        time_entries: [],
      };
      const result = validateExportData(data);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Task 0:'))).toBe(true);
    });

    it('should validate complete valid data structure', () => {
      const data = {
        lists: [{ id: 1, name: 'List 1', emoji: '📋' }],
        labels: [{ id: 1, name: 'Label 1', color: 'red' }],
        tasks: [{ id: 1, name: 'Task 1', description: 'Desc', priority: 'high' }],
        templates: [{ id: 1, name: 'Template 1' }],
        time_entries: [{ id: 1, task_id: 1, duration_seconds: 3600 }],
        users: [{ id: 1, email: 'test@example.com' }],
        version: '1.0',
        exported_at: '2024-01-01T00:00:00Z',
      };
      const result = validateExportData(data);
      expect(result.valid).toBe(true);
    });
  });

  describe('previewImportConflicts', () => {
    it('should return no conflicts for empty lists', async () => {
      const { preview, summary } = await previewImportConflicts({
        lists: [],
        labels: [],
        tasks: [],
        templates: [],
        time_entries: [],
      });
      expect(preview.tasks.duplicates).toBe(0);
      expect(preview.lists.duplicates).toBe(0);
      expect(preview.labels.duplicates).toBe(0);
      expect(preview.templates.duplicates).toBe(0);
      expect(preview.time_entries.duplicates).toBe(0);
    });

    it('should generate correct summary for replace strategy', async () => {
      const { summary } = await previewImportConflicts(
        {
          lists: [{ id: 1, name: 'List' }],
          labels: [],
          tasks: [{ id: 1, name: 'Task' }],
          templates: [],
          time_entries: [],
        },
        'replace'
      );
      expect(summary).toContain('will replace existing');
    });

    it('should generate correct summary for merge strategy', async () => {
      const { summary } = await previewImportConflicts(
        {
          lists: [],
          labels: [],
          tasks: [],
          templates: [],
          time_entries: [],
        },
        'merge'
      );
      expect(summary).toContain('will merge');
    });

    it('should generate correct summary for skip conflicts strategy', async () => {
      const { summary } = await previewImportConflicts(
        {
          lists: [],
          labels: [],
          tasks: [],
          templates: [],
          time_entries: [],
        },
        'skip_conflicts'
      );
      expect(summary).toContain('will skip conflicts');
    });

    it('should return correct counts for multiple items', async () => {
      const { preview } = await previewImportConflicts({
        lists: Array.from({ length: 5 }, (_, i) => ({ id: i + 1, name: `List ${i + 1}` })),
        labels: Array.from({ length: 3 }, (_, i) => ({ id: i + 1, name: `Label ${i + 1}` })),
        tasks: Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: `Task ${i + 1}` })),
        templates: [],
        time_entries: [],
      });
      expect(preview.lists.total).toBe(5);
      expect(preview.labels.total).toBe(3);
      expect(preview.tasks.total).toBe(10);
    });
  });

  describe('Conflict Preview', () => {
    it('should handle all entity types', async () => {
      const { preview } = await previewImportConflicts({
        lists: [{ id: 1, name: 'List 1' }],
        labels: [{ id: 1, name: 'Label 1' }],
        tasks: [{ id: 1, name: 'Task 1' }],
        templates: [{ id: 1, name: 'Template 1' }],
        time_entries: [{ id: 1, task_id: 1 }],
      });

      expect(preview.lists.total).toBe(1);
      expect(preview.labels.total).toBe(1);
      expect(preview.tasks.total).toBe(1);
      expect(preview.templates.total).toBe(1);
      expect(preview.time_entries.total).toBe(1);
    });
  });
});