"use client";

import { useState } from "react";
import { HelpCircle, Search, Plus, ChevronDown, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface Shortcut {
  key: string;
  label: string;
  description: string;
  category: "navigation" | "tasks" | "search";
}

const shortcuts: Shortcut[] = [
  // Navigation
  { key: "⌘N", label: "New Task", description: "Create a new task", category: "navigation" },
  { key: "/", label: "Search", description: "Focus search bar", category: "navigation" },
  { key: "Esc", label: "Clear", description: "Clear search or filters", category: "navigation" },
  { key: "1", label: "Today", description: "Switch to Today view", category: "navigation" },
  { key: "2", label: "Kanban", description: "Switch to Kanban board", category: "navigation" },
  { key: "3", label: "Analytics", description: "Switch to Analytics view", category: "navigation" },
  { key: "G", label: "Gantt", description: "Switch to Gantt chart", category: "navigation" },
  { key: "M", label: "Matrix", description: "Switch to Eisenhower Matrix", category: "navigation" },
  { key: "⌘K", label: "AI Assistant", description: "Open AI Assistant", category: "navigation" },
  { key: "C", label: "Calendar", description: "Switch to Calendar view", category: "navigation" },
  { key: "K", label: "Shortcuts", description: "Show keyboard shortcuts", category: "navigation" },

  // Tasks
  { key: "Space", label: "Toggle", description: "Mark task as complete/incomplete", category: "tasks" },
  { key: "e", label: "Edit", description: "Edit selected task", category: "tasks" },
  { key: "d", label: "Delete", description: "Delete selected task", category: "tasks" },
  { key: "↑↓", label: "Navigate", description: "Move between tasks", category: "tasks" },
  { key: "f", label: "Focus", description: "Enter focus mode", category: "tasks" },
  { key: "Shift+A", label: "Assign", description: "Open assignment tab", category: "tasks" },
  { key: "Shift+E", label: "Time", description: "Open time tracking tab", category: "tasks" },
  { key: "Shift+C", label: "Comments", description: "Open comments tab", category: "tasks" },
  { key: "Shift+F", label: "Files", description: "Open attachments tab", category: "tasks" },

  // Search
  { key: "⌘,", label: "Settings", description: "Open settings", category: "search" },
];

export function KeyboardShortcuts() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredShortcuts = shortcuts.filter(
    (s) =>
      s.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedShortcuts = {
    navigation: filteredShortcuts.filter((s) => s.category === "navigation"),
    tasks: filteredShortcuts.filter((s) => s.category === "tasks"),
    search: filteredShortcuts.filter((s) => s.category === "search"),
  };

  return (
    <Dialog>
      <DialogTrigger>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Press <kbd className="kbd">⌘/Ctrl</kbd> + <kbd className="kbd">K</kbd> to open anytime
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search shortcuts..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {Object.entries(groupedShortcuts).map(([category, items]) => {
              if (items.length === 0) return null;

              const categoryLabels: Record<string, string> = {
                navigation: "Navigation",
                tasks: "Tasks",
                search: "Search",
              };

              return (
                <div key={category} className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    {categoryLabels[category]}
                  </h3>
                  <div className="space-y-1">
                    {items.map((shortcut) => (
                      <div
                        key={shortcut.key}
                        className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-accent"
                      >
                        <div className="flex items-center gap-2">
                          <kbd className="kbd text-sm">{shortcut.key}</kbd>
                          <span className="text-sm">{shortcut.label}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {shortcut.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}