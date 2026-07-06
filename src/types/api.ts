/**
 * End-to-end API response types
 * Provides type safety for API responses across the application
 */

import type { Task, List, Label, Template, User } from "./index";

// Common API response wrapper
export interface ApiResponse<T> {
  data: T;
  success: boolean;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: string;
}

// Auth responses
export interface AuthResponse {
  user: User & { id: string };
  token?: string;
}

// Task responses
export type TaskResponse = TaskWithRelationsResponse;

export interface TasksResponse {
  tasks: TaskWithRelationsResponse[];
  total: number;
  hasMore: boolean;
}

export type TaskWithRelationsResponse = Task & {
  labels: Label[];
  subtasks: SubtaskResponse[];
  reminders: ReminderResponse[];
  comments: CommentResponse[];
  time_entries: TimeEntryResponse[];
  recurring_exceptions: RecurringExceptionResponse[];
}

export interface SubtaskResponse {
  id: number;
  task_id: number;
  name: string;
  completed: boolean;
  created_at: string;
}

export interface ReminderResponse {
  id: number;
  task_id: number;
  remind_at: string;
  created_at: string;
}

export interface CommentResponse {
  id: number;
  task_id: number;
  content: string;
  created_at: string;
}

export interface TimeEntryResponse {
  id: number;
  task_id: number;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
  description: string | null;
  created_at: string;
}

export interface RecurringExceptionResponse {
  id: number;
  task_id: number;
  exception_date: string;
  created_at: string;
}

// List responses
export type ListResponse = List;

export interface ListsResponse {
  lists: List[];
}

// Label responses
export type LabelResponse = Label;

export interface LabelsResponse {
  labels: Label[];
}

// Template responses
export type TemplateResponse = Template;

export interface TemplatesResponse {
  templates: Template[];
}

// Dashboard/Analytics responses
export interface DashboardStats {
  overdueCount: number;
  completedToday: number;
  pendingCount: number;
  highPriorityCount: number;
  productivityTrend: number;
}

export interface TimeReportResponse {
  taskId: number;
  taskName: string;
  totalSeconds: number;
  entries: TimeEntryResponse[];
}

// WebSocket message types
export interface WSMessage {
  type: "task_update" | "task_created" | "task_deleted" | "presence_change" | "typing";
  taskId?: number;
  userId?: number;
  userName?: string;
  data?: Partial<Task>;
  timestamp: string;
}

// Error response type
export interface ErrorResponse {
  error: string;
  code?: string;
  validationErrors?: Array<{ field: string; message: string }>;
}