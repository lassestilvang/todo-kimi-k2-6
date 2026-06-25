"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import type { TaskWithRelations } from "@/types";

interface NotificationProviderProps {
  tasks: TaskWithRelations[];
}

// Track which notifications have been shown to avoid duplicates
const shownNotifications = new Set<string>();

export function NotificationProvider({ tasks }: NotificationProviderProps) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [showPrompt, setShowPrompt] = useState(true);
  const lastCheckRef = useRef<number>(0);

  const showBrowserNotification = (title: string, body: string, tag: string) => {
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
      new Notification("TaskFlow", {
        body,
        tag,
        icon: "/favicon.ico",
      } as NotificationOptions);
    }

    // Also show toast
    toast(title, { description: body });
  };

  useEffect(() => {
    // Check permission
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (permission !== "granted") return;

    const now = new Date();
    const currentTimestamp = now.getTime();

    // Only check every 5 minutes to avoid spam
    if (currentTimestamp - lastCheckRef.current < 5 * 60 * 1000) {
      return;
    }
    lastCheckRef.current = currentTimestamp;

    // Find tasks with reminders
    const remindedTasks = tasks.filter((task) => {
      if (task.completed) return false;
      if (!task.reminders || task.reminders.length === 0) return false;

      const now = new Date();
      return task.reminders.some(r => {
        const remindAt = new Date(r.remind_at);
        return remindAt <= now && !shownNotifications.has(`${task.id}-${r.id}`);
      });
    });

    // Also check for due soon tasks
    const dueSoonTasks = tasks.filter((task) => {
      if (task.completed) return false;
      if (!task.deadline) return false;

      const deadline = new Date(task.deadline);
      const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
      return deadline <= tenMinutesFromNow && deadline >= now;
    });

    // Show notifications for reminders
    remindedTasks.forEach((task) => {
      task.reminders?.forEach((reminder) => {
        const remindAt = new Date(reminder.remind_at);
        if (remindAt <= new Date() && !shownNotifications.has(`${task.id}-${reminder.id}`)) {
          shownNotifications.add(`${task.id}-${reminder.id}`);
          showBrowserNotification(task.name, task.description || "Reminder", "reminder");
        }
      });
    });

    // Show notifications for due tasks
    dueSoonTasks.forEach((task) => {
      const deadline = new Date(task.deadline!);
      const isOverdue = deadline < now;
      const title = isOverdue
        ? `⚠️ Overdue: ${task.name}`
        : `📅 Due soon: ${task.name}`;

      if (isOverdue) {
        toast.error(title, {
          description: task.description || "Task needs attention",
        });
      } else {
        toast(title, {
          description: `Due at ${deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        });
      }
    });
  }, [permission, tasks]);

  const requestPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const granted = await Notification.requestPermission();
      setPermission(granted);
      setShowPrompt(false);
      if (granted === "granted") {
        toast.success("Notifications enabled!");
      }
    }
  };

  if (permission === "default" && showPrompt) {
    return (
      <div className="fixed bottom-6 left-6 z-50 rounded-lg bg-card border p-4 shadow-lg max-w-sm animate-in slide-in-from-bottom-4">
        <p className="text-sm mb-2">Enable notifications for due date reminders?</p>
        <div className="flex gap-2">
          <button
            onClick={requestPermission}
            className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:opacity-90"
          >
            Enable
          </button>
          <button
            onClick={() => setShowPrompt(false)}
            className="px-3 py-1 text-xs bg-muted rounded hover:opacity-90"
          >
            Later
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export function isBrowserNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}