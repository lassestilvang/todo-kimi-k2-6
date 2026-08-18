'use client';

import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Clock,
  Calendar,
  Tag,
  Repeat,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { AIStatusIndicator } from '@/components/task/ai-status-indicator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { TaskWithRelations, List } from '@/types';

interface TaskPreviewProps {
  task: TaskWithRelations | null;
  lists: List[];
  isVisible: boolean;
  x: number;
  y: number;
}

export function TaskPreview({
  task,
  lists,
  isVisible,
  x,
  y,
}: TaskPreviewProps) {
  // Early return before accessing task properties
  if (!isVisible || !task) return null;

  const priorityConfig = {
    critical: { color: 'text-red-600', bg: 'bg-red-600/10', label: 'Critical' },
    high: { color: 'text-red-500', bg: 'bg-red-500/10', label: 'High' },
    medium: { color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Medium' },
    low: { color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Low' },
    none: { color: 'text-muted-foreground', bg: 'bg-muted', label: '' },
  };

  const pConfig = priorityConfig[task.priority];
  const list = lists.find(l => l.id === task.list_id);

  return (
    <div
      className="absolute w-72 rounded-lg border bg-popover p-4 shadow-lg pointer-events-none animate-in fade-in-0 zoom-in-95"
      style={{ top: y + 10, left: x + 10 }}
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base line-clamp-2 flex-1">
              {task.name}
            </h3>
            {task.priority !== 'none' && (
              <Badge
                variant="outline"
                className="text-[10px] h-5"
                style={{ color: pConfig.color }}
              >
                {pConfig.label}
              </Badge>
            )}
            {/* AI Status Indicator in preview */}
            {!task.completed && (
              <AIStatusIndicator
                aiProvider={task.ai_provider}
                confidenceScore={task.confidence_score}
                className="ml-1"
              />
            )}
          </div>

          {task.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          {list && (
            <div className="flex items-center gap-1">
              <span className="text-base">{list.emoji}</span>
              <span className="text-muted-foreground">{list.name}</span>
            </div>
          )}

          {task.date && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {format(parseISO(task.date), 'MMM d')}
            </div>
          )}

          {task.deadline && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              {format(parseISO(task.deadline), 'HH:mm')}
            </div>
          )}
        </div>

        {task.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.labels.slice(0, 3).map(label => (
              <span
                key={label.id}
                className="text-[10px] px-1.5 py-0.5 rounded text-white"
                style={{ backgroundColor: label.color }}
                aria-label={`Label: ${label.name}`}
              >
                {label.icon} {label.name}
              </span>
            ))}
            {task.labels.length > 3 && (
              <Badge variant="secondary" className="text-[10px]">
                +{task.labels.length - 3}
              </Badge>
            )}
          </div>
        )}

        {task.subtasks.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3 w-3" />
              <span>
                {task.subtasks.filter(s => s.completed).length}/
                {task.subtasks.length} subtasks
              </span>
            </div>
          </div>
        )}

        {/* Voting Section */}
        <div className="flex items-center gap-1 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => console.log('Upvote', task.id)}
          >
            <ThumbsUp className="h-3 w-3" />
          </Button>
          <span className="text-xs text-muted-foreground w-6 text-center">
            4.5
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => console.log('Downvote', task.id)}
          >
            <ThumbsDown className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
