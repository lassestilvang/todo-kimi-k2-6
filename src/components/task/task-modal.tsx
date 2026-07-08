"use client";

import { useState, useEffect, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { taskSchema, type TaskFormData } from "@/lib/validation";
import { saveOfflineTask } from "@/lib/offline-storage";
import type {
  TaskWithRelations,
  List,
  Label as LabelType,
  Priority,
  Recurring,
  Template,
  TemplateCategory,
} from "@/types";
import { createTask as createTaskAction, updateTask as updateTaskAction, addTaskComment, saveTemplateFromTask, getTemplateCategories } from "@/lib/actions";
import {
  TaskBasicInfo,
  TaskSchedule,
  TaskLabels,
  TaskSubtasks,
  TaskDependencies,
  TaskAttachments,
  TaskCommentsTab,
  TaskCollaborateTab,
  TaskAssignTab,
  TaskTemplateTab,
  TaskStreakTab,
} from "./modal";
import { TimeReport } from "./time-report";
import { PomodoroTimer } from "./pomodoro-timer";
// Icons
import {
  Calendar,
  Clock,
  Tag,
  Plus,
  Trash2,
  X,
  Paperclip,
  Flag,
  Repeat,
  ListChecks,
  Link,
  CheckCircle2,
  Share2,
  Flame,
} from "lucide-react";

interface TaskModalProps {
  task?: TaskWithRelations | undefined;
  lists: List[];
  labels: LabelType[];
  templates: Template[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  allTasks: TaskWithRelations[];
}

const priorities: { value: Priority; label: string; color: string }[] = [
  { value: "critical", label: "Critical", color: "bg-red-600" },
  { value: "high", label: "High", color: "bg-red-500" },
  { value: "medium", label: "Medium", color: "bg-amber-500" },
  { value: "low", label: "Low", color: "bg-blue-500" },
  { value: "none", label: "None", color: "bg-gray-400" },
];

const recurringOptions: { value: Recurring; label: string }[] = [
  { value: "none", label: "No recurrence" },
  { value: "daily", label: "Every day" },
  { value: "weekly", label: "Every week" },
  { value: "weekdays", label: "Every weekday" },
  { value: "monthly", label: "Every month" },
  { value: "yearly", label: "Every year" },
  { value: "custom", label: "Custom..." },
];

export function TaskModal({
  task,
  lists,
  labels,
  templates,
  open,
  onOpenChange,
  onSuccess,
  allTasks,
}: TaskModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [listId, setListId] = useState("1");
  const [date, setDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [estimate, setEstimate] = useState("");
  const [actualTime, setActualTime] = useState("");
  const [priority, setPriority] = useState<Priority>("none");
  const [recurring, setRecurring] = useState<Recurring>("none");
  const [selectedLabels, setSelectedLabels] = useState<number[]>([]);
  const [subtaskInput, setSubtaskInput] = useState("");
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [reminderInput, setReminderInput] = useState("");
  const [reminders, setReminders] = useState<string[]>([]);
  const [recurringConfig, setRecurringConfig] = useState<{
    interval?: number;
    unit?: "days" | "weeks" | "months" | "years";
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"task" | "template" | "comments" | "time" | "pomodoro" | "assign" | "attachments" | "collaborate" | "streak">("task");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [assignees, setAssignees] = useState<Array<{ user_id: number; user_email: string; user_name: string | null; permission: "view" | "edit" }>>([]);
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState("");
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  // Dependencies (blockers)
  const [selectedBlocks, setSelectedBlocks] = useState<number[]>(
    task?.blocked_by?.map((d) => d.depends_on_task_id) || []
  );
  const [blockSearchQuery, setBlockSearchQuery] = useState("");

  // Comments
  const [newComment, setNewComment] = useState("");

  const isEditing = !!task;

  // Get available tasks for blocking (exclude self and already completed)
  const availableBlockingTasks = (allTasks || [])
    .filter((t) => !t.completed && t.id !== task?.id)
    .filter((t) => t.name.toLowerCase().includes(blockSearchQuery.toLowerCase()))
    .slice(0, 20);

  // Initialize form state when modal opens
  const initializeForm = () => {
    if (task) {
      setName(task.name);
      setDescription(task.description || "");
      setNotes(task.notes || "");
      setListId(String(task.list_id || 1));
      setDate(task.date || "");
      setDeadline(task.deadline || "");
      setEstimate(task.estimate || "");
      setActualTime(task.actual_time || "");
      setPriority(task.priority);
      setRecurring(task.recurring);
      setSelectedLabels(task.labels.map((l) => l.id));
      setSubtasks(task.subtasks.map((s) => s.name));
      setReminders(task.reminders.map((r) => r.remind_at));
      setSelectedBlocks(task.blocked_by?.map((d) => d.depends_on_task_id) || []);
      if (task.recurring === "custom" && task.recurring_config) {
        setRecurringConfig(JSON.parse(task.recurring_config));
      }
      // Load assignees
      if (task.assignee) {
        setAssignees([{
          user_id: task.assignee.id,
          user_email: task.assignee.email,
          user_name: task.assignee.name,
          permission: "edit"
        }]);
      }
    } else {
      // Apply template if selected
      if (selectedTemplate) {
        setName(selectedTemplate.name);
        setDescription(selectedTemplate.description || "");
        setListId(String(selectedTemplate.list_id || 1));
        setPriority(selectedTemplate.priority);
        setSelectedLabels(selectedTemplate.label_ids || []);
        setSubtasks(selectedTemplate.subtasks || []);
      } else {
        setName("");
        setDescription("");
        setNotes("");
        setListId("1");
        setDate("");
        setDeadline("");
        setEstimate("");
        setActualTime("");
        setPriority("none");
        setRecurring("none");
        setSelectedLabels([]);
        setSubtaskInput("");
        setSubtasks([]);
        setReminderInput("");
        setReminders([]);
        setSelectedBlocks([]);
        setRecurringConfig({});
      }
    }
    setSelectedTemplate(null);
  };

  useEffect(() => {
    if (open) {
      const timer = setTimeout(initializeForm, 0);
      // Load categories
      getTemplateCategories().then(setCategories).catch(console.error);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return undefined;
  }, [open]);

  const handleSubmit = async () => {
    if (!name.trim()) return;

    // Check for similar tasks before creating new one
    if (!isEditing && !task) {
      try {
        const similarTasks = await (await import("@/lib/actions/tasks")).findSimilarTasks(name);
        if (similarTasks.length > 0) {
          const shouldContinue = confirm(
            `Found ${similarTasks.length} similar task(s): "${similarTasks[0].name}"\n\nDo you still want to create this task?`
          );
          if (!shouldContinue) {
            return;
          }
        }
      } catch (error) {
        console.error("Failed to check for similar tasks:", error);
      }
    }

    // Validate form data
    const formData: TaskFormData = {
      name,
      description,
      notes,
      list_id: Number(listId),
      date: date || undefined,
      deadline: deadline || undefined,
      estimate: estimate || undefined,
      actual_time: actualTime || undefined,
      priority,
      recurring,
      recurring_config: recurring === "custom" && recurringConfig.interval && recurringConfig.unit
        ? JSON.stringify(recurringConfig)
        : undefined,
      label_ids: selectedLabels,
      subtasks,
      reminders,
    };

    const parsed = taskSchema.safeParse(formData);
    if (!parsed.success) {
      const errorMessage = parsed.error.issues[0]?.message || "Validation error";
      toast.error(errorMessage);
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && task) {
        await updateTaskAction(task.id, {
          name: parsed.data.name,
          description: parsed.data.description ?? undefined,
          list_id: parsed.data.list_id || 1,
          date: parsed.data.date ?? undefined,
          deadline: parsed.data.deadline ?? undefined,
          estimate: parsed.data.estimate ?? undefined,
          actual_time: parsed.data.actual_time ?? undefined,
          priority: parsed.data.priority,
          recurring: parsed.data.recurring,
          recurring_config: parsed.data.recurring_config ?? undefined,
          label_ids: parsed.data.label_ids,
          subtasks: parsed.data.subtasks,
          reminders: parsed.data.reminders,
          blocker_ids: selectedBlocks,
        });
        toast.success("Task updated successfully");
      } else {
        await createTaskAction({
          name: parsed.data.name,
          description: parsed.data.description ?? undefined,
          list_id: parsed.data.list_id || 1,
          date: parsed.data.date ?? undefined,
          deadline: parsed.data.deadline ?? undefined,
          estimate: parsed.data.estimate ?? undefined,
          actual_time: parsed.data.actual_time ?? undefined,
          priority: parsed.data.priority,
          recurring: parsed.data.recurring,
          recurring_config: parsed.data.recurring_config ?? undefined,
          label_ids: parsed.data.label_ids,
          subtasks: parsed.data.subtasks,
          reminders: parsed.data.reminders,
          blocker_ids: selectedBlocks,
        });
        toast.success("Task created successfully");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      // If offline, save to offline storage
      if (!navigator.onLine) {
        // Convert null values to undefined for offline storage
        const offlineData = isEditing ? { id: task.id, ...parsed.data } : parsed.data;
        saveOfflineTask(isEditing ? "update" : "create", offlineData as any);
        toast.success("Task saved locally. Will sync when online.");
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error("Failed to save task. Please try again.");
      }
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleLabel = (labelId: number) => {
    setSelectedLabels((prev) =>
      prev.includes(labelId)
        ? prev.filter((id) => id !== labelId)
        : [...prev, labelId]
    );
  };

  const addSubtask = () => {
    if (!subtaskInput.trim()) return;
    setSubtasks((prev) => [...prev, subtaskInput.trim()]);
    setSubtaskInput("");
  };

  const removeSubtask = (index: number) => {
    setSubtasks((prev) => prev.filter((_, i) => i !== index));
  };

  const addReminder = () => {
    if (!reminderInput.trim()) return;
    setReminders((prev) => [...prev, reminderInput.trim()]);
    setReminderInput("");
  };

  const removeReminder = (index: number) => {
    setReminders((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleBlocker = (taskId: number) => {
    setSelectedBlocks((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleUseTemplate = (template: Template) => {
    setName(template.name);
    setDescription(template.description || "");
    setListId(String(template.list_id || 1));
    setPriority(template.priority);
    setSelectedLabels(template.label_ids || []);
    setSubtasks(template.subtasks || []);
    setActiveTab("task");
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !task) return;
    try {
      const comment = await addTaskComment(task.id, { content: newComment });
      // Refresh task to show the new comment
      onSuccess();
      setNewComment("");
      toast.success("Comment added");
    } catch {
      toast.error("Failed to add comment");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>
            {isEditing ? "Edit Task" : "New Task"}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-2">
          <div className="flex space-x-1 border-b">
            <button
              className={cn(
                "pb-2 text-sm font-medium",
                activeTab === "task"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setActiveTab("task")}
            >
              Task
            </button>
            {templates.length > 0 && (
              <button
                className={cn(
                  "pb-2 text-sm font-medium",
                  activeTab === "template"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setActiveTab("template")}
              >
                Templates ({templates.length})
              </button>
            )}
            {isEditing && (
              <button
                className={cn(
                  "pb-2 text-sm font-medium",
                  activeTab === "comments"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setActiveTab("comments")}
              >
                Comments
              </button>
            )}
            {isEditing && (
              <button
                className={cn(
                  "pb-2 text-sm font-medium",
                  activeTab === "time"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setActiveTab("time")}
              >
                Time Tracking
              </button>
            )}
            {isEditing && (
              <button
                className={cn(
                  "pb-2 text-sm font-medium",
                  activeTab === "pomodoro"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setActiveTab("pomodoro")}
              >
                Pomodoro
              </button>
            )}
            {isEditing && (
              <button
                className={cn(
                  "pb-2 text-sm font-medium",
                  activeTab === "assign"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setActiveTab("assign")}
              >
                Assign
              </button>
            )}
            {isEditing && (
              <button
                className={cn(
                  "pb-2 text-sm font-medium",
                  activeTab === "attachments"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setActiveTab("attachments")}
              >
                <Paperclip className="h-3.5 w-3.5 mr-1.5 inline" />
                Files
              </button>
            )}
            {isEditing && (
              <button
                className={cn(
                  "pb-2 text-sm font-medium",
                  activeTab === "collaborate"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setActiveTab("collaborate")}
              >
                <Share2 className="h-3.5 w-3.5 mr-1.5 inline" />
                Share
              </button>
            )}
            {isEditing && task?.recurring !== "none" && (
              <button
                className={cn(
                  "pb-2 text-sm font-medium",
                  activeTab === "streak"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setActiveTab("streak")}
              >
                <Flame className="h-3.5 w-3.5 mr-1.5 inline" />
                Streak
              </button>
            )}
          </div>
        </div>

        <ScrollArea className="px-6 pb-6 max-h-[calc(90vh-120px)]">
          {activeTab === "task" && (
            <div className="space-y-5 pt-4">
              {!isEditing && templates.length > 0 && (
                <div className="space-y-2">
                  <Label>Start from Template</Label>
                  <Select
                    value={selectedTemplate?.id?.toString() || ""}
                    onValueChange={(value) => {
                      const template = templates.find((t) => t.id === Number(value));
                      setSelectedTemplate(template || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={String(template.id)}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Task Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="What needs to be done?"
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add details..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Notes (Markdown supported)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes..."
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Date
                  </Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Deadline
                  </Label>
                  <Input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>List</Label>
                  <Select value={listId} onValueChange={(v) => setListId(v || "1")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {lists.map((list) => (
                        <SelectItem key={list.id} value={String(list.id)}>
                          <span className="mr-1">{list.emoji}</span>
                          {list.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Flag className="h-3.5 w-3.5" />
                    Priority
                  </Label>
                  <Select
                    value={priority}
                    onValueChange={(v) => setPriority(v as Priority)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          <div className="flex items-center gap-2">
                            <span className={cn("h-2 w-2 rounded-full", p.color)} />
                            {p.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Repeat className="h-3.5 w-3.5" />
                    Recurring
                  </Label>
                  <Select
                    value={recurring}
                    onValueChange={(v) => setRecurring(v as Recurring)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {recurringOptions.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Custom recurring configuration */}
              {recurring === "custom" && (
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-2">
                    <Label>Repeat every</Label>
                    <Input
                      type="number"
                      min="1"
                      value={recurringConfig.interval || ""}
                      onChange={(e) =>
                        setRecurringConfig({
                          ...recurringConfig,
                          interval: parseInt(e.target.value) || 1,
                        })
                      }
                      placeholder="1"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label>Unit</Label>
                    <Select
                      value={recurringConfig.unit || "days"}
                      onValueChange={(v) =>
                        setRecurringConfig({
                          ...recurringConfig,
                          unit: v as "days" | "weeks" | "months" | "years",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="days">Days</SelectItem>
                        <SelectItem value="weeks">Weeks</SelectItem>
                        <SelectItem value="months">Months</SelectItem>
                        <SelectItem value="years">Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Estimate (HH:mm)
                  </Label>
                  <Input
                    type="time"
                    value={estimate}
                    onChange={(e) => setEstimate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Actual Time (HH:mm)
                  </Label>
                  <Input
                    type="time"
                    value={actualTime}
                    onChange={(e) => setActualTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" />
                  Labels
                </Label>
                <div className="flex flex-wrap gap-2">
                  {labels.map((label) => (
                    <button
                      key={label.id}
                      onClick={() => toggleLabel(label.id)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs transition-all border",
                        selectedLabels.includes(label.id)
                          ? "border-transparent text-white"
                          : "border-input bg-background hover:bg-muted"
                      )}
                      style={
                        selectedLabels.includes(label.id)
                          ? { backgroundColor: label.color }
                          : undefined
                      }
                    >
                      <span>{label.icon}</span>
                      {label.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <ListChecks className="h-3.5 w-3.5" />
                  Subtasks
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={subtaskInput}
                    onChange={(e) => setSubtaskInput(e.target.value)}
                    placeholder="Add a subtask..."
                    onKeyDown={(e) => e.key === "Enter" && addSubtask()}
                  />
                  <Button variant="outline" size="icon" onClick={addSubtask}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {subtasks.length > 0 && (
                  <div className="space-y-1">
                    {subtasks.map((subtask, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm"
                      >
                        <span className="flex-1">{subtask}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeSubtask(index)}
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Link className="h-3.5 w-3.5" />
                  Blocked by
                </Label>
                <Popover>
                  <PopoverTrigger>
                    <Button variant="outline" className="w-full justify-start">
                      {selectedBlocks.length > 0
                        ? `${selectedBlocks.length} task${selectedBlocks.length > 1 ? "s" : ""} blocking`
                        : "Add blocking task"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64" align="start">
                    <div className="space-y-2">
                      <Input
                        placeholder="Search tasks..."
                        value={blockSearchQuery}
                        onChange={(e) => setBlockSearchQuery(e.target.value)}
                      />
                      <div className="max-h-60 overflow-y-auto">
                        {availableBlockingTasks.map((t) => (
                          <button
                            key={t.id}
                            className={cn(
                              "w-full text-left text-sm rounded px-2 py-1.5 hover:bg-accent",
                              selectedBlocks.includes(t.id) && "bg-accent"
                            )}
                            onClick={() => toggleBlocker(t.id)}
                          >
                            <div className="font-medium truncate">{t.name}</div>
                            {t.date && (
                              <div className="text-xs text-muted-foreground">
                                {format(parseISO(t.date), "MMM d")}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                {selectedBlocks.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedBlocks.map((id) => {
                      const blockedTask = allTasks?.find((t) => t.id === id);
                      return blockedTask ? (
                        <Badge key={id} variant="secondary">
                          {blockedTask.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Reminders
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="datetime-local"
                    value={reminderInput}
                    onChange={(e) => setReminderInput(e.target.value)}
                  />
                  <Button variant="outline" size="icon" onClick={addReminder}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {reminders.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {reminders.map((reminder, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {format(parseISO(reminder), "MMM d, HH:mm")}
                        <button onClick={() => removeReminder(index)}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {task && task.logs.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Activity Log</Label>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {task.logs.slice(0, 10).map((log) => (
                        <div key={log.id} className="flex gap-2">
                          <span className="font-medium capitalize">{log.action}</span>
                          <span>{log.details}</span>
                          <span className="ml-auto text-xs">
                            {format(parseISO(log.created_at), "MMM d, HH:mm")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "time" && isEditing && task && (
            <TimeReport
              tasks={[task]}
              timeEntries={task.time_entries || []}
              period="all"
            />
          )}

          {activeTab === "pomodoro" && isEditing && task && (
            <div className="pt-4">
              <PomodoroTimer task={task} />
            </div>
          )}

          {activeTab === "template" && !isEditing && (
            <TaskTemplateTab
              name={name}
              description={description}
              listId={listId}
              priority={priority}
              selectedLabels={selectedLabels}
              subtasks={subtasks}
              templates={templates}
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              onUseTemplate={handleUseTemplate}
              onSuccess={onSuccess}
            />
          )}

          {activeTab === "comments" && isEditing && task && (
            <TaskCommentsTab
              task={task}
              comments={task.comments || []}
              onCommentsChange={onSuccess}
            />
          )}

          {activeTab === "attachments" && isEditing && task && (
            <TaskAttachments task={task} onAttachmentsChange={onSuccess} />
          )}

          {activeTab === "collaborate" && isEditing && task && (
            <TaskCollaborateTab task={task} />
          )}

          {activeTab === "assign" && isEditing && (
            <TaskAssignTab
              assignees={assignees}
              assigneeSearchQuery={assigneeSearchQuery}
              onAssigneeSearchChange={setAssigneeSearchQuery}
              onAssigneesChange={setAssignees}
            />
          )}

          {activeTab === "streak" && isEditing && task && (
            <TaskStreakTab task={task} />
          )}
        </ScrollArea>

        <DialogFooter className="px-6 py-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim()}>
            {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}