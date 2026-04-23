"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  X,
  Plus,
  Trash2,
  Clock,
  Calendar,
  Flag,
  Repeat,
  Tag,
  CheckCircle2,
  ListChecks,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import type {
  TaskWithRelations,
  List,
  Label as LabelType,
  Priority,
  Recurring,
} from "@/types";
import { createTask, updateTask, toggleSubtask } from "@/lib/actions/tasks";

interface TaskModalProps {
  task?: TaskWithRelations;
  lists: List[];
  labels: LabelType[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const priorities: { value: Priority; label: string; color: string }[] = [
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
];

export function TaskModal({
  task,
  lists,
  labels,
  open,
  onOpenChange,
  onSuccess,
}: TaskModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!task;

  useEffect(() => {
    if (task) {
      setName(task.name);
      setDescription(task.description || "");
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
    } else {
      setName("");
      setDescription("");
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
    }
  }, [task, open]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      if (isEditing && task) {
        await updateTask(task.id, {
          name,
          description,
          list_id: Number(listId),
          date: date || undefined,
          deadline: deadline || undefined,
          estimate: estimate || undefined,
          actual_time: actualTime || undefined,
          priority,
          recurring,
          label_ids: selectedLabels,
          subtasks,
          reminders,
        });
      } else {
        await createTask({
          name,
          description,
          list_id: Number(listId),
          date: date || undefined,
          deadline: deadline || undefined,
          estimate: estimate || undefined,
          actual_time: actualTime || undefined,
          priority,
          recurring,
          label_ids: selectedLabels,
          subtasks,
          reminders,
        });
      }
      onSuccess();
      onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>
            {isEditing ? "Edit Task" : "New Task"}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="px-6 pb-6 max-h-[calc(90vh-80px)]">
          <div className="space-y-5">
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

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim()}>
                {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create Task"}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
