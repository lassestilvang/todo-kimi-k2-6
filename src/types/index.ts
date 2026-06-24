export type Priority = "critical" | "high" | "medium" | "low" | "none";
export type Recurring = "none" | "daily" | "weekly" | "weekdays" | "monthly" | "yearly" | "custom";
export type ViewType = "today" | "next7" | "upcoming" | "all" | "list" | "blocked";
export type FilterPreset = "needs_attention" | "this_week" | "with_labels" | "with_subtasks" | "completed";
export type SortField = "name" | "date" | "deadline" | "priority" | "created_at" | "updated_at";
export type SortDirection = "asc" | "desc";

export interface List {
  id: number;
  name: string;
  emoji: string;
  color: string;
  is_inbox: boolean;
  created_at: string;
}

export interface Label {
  id: number;
  name: string;
  icon: string;
  color: string;
  created_at: string;
}

export interface Subtask {
  id: number;
  task_id: number;
  name: string;
  completed: boolean;
  created_at: string;
}

export interface Reminder {
  id: number;
  task_id: number;
  remind_at: string;
  created_at: string;
}

export interface TaskLog {
  id: number;
  task_id: number;
  action: string;
  details: string | null;
  created_at: string;
}

export interface TimeEntry {
  id: number;
  task_id: number;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
  description: string | null;
  created_at: string;
}

export interface TaskAttachment {
  id: number;
  task_id: number;
  filename: string;
  file_size: number;
  mime_type: string;
  url: string;
  created_at: string;
}

export interface CreateAttachmentInput {
  task_id: number;
  filename: string;
  file_size: number;
  mime_type: string;
  url: string;
}

export interface User {
  id: number;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface TaskShare {
  id: number;
  task_id: number;
  user_id: number;
  permission: "view" | "edit";
  created_at: string;
}

export interface CalendarSync {
  id: number;
  user_id: number;
  provider: "google" | "outlook";
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  enabled: boolean;
  created_at: string;
}

export interface Task {
  id: number;
  name: string;
  description: string | null;
  notes: string | null;
  list_id: number | null;
  date: string | null;
  deadline: string | null;
  estimate: string | null;
  actual_time: string | null;
  priority: Priority;
  recurring: Recurring;
  recurring_config: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  sort_order: number;
  labels?: Label[];
  subtasks?: Subtask[];
  reminders?: Reminder[];
  logs?: TaskLog[];
  comments?: TaskComment[];
  blockers?: TaskDependency[];
  blocked_by?: TaskDependency[];
  time_entries?: TimeEntry[];
  assignee_id?: number | null;
  created_by?: number | null;
}

export interface TaskWithRelations extends Task {
  labels: Label[];
  subtasks: Subtask[];
  reminders: Reminder[];
  logs: TaskLog[];
}

export interface CreateTaskInput {
  name: string;
  description?: string;
  list_id?: number;
  date?: string;
  deadline?: string;
  estimate?: string;
  actual_time?: string;
  priority?: Priority;
  recurring?: Recurring;
  recurring_config?: string;
  label_ids?: number[];
  subtasks?: string[];
  reminders?: string[];
  blocker_ids?: number[];
}

export interface UpdateTaskInput extends Partial<Omit<CreateTaskInput, 'completed'>> {
  completed?: boolean;
  blocker_ids?: number[];
}

export interface CreateListInput {
  name: string;
  emoji?: string;
  color?: string;
}

export interface CreateLabelInput {
  name: string;
  icon?: string;
  color?: string;
}

export interface TaskDependency {
  id: number;
  task_id: number;
  depends_on_task_id: number;
  created_at: string;
}

export interface Template {
  id: number;
  name: string;
  description: string | null;
  list_id: number | null;
  priority: Priority;
  label_ids: number[];
  subtasks: string[];
  created_at: string;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  list_id?: number;
  priority?: Priority;
  label_ids?: number[];
  subtasks?: string[];
}

export interface TaskComment {
  id: number;
  task_id: number;
  content: string;
  created_at: string;
}

export interface CreateCommentInput {
  content: string;
}

export interface BulkAction {
  type: "delete" | "move" | "label" | "priority";
  value?: number; // list_id for move, label_id for label, priority for priority
}

export interface CreateTimeEntryInput {
  task_id: number;
  start_time: string;
  end_time?: string;
  duration_seconds?: number;
  description?: string;
}
