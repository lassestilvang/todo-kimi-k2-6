"use client";

import { useEffect } from "react";
import { HelpCircle, Command, Search, Calendar, List, BarChart3, Bot, Filter } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface KeyboardCheatsheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardCheatsheet({ open, onOpenChange }: KeyboardCheatsheetProps) {
  const shortcuts = [
    {
      category: "Navigation",
      items: [
        { keys: "⌘ + 1", description: "Go to Today view" },
        { keys: "⌘ + 2", description: "Go to Kanban board" },
        { keys: "⌘ + 3", description: "Go to Analytics" },
        { keys: "⌘ + /", description: "Focus search" },
        { keys: "⌘ + n", description: "Create new task" },
        { keys: "⌘ + k", description: "Open command palette" },
      ],
    },
    {
      category: "Views",
      items: [
        { keys: "t", description: "Today" },
        { keys: "w", description: "Next 7 Days" },
        { keys: "u", description: "Upcoming" },
        { keys: "a", description: "All Tasks" },
        { keys: "b", description: "Blocked Tasks" },
        { keys: "k", description: "Kanban Board" },
        { keys: "g", description: "Gantt Chart" },
        { keys: "m", description: "Eisenhower Matrix" },
      ],
    },
    {
      category: "Task Management",
      items: [
        { keys: "Enter", description: "Save task" },
        { keys: "Esc", description: "Close/Clear" },
        { keys: "⌘ + s", description: "Save changes" },
        { keys: "c", description: "Add comment (when editing)" },
        { keys: "Shift + @", description: "Mention user" },
      ],
    },
    {
      category: "Focus Mode",
      items: [
        { keys: "f", description: "Enter focus mode" },
        { keys: "Esc", description: "Exit focus mode" },
        { keys: "Space", description: "Start/pause timer" },
      ],
    },
  ];

  // Keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "?" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Speed up your workflow with these keyboard shortcuts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {shortcuts.map((category) => (
            <div key={category.category} className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {category.category}
              </h3>
              <div className="space-y-1">
                {category.items.map((item) => (
                  <div
                    key={item.keys}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <span className="text-sm">{item.description}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.split(" + ").map((key) => (
                        <kbd
                          key={key}
                          className="px-2 py-1 text-xs font-semibold bg-background border rounded"
                        >
                          {key === "⌘" ? "Cmd" : key === "⌘" ? "Cmd" : key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}