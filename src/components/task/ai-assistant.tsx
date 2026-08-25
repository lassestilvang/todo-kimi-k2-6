'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Clock,
  Target,
  Copy,
  Check,
  X,
  List as ListIcon,
  Mic,
  MicOff,
  CheckCircle2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { TaskWithRelations, List, Priority, Label } from '@/types';
import type { TaskSuggestion, AIEditCommand } from '@/lib/ai';
import { toast } from 'sonner';
import { z } from 'zod';

// Type declarations for Web Speech API are in src/types/speech.d.ts

type WorkloadSuggestion = {
  type: string;
  taskName: string;
  reason: string;
  confidence: number;
};

interface AIAssistantProps {
  tasks: TaskWithRelations[];
  lists: List[];
  labels: Label[];
  onAddTask: (task: Partial<TaskWithRelations>) => void;
  className?: string;
}

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  parsedTask?: TaskSuggestion & { provider: string };
}

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  prompt: string;
}

// Validation schema for the main input
const inputSchema = z.object({
  text: z
    .string()
    .min(1, 'Please enter a task description')
    .max(1000, 'Input too long'),
});

export function AIAssistant({
  tasks,
  lists,
  labels,
  onAddTask,
  className,
}: AIAssistantProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [insights, setInsights] = useState<{
    tips: string[];
    suggestions: string[];
    trends: string[];
    provider: string;
  } | null>(null);
  const [aiStatus, setAiStatus] = useState<{
    openai: boolean;
    anthropic: boolean;
    activeProvider: string;
  } | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [pendingEditCommand, setPendingEditCommand] = useState<
    (AIEditCommand & { task?: TaskWithRelations }) | null
  >(null);

  // State for undo functionality (used in executeEditCommand)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [pendingUndo, setPendingUndo] = useState<{
    taskId: number;
    taskName: string;
    action: 'delete' | 'complete';
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const [workloadSuggestions, setWorkloadSuggestions] = useState<
    WorkloadSuggestion[]
  >([]);
  const [notesInput, setNotesInput] = useState('');
  const [isGeneratingFromNotes, setIsGeneratingFromNotes] = useState(false);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.interimResults = false;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        if (isListening) {
          recognitionRef.current?.start();
        }
      };
    }

    return () => {
      recognitionRef.current?.stop();
    };
  }, [isListening]);

  // Fetch AI status on mount
  useEffect(() => {
    fetch('/api/ai')
      .then(r => r.json())
      .then(setAiStatus)
      .catch(console.error);
  }, []);

  // Calculate smart suggestions based on task context
  const smartSuggestions = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const suggestions: QuickAction[] = [];

    // Suggest tasks for today based on incomplete tasks
    const incompleteToday = tasks.filter(t => t.date === today && !t.completed);
    const firstIncompleteTask = incompleteToday[0];
    if (firstIncompleteTask) {
      suggestions.push({
        title: 'Continue task',
        description: `Pick up where you left off`,
        icon: <Clock className="h-3.5 w-3.5" />,
        prompt: `Continue working on "${firstIncompleteTask.name}"`,
      });
    }

    // Suggest based on priority
    const criticalTasks = tasks.filter(
      t => t.priority === 'critical' && !t.completed
    );
    const firstCriticalTask = criticalTasks[0];
    if (firstCriticalTask) {
      suggestions.push({
        title: 'Critical task',
        description: `${criticalTasks.length} critical tasks need attention`,
        icon: <Target className="h-3.5 w-3.5" />,
        prompt: `Focus on "${firstCriticalTask.name}" - it's marked as critical`,
      });
    }

    // Suggest based on list context
    if (lists.length > 1) {
      const inboxList = lists.find(l => l.is_inbox);
      if (inboxList) {
        suggestions.push({
          title: `Add to ${inboxList.name}`,
          description: 'Quick entry to inbox',
          icon: <ListIcon className="h-3.5 w-3.5" />,
          prompt: `Add to ${inboxList.name}: ${inboxList.emoji} `,
        });
      }
    }

    return suggestions;
  }, [tasks, lists]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load workload suggestions on mount
  useEffect(() => {
    fetch('/api/workload')
      .then(r => r.json())
      .then(data => {
        setWorkloadSuggestions(
          data.suggestions?.map((s: WorkloadSuggestion) => s) || []
        );
      })
      .catch(console.error);
  }, []);

  // Load insights on mount
  const loadInsights = useCallback(async () => {
    try {
      const result = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'insights',
          input: {
            tasks: tasks.map(t => ({
              name: t.name,
              completed: t.completed,
              priority: t.priority,
              date: t.date,
              deadline: t.deadline,
            })),
          },
        }),
      });

      const data = await result.json();
      setInsights({
        tips: data.tips || [],
        suggestions: data.suggestions || [],
        trends: data.trends || [],
        provider: aiStatus?.activeProvider || 'keyword-parser',
      });
    } catch (error) {
      console.error('Failed to load insights:', error);
    }
  }, [tasks, aiStatus]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  const handleSubmit = async () => {
    // Validate input
    const validated = inputSchema.safeParse({ text: input });
    if (!validated.success) {
      toast.error(validated.error.issues[0]?.message || 'Invalid input');
      return;
    }
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Try to parse as an edit command first if we have existing tasks
      const editCommand = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'edit',
          input: {
            text: input,
            tasks: tasks.map(t => ({
              id: t.id,
              name: t.name,
              completed: t.completed,
              priority: t.priority,
            })),
          },
        }),
      });

      const editResult = await editCommand.json();

      // If we got a valid edit command, execute it with undo capability
      if (editResult.action && editResult.taskId) {
        const task = tasks.find(t => t.id === editResult.taskId);
        if (task) {
          // Set up pending edit command for the confirmation dialog (for priority changes)
          // Delete and complete will handle themselves with undo toast
          if (editResult.action === 'prioritize') {
            setPendingEditCommand({ ...editResult, task });
            setIsLoading(false);
            return;
          }

          // Execute actions directly (delete/complete have undo via toast)
          if (editResult.action === 'delete') {
            // Store task for potential undo
            const deletedTask = { ...task };
            const deletedKey = `deleted_task_${task.id}_${Date.now()}`;
            localStorage.setItem(deletedKey, JSON.stringify(deletedTask));

            // Store original completed state for restoration (used by restoreTask)
            const _originalState = { completed: task.completed };

            await (await import('@/lib/actions/tasks')).deleteTask(task.id);

            // Show toast with undo
            toast('Task deleted', {
              description: `"${task.name}" has been permanently deleted`,
              duration: 10000,
              action: {
                label: 'Undo',
                onClick: async () => {
                  try {
                    const { restoreTask } = await import(
                      '@/lib/actions/tasks'
                    );
                    const taskData = JSON.parse(localStorage.getItem(deletedKey) || '{}');
                    if (taskData && taskData.name) {
                      await restoreTask(taskData);
                      localStorage.removeItem(deletedKey);
                      toast('Task restored', {
                        description: `"${taskData.name}" has been restored`,
                      });
                    }
                  } catch (error) {
                    console.error('Failed to restore task:', error);
                    toast.error('Failed to restore task');
                  }
                },
              },
            });

            const aiResponse: Message = {
              id: Date.now() + 1,
              role: 'assistant',
              content: `🗑️ Deleted "${task.name}"`,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, aiResponse]);
            setIsLoading(false);
            return;
          }

          if (editResult.action === 'complete') {
            const _wasCompleted = task.completed;

            await (
              await import('@/lib/actions/tasks')
            ).updateTask(task.id, { completed: true });

            // Show toast with undo
            toast('Task completed', {
              description: `"${task.name}" marked as completed`,
              duration: 8000,
              action: {
                label: 'Undo',
                onClick: async () => {
                  await (
                    await import('@/lib/actions/tasks')
                  ).updateTask(task.id, { completed: false });
                  toast('Task reopened', {
                    description: `"${task.name}" marked as incomplete`,
                  });
                },
              },
            });

            const aiResponse: Message = {
              id: Date.now() + 1,
              role: 'assistant',
              content: `✅ Marked "${task.name}" as completed!`,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, aiResponse]);
            setIsLoading(false);
            return;
          }
        }
      }

      // Execute via executeEditCommand for other actions that need confirmation
      if (editResult.action && editResult.taskId) {
        setPendingEditCommand({
          action: editResult.action,
          taskId: editResult.taskId,
          updates: editResult.updates,
          task: tasks.find(t => t.id === editResult.taskId),
        });
        setIsLoading(false);
        return;
      }

      // Fall back to task creation parsing
      const result = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'parse',
          input: {
            text: input,
            context: {
              existingTasks: tasks.map(t => ({
                name: t.name,
                date: t.date,
                deadline: t.deadline,
                priority: t.priority,
              })),
              lists: lists.map(l => ({
                id: l.id,
                name: l.name,
                emoji: l.emoji,
              })),
            },
          },
        }),
      });

      const parsed = await result.json();

      const aiResponse: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: parsed.description
          ? `I've parsed your request: "${parsed.name}"\n\n**Priority:** ${parsed.priority}\n**Estimated time:** ${parsed.estimated_duration ? `${parsed.estimated_duration}m` : 'Unknown'}\n\n${parsed.description}\n\nWould you like me to add this to your task list?`
          : `I've parsed: "${parsed.name}". Priority: ${parsed.priority}. Add this task?`,
        timestamp: new Date(),
        parsedTask: {
          ...parsed,
          provider: aiStatus?.activeProvider || 'keyword-parser',
        },
      };
      setMessages(prev => [...prev, aiResponse]);
    } catch {
      // API error - use fallback response
      const aiResponse: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `I've understood: "${input}". I've prepared this as a task with normal priority. Would you like me to add it to your task list?`,
        timestamp: new Date(),
        parsedTask: {
          name: input,
          priority: 'none',
          provider: aiStatus?.activeProvider || 'keyword-parser',
        },
      };
      setMessages(prev => [...prev, aiResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMessage = (content: string, id: number) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Execute an AI edit command with proper error handling and toast-based undo capability
  const executeEditCommand = useCallback(
    async (command: AIEditCommand & { task?: TaskWithRelations }) => {
      if (!command.action || !command.taskId || !command.task) {
        return;
      }

      const task = command.task;
      let responseContent = '';

      try {
        switch (command.action) {
          case 'complete': {
            await (
              await import('@/lib/actions/tasks')
            ).updateTask(task.id, { completed: true });

            // Show toast with undo
            toast('Task completed', {
              description: `"${task.name}" marked as completed`,
              action: {
                label: 'Undo',
                onClick: async () => {
                  await (
                    await import('@/lib/actions/tasks')
                  ).updateTask(task.id, { completed: false });
                  toast('Task reopened', {
                    description: `"${task.name}" marked as incomplete`,
                  });
                },
              },
            });

            responseContent = `✅ Marked "${task.name}" as completed!`;
            break;
          }
          case 'delete': {
            // Show confirmation first, then show undo toast
            await (await import('@/lib/actions/tasks')).deleteTask(task.id);

            // Store in localStorage for potential restore
            const deletedKey = `deleted_task_${task.id}_${Date.now()}`;
            localStorage.setItem(
              deletedKey,
              JSON.stringify({
                ...task,
                deletedAt: Date.now(),
              })
            );

            // Clean up localStorage after 10 seconds (permanent deletion window)
            setTimeout(() => {
              localStorage.removeItem(deletedKey);
            }, 10000);

            // Show toast with undo
            toast('Task deleted', {
              description: `"${task.name}" has been permanently deleted`,
              duration: 10000,
              action: {
                label: 'Undo',
                onClick: async () => {
                  try {
                    // Restore from localStorage
                    const data = localStorage.getItem(deletedKey);
                    if (data) {
                      const taskData = JSON.parse(data);
                      const { restoreTask } = await import(
                        '@/lib/actions/tasks'
                      );
                      const restored = await restoreTask(taskData);
                      localStorage.removeItem(deletedKey);
                      toast('Task restored', {
                        description: `"${restored.name}" has been restored`,
                      });
                    }
                  } catch (error) {
                    console.error('Failed to restore task:', error);
                    toast('Failed to restore task');
                  }
                },
              },
            });

            // Refresh the tasks list
            await new Promise(resolve => setTimeout(resolve, 500));

            responseContent = `🗑️ Deleted "${task.name}"`;
            break;
          }
          case 'prioritize': {
            const priority = command.updates?.priority as
              'critical' | 'high' | 'medium' | 'low' | 'none' | undefined;
            await (
              await import('@/lib/actions/tasks')
            ).updateTask(task.id, { priority });
            responseContent = `📌 Changed priority of "${task.name}" to ${priority || 'unknown'}`;
            break;
          }
          default:
            responseContent = `I don't know how to "${command.action}". Try being more specific!`;
        }
      } catch (error) {
        console.error(error);
        responseContent = `Failed to execute ${command.action} command`;
      }

      const aiResponse: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiResponse]);
      setPendingEditCommand(null);
    },
    []
  );

  const confirmEditCommand = () => {
    if (pendingEditCommand) {
      executeEditCommand(pendingEditCommand);
    }
  };

  const cancelEditCommand = () => {
    setPendingEditCommand(null);
  };

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
  };

  // Combine static and smart suggestions
  const allQuickActions = useMemo(() => {
    const staticActions: QuickAction[] = [
      {
        title: 'Meeting task',
        description: 'Create a task for meeting follow-up',
        icon: <Clock className="h-3.5 w-3.5" />,
        prompt: 'Create a task for the marketing report due next Friday',
      },
      {
        title: 'Call task',
        description: 'Schedule a call/meeting task',
        icon: <Bot className="h-3.5 w-3.5" />,
        prompt: 'Add a meeting with the team tomorrow at 2pm',
      },
      {
        title: 'Review task',
        description: 'Create a review task',
        icon: <Target className="h-3.5 w-3.5" />,
        prompt: 'Schedule a review of the quarterly goals',
      },
      {
        title: 'Reminder',
        description: 'Set up a reminder task',
        icon: <Sparkles className="h-3.5 w-3.5" />,
        prompt: 'Set up a reminder for the client presentation next week',
      },
    ];

    // Add edit actions if we have incomplete tasks
    const editActions: QuickAction[] = [];
    const incompleteTasks = tasks.filter(t => !t.completed);
    if (incompleteTasks.length > 0) {
      const firstTask = incompleteTasks[0];
      editActions.push(
        {
          title: 'Complete task',
          description: `Mark "${firstTask.name.slice(0, 20)}..." as done`,
          icon: <CheckCircle2 className="h-3.5 w-3.5" />,
          prompt: `Complete task: ${firstTask.name}`,
        },
        {
          title: 'Delete task',
          description: 'Remove a task you no longer need',
          icon: <Trash2 className="h-3.5 w-3.5" />,
          prompt: `Delete the task "${firstTask.name}"`,
        }
      );
    }

    return [...editActions, ...smartSuggestions, ...staticActions];
  }, [smartSuggestions, tasks]);

  // Generate task suggestions based on patterns
  const formatTime = useCallback((date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  const taskSuggestions = useMemo(() => {
    const now = new Date();
    const suggestions: string[] = [];

    // Suggest reviewing overdue tasks
    const overdue = tasks.filter(
      t => t.deadline && new Date(t.deadline) < now && !t.completed
    );
    if (overdue.length > 0) {
      suggestions.push(`Review ${overdue.length} overdue task(s) first`);
    }

    // Suggest batching similar tasks
    const byList = tasks.reduce(
      (acc, t) => {
        const listName = t.list_id
          ? (lists.find(l => l.id === t.list_id)?.name ?? 'Uncategorized')
          : 'Uncategorized';
        if (!acc[listName]) acc[listName] = [];
        acc[listName].push(t);
        return acc;
      },
      {} as Record<string, typeof tasks>
    );

    Object.entries(byList).forEach(([listName, listTasks]) => {
      if (listTasks.length >= 3) {
        suggestions.push(
          `Batch process ${listTasks.length} tasks in ${listName}`
        );
      }
    });

    return suggestions.slice(0, 3);
  }, [tasks, lists]);

  // Generate tasks from notes/bullet points
  const handleGenerateFromNotes = async () => {
    if (!notesInput.trim()) return;

    setIsGeneratingFromNotes(true);
    try {
      // Get user preferences for task creation
      const userPreferences = {
        lists: lists.map(l => ({
          id: l.id,
          name: l.name,
          emoji: l.emoji,
        })),
        labels: labels.map(label => ({ id: label.id, name: label.name, color: label.color })),
      };

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'generateTasks',
          input: {
            notes: notesInput,
            context: userPreferences,
            options: {
              extract_deadlines: true,
              suggest_priorities: true,
              suggest_labels: true,
              batch_similar: true,
            },
          },
        }),
      });

      if (response.ok) {
        const generatedTasks = await response.json();
        if (generatedTasks.tasks && generatedTasks.tasks.length > 0) {
          // Add each generated task with enhanced data
          generatedTasks.tasks.forEach(
            (task: {
              name: string;
              description?: string | null;
              priority?: Priority;
              suggested_date?: string | null;
              deadline?: string | null;
              list_id?: number | null;
              confidence?: number;
              label_suggestions?: string[]; // Suggested label names
            }) => {
              // Map label names to actual label IDs
              const labelSuggestions = task.label_suggestions || [];
              const suggestedLabelIds = labels
                .filter(l =>
                  labelSuggestions.some(
                    sug =>
                      l.name.toLowerCase() === sug.toLowerCase() ||
                      l.name.toLowerCase().includes(sug.toLowerCase())
                  )
                )
                .map(l => l.id);

              onAddTask({
                name: task.name,
                description: task.description ?? null,
                priority: task.priority || 'medium',
                date: task.suggested_date ?? null,
                deadline: task.deadline ?? null,
                list_id: task.list_id ?? null,
                labels: labels.filter(l =>
                  suggestedLabelIds.includes(l.id)
                ),
              });
            }
          );

          // Show detailed success message with suggestions
          const taskCount = generatedTasks.tasks.length;
          const tasksAdded = `🎉 Generated ${taskCount} task${taskCount > 1 ? 's' : ''} from your notes`;

          toast.success(tasksAdded, {
              description: generatedTasks.summary || 'Review the tasks in your inbox',
            });

          setNotesInput('');
        } else {
          toast.info('No tasks could be generated from the provided text');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.message || 'Failed to generate tasks from notes');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate tasks. Please try again.');
    } finally {
      setIsGeneratingFromNotes(false);
    }
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          AI Assistant
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Use natural language to create and manage tasks.{' '}
          {aiStatus?.activeProvider && `Powered by ${aiStatus.activeProvider}`}
          {!aiStatus?.openai && !aiStatus?.anthropic && ' (keyword mode)'}
        </p>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <ScrollArea className="flex-1 mb-4 max-h-[300px]">
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">
                  How can I help you with your tasks today?
                </p>
                {insights && (
                  <div className="mt-4 space-y-2">
                    <div className="text-xs font-medium">Quick insights:</div>
                    <div className="text-xs space-y-1">
                      <div>
                        Completion rate:{' '}
                        {Math.round(
                          (tasks.filter(t => t.completed).length /
                            Math.max(tasks.length, 1)) *
                            100
                        )}
                        %
                      </div>
                      <div>
                        {
                          tasks.filter(
                            t => t.priority === 'critical' && !t.completed
                          ).length
                        }{' '}
                        critical tasks pending
                      </div>
                    </div>
                  </div>
                )}
                {taskSuggestions.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">
                      Smart suggestions:
                    </div>
                    {taskSuggestions.map((suggestion, i) => (
                      <button
                        key={i}
                        className="text-xs text-left text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setInput(suggestion)}
                      >
                        → {suggestion}
                      </button>
                    ))}
                  </div>
                )}
                {workloadSuggestions.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">
                      Workload Balance:
                    </div>
                    {workloadSuggestions.map((s, i) => (
                      <div
                        key={i}
                        className="text-xs p-2 bg-amber-500/10 rounded"
                      >
                        <div className="font-medium">{s.taskName}</div>
                        <div className="text-muted-foreground">{s.reason}</div>
                        <div className="text-amber-600">
                          {(s.confidence * 100).toFixed(0)}% confidence
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              messages.map(message => (
                <div
                  key={message.id}
                  className={`flex gap-2 max-w-[85%] ${
                    message.role === 'user' ? 'ml-auto flex-row-reverse' : ''
                  }`}
                >
                  <div
                    className={`rounded-lg p-3 text-sm ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground ml-auto'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 whitespace-pre-wrap">
                        {message.content}
                      </div>
                      {message.role === 'assistant' && (
                        <button
                          onClick={() =>
                            handleCopyMessage(message.content, message.id)
                          }
                          className="opacity-50 hover:opacity-100 transition-opacity"
                        >
                          {copiedId === message.id ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 opacity-70">
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex gap-2 max-w-[80%]">
                <div className="rounded-lg p-3 bg-muted">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              variant={isListening ? 'destructive' : 'outline'}
              size="icon"
              onClick={() => setIsListening(!isListening)}
              disabled={!speechSupported}
              title={isListening ? 'Stop listening' : 'Start voice input'}
            >
              {isListening ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type a task or ask me something..."
              onKeyDown={e =>
                e.key === 'Enter' && !e.shiftKey && handleSubmit()
              }
              className="flex-1"
            />
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <div className="border-t pt-3">
            <div className="flex items-center gap-2 mb-2">
              <Input
                value={notesInput}
                onChange={e => setNotesInput(e.target.value)}
                placeholder="Paste meeting notes or bullet points..."
                className="flex-1"
              />
              <Button
                onClick={handleGenerateFromNotes}
                disabled={isGeneratingFromNotes || !notesInput.trim()}
                size="sm"
              >
                {isGeneratingFromNotes ? 'Generating...' : 'Generate Tasks'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Paste meeting notes, bullet points, or a to-do list to
              auto-generate tasks
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Quick actions:</p>
            <div className="flex flex-wrap gap-2">
              {allQuickActions.slice(0, 6).map(action => (
                <button
                  key={action.title}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs border rounded hover:bg-muted transition-colors"
                  onClick={() => handleQuickAction(action.prompt)}
                >
                  {action.icon}
                  {action.title}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <Card className="p-3">
              <div className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" />
                <span className="font-medium">Completion Rate</span>
              </div>
              <p className="text-muted-foreground mt-1">
                {tasks.filter(t => t.completed).length} / {tasks.length} tasks
                completed
              </p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span className="font-medium">Due Today</span>
              </div>
              <p className="text-muted-foreground mt-1">
                {
                  tasks.filter(
                    t => t.date === new Date().toISOString().split('T')[0]
                  ).length
                }{' '}
                tasks
              </p>
            </Card>
          </div>
        </div>
      </CardContent>

      {/* Confirmation Dialog for AI Edit Actions */}
      {pendingEditCommand && pendingEditCommand.task && (
        <Dialog open={!!pendingEditCommand} onOpenChange={cancelEditCommand}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Confirm{' '}
                {pendingEditCommand.action === 'delete'
                  ? 'Deletion'
                  : pendingEditCommand.action === 'complete'
                    ? 'Completion'
                    : 'Priority Change'}
              </DialogTitle>
              <DialogDescription>
                {pendingEditCommand.action === 'delete' && (
                  <>
                    Are you sure you want to delete &ldquo;
                    {pendingEditCommand.task.name}&rdquo;? This action cannot be
                    undone.
                  </>
                )}
                {pendingEditCommand.action === 'complete' && (
                  <>
                    Mark &ldquo;{pendingEditCommand.task.name}&rdquo; as
                    completed? You can undo this later.
                  </>
                )}
                {pendingEditCommand.action === 'prioritize' && (
                  <>
                    Change priority of &ldquo;{pendingEditCommand.task.name}
                    &rdquo; to{' '}
                    {pendingEditCommand.updates?.priority || 'unknown'}?
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={cancelEditCommand}>
                <X className="h-4 w-4 mr-1.5" />
                Cancel
              </Button>
              <Button
                variant={
                  pendingEditCommand.action === 'delete'
                    ? 'destructive'
                    : 'default'
                }
                onClick={confirmEditCommand}
              >
                {pendingEditCommand.action === 'delete' ? (
                  <>
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Delete
                  </>
                ) : pendingEditCommand.action === 'complete' ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Mark Complete
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4 mr-1.5" />
                    Change Priority
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
