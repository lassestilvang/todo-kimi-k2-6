import { z } from "zod";

export const taskSchema = z.object({
  name: z.string().min(1, "Task name is required"),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  list_id: z.number().optional(),
  date: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(),
  estimate: z.string().optional().nullable(),
  actual_time: z.string().optional().nullable(),
  priority: z.enum(["critical", "high", "medium", "low", "none"]).default("none"),
  recurring: z.enum(["none", "daily", "weekly", "weekdays", "monthly", "yearly", "custom"]).default("none"),
  recurring_config: z.string().optional().nullable(),
  label_ids: z.array(z.number()).optional(),
  subtasks: z.array(z.string()).optional(),
  reminders: z.array(z.string()).optional(),
});

export const listSchema = z.object({
  name: z.string().min(1, "List name is required"),
  emoji: z.string().max(2, "Emoji must be 2 characters or less").optional().default("📋"),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color format").optional().default("#6366f1"),
});

export const labelSchema = z.object({
  name: z.string().min(1, "Label name is required"),
  icon: z.string().max(2, "Icon must be 2 characters or less").optional().default("🏷️"),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color format").optional().default("#8b5cf6"),
});

export type TaskFormData = z.infer<typeof taskSchema>;
export type ListFormData = z.infer<typeof listSchema>;
export type LabelFormData = z.infer<typeof labelSchema>;