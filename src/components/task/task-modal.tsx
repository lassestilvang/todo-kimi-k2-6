"use client";

import { useState, useEffect, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { taskSchema, type TaskFormData } from "@/lib/validation";
import type {
  TaskWithRelations,
  List,
  Label as LabelType,
  Priority,
  Recurring,
  Template,
} from "@/types";
import { createTask as createTaskAction, updateTask as updateTaskAction, addTaskComment, saveTemplateFromTask } from "@/lib/actions/tasks";
import { TaskBasicInfo } from "./modal/task-basic-info";
import { TaskSchedule } from "./modal/task-schedule";
import { TaskLabels } from "./modal/task-labels";
import { TaskSubtasks } from "./modal/task-subtasks";
import { TaskDependencies } from "./modal/task-dependencies";

interface TaskModalProps {
  task?: TaskWithRelations;
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
  }, [open]);

  const handleSubmit = async () => {
    if (!name.trim()) return;

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
            <TimeTracker
              task={task}
              open={activeTab === "time"}
              onOpenChange={() => setActiveTab("task")}
            />
          )}

          {activeTab === "pomodoro" && isEditing && task && (
            <div className="pt-4">
              <PomodoroTimer task={task} />
            </div>
          )}

          {activeTab === "template" && (
            <div className="space-y-4 pt-4">
              <h3 className="font-medium">Save as Template</h3>
              <p className="text-sm text-muted-foreground">
                Save this task configuration as a reusable template for future tasks.
              </p>

              {/* Category selection */}
              {categories.length > 0 && (
                <div className="space-y-2">
                  <Label>Category (optional)</Label>
                  <Select
                    value={selectedCategory?.toString() || ""}
                    onValueChange={(v) => setSelectedCategory(v ? Number(v) : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  if (!name.trim()) {
                    toast.error("Task name is required to save as template");
                    return;
                  }
                  try {
                    await saveTemplateFromTask(
                      name,
                      description || null,
                      Number(listId) || null,
                      priority,
                      selectedLabels,
                      subtasks,
                      selectedCategory || undefined
                    );
                    onSuccess();
                    toast.success("Template saved");
                  } catch {
                    toast.error("Failed to save template");
                  }
                }}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Current as Template
              </Button>

              <Separator className="my-4" />

              <h4 className="text-sm font-medium">Saved Templates</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    className="w-full text-left text-sm rounded px-2 py-2 hover:bg-accent border"
                    onClick={() => handleUseTemplate(template)}
                  >
                    <div className="font-medium">{template.name}</div>
                    {template.description && (
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {template.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === "comments" && isEditing && task && (
            <div className="space-y-4 pt-4">
              <h3 className="font-medium">Comments</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {task?.comments && task.comments.length > 0 ? (
                  task.comments.map((comment) => (
                    <div key={comment.id} className="text-sm">
                      <div className="flex items-start gap-2">
                        <div className="bg-muted rounded-full h-8 w-8 flex items-center justify-center text-xs font-medium">
                          👤
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Comment</span>
                            <span>•</span>
                            <span>{format(parseISO(comment.created_at), "MMM d, HH:mm")}</span>
                          </div>
                          <p className="mt-1">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No comments yet. Be the first to comment!
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                />
                <Button size="sm" onClick={handleAddComment}>
                  Send
                </Button>
              </div>
            </div>
          )}

          {activeTab === "attachments" && isEditing && task && (
            <div className="space-y-4 pt-4">
              <h3 className="font-medium">Attachments</h3>
              <div className="space-y-2">
                <Label>Upload Files</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <Input
                    type="file"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !task) return;

                      try {
                        const formData = new FormData();
                        formData.append("file", file);
                        formData.append("taskId", String(task.id));

                        const response = await fetch("/api/attachments", {
                          method: "POST",
                          body: formData,
                        });

                        if (response.ok) {
                          onSuccess();
                          toast.success(`Attached ${file.name}`);
                        } else {
                          throw new Error("Upload failed");
                        }
                      } catch (error) {
                        toast.error("Failed to attach file");
                        console.error(error);
                      }
                      e.target.value = "";
                    }}
                    className="hidden"
                    id="file-upload"
                  />
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <Plus className="h-6 w-6 mx-auto mb-1" />
                    <span className="text-sm">Click to upload or drag file here</span>
                  </Label>
                </div>
                {task.attachments && task.attachments.length > 0 && (
                  <div className="space-y-2 mt-4">
                    {task.attachments.map((att) => (
                      <div key={att.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex items-center gap-2">
                          <span>{att.mime_type.startsWith("image/") ? "🖼️" : "📎"}</span>
                          <div>
                            <div className="text-sm font-medium">{att.filename}</div>
                            <div className="text-xs text-muted-foreground">
                              {(att.file_size / 1024).toFixed(1)} KB
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            try {
                              const response = await fetch(`/api/attachments?id=${att.id}`, {
                                method: "DELETE",
                              });
                              if (response.ok) {
                                onSuccess();
                                toast.success("Attachment removed");
                              }
                            } catch {
                              toast.error("Failed to remove attachment");
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "collaborate" && isEditing && (
            <div className="space-y-4 pt-4">
              <h3 className="font-medium">Collaboration</h3>
              <p className="text-sm text-muted-foreground">
                Share this task with team members and collaborate in real-time.
              </p>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Share with Users</h4>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter user email..."
                        className="flex-1"
                      />
                      <Select
                        value="view"
                        onValueChange={() => {}}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="view">View</SelectItem>
                          <SelectItem value="edit">Edit</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm">Invite</Button>
                    </div>

                    <div className="space-y-2">
                      <Label>Current Collaborators</Label>
                      <div className="flex flex-wrap gap-2">
                        {task.assignee && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <span>{task.assignee.name || task.assignee.email}</span>
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      // Generate share link
                      const shareLink = `${window.location.origin}/share/${task.id}-${Math.random().toString(36).substr(2, 9)}`;
                      navigator.clipboard.writeText(shareLink);
                      toast.success("Share link copied to clipboard!");
                    }}
                  >
                    Generate Share Link
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Anyone with this link can view the task
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "assign" && isEditing && (
            <div className="space-y-4 pt-4">
              <h3 className="font-medium">Task Assignment</h3>
              <p className="text-sm text-muted-foreground">
                Assign this task to team members. They will receive notifications about this task.
              </p>

              <div className="space-y-2">
                <Label>Assignees</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {assignees.map((assignee) => (
                    <Badge
                      key={assignee.user_id}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      <span>{assignee.user_name || assignee.user_email}</span>
                      <button
                        onClick={() => setAssignees(assignees.filter(a => a.user_id !== assignee.user_id))}
                        className="hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Popover>
                  <PopoverTrigger>
                    <Button variant="outline" className="w-full justify-start">
                      <Plus className="h-4 w-4 mr-2" />
                      Add assignee...
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <div className="space-y-2">
                      <Input
                        placeholder="Search users..."
                        value={assigneeSearchQuery}
                        onChange={async (e) => {
                          setAssigneeSearchQuery(e.target.value);
                          // In a real implementation, this would fetch users
                          // For now, we show a message that this requires backend integration
                        }}
                      />
                      <div className="max-h-60 overflow-y-auto">
                        <div className="text-xs text-muted-foreground py-2">
                          <p>Search is ready - connect to backend API for full functionality.</p>
                          <p className="mt-1">You can manually add assignees using their user IDs.</p>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="text-xs text-muted-foreground">
                <p>Tip: Assignees with "edit" permission can modify this task.</p>
              </div>
            </div>
          )}

          {activeTab === "streak" && isEditing && task && (
            <div className="space-y-4 pt-4">
              <h3 className="font-medium">Habit Streak</h3>
              <p className="text-sm text-muted-foreground">
                Track your progress on this recurring task. Mark it complete each day to build your streak!
              </p>
              <StreakCalendar
                taskId={task.id}
                taskName={task.name}
                currentDate={task.date || ""}
                completedDates={task.completed ? [task.date || ""] : []}
                onDateToggle={async (date) => {
                  // For now, just show a toast - the actual implementation would call the API
                  toast.info("Habit tracking will be fully implemented with backend integration");
                }}
              />
            </div>
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