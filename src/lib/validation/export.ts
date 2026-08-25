// Client-side validation for export/import data
// This file is used by the import-export component

export interface ExportData {
  lists: Array<{ id: number; name: string; emoji?: string; color?: string; is_inbox?: number; created_at?: string }>;
  labels: Array<{ id: number; name: string; icon?: string; color?: string; created_at?: string }>;
  tasks: Array<{ id: number; name: string; description?: string; list_id?: number; date?: string; deadline?: string; priority?: string; completed?: boolean; completed_at?: string; created_at?: string; updated_at?: string; sort_order?: number; recurring?: string; recurring_config?: string; estimate?: number; actual_time?: number }>;
  templates: Array<{ id: number; name: string; description?: string; list_id?: number; priority?: string; label_ids?: number[]; subtasks?: Array<{ id: number; name: string; completed?: boolean }>; created_at?: string }>;
  time_entries: Array<{ id: number; task_id: number; start_time?: string; end_time?: string; duration_seconds?: number; description?: string; created_at?: string }>;
  users?: Array<{ id: number; email: string; name?: string }>;
  version?: string;
  exported_at?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateId(id: unknown, type: string): { valid: boolean; message?: string } {
  if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
    return { valid: false, message: `${type} ID must be a positive integer, got ${typeof id}` };
  }
  return { valid: true };
}

function validateRequiredString(value: unknown, field: string): { valid: boolean; message?: string } {
  if (typeof value !== 'string' || value.trim() === '') {
    return { valid: false, message: `${field} must be a non-empty string` };
  }
  return { valid: true };
}

export interface ConflictPreview {
  lists: { duplicates: number; total: number };
  labels: { duplicates: number; total: number };
  tasks: { duplicates: number; total: number };
  templates: { duplicates: number; total: number };
  time_entries: { duplicates: number; total: number };
}

export async function previewImportConflicts(
  data: ExportData,
  conflictStrategy: 'replace' | 'merge' | 'skip_conflicts' = 'replace'
): Promise<{ preview: ConflictPreview; summary: string }> {
  // This would need to check against actual database on client
  // For now, return a placeholder that will be populated server-side
  const preview: ConflictPreview = {
    lists: { duplicates: 0, total: data.lists?.length || 0 },
    labels: { duplicates: 0, total: data.labels?.length || 0 },
    tasks: { duplicates: 0, total: data.tasks?.length || 0 },
    templates: { duplicates: 0, total: data.templates?.length || 0 },
    time_entries: { duplicates: 0, total: data.time_entries?.length || 0 },
  };

  let summary = `Will import ${preview.tasks.total} tasks, ${preview.lists.total} lists, ${preview.labels.total} labels`;
  if (conflictStrategy === 'skip_conflicts') {
    summary += ` (will skip conflicts)`;
  } else if (conflictStrategy === 'merge') {
    summary += ` (will merge with existing)`;
  } else {
    summary += ` (will replace existing)`;
  }

  return { preview, summary };
}

export function validateExportData(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Data must be an object'] };
  }

  const record = data as Record<string, unknown>;

  // Validate arrays exist
  if (!Array.isArray(record.lists)) {
    errors.push('lists must be an array');
  }
  if (!Array.isArray(record.labels)) {
    errors.push('labels must be an array');
  }
  if (!Array.isArray(record.tasks)) {
    errors.push('tasks must be an array');
  }
  if (!Array.isArray(record.templates)) {
    errors.push('templates must be an array');
  }
  if (!Array.isArray(record.time_entries)) {
    errors.push('time_entries must be an array');
  }

  // Validate lists
  const lists = (record.lists as unknown[] | undefined) || [];
  for (let i = 0; i < lists.length; i++) {
    const listItem = lists[i];
    const idCheck = validateId((listItem as Record<string, unknown>)?.id, 'List');
    if (!idCheck.valid && idCheck.message) errors.push(`List ${i}: ${idCheck.message}`);
    if (!(listItem as Record<string, unknown>)?.name) errors.push(`List ${i}: name is required`);
  }

  // Validate labels
  const labels = (record.labels as unknown[] | undefined) || [];
  for (let i = 0; i < labels.length; i++) {
    const labelItem = labels[i];
    const idCheck = validateId((labelItem as Record<string, unknown>)?.id, 'Label');
    if (!idCheck.valid && idCheck.message) errors.push(`Label ${i}: ${idCheck.message}`);
    if (!(labelItem as Record<string, unknown>)?.name) errors.push(`Label ${i}: name is required`);
  }

  // Validate tasks
  const tasks = (record.tasks as unknown[] | undefined) || [];
  for (let i = 0; i < tasks.length; i++) {
    const taskItem = tasks[i];
    const idCheck = validateId((taskItem as Record<string, unknown>)?.id, 'Task');
    if (!idCheck.valid && idCheck.message) errors.push(`Task ${i}: ${idCheck.message}`);
    const nameCheck = validateRequiredString((taskItem as Record<string, unknown>)?.name, 'Task name');
    if (!nameCheck.valid && nameCheck.message) errors.push(`Task ${i}: ${nameCheck.message}`);
  }

  // Validate templates
  const templates = (record.templates as unknown[] | undefined) || [];
  for (let i = 0; i < templates.length; i++) {
    const templateItem = templates[i];
    const idCheck = validateId((templateItem as Record<string, unknown>)?.id, 'Template');
    if (!idCheck.valid && idCheck.message) errors.push(`Template ${i}: ${idCheck.message}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}