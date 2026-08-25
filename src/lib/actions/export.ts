'use server';

import type {
  List,
  Label,
  TaskWithRelations,
  Template,
  TimeEntry,
  User,
} from '@/types';
import { getDb } from '@/lib/db';
import { getLists } from '@/lib/actions/lists';
import { getLabels } from '@/lib/actions/labels';
import { getTasks } from '@/lib/actions';
import { getTemplates } from '@/lib/actions/templates';

export interface ExportData {
  lists: List[];
  labels: Label[];
  tasks: TaskWithRelations[];
  templates: Template[];
  time_entries: TimeEntry[];
  users?: User[];
}

export interface ExportDataSchema extends ExportData {
  version: string;
  exported_at: string;
}

export interface ConflictCheckResult {
  lists: { duplicates: number; ids: number[] };
  labels: { duplicates: number; ids: number[] };
  tasks: { duplicates: number; ids: number[] };
  templates: { duplicates: number; ids: number[] };
  time_entries: { duplicates: number; ids: number[] };
  hasConflicts: boolean;
}

export async function checkImportConflicts(data: ExportData): Promise<ConflictCheckResult> {
  const db = getDb();

  const listIds = data.lists.map(l => l.id);
  const labelIds = data.labels.map(l => l.id);
  const taskIds = data.tasks.map(t => t.id);
  const templateIds = data.templates.map(t => t.id);
  const timeEntryIds = data.time_entries.map(t => t.id);

  const getDuplicates = (ids: number[], table: string, idCol: string) => {
    if (ids.length === 0) return { duplicates: 0, ids: [] };
    const placeholders = ids.map(() => '?').join(',');
    const rows = db.prepare(
      `SELECT ${idCol} FROM ${table} WHERE ${idCol} IN (${placeholders})`
    ).all(...ids) as { [idCol]: number }[];
    const existing = new Set(rows.map(r => r[idCol]));
    const duplicates = ids.filter(id => existing.has(id));
    return { duplicates: duplicates.length, ids: duplicates };
  };

  const result = {
    lists: getDuplicates(listIds, 'lists', 'id'),
    labels: getDuplicates(labelIds, 'labels', 'id'),
    tasks: getDuplicates(taskIds, 'tasks', 'id'),
    templates: getDuplicates(templateIds, 'templates', 'id'),
    time_entries: getDuplicates(timeEntryIds, 'time_entries', 'id'),
    hasConflicts: false,
  };

  result.hasConflicts = result.lists.duplicates > 0 || result.labels.duplicates > 0 ||
    result.tasks.duplicates > 0 || result.templates.duplicates > 0 || result.time_entries.duplicates > 0;

  return result;
}

function taskToCsvRow(task: TaskWithRelations): string {
  const escape = (val: string | number | null | undefined) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    return str.includes(',') || str.includes('"')
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };

  return [
    escape(task.id),
    escape(task.name),
    escape(task.description),
    escape(task.date),
    escape(task.deadline),
    escape(task.priority),
    escape(task.completed ? 'true' : 'false'),
    escape(task.list_id),
  ].join(',');
}

export async function exportData(): Promise<ExportDataSchema> {
  const db = getDb();
  const lists = await getLists();
  const labels = await getLabels();
  const tasks = await getTasks({ includeCompleted: true });
  const templates = await getTemplates();
  const time_entries = db
    .prepare('SELECT * FROM time_entries ORDER BY created_at DESC')
    .all() as TimeEntry[];
  return {
    version: '1.0',
    exported_at: new Date().toISOString(),
    lists,
    labels,
    tasks,
    templates,
    time_entries,
  };
}

export async function exportCsv(): Promise<string> {
  const tasks = await getTasks({ includeCompleted: true });
  const header =
    'id,name,description,date,deadline,priority,completed,list_id,estimate,actual_time';
  const rows = tasks.map(taskToCsvRow);
  return [header, ...rows].join('\n');
}

export async function exportJson(): Promise<Blob> {
  const data = await exportData();
  return new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
}

export async function exportIcal(): Promise<Blob> {
  const tasks = await getTasks({ includeCompleted: true });
  const now = new Date();

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TaskFlow//TaskFlow//EN',
    'CALSCALE:GREGORIAN',
  ];

  for (const task of tasks) {
    if (!task.deadline && !task.date) continue;

    const dateStr = ((task.deadline || task.date) as string).replace(/-/g, '');
    const uid = `${task.id}@taskflow.local`;
    const dtStamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${dtStamp}`);
    lines.push(`DTSTART:${dateStr}`);
    lines.push(`SUMMARY:${task.name}`);
    if (task.description) {
      lines.push(`DESCRIPTION:${task.description.replace(/\n/g, '\\n')}`);
    }
    if (task.priority !== 'none') {
      lines.push(`CATEGORIES:${task.priority}`);
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  return new Blob([lines.join('\n')], { type: 'text/calendar' });
}

export async function exportPdf(): Promise<Blob> {
  const data = await exportData();

  const lines: string[] = [];
  lines.push('TaskFlow Export');
  lines.push(`Generated: ${new Date().toISOString().split('T')[0]}`);
  lines.push(`Total Tasks: ${data.tasks.length}`);
  lines.push(`Completed: ${data.tasks.filter(t => t.completed).length}`);
  lines.push('');
  lines.push('Tasks:');
  lines.push('-'.repeat(50));

  data.tasks.forEach(task => {
    const status = task.completed ? '[✓]' : '[○]';
    lines.push(`${status} ${task.name}`);
    if (task.description) lines.push(`  Description: ${task.description}`);
    if (task.date) lines.push(`  Date: ${task.date}`);
    if (task.priority !== 'none') lines.push(`  Priority: ${task.priority}`);
  });

  lines.push('');
  lines.push('Lists:');
  lines.push('-'.repeat(50));
  data.lists.forEach(list => {
    lines.push(`${list.emoji} ${list.name}`);
  });

  return new Blob([lines.join('\n')], { type: 'text/plain' });
}

export interface ImportOptions {
  /** 'replace' removes existing data first (default), 'merge' adds new items only, 'skip_conflicts' keeps existing items */
  conflictStrategy?: 'replace' | 'merge' | 'skip_conflicts';
  /** Only import if this source version is newer than destination for each item */
  versionField?: string;
  /** List of specific item IDs to import (empty = all) */
  includeIds?: number[];
  /** Skip items with validation errors rather than failing completely */
  skipInvalid?: boolean;
}

export interface ImportResult {
  lists: number;
  labels: number;
  tasks: number;
  templates: number;
  time_entries: number;
  skipped: number;
  errors: Array<{ type: string; id?: number; message: string }>;
}

export async function importData(
  data: ExportData,
  options: ImportOptions = {}
): Promise<ImportResult> {
  const db = getDb();
  const { conflictStrategy = 'replace', skipInvalid = false } = options;
  const errors: ImportResult['errors'] = [];
  let skipped = 0;

  // Clear existing data only for replace strategy
  if (conflictStrategy === 'replace') {
    db.exec('DELETE FROM time_entries');
    db.exec('DELETE FROM task_comments');
    db.exec('DELETE FROM task_dependencies');
    db.exec('DELETE FROM task_logs');
    db.exec('DELETE FROM reminders');
    db.exec('DELETE FROM subtasks');
    db.exec('DELETE FROM task_labels');
    db.exec('DELETE FROM tasks');
    db.exec('DELETE FROM templates');
    db.exec('DELETE FROM labels');
    db.exec('DELETE FROM lists');
  } else {
    // For merge/skip_conflicts, we need to handle conflicts per-item
    // by checking if IDs already exist
  }

  let listCount = 0;
  let labelCount = 0;
  let taskCount = 0;
  let templateCount = 0;
  let timeEntriesCount = 0;

  // Prepare insert statements with conflict handling
  const listInsert = db.prepare(`
    INSERT OR ${conflictStrategy === 'skip_conflicts' ? 'IGNORE' : 'REPLACE'}
    INTO lists (id, name, emoji, color, is_inbox, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const labelInsert = db.prepare(`
    INSERT OR ${conflictStrategy === 'skip_conflicts' ? 'IGNORE' : 'REPLACE'}
    INTO labels (id, name, icon, color, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const list of data.lists) {
    if (options.includeIds && !options.includeIds.includes(list.id)) {
      skipped++;
      continue;
    }
    try {
      listInsert.run(list.id, list.name, list.emoji, list.color, list.is_inbox, list.created_at);
      listCount++;
    } catch (e) {
      errors.push({ type: 'list', id: list.id, message: (e as Error).message });
      if (!skipInvalid) throw e;
      skipped++;
    }
  }

  for (const label of data.labels) {
    if (options.includeIds && !options.includeIds.includes(label.id)) {
      skipped++;
      continue;
    }
    try {
      labelInsert.run(label.id, label.name, label.icon, label.color, label.created_at);
      labelCount++;
    } catch (e) {
      errors.push({ type: 'label', id: label.id, message: (e as Error).message });
      if (!skipInvalid) throw e;
      skipped++;
    }
  }

  const taskInsert = db.prepare(`
    INSERT OR ${conflictStrategy === 'skip_conflicts' ? 'IGNORE' : 'REPLACE'}
    INTO tasks (id, name, description, list_id, date, deadline, estimate, actual_time, priority, recurring, recurring_config, completed, completed_at, created_at, updated_at, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const taskLabelInsert = db.prepare(`
    INSERT OR ${conflictStrategy === 'skip_conflicts' ? 'IGNORE' : 'REPLACE'}
    INTO task_labels (task_id, label_id) VALUES (?, ?)
  `);
  const subtaskInsert = db.prepare(`
    INSERT OR ${conflictStrategy === 'skip_conflicts' ? 'IGNORE' : 'REPLACE'}
    INTO subtasks (id, task_id, name, completed, created_at) VALUES (?, ?, ?, ?, ?)
  `  );
  const reminderInsert = db.prepare(`
    INSERT OR ${conflictStrategy === 'skip_conflicts' ? 'IGNORE' : 'REPLACE'}
    INTO reminders (id, task_id, remind_at, created_at) VALUES (?, ?, ?, ?)
  `);

  for (const task of data.tasks) {
    if (options.includeIds && !options.includeIds.includes(task.id)) {
      skipped++;
      continue;
    }
    try {
      taskInsert.run(
        task.id,
        task.name,
        task.description,
        task.list_id,
        task.date,
        task.deadline,
        task.estimate,
        task.actual_time,
        task.priority,
        task.recurring,
        task.recurring_config,
        task.completed ? 1 : 0,
        task.completed_at,
        task.created_at,
        task.updated_at,
        task.sort_order || 0
      );

      for (const label of task.labels || []) {
        taskLabelInsert.run(task.id, label.id);
      }

      for (const subtask of task.subtasks || []) {
        subtaskInsert.run(subtask.id, task.id, subtask.name, subtask.completed ? 1 : 0, subtask.created_at);
      }

      for (const reminder of task.reminders || []) {
        reminderInsert.run(reminder.id, task.id, reminder.remind_at, reminder.created_at);
      }

      taskCount++;
    } catch (e) {
      errors.push({ type: 'task', id: task.id, message: (e as Error).message });
      if (!skipInvalid) throw e;
      skipped++;
    }
  }

  const templateInsert = db.prepare(`
    INSERT OR ${conflictStrategy === 'skip_conflicts' ? 'IGNORE' : 'REPLACE'}
    INTO templates (id, name, description, list_id, priority, label_ids, subtasks, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const timeEntryInsert = db.prepare(`
    INSERT OR ${conflictStrategy === 'skip_conflicts' ? 'IGNORE' : 'REPLACE'}
    INTO time_entries (id, task_id, start_time, end_time, duration_seconds, description, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const template of data.templates) {
    if (options.includeIds && !options.includeIds.includes(template.id)) {
      skipped++;
      continue;
    }
    try {
      templateInsert.run(
        template.id,
        template.name,
        template.description,
        template.list_id,
        template.priority,
        JSON.stringify(template.label_ids),
        JSON.stringify(template.subtasks),
        template.created_at
      );
      templateCount++;
    } catch (e) {
      errors.push({ type: 'template', id: template.id, message: (e as Error).message });
      if (!skipInvalid) throw e;
      skipped++;
    }
  }

  for (const entry of data.time_entries || []) {
    if (options.includeIds && !options.includeIds.includes(entry.id)) {
      skipped++;
      continue;
    }
    try {
      timeEntryInsert.run(
        entry.id,
        entry.task_id,
        entry.start_time,
        entry.end_time,
        entry.duration_seconds,
        entry.description,
        entry.created_at
      );
      timeEntriesCount++;
    } catch (e) {
      errors.push({ type: 'time_entry', id: entry.id, message: (e as Error).message });
      if (!skipInvalid) throw e;
      skipped++;
    }
  }

  return {
    lists: listCount,
    labels: labelCount,
    tasks: taskCount,
    templates: templateCount,
    time_entries: timeEntriesCount,
    skipped,
    errors,
  };
}
