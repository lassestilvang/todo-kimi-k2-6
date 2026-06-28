"use client";

import { useState, useEffect } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { KeyboardShortcuts } from "@/components/task/keyboard-shortcuts";
import { Dialog } from "@/components/ui/dialog";

export function KeyboardShortcutsHandler() {
  const [open, setOpen] = useState(false);
  useKeyboardShortcuts({
    onNewTask: () => {
      window.dispatchEvent(new CustomEvent("open-new-task-modal"));
    },
    onSearchFocus: () => {
      window.dispatchEvent(new CustomEvent("focus-search"));
    },
    onEscape: () => {
      window.dispatchEvent(new CustomEvent("escape-key"));
    },
  });

  useEffect(() => {
    const handleOpenShortcuts = () => setOpen(true);
    window.addEventListener("open-keyboard-shortcuts", handleOpenShortcuts);
    return () => window.removeEventListener("open-keyboard-shortcuts", handleOpenShortcuts);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <KeyboardShortcuts />
    </Dialog>
  );
}