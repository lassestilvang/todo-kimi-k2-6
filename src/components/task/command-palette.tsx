"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Command,
  Filter,
  Lightbulb,
  Calendar,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  UserCheck,
  Brain,
  BarChart3,
  List as ListIcon,
  Search,
  Clock,
  Settings,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { TaskWithRelations } from "@/types";

interface CommandPaletteProps {
  tasks: TaskWithRelations[];
  lists: { id: number; name: string; emoji: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAction?: (action: CommandAction) => void;
}

type CommandAction =
  | { type: "create_task"; payload: string }
  | { type: "complete_task"; payload: number }
  | { type: "delete_task"; payload: number }
  | { type: "go_to_view"; payload: string }
  | { type: "search_tasks"; payload: string }
  | { type: "open_ai"; payload: string }
  | { type: "move_task"; payload: { taskId: number; listId: number } }
  | { type: "set_priority"; payload: { taskId: number; priority: string } }
  | { type: "set_due_date"; payload: { taskId: number; date: string } }
  | { type: "toggle_complete"; payload: number };

const categories = [
  {
    name: "Search",
    icon: Search,
    items: [
      { name: "Search tasks", keyword: "search", action: (query: string) => ({ type: "search_tasks" as const, payload: query }) },
      { name: "Filter by priority", keyword: "priority", action: () => ({ type: "search_tasks" as const, payload: "priority" }) },
    ],
  },
  {
    name: "Tasks",
    icon: ListIcon,
    items: [
      { name: "New task", keyword: "new", action: () => ({ type: "create_task" as const, payload: "" }) },
      { name: "Complete task", keyword: "complete", action: () => ({ type: "complete_task" as const, payload: 0 }) },
      { name: "Delete task", keyword: "delete", action: () => ({ type: "delete_task" as const, payload: 0 }) },
    ],
  },
  {
    name: "Views",
    icon: BarChart3,
    items: [
      { name: "Today", keyword: "today", action: () => ({ type: "go_to_view" as const, payload: "today" }) },
      { name: "Kanban", keyword: "kanban", action: () => ({ type: "go_to_view" as const, payload: "kanban" }) },
      { name: "Analytics", keyword: "analytics", action: () => ({ type: "go_to_view" as const, payload: "analytics" }) },
      { name: "AI Assistant", keyword: "ai", action: () => ({ type: "open_ai" as const, payload: "" }) },
    ],
  },
  {
    name: "AI Actions",
    icon: Brain,
    items: [
      { name: "AI parse task", keyword: "ai parse", action: () => ({ type: "open_ai" as const, payload: "parse" }) },
      { name: "Generate project plan", keyword: "project", action: () => ({ type: "open_ai" as const, payload: "project" }) },
      { name: "Decision template", keyword: "decision", action: () => ({ type: "open_ai" as const, payload: "decision" }) },
    ],
  },
  {
    name: "Productivity",
    icon: Clock,
    items: [
      { name: "Focus mode", keyword: "focus", action: () => ({ type: "go_to_view" as const, payload: "focus" }) },
      { name: "Pomodoro timer", keyword: "pomodoro", action: () => ({ type: "go_to_view" as const, payload: "pomodoro" }) },
      { name: "Goals Dashboard", keyword: "goals", action: () => ({ type: "go_to_view" as const, payload: "goals" }) },
    ],
  },
];

interface CategoryItem {
  name: string;
  keyword: string;
  action: (query: string | (() => { type: string; payload: any })) => CommandAction;
}

interface Category {
  name: string;
  icon: React.ComponentNode;
  items: CategoryItem[];
}

// Simple NLP command parser
const nlpParser = {
  patterns: [
    {
      pattern: /complete\s+(task\s+)?[^\d]+/i,
      action: (match: string, tasks: TaskWithRelations[]) => {
        const taskName = match.replace(/(complete\s+)?/i, "").trim();
        const task = tasks.find(t => t.name.toLowerCase().includes(taskName.toLowerCase()));
        return task ? { type: "complete_task" as const, payload: task.id } : null;
      }
    },
    {
      pattern: /mark\s+.+\s+as\s+(done|complete)/i,
      action: (match: string, tasks: TaskWithRelations[]) => {
        const taskName = match.replace(/mark\s+.+\s+as\s+(done|complete)/i, "").trim();
        const task = tasks.find(t => t.name.toLowerCase().includes(taskName.toLowerCase()));
        return task ? { type: "complete_task" as const, payload: task.id } : null;
      }
    },
    {
      pattern: /move\s+(task\s+)?(.+?)\s+to\s+(.+)/i,
      action: (match: string, tasks: TaskWithRelations[], lists: { id: number; name: string }[]) => {
        const parts = match.split(/\s+to\s+/);
        const taskName = parts[0]?.replace(/(move\s+)?/i, "").trim() || "";
        const listName = parts[1]?.trim() || "";

        const task = tasks.find(t => t.name.toLowerCase().includes(taskName.toLowerCase()));
        const list = lists.find(l => l.name.toLowerCase() === listName.toLowerCase());

        if (task && list) {
          return { type: "move_task" as const, payload: { taskId: task.id, listId: list.id } };
        }
        return null;
      }
    },
    {
      pattern: /set\s+(priority\s+)?(.+?)\s+to\s+(critical|high|medium|low)/i,
      action: (match: string, tasks: TaskWithRelations[]) => {
        const parts = match.match(/set\s+(priority\s+)?(.+?)\s+to\s+(critical|high|medium|low)/i);
        if (!parts) return null;

        const taskName = parts[2].trim();
        const priority = parts[3].toLowerCase();

        const task = tasks.find(t => t.name.toLowerCase().includes(taskName.toLowerCase()));
        if (task) {
          return { type: "set_priority" as const, payload: { taskId: task.id, priority } };
        }
        return null;
      }
    },
    {
      pattern: /schedule\s+(task\s+)?(.+?)\s+(for|on|tomorrow|next\s+(week|monday|tuesday|wednesday|thursday|friday|saturday|sunday))/i,
      action: (match: string, tasks: TaskWithRelations[]) => {
        const isToday = /today/i.test(match);
        const isTomorrow = /tomorrow/i.test(match);

        let date: string | null = null;
        if (isTomorrow) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          date = tomorrow.toISOString().split("T")[0];
        } else if (isToday) {
          date = new Date().toISOString().split("T")[0];
        }

        const taskName = match.replace(/schedule\s+(task\s+)?/, "").split(/\s+(for|on|tomorrow)/i)[0].trim();
        const task = tasks.find(t => t.name.toLowerCase().includes(taskName.toLowerCase()));

        if (task && date) {
          return { type: "set_due_date" as const, payload: { taskId: task.id, date } };
        }

        // Return partial to trigger task creation
        return { type: "create_task" as const, payload: taskName };
      }
    },
    {
      pattern: /(create|add)\s+(a\s+)?(task|todo)\s+(.+)/i,
      action: (match: string, tasks: TaskWithRelations[]) => {
        const taskName = match.replace(/(create|add)\s+(a\s+)?(task|todo)\s+/, "").trim();
        return { type: "create_task" as const, payload: taskName };
      }
    },
    {
      pattern: /(remind|remember)\s+me\s+to\s+(.+)/i,
      action: (match: string) => {
        const taskName = match.replace(/(remind|remember)\s+me\s+to\s+/, "").trim();
        return { type: "create_task" as const, payload: taskName };
      }
    },
    {
      pattern: /show\s+(me\s+)?(.+)/i,
      action: (match: string, tasks: TaskWithRelations[], lists: { id: number; name: string }[]) => {
        const query = match.replace(/show\s+(me\s+)?/, "").trim();

        // Check if it's a list name
        const list = lists.find(l => l.name.toLowerCase() === query.toLowerCase());
        if (list) {
          return { type: "go_to_view" as const, payload: "list" };
        }

        // Check if it's a view name
        const view = ["today", "kanban", "calendar", "analytics", "ai", "goals", "focus"].find(v => v === query.toLowerCase());
        if (view) {
          return { type: "go_to_view" as const, payload: view };
        }

        return { type: "search_tasks" as const, payload: query };
      }
    }
  ],

  parse: (input: string, tasks: TaskWithRelations[], lists: { id: number; name: string; emoji: string }[][]): CommandAction | null => {
    for (const pattern of nlpParser.patterns) {
      const match = input.match(pattern.pattern);
      if (match) {
        return pattern.action(match[0], tasks, lists);
      }
    }
    return null;
  }
};

export function CommandPalette({ tasks, lists, open, onOpenChange, onAction }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onOpenChange(false);
    }
  }, [onOpenChange]);

  const executeCommand = useCallback((action: CommandAction) => {
    onAction?.(action);
    onOpenChange(false);
    setQuery("");
  }, [onAction, onOpenChange]);

  // Parse NLP input
  useEffect(() => {
    if (query && open) {
      const parsed = nlpParser.parse(query, tasks, lists);
      if (parsed) {
        // Auto-execute if high confidence
        // For now, just show the parsed action
      }
    }
  }, [query, open, tasks, lists]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command (e.g., 'complete meeting', 'new task: fix bug', 'go to kanban')" ref={inputRef} />
      <CommandList onKeyDown={handleKeyDown}>
        <CommandEmpty>No results found.</CommandEmpty>

        {categories.map((category) => (
          <CommandGroup key={category.name} heading={category.name}>
            {category.items.map((item) => (
              <CommandItem
                key={item.name}
                onSelect={() => {
                  if (item.keyword === "new") {
                    executeCommand({ type: "create_task", payload: query || "" });
                  } else {
                    executeCommand(item.action(query));
                  }
                }}
                filter={(value, search) => {
                  if (value.toLowerCase().includes(search.toLowerCase())) return 1;
                  if (item.keyword.toLowerCase().includes(search.toLowerCase())) return 1;
                  return 0;
                }}
              >
                {item.keyword}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}

        {/* NLP Quick Actions */}
        <CommandGroup heading="NLP Commands">
          <CommandItem onSelect={() => executeCommand({ type: "create_task", payload: "Schedule team meeting for tomorrow" })}>
            <span>Create: Schedule team meeting for tomorrow</span>
          </CommandItem>
          <CommandItem onSelect={() => executeCommand({ type: "create_task", payload: "Fix bug in the login form" })}>
            <span>Create: Fix bug in the login form</span>
          </CommandItem>
          <CommandItem onSelect={() => executeCommand({ type: "complete_task", payload: tasks[0]?.id || 0 })}>
            <span>Complete: First incomplete task</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}