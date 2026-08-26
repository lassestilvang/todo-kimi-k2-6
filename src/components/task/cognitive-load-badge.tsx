'use client';

import { useCallback, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Brain, Sparkles, Settings, Users, Heart } from 'lucide-react';
import { toast } from 'sonner';

const LOADS = ['deep', 'creative', 'routine', 'social', 'emotional'] as const;
type Load = (typeof LOADS)[number];

const LOAD_META: Record<
  Load,
  { icon: React.ComponentType<{ className?: string }>; label: string; color: string }
> = {
  deep: { icon: Brain, label: 'Deep', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300' },
  creative: { icon: Sparkles, label: 'Creative', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300' },
  routine: { icon: Settings, label: 'Routine', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300' },
  social: { icon: Users, label: 'Social', color: 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300' },
  emotional: { icon: Heart, label: 'Emotional', color: 'bg-pink-100 text-pink-800 dark:bg-pink-950/40 dark:text-pink-300' },
};

interface CognitiveLoadBadgeProps {
  taskId: number;
  current?: Load | null;
  onChange?: (load: Load) => void;
}

export function CognitiveLoadBadge({ taskId, current, onChange }: CognitiveLoadBadgeProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<Load | null>(current ?? null);

  const choose = useCallback(
    async (next: Load) => {
      setValue(next);
      setOpen(false);
      onChange?.(next);
      try {
        await fetch('/api/cognitive-load', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ task_id: taskId, cognitive_load: next }),
        });
      } catch {
        toast.error('Could not update');
      }
    },
    [taskId, onChange]
  );

  if (!open) {
    if (!value) {
      return (
        <button
          onClick={() => setOpen(true)}
          className="text-xs text-muted-foreground hover:underline"
          aria-label="Tag cognitive load"
        >
          +cognitive load
        </button>
      );
    }
    const meta = LOAD_META[value];
    const Icon = meta.icon;
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex"
        aria-label={`Cognitive load: ${meta.label}. Click to change.`}
      >
        <Badge className={meta.color}>
          <Icon className="h-3 w-3 mr-1" />
          {meta.label}
        </Badge>
      </button>
    );
  }

  return (
    <div className="flex flex-wrap gap-1 p-2 rounded-md border bg-popover">
      {LOADS.map(l => {
        const meta = LOAD_META[l];
        const Icon = meta.icon;
        return (
          <button
            key={l}
            onClick={() => choose(l)}
            className={`px-2 py-1 rounded text-xs flex items-center gap-1 hover:bg-accent ${
              value === l ? 'ring-1 ring-primary' : ''
            }`}
          >
            <Icon className="h-3 w-3" />
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}
