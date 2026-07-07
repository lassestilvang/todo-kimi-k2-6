"use client";

import { useEffect, useState, useRef, createContext, useContext, useCallback } from "react";
import { toast } from "sonner";
import type { Reminder } from "@/types";

interface NotificationProviderProps {
  children: React.ReactNode;
}

interface ReminderWithTask extends Reminder {
  task_name: string;
  task_completed: number;
}

// Track which notifications have been shown to avoid duplicates
const shownNotifications = new Set<string>();

const NotificationContext = createContext<{
  permission: NotificationPermission;
  enableNotifications: () => Promise<void>;
  testNotification: () => void;
} | null>(null);

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [showPrompt, setShowPrompt] = useState(true);
  const [isEnabled, setIsEnabled] = useState(false);
  const lastCheckRef = useRef<number>(0);

  // Check permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const showBrowserNotification = (title: string, body: string, tag: string) => {
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
      try {
        new Notification("TaskFlow", {
          body,
          tag,
          icon: "/favicon.ico",
        } as NotificationOptions);
      } catch (e) {
        // Fallback to toast
      }
    }

    // Always show toast as well
    toast(title, {
      description: body,
      action: {
        label: "View",
        onClick: () => {
          window.location.href = `/?highlight=${tag.replace("task-", "")}`;
        },
      },
      duration: 10000,
    });
  };

  const checkReminders = useCallback(async () => {
    const now = new Date();
    const currentTimestamp = now.getTime();

    // Only check every 5 minutes to avoid spam
    if (currentTimestamp - lastCheckRef.current < 5 * 60 * 1000) {
      return;
    }
    lastCheckRef.current = currentTimestamp;

    try {
      const response = await fetch("/api/reminders/upcoming");
      if (!response.ok) return;

      const reminders: ReminderWithTask[] = await response.json();

      for (const reminder of reminders) {
        // Skip if already notified
        const notificationKey = `${reminder.task_id}-${reminder.id}`;
        if (shownNotifications.has(notificationKey)) continue;

        shownNotifications.add(notificationKey);

        // Show notification
        const title = `Reminder: ${reminder.task_name}`;
        const body = `Task was due at ${new Date(reminder.remind_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

        showBrowserNotification(title, body, `task-${reminder.task_id}`);
      }
    } catch (error) {
      console.error("Error checking reminders:", error);
    }
    // lastCheckRef is intentionally omitted from deps - we only want to run when button clicked
  }, [showBrowserNotification]);

  // Set up periodic reminder checking
  useEffect(() => {
    if (!isEnabled || permission !== "granted") return;

    // Check every 5 minutes
    const interval = setInterval(checkReminders, 5 * 60 * 1000);
    checkReminders(); // Check immediately

    return () => clearInterval(interval);
  }, [isEnabled, permission, checkReminders]);

  const enableNotifications = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const granted = await Notification.requestPermission();
      setPermission(granted);
      setShowPrompt(false);
      if (granted === "granted") {
        setIsEnabled(true);
        toast.success("Notifications enabled!");
      } else {
        toast.error("Permission denied. Please enable notifications in browser settings.");
      }
    }
  };

  const testNotification = () => {
    showBrowserNotification(
      "Test Notification",
      "This is a test reminder from TaskFlow!",
      "test"
    );
  };

  return (
    <NotificationContext.Provider value={{ permission, enableNotifications, testNotification }}>
      {children}
      {permission === "default" && showPrompt && (
        <div className="fixed bottom-6 left-6 z-50 rounded-lg bg-card border p-4 shadow-lg max-w-sm animate-in slide-in-from-bottom-4">
          <p className="text-sm mb-2">Enable notifications for due date reminders?</p>
          <div className="flex gap-2">
            <button
              onClick={enableNotifications}
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
      )}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
};

export function isBrowserNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}