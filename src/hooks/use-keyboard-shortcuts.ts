"use client";

import { useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface KeyboardShortcut {
  key: string;
  metaKey?: boolean;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  action: () => void;
  label: string;
}

interface UseKeyboardShortcutsOptions {
  onNewTask?: () => void;
  onSearchFocus?: () => void;
  onEscape?: () => void;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const router = useRouter();
  const isModalOpen = useRef(false);

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

      // ⌘/Ctrl + N - New Task
      if (cmdKey && e.key === "n") {
        e.preventDefault();
        options.onNewTask?.();
        return;
      }

      // / - Focus Search
      if (e.key === "/" && !cmdKey && !e.shiftKey) {
        e.preventDefault();
        options.onSearchFocus?.();
        return;
      }

      // Esc - Clear/Close
      if (e.key === "Escape") {
        options.onEscape?.();
        return;
      }

      // 1 - Today view
      if (e.key === "1" && !cmdKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        router.push("/?view=today");
        toast.success("Switched to Today view");
        return;
      }

      // 2 - Kanban view
      if (e.key === "2" && !cmdKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        router.push("/kanban");
        toast.success("Switched to Kanban view");
        return;
      }

      // 3 - Analytics view
      if (e.key === "3" && !cmdKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        router.push("/analytics");
        toast.success("Switched to Analytics view");
        return;
      }

      // G - Gantt view
      if (e.key === "g" && !cmdKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        router.push("/gantt");
        toast.success("Switched to Gantt view");
        return;
      }

      // M - Matrix view
      if (e.key === "m" && !cmdKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        router.push("/matrix");
        toast.success("Switched to Eisenhower Matrix");
        return;
      }

      // C - Calendar view
      if (e.key === "c" && !cmdKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        router.push("/calendar");
        toast.success("Switched to Calendar view");
        return;
      }

      // K - Show shortcuts
      if (cmdKey && e.key === "k") {
        e.preventDefault();
        // Dispatch event to open shortcuts dialog
        window.dispatchEvent(new CustomEvent("open-keyboard-shortcuts"));
        return;
      }
    },
    [router, options]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

export default useKeyboardShortcuts;