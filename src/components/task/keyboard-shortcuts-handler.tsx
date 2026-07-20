"use client";

import { useState, useEffect } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { KeyboardShortcuts } from "@/components/task/keyboard-shortcuts";
import { CommandPalette } from "@/components/task/command-palette";
import { Dialog } from "@/components/ui/dialog";

export function KeyboardShortcutsHandler() {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

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
    onCommandPalette: () => {
      setCommandPaletteOpen(true);
    },
  });

  useEffect(() => {
    const handleOpenShortcuts = () => setShortcutsOpen(true);
    const handleOpenCommandPalette = () => setCommandPaletteOpen(true);

    window.addEventListener("open-keyboard-shortcuts", handleOpenShortcuts);
    window.addEventListener("open-command-palette", handleOpenCommandPalette);

    return () => {
      window.removeEventListener("open-keyboard-shortcuts", handleOpenShortcuts);
      window.removeEventListener("open-command-palette", handleOpenCommandPalette);
    };
  }, []);

  return (
    <>
      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <KeyboardShortcuts />
      </Dialog>
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />
    </>
  );
}