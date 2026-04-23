export type Priority = "high" | "medium" | "low" | "none";
export type Recurring = "none" | "daily" | "weekly" | "weekdays" | "monthly" | "yearly" | "custom";
export type ViewType = "today" | "next7" | "upcoming" | "all" | "list";

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

export interface Task {
  id: number;
  name: string;
  description: string | null;
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
  labels?: Label[];
  subtasks?: Subtask[];
  reminders?: Reminder[];
  logs?: TaskLog[];
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
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  completed?: boolean;
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
