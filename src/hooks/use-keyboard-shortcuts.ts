"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export interface KeyboardShortcut {
  key: string;
  metaKey?: boolean;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  action: () => void;
  label: string;
}

interface SavedShortcut {
  id: string;
  key: string;
  meta?: boolean;
  shift?: boolean;
  enabled: boolean;
}

interface UseKeyboardShortcutsOptions {
  onNewTask?: () => void;
  onSearchFocus?: () => void;
  onEscape?: () => void;
}

// Default shortcuts configuration
const defaultShortcuts: SavedShortcut[] = [
  { id: "new_task", key: "n", meta: true, enabled: true },
  { id: "search", key: "/", enabled: true },
  { id: "clear", key: "escape", enabled: true },
  { id: "view_today", key: "1", meta: true, enabled: true },
  { id: "view_kanban", key: "2", meta: true, enabled: true },
  { id: "view_analytics", key: "3", meta: true, enabled: true },
  { id: "view_gantt", key: "g", meta: true, shift: true, enabled: true },
  { id: "view_matrix", key: "m", meta: true, shift: true, enabled: true },
  { id: "ai_assistant", key: "a", meta: true, enabled: true },
  { id: "view_calendar", key: "c", meta: true, enabled: true },
  { id: "view_goals", key: "g", meta: true, shift: true, enabled: true },
  { id: "focus_mode", key: "f", shift: true, enabled: true },
];

/**
 * Hook to manage keyboard shortcuts with customization support.
 * Loads saved shortcuts from localStorage and applies them to key events.
 */
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const router = useRouter();
  const isModalOpen = useRef(false);
  const [customShortcuts, setCustomShortcuts] = useState<SavedShortcut[]>(() => {
    if (typeof window === "undefined") return defaultShortcuts;
    try {
      const saved = localStorage.getItem("keyboard-shortcuts");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Keep defaults
    }
    return defaultShortcuts;
  });

  // Load shortcuts from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("keyboard-shortcuts");
        if (saved) {
          setCustomShortcuts(JSON.parse(saved));
        }
      } catch {
        // Keep defaults
      }
    }
  }, []);

  // Track if a modal or input is focused
  useEffect(() => {
    const handleModalOpen = () => {
      isModalOpen.current = true;
    };
    const handleModalClose = () => {
      isModalOpen.current = false;
    };

    document.addEventListener("dialog-open", handleModalOpen);
    document.addEventListener("dialog-close", handleModalClose);

    return () => {
      document.removeEventListener("dialog-open", handleModalOpen);
      document.removeEventListener("dialog-close", handleModalClose);
    };
  }, []);

  const findShortcut = (id: string): SavedShortcut | undefined => {
    return customShortcuts.find((s) => s.id === id && s.enabled);
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs or textareas
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
      ) {
        return;
      }

      // Don't trigger shortcuts when a modal is open
      if (isModalOpen.current) {
        return;
      }

      const isMac = navigator.platform.includes("Mac");
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      // Check custom shortcuts first, fall back to defaults
      const checkShortcut = (shortcut: SavedShortcut | undefined) => {
        if (!shortcut?.enabled) return false;
        const keyMatches = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const metaMatches = shortcut.meta ? (e.metaKey || e.ctrlKey) : !e.metaKey && !e.ctrlKey;
        const shiftMatches = shortcut.shift ? e.shiftKey : !e.shiftKey;
        return keyMatches && metaMatches && shiftMatches;
      };

      // ⌘/Ctrl + N - New Task (or custom)
      const newTaskShortcut = findShortcut("new_task");
      if (checkShortcut(newTaskShortcut)) {
        e.preventDefault();
        options.onNewTask?.();
        return;
      }

      // / - Focus Search (or custom)
      const searchShortcut = findShortcut("search");
      if (checkShortcut(searchShortcut)) {
        e.preventDefault();
        options.onSearchFocus?.();
        return;
      }

      // Esc - Clear/Close (or custom)
      const clearShortcut = findShortcut("clear");
      if (checkShortcut(clearShortcut)) {
        options.onEscape?.();
        return;
      }

      // View shortcuts with meta key
      if (cmdKey && !e.altKey) {
        // 1 - Today view
        if (e.key === "1") {
          const viewToday = findShortcut("view_today");
          if (checkShortcut(viewToday)) {
            e.preventDefault();
            router.push("/?view=today");
            toast.success("Switched to Today view");
            return;
          }
        }

        // 2 - Kanban view
        if (e.key === "2") {
          const viewKanban = findShortcut("view_kanban");
          if (checkShortcut(viewKanban)) {
            e.preventDefault();
            router.push("/?view=kanban");
            toast.success("Switched to Kanban view");
            return;
          }
        }

        // 3 - Analytics view
        if (e.key === "3") {
          const viewAnalytics = findShortcut("view_analytics");
          if (checkShortcut(viewAnalytics)) {
            e.preventDefault();
            router.push("/?view=analytics");
            toast.success("Switched to Analytics view");
            return;
          }
        }

        // G - Gantt view (with Shift)
        if (e.key.toLowerCase() === "g" && e.shiftKey) {
          const viewGantt = findShortcut("view_gantt");
          if (checkShortcut(viewGantt)) {
            e.preventDefault();
            router.push("/?view=gantt");
            toast.success("Switched to Gantt view");
            return;
          }
        }

        // M - Matrix view (with Shift)
        if (e.key.toLowerCase() === "m" && e.shiftKey) {
          const viewMatrix = findShortcut("view_matrix");
          if (checkShortcut(viewMatrix)) {
            e.preventDefault();
            router.push("/?view=matrix");
            toast.success("Switched to Eisenhower Matrix");
            return;
          }
        }

        // A - AI Assistant
        if (e.key.toLowerCase() === "a") {
          const aiAssistant = findShortcut("ai_assistant");
          if (checkShortcut(aiAssistant)) {
            e.preventDefault();
            router.push("/?view=ai");
            toast.success("Opened AI Assistant");
            return;
          }
        }

        // C - Calendar view
        if (e.key.toLowerCase() === "c") {
          const viewCalendar = findShortcut("view_calendar");
          if (checkShortcut(viewCalendar)) {
            e.preventDefault();
            router.push("/?view=calendar");
            toast.success("Switched to Calendar view");
            return;
          }
        }

        // K - Show shortcuts
        if (e.key.toLowerCase() === "k") {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("open-keyboard-shortcuts"));
          return;
        }
      }

      // F - Focus mode (Shift only)
      if (e.key.toLowerCase() === "f" && e.shiftKey && !cmdKey) {
        const focusMode = findShortcut("focus_mode");
        if (checkShortcut(focusMode)) {
          e.preventDefault();
          router.push("/?view=focus");
          toast.success("Entering focus mode");
          return;
        }
      }
    },
    [router, options, customShortcuts]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Return a function to update shortcuts
  const updateShortcuts = (shortcuts: SavedShortcut[]) => {
    setCustomShortcuts(shortcuts);
    localStorage.setItem("keyboard-shortcuts", JSON.stringify(shortcuts));
  };

  return {
    shortcuts: customShortcuts,
    updateShortcuts,
  };
}

export default useKeyboardShortcuts;