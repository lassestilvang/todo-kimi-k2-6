import { useState, useEffect } from 'react';
import type { TaskWithRelations } from '@/types';

export interface ProactiveSuggestion {
  type: 'nudge' | 'pattern' | 'focus' | 'balance' | 'risk' | 'streak' | 'habit';
  message: string;
  action?: {
    type: 'create' | 'schedule' | 'complete' | 'reschedule' | 'view';
    taskName?: string;
    taskId?: number;
    suggestedDate?: string;
    view?: string;
  };
  priority: 'low' | 'medium' | 'high';
  confidence: number;
}

export function useProactiveSuggestions(tasks: TaskWithRelations[]) {
  const [suggestions, setSuggestions] = useState<ProactiveSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (tasks.length === 0) return;

    const generateSuggestions = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/proactive-suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tasks }),
        });

        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.suggestions || []);
        }
      } catch {
        // Fallback to basic suggestions
        setSuggestions(generateBasicSuggestions(tasks));
      } finally {
        setIsLoading(false);
      }
    };

    generateSuggestions();
  }, [tasks]);

  return { suggestions, isLoading };
}

// Basic fallback suggestions for when AI is unavailable
function generateBasicSuggestions(
  tasks: TaskWithRelations[]
): ProactiveSuggestion[] {
  const suggestions: ProactiveSuggestion[] = [];
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentHour = now.getHours();

  // Check for overdue tasks
  const overdue = tasks.filter(
    t => !t.completed && t.deadline && new Date(t.deadline) < now
  );

  if (overdue.length > 0) {
    suggestions.push({
      type: 'risk',
      message: `${overdue.length} task${overdue.length > 1 ? 's' : ''} overdue`,
      action: { type: 'view', view: 'blocked' },
      priority: 'high',
      confidence: 0.9,
    });
  }

  // Check for empty day
  const todayTasks = tasks.filter(t => t.date === today && !t.completed);
  if (todayTasks.length === 0 && currentHour > 9 && currentHour < 17) {
    suggestions.push({
      type: 'focus',
      message: 'No tasks scheduled for today. Ready to add some?',
      action: { type: 'view', view: 'today' },
      priority: 'low',
      confidence: 0.6,
    });
  }

  return suggestions;
}
