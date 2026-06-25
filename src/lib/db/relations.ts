import type { Database } from "./driver";
import type {
  Task,
  Label,
  Subtask,
  Reminder,
  TaskLog,
  TaskComment,
  TaskAttachment,
  TaskDependency,
  TimeEntry,
  User,
} from "@/types";

interface LabelWithTaskId extends Label {
  task_id: number;
}

interface AssigneeWithTask {
  task_id: number;
  user_id: number;
  user_email: string;
  user_name: string | null;
  avatar_url: string | null;
}

/**
 * Fetches all relations for a set of tasks in a single batch operation.
 * Returns an object mapping task IDs to their relations.
 */
export async function getTaskRelations(
  db: Database,
  taskIds: number[]
): Promise<Record<number, {
  labels: Label[];
  subtasks: Subtask[];
  reminders: Reminder[];
  logs: TaskLog[];
  comments: TaskComment[];
  attachments: TaskAttachment[];
  blockers: TaskDependency[];
  blocked_by: TaskDependency[];
  assignee: User | undefined;
  time_entries: TimeEntry[];
}>> {
  if (taskIds.length === 0) return {};

  const [
    labelsResult,
    subtasksResult,
    remindersResult,
    logsResult,
    commentsResult,
    blockersResult,
    blockedByResult,
    assigneesResult,
    attachmentsResult,
    timeEntriesResult,
  ] = await Promise.all([
    db
      .prepare(
        `SELECT l.*, tl.task_id FROM labels l
         JOIN task_labels tl ON l.id = tl.label_id
         WHERE tl.task_id IN (${taskIds.map(() => "?").join(",")})`
      )
      .all(...taskIds) as LabelWithTaskId[],
    db.prepare(`SELECT * FROM subtasks WHERE task_id IN (${taskIds.map(() => "?").join(",")}) ORDER BY task_id, id`).all(...taskIds) as Subtask[],
    db
      .prepare(`SELECT * FROM reminders WHERE task_id IN (${taskIds.map(() => "?").join(",")}) ORDER BY task_id, remind_at`)
      .all(...taskIds) as Reminder[],
    db
      .prepare(`SELECT * FROM task_logs WHERE task_id IN (${taskIds.map(() => "?").join(",")}) ORDER BY task_id, created_at DESC`)
      .all(...taskIds) as TaskLog[],
    db.prepare(`SELECT * FROM task_comments WHERE task_id IN (${taskIds.map(() => "?").join(",")}) ORDER BY task_id, created_at ASC`).all(...taskIds) as TaskComment[],
    db
      .prepare(`SELECT td.*, t.name as blocked_task_name FROM task_dependencies td JOIN tasks t ON td.task_id = t.id WHERE td.depends_on_task_id IN (${taskIds.map(() => "?").join(",")})`)
      .all(...taskIds) as TaskDependency[],
    db
      .prepare(`SELECT td.*, t.name as blocking_task_name FROM task_dependencies td JOIN tasks t ON td.depends_on_task_id = t.id WHERE td.task_id IN (${taskIds.map(() => "?").join(",")})`)
      .all(...taskIds) as TaskDependency[],
    db
      .prepare(
        `SELECT t.id as task_id, u.id as user_id, u.email as user_email, u.name as user_name, u.avatar_url
         FROM tasks t
         LEFT JOIN task_shares ts ON t.id = ts.task_id
         LEFT JOIN users u ON ts.user_id = u.id
         WHERE t.id IN (${taskIds.map(() => "?").join(",")}) AND ts.permission = 'edit'`
      )
      .all(...taskIds) as AssigneeWithTask[],
    db.prepare(`SELECT * FROM task_attachments WHERE task_id IN (${taskIds.map(() => "?").join(",")}) ORDER BY task_id, created_at DESC`).all(...taskIds) as TaskAttachment[],
    db.prepare(`SELECT * FROM time_entries WHERE task_id IN (${taskIds.map(() => "?").join(",")}) ORDER BY task_id, created_at ASC`).all(...taskIds) as TimeEntry[],
  ]);

  // Group relations by task_id
  const labelsByTask = (labelsResult || []).reduce((acc, label) => {
    if (!acc[label.task_id]) acc[label.task_id] = [];
    acc[label.task_id].push(label);
    return acc;
  }, {} as Record<number, Label[]>);

  const subtasksByTask = (subtasksResult || []).reduce((acc, subtask) => {
    if (!acc[subtask.task_id]) acc[subtask.task_id] = [];
    acc[subtask.task_id].push(subtask);
    return acc;
  }, {} as Record<number, Subtask[]>);

  const remindersByTask = (remindersResult || []).reduce((acc, reminder) => {
    if (!acc[reminder.task_id]) acc[reminder.task_id] = [];
    acc[reminder.task_id].push(reminder);
    return acc;
  }, {} as Record<number, Reminder[]>);

  const logsByTask = (logsResult || []).reduce((acc, log) => {
    if (!acc[log.task_id]) acc[log.task_id] = [];
    acc[log.task_id].push(log);
    return acc;
  }, {} as Record<number, TaskLog[]>);

  const commentsByTask = (commentsResult || []).reduce((acc, comment) => {
    if (!acc[comment.task_id]) acc[comment.task_id] = [];
    acc[comment.task_id].push(comment);
    return acc;
  }, {} as Record<number, TaskComment[]>);

  const blockersByTask = (blockersResult || []).reduce((acc, dep) => {
    if (!acc[dep.depends_on_task_id]) acc[dep.depends_on_task_id] = [];
    acc[dep.depends_on_task_id].push(dep);
    return acc;
  }, {} as Record<number, TaskDependency[]>);

  const blockedByTask = (blockedByResult || []).reduce((acc, dep) => {
    if (!acc[dep.task_id]) acc[dep.task_id] = [];
    acc[dep.task_id].push(dep);
    return acc;
  }, {} as Record<number, TaskDependency[]>);

  const assigneesByTask = (assigneesResult || []).reduce((acc, assignee) => {
    if (!acc[assignee.task_id]) acc[assignee.task_id] = [];
    acc[assignee.task_id].push({
      id: assignee.user_id,
      email: assignee.user_email,
      name: assignee.user_name,
      avatar_url: assignee.avatar_url,
    } as User);
    return acc;
  }, {} as Record<number, User[]>);

  const attachmentsByTask = (attachmentsResult || []).reduce((acc, att) => {
    if (!acc[att.task_id]) acc[att.task_id] = [];
    acc[att.task_id].push(att);
    return acc;
  }, {} as Record<number, TaskAttachment[]>);

  const timeEntriesByTask = (timeEntriesResult || []).reduce((acc, entry) => {
    if (!acc[entry.task_id]) acc[entry.task_id] = [];
    acc[entry.task_id].push(entry);
    return acc;
  }, {} as Record<number, TimeEntry[]>);

  // Build the final result
  const result: Record<number, {
    labels: Label[];
    subtasks: Subtask[];
    reminders: Reminder[];
    logs: TaskLog[];
    comments: TaskComment[];
    attachments: TaskAttachment[];
    blockers: TaskDependency[];
    blocked_by: TaskDependency[];
    assignee: User | undefined;
    time_entries: TimeEntry[];
  }> = {};

  for (const taskId of taskIds) {
    result[taskId] = {
      labels: labelsByTask[taskId] || [],
      subtasks: subtasksByTask[taskId] || [],
      reminders: remindersByTask[taskId] || [],
      logs: logsByTask[taskId] || [],
      comments: commentsByTask[taskId] || [],
      attachments: attachmentsByTask[taskId] || [],
      blockers: blockersByTask[taskId] || [],
      blocked_by: blockedByTask[taskId] || [],
      assignee: assigneesByTask[taskId]?.[0],
      time_entries: timeEntriesByTask[taskId] || [],
    };
  }

  return result;
}