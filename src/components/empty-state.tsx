'use client';

import { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Search, Calendar, CheckCircle2, Inbox, Lightbulb, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  /** The title to display */
  title: string;
  /** Optional description text */
  description?: string | undefined;
  /** Optional icon to display */
  icon?: ReactNode | undefined;
  /** Optional action button */
  action?:
    | {
        label: string;
        onClick: () => void;
      }
    | undefined;
  /** Optional secondary action */
  secondaryAction?:
    | {
        label: string;
        onClick: () => void;
      }
    | undefined;
  /** Variant affects styling */
  variant?: 'default' | 'compact' | undefined;
}

const icons = {
  default: <Inbox className="h-12 w-12 text-muted-foreground" />,
  search: <Search className="h-12 w-12 text-muted-foreground" />,
  calendar: <Calendar className="h-12 w-12 text-muted-foreground" />,
  completed: <CheckCircle2 className="h-12 w-12 text-muted-foreground" />,
  tasks: <CheckCircle2 className="h-12 w-12 text-muted-foreground" />,
};

export function EmptyState({
  title,
  description,
  icon,
  action,
  secondaryAction,
  variant = 'default',
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        variant === 'compact' ? 'py-8' : 'min-h-[400px] py-16'
      )}
    >
      <div className="mb-4">{icon || icons.default}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-md mb-4">
          {description}
        </p>
      )}
      <div className="flex gap-2 mt-2">
        {action && (
          <Button onClick={action.onClick} className="gap-2">
            <Plus className="h-4 w-4" />
            {action.label}
          </Button>
        )}
        {secondaryAction && (
          <Button variant="outline" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}

// Predefined empty states for common scenarios
export function EmptyTasksState({ onAddTask }: { onAddTask?: () => void }) {
  return (
    <EmptyState
      title="No tasks yet"
      description="Get started by creating your first task. Use the + button above to add one."
      action={onAddTask ? { label: 'Add Task', onClick: onAddTask } : undefined}
    />
  );
}

export function EmptySearchResultsState({ query }: { query: string }) {
  return (
    <EmptyState
      icon={icons.search}
      title="No tasks found"
      description={`No tasks match "${query}". Try a different search term or clear your filters.`}
      variant="compact"
    />
  );
}

export function EmptyCompletedState() {
  return (
    <EmptyState
      icon={icons.completed}
      title="No completed tasks"
      description="Complete tasks will appear here. Keep going!"
      variant="compact"
    />
  );
}

export function EmptyUpcomingState({ onAddTask }: { onAddTask?: () => void }) {
  return (
    <EmptyState
      icon={icons.calendar}
      title="No upcoming tasks"
      description="Your schedule is clear for the next week. Time to plan ahead or add recurring tasks for regular routines!"
      action={onAddTask ? { label: 'Add Task', onClick: onAddTask } : undefined}
    />
  );
}

export function EmptyArchivedState({ onUnarchive }: { onUnarchive?: () => void }) {
  return (
    <EmptyState
      icon={<Archive className="h-12 w-12 text-muted-foreground" />}
      title="No archived tasks"
      description="Archived tasks are hidden here. Restore tasks when you need them again."
      action={onUnarchive ? { label: 'Unarchive All', onClick: onUnarchive } : undefined}
    />
  );
}

export function EmptyIdeasState({ onAddTask }: { onAddTask?: () => void }) {
  return (
    <EmptyState
      icon={<Lightbulb className="h-12 w-12 text-muted-foreground" />}
      title="No ideas yet"
      description="Ideas and tasks you haven't formalized yet will appear here. Use the AI assistant to generate tasks from your notes!"
      action={onAddTask ? { label: 'Add Idea', onClick: onAddTask } : undefined}
    />
  );
}

export function EmptyWithTipsState({
  title,
  description,
  tips,
  onAction,
}: {
  title: string;
  description?: string;
  tips?: string[];
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 min-h-[400px]">
      <div className="mb-4 opacity-70">
        <Inbox className="h-12 w-12 mx-auto" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-md mb-4">
          {description}
        </p>
      )}
      {tips && tips.length > 0 && (
        <div className="w-full max-w-md mb-6">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Tips:</h4>
          <ul className="text-xs text-left space-y-1">
            {tips.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-muted-foreground/50">•</span>
                <span className="text-muted-foreground">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {onAction && (
        <Button onClick={onAction} className="gap-2">
          <Plus className="h-4 w-4" />
          Get started
        </Button>
      )}
    </div>
  );
}
