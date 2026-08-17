'use client';

import { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  BookOpen,
  Brain,
  Zap,
  BarChart3,
  Settings,
  Lightbulb,
  Layout,
  Check,
} from 'lucide-react';

interface KeyboardCheatsheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutCategory {
  category: string;
  icon?: React.ComponentType<{ className?: string; size?: number | string }>;
  items: Array<{ keys: string; description: string }>;
}

export function KeyboardCheatsheet({
  open,
  onOpenChange,
}: KeyboardCheatsheetProps) {
  const shortcuts: ShortcutCategory[] = [
    {
      category: 'Navigation',
      icon: BookOpen,
      items: [
        { keys: 'Cmd + 1', description: 'Go to Today view' },
        { keys: 'Cmd + 2', description: 'Go to Kanban board' },
        { keys: 'Cmd + 3', description: 'Go to Calendar' },
        { keys: 'Cmd + 4', description: 'Go to Analytics' },
        { keys: 'Cmd + 5', description: 'Go to Goals' },
        { keys: 'Cmd + /', description: 'Focus search' },
        { keys: 'Cmd + n', description: 'Create new task' },
        { keys: 'Cmd + k', description: 'Open AI Assistant/command palette' },
      ],
    },
    {
      category: 'Views',
      icon: Layout,
      items: [
        { keys: 't', description: 'Today view' },
        { keys: 'w', description: 'Next 7 Days' },
        { keys: 'u', description: 'Upcoming' },
        { keys: 'a', description: 'All Tasks' },
        { keys: 'b', description: 'Blocked Tasks' },
        { keys: 'k', description: 'Kanban Board' },
        { keys: 'g', description: 'Gantt Chart' },
        { keys: 'm', description: 'Eisenhower Matrix' },
        { keys: 'c', description: 'Calendar view' },
        { keys: '? (Shift + 2)', description: 'Show this help' },
      ],
    },
    {
      category: 'Task Management',
      icon: Check,
      items: [
        { keys: 'Enter', description: 'Save task/form' },
        { keys: 'Esc', description: 'Close/Cancel' },
        { keys: 'Cmd + s', description: 'Save changes' },
        { keys: 'c', description: 'Add comment (when editing)' },
        { keys: '@', description: 'Mention user in comment' },
        { keys: 'D', description: 'Duplicate task' },
        { keys: 'R', description: 'Toggle recurring' },
      ],
    },
    {
      category: 'Focus Mode',
      icon: Zap,
      items: [
        { keys: 'f', description: 'Enter focus mode' },
        { keys: 'Esc', description: 'Exit focus mode' },
        { keys: 'Space', description: 'Start/pause Pomodoro timer' },
        { keys: 'p', description: 'Quick pause (focus mode)' },
      ],
    },
    {
      category: 'AI Assistant',
      icon: Brain,
      items: [
        { keys: 'Cmd + k', description: 'Open AI Assistant' },
        { keys: '/ai', description: 'Open AI parsing playground' },
        { keys: 'Cmd + i', description: 'Generate task insights' },
        { keys: 'Cmd + shift + a', description: 'AI action suggestions' },
      ],
    },
    {
      category: 'Analytics',
      icon: BarChart3,
      items: [{ keys: 'Cmd + 4', description: 'Go to Analytics dashboard' }],
    },
    {
      category: 'Labs',
      icon: Lightbulb,
      items: [
        { keys: '/labs', description: 'Open TaskFlow Labs' },
        { keys: '/labs/ai-parsing', description: 'Compare AI models' },
        { keys: '/labs/project-planning', description: 'AI project planning' },
        { keys: '/labs/skills', description: 'Skills tracker' },
        { keys: '/labs/energy', description: 'Energy scheduler' },
        { keys: '/labs/stories', description: 'Success stories' },
      ],
    },
    {
      category: 'Settings',
      icon: Settings,
      items: [
        { keys: 'Cmd + ,', description: 'Open settings' },
        { keys: 'Cmd + shift + \\', description: 'Open labs' },
      ],
    },
  ];

  // Keyboard shortcut to open (Shift + ? or Cmd + / outside of inputs)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open shortcuts with Shift + ? or Cmd + / outside of inputs
      if (e.key === '?' && e.shiftKey) {
        e.preventDefault();
        onOpenChange(true);
      }
      // Also support Cmd + / in non-input contexts
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        const activeElement = document.activeElement;
        if (
          !activeElement?.closest('input') &&
          !activeElement?.closest('textarea') &&
          !activeElement?.closest('.prose')
        ) {
          e.preventDefault();
          onOpenChange(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenChange]);

  const formatKeys = (keys: string): string[] => {
    return keys.split(' + ').map(key => {
      const displayKey = key
        .replace('⌘', 'Cmd')
        .replace('⇧', 'Shift')
        .replace('⌥', 'Option')
        .replace('⌃', 'Ctrl');
      return displayKey;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Speed up your workflow with these keyboard shortcuts. Press the keys
            in order.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-4">
          {shortcuts.map(category => (
            <div key={category.category} className="space-y-3">
              <div className="flex items-center gap-2">
                {category.icon && (
                  <category.icon className="h-4 w-4 text-muted-foreground" />
                )}
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                  {category.category}
                </h3>
              </div>
              <div className="space-y-1">
                {category.items.map(item => (
                  <div
                    key={item.keys}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
                  >
                    <span className="text-sm">{item.description}</span>
                    <div className="flex items-center gap-1">
                      {formatKeys(item.keys).map(key => (
                        <kbd
                          key={key}
                          className="px-2 py-1 text-xs font-semibold bg-background border rounded shadow-sm"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-4 mt-4">
          <div className="text-center text-sm text-muted-foreground">
            <p className="mb-2">
              <span className="font-medium">Pro Tip:</span> Click on any task or
              field, then type natural language to edit it
            </p>
            <p>
              Examples: "complete meeting with John", "move project task to
              tomorrow", "set priority high on bug fix"
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
