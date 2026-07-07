export type Priority = "critical" | "high" | "medium" | "low" | "none";
export type Recurring = "none" | "daily" | "weekly" | "weekdays" | "monthly" | "yearly" | "custom";
export type ViewType = "today" | "next7" | "upcoming" | "all" | "list" | "blocked" | "kanban" | "gantt" | "matrix" | "calendar" | "graph" | "analytics" | "ai" | "goals" | "focus" | "calendar_sync";
export type FilterPreset = "needs_attention" | "this_week" | "with_labels" | "with_subtasks" | "completed";
export type SortField = "name" | "date" | "deadline" | "priority" | "created_at" | "updated_at";
export type SortDirection = "asc" | "desc";

// Recurring task exceptions
export interface RecurringException {
  id: number;
  task_id: number;
  exception_date: string;
  created_at: string;
}

export interface SavedFilterPreset {
  id: number;
  user_id: number;
  name: string;
  filter_type: string | null;
  list_id: number | null;
  label_ids: number[];
  priority: Priority | null;
  created_at: string;
}

export interface CustomView {
  id: number;
  user_id: number;
  name: string;
  filter_preset: FilterPreset | null;
  list_id: number | null;
  label_ids: number[];
  priority: Priority | null;
  sort_field: SortField;
  sort_direction: SortDirection;
  view_type: ViewType;
  created_at: string;
}

export interface CreateCustomViewInput {
  name: string;
  filter_preset?: FilterPreset;
  list_id?: number;
  label_ids?: number[];
  priority?: Priority;
  sort_field?: SortField;
  sort_direction?: SortDirection;
  view_type?: ViewType;
}

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
  password_hash?: string;
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
  assignee_id?: number | null;
  assignee?: User;
  created_by?: number | null;
  created_by_user?: User;
  labels?: Label[];
  subtasks?: Subtask[];
  reminders?: Reminder[];
  logs?: TaskLog[];
  comments?: TaskComment[];
  attachments?: TaskAttachment[];
  blockers?: TaskDependency[];
  blocked_by?: TaskDependency[];
  time_entries?: TimeEntry[];
  recurring_exceptions?: RecurringException[];
}

export interface TaskWithRelations extends Task {
  labels: Label[];
  subtasks: Subtask[];
  reminders: Reminder[];
  logs: TaskLog[];
  comments: TaskComment[];
  attachments: TaskAttachment[];
  time_entries: TimeEntry[];
  recurring_exceptions: RecurringException[];
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
  recurring_exception_dates?: string[];
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

export interface TemplateCategory {
  id: number;
  name: string;
  description: string | null;
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
  category_id: number | null;
  category?: TemplateCategory;
  created_at: string;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  list_id?: number;
  priority?: Priority;
  label_ids?: number[];
  subtasks?: string[];
  category_id?: number;
}

export interface CreateTemplateCategoryInput {
  name: string;
  description?: string;
}

export interface TaskComment {
  id: number;
  task_id: number;
  content: string;
  created_at: string;
}

export interface CreateCommentInput {
  content: string;
  mentions?: number[];
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

// Habit Tracking Types
export interface HabitStreak {
  id: number;
  task_id: number;
  streak_count: number;
  last_completed: string | null;
  created_at: string;
  updated_at: string;
}

export interface HabitCompletion {
  id: number;
  task_id: number;
  date: string;
  completed_at: string;
}

export interface NotificationSettings {
  enabled: boolean;
  reminderMinutes: number;
  dueDateReminders: boolean;
  overdueReminders: boolean;
  dailySummary: boolean;
  pushEnabled: boolean;
}

// Goal Tracking Types
export type GoalPeriod = "daily" | "weekly" | "monthly" | "yearly";

export interface Goal {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  target_count: number;
  target_unit: string; // e.g., "tasks", "hours", "pomodoros"
  period: GoalPeriod;
  current_count: number;
  streak_count: number;
  last_updated: string | null;
  created_at: string;
}

export interface GoalMilestone {
  id: number;
  goal_id: number;
  name: string;
  target_count: number;
  current_count: number;
  due_date: string | null;
  completed: boolean;
  created_at: string;
}

export interface TaskVote {
  id: number;
  task_id: number;
  user_id: number;
  value: -1 | 1;
  created_at: string;
}

export interface CreateGoalInput {
  name: string;
  description?: string;
  target_count: number;
  target_unit: string;
  period: GoalPeriod;
}

export interface GoalProgress {
  goal: Goal;
  progress_percent: number;
  is_completed: boolean;
  days_remaining: number;
}

// User Settings Types
export interface UserSettings {
  id: number;
  user_id: number;
  work_start_hour: number;
  work_end_hour: number;
  preferred_pomodoro_minutes: number;
  preferred_break_minutes: number;
  theme: "light" | "dark" | "system";
  language: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

// Workspace Types - Basic type for display purposes
// Note: created_by and created_at may not be present in all contexts
export interface Workspace {
  id: number;
  name: string;
  description: string | null;
  created_by?: number | null;
  created_at?: string;
  role?: string;
}

export interface WorkspaceUser {
  id: number;
  workspace_id: number;
  user_id: number;
  role: "owner" | "admin" | "member" | "viewer";
  joined_at: string;
}

export interface CreateWorkspaceInput {
  name: string;
  description?: string;
}

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

// Custom View Sharing Types
export interface CustomViewShare {
  id: number;
  view_id: number;
  shared_by: number;
  shared_with: number | null;
  share_token: string | null;
  permission: "view" | "edit";
  created_at: string;
}
