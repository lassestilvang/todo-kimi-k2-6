"use client";

import { useState, useEffect } from "react";
import { HelpCircle, Search, Plus, X, Edit3, Shield, RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Shortcut {
  id: string;
  key: string;
  label: string;
  description: string;
  category: "navigation" | "tasks" | "search";
  enabled: boolean;
  custom?: boolean;
  meta?: boolean;
  shift?: boolean;
}

interface KeyboardShortcutsProps {
  settings?: {
    customShortcuts?: Record<string, string>;
    enableCustomShortcuts?: boolean;
  };
  onSaveSettings?: (settings: any) => void;
}

const defaultShortcuts: Shortcut[] = [
  // Navigation
  { id: "new_task", key: "n", label: "New Task", description: "Create a new task", category: "navigation", enabled: true },
  { id: "search", key: "/", label: "Search", description: "Focus search bar", category: "navigation", enabled: true },
  { id: "clear", key: "esc", label: "Clear", description: "Clear search or filters", category: "navigation", enabled: true },
  { id: "view_today", key: "1", label: "Today", description: "Switch to Today view", category: "navigation", enabled: true },
  { id: "view_kanban", key: "2", label: "Kanban", description: "Switch to Kanban board", category: "navigation", enabled: true },
  { id: "view_analytics", key: "3", label: "Analytics", description: "Switch to Analytics view", category: "navigation", enabled: true },
  { id: "view_gantt", key: "g", label: "Gantt", description: "Switch to Gantt chart", category: "navigation", enabled: true, shift: true },
  { id: "view_matrix", key: "m", label: "Matrix", description: "Switch to Eisenhower Matrix", category: "navigation", enabled: true, shift: true },
  { id: "ai_assistant", key: "a", label: "AI Assistant", description: "Open AI Assistant", category: "navigation", enabled: true, meta: true },
  { id: "view_calendar", key: "c", label: "Calendar", description: "Switch to Calendar view", category: "navigation", enabled: true },
  { id: "show_shortcuts", key: "k", label: "Shortcuts", description: "Show keyboard shortcuts", category: "navigation", enabled: true, meta: true },

  // Tasks
  { id: "toggle_complete", key: "space", label: "Toggle", description: "Mark task as complete/incomplete", category: "tasks", enabled: true },
  { id: "edit_task", key: "e", label: "Edit", description: "Edit selected task", category: "tasks", enabled: true },
  { id: "delete_task", key: "delete", label: "Delete", description: "Delete selected task", category: "tasks", enabled: true },
  { id: "navigate_tasks", key: "arrow", label: "Navigate", description: "Move between tasks", category: "tasks", enabled: true },
  { id: "focus_mode", key: "f", label: "Focus", description: "Enter focus mode", category: "tasks", enabled: true, shift: true },
  { id: "assign_task", key: "a", label: "Assign", description: "Open assignment tab", category: "tasks", enabled: true, shift: true },
  { id: "time_track", key: "t", label: "Time", description: "Open time tracking tab", category: "tasks", enabled: true, shift: true },
  { id: "add_comment", key: "c", label: "Comments", description: "Open comments tab", category: "tasks", enabled: true, shift: true },
  { id: "add_attachment", key: "f", label: "Files", description: "Open attachments tab", category: "tasks", enabled: true, shift: true },

  // Search
  { id: "settings", key: ",", label: "Settings", description: "Open settings", category: "search", enabled: true, meta: true },
];

const availableKeys = [
  "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
  "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
  "escape", "enter", "tab", "space", "backspace", "delete",
  "arrowup", "arrowdown", "arrowleft", "arrowright",
];

export function KeyboardShortcuts({ settings, onSaveSettings }: KeyboardShortcutsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(() => {
    const saved = localStorage.getItem("keyboard-shortcuts");
    if (saved) {
      return JSON.parse(saved);
    }
    return defaultShortcuts;
  });

  useEffect(() => {
    localStorage.setItem("keyboard-shortcuts", JSON.stringify(shortcuts));
  }, [shortcuts]);

  const handleSaveShortcut = (id: string, updates: Partial<Shortcut>) => {
    setShortcuts(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleReset = () => {
    setShortcuts(defaultShortcuts);
    localStorage.removeItem("keyboard-shortcuts");
  };

  const filteredShortcuts = shortcuts.filter(
    (s) =>
      s.enabled &&
      (s.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const groupedShortcuts = {
    navigation: filteredShortcuts.filter((s) => s.category === "navigation"),
    tasks: filteredShortcuts.filter((s) => s.category === "tasks"),
    search: filteredShortcuts.filter((s) => s.category === "search"),
  };

  const formatKey = (shortcut: Shortcut) => {
    const parts: string[] = [];
    if (shortcut.meta) parts.push("⌘");
    if (shortcut.shift) parts.push("⇧");
    parts.push(shortcut.key.toUpperCase());
    return parts.join("+");
  };

  return (
    <Dialog>
      <DialogTrigger>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Press <kbd className="kbd">⌘/Ctrl</kbd> + <kbd className="kbd">K</kbd> to open anytime. Customize your shortcuts below.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative flex-1">
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="ml-2"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <Switch
                checked={shortcuts.every(s => s.enabled)}
                onCheckedChange={(checked) => {
                  setShortcuts(shortcuts.map(s => ({ ...s, enabled: checked })));
                }}
              />
              Enable all shortcuts
            </label>
          </div>

          <ScrollArea className="max-h-96">
            <div className="space-y-4">
              {Object.entries(groupedShortcuts).map(([category, items]) => {
                if (items.length === 0) return null;

                const categoryLabels: Record<string, { title: string; icon: React.ReactNode }> = {
                  navigation: { title: "Navigation", icon: <Shield className="h-4 w-4" /> },
                  tasks: { title: "Tasks", icon: <Plus className="h-4 w-4" /> },
                  search: { title: "Search", icon: <Search className="h-4 w-4" /> },
                };

                return (
                  <div key={category} className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      {categoryLabels[category]?.icon}
                      {categoryLabels[category]?.title}
                    </h3>
                    <div className="space-y-1">
                      {items.map((shortcut) => (
                        <ShortcutItem
                          key={shortcut.id}
                          shortcut={shortcut}
                          onSave={handleSaveShortcut}
                          formatKey={formatKey}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="text-xs text-muted-foreground">
            <p>Tip: On Mac, use ⌘ instead of Ctrl. On Windows, use Ctrl.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ShortcutItemProps {
  shortcut: Shortcut;
  onSave: (id: string, updates: Partial<Shortcut>) => void;
  formatKey: (shortcut: Shortcut) => string;
}

function ShortcutItem({ shortcut, onSave, formatKey }: ShortcutItemProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isEditing, setIsEditing] = useState(false);
  const [editKey, setEditKey] = useState(shortcut.key ?? "");
  const [editMeta, setEditMeta] = useState(shortcut.meta ?? false);
  const [editShift, setEditShift] = useState(shortcut.shift ?? false);

  const handleSave = () => {
    // Check for conflicts
    const conflictingShortcut = defaultShortcuts.find(
      s => s.key === editKey &&
      s.shift === editShift &&
      s.meta === editMeta &&
      s.id !== shortcut.id
    );

    if (conflictingShortcut) {
      return; // Don't allow conflicts for now
    }

    onSave(shortcut.id, {
      key: editKey,
      meta: editMeta || undefined,
      shift: editShift || undefined,
      custom: true,
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-accent/50">
        <Select value={editKey} onValueChange={(v) => setEditKey(v ?? "")}>
          <SelectTrigger className="h-7 w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableKeys.map(key => (
              <SelectItem key={key} value={key}>
                {key.toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Switch checked={editMeta} onCheckedChange={setEditMeta} className="h-4 w-8" />
          <span className="text-xs">Meta</span>
        </div>
        <div className="flex items-center gap-1">
          <Switch checked={editShift} onCheckedChange={setEditShift} className="h-4 w-8" />
          <span className="text-xs">Shift</span>
        </div>
        <Button size="sm" onClick={handleSave} className="h-7 w-7 p-0">
          <Check className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="h-7 w-7 p-0">
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-accent group">
      <div className="flex items-center gap-2">
        <kbd className="kbd text-sm min-w-[36px] text-center">{formatKey(shortcut)}</kbd>
        <span className="text-sm">{shortcut.label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{shortcut.description}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
          onClick={() => setIsEditing(true)}
        >
          <Edit3 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// Keyboard shortcut cheat sheet component
export function KeyboardCheatsheet() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
      {[
        { keys: ["⌘", "N"], desc: "New Task" },
        { keys: ["⌘", "/"], desc: "Search" },
        { keys: ["⌘", "K"], desc: "Shortcuts" },
        { keys: ["1"], desc: "Today View" },
        { keys: ["2"], desc: "Kanban View" },
        { keys: ["3"], desc: "Analytics" },
        { keys: ["C"], desc: "Calendar" },
        { keys: ["G"], desc: "Gantt Chart" },
        { keys: ["M"], desc: "Eisenhower Matrix" },
      ].map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <kbd className="kbd">{item.keys.join("+")}</kbd>
          <span className="text-muted-foreground">{item.desc}</span>
        </div>
      ))}
    </div>
  );
}