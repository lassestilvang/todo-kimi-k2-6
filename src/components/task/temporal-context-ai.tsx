'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Clock,
  Brain,
  Sun,
  Moon,
  Cloud,
  TrendingUp,
  Lightbulb,
  History,
  Zap,
  Calendar,
  BarChart3,
  CheckCircle2,
  Target,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  format,
  addHours,
  subHours,
  isSameDay,
  isToday,
  isTomorrow,
} from 'date-fns';

interface TemporalContextAIProps {
  currentTasks?: Array<{
    id: number;
    name: string;
    priority: string;
    completed: boolean;
    date?: string | null;
    deadline?: string | null;
    energy_level?: number | null;
  }>;
  className?: string;
}

interface TimeContext {
  hour: number;
  dayOfWeek: number;
  isWeekend: boolean;
  currentTime: Date;
  timeOfDay: 'morning' | 'workday' | 'afternoon' | 'evening' | 'night';
  dayType: 'today' | 'tomorrow' | 'upcoming' | 'overdue';
}

interface TemporalSuggestion {
  id: string;
  title: string;
  description: string;
  confidence: number;
  type: 'priority' | 'timing' | 'energy' | 'break' | 'next_task' | 'reflection';
  suggested_at: Date;
  action?: {
    type: 'create_task' | 'reschedule' | 'mark_complete' | 'add_note';
    payload: any;
  };
}

const mockTasks = [
  {
    id: 1,
    name: 'Review code from yesterday',
    priority: 'high',
    completed: true,
    date: null,
    deadline: null,
    energy_level: 7,
  },
  {
    id: 2,
    name: 'Design system architecture',
    priority: 'critical',
    completed: false,
    date: null,
    deadline: '2025-01-20',
    energy_level: 4,
  },
  {
    id: 3,
    name: 'Write documentation',
    priority: 'medium',
    completed: false,
    date: null,
    deadline: '2025-01-25',
    energy_level: 3,
  },
  {
    id: 4,
    name: 'Morning planning session',
    priority: 'low',
    completed: false,
    date: null,
    deadline: null,
    energy_level: 8,
  },
  {
    id: 5,
    name: 'Deep work: API implementation',
    priority: 'critical',
    completed: false,
    date: null,
    deadline: '2025-01-22',
    energy_level: 6,
  },
];

export function TemporalContextAI({
  currentTasks = mockTasks,
  className,
}: TemporalContextAIProps) {
  const [suggestions, setSuggestions] = useState<TemporalSuggestion[]>([]);
  const [context, setContext] = useState<TimeContext>(() =>
    getCurrentContext()
  );
  const [energyReading, setEnergyReading] = useState<number>(7);

  // Recalculate context when time changes or in 15-minute intervals
  useEffect(() => {
    const updateContext = () => {
      const ctx = getCurrentContext();
      setContext(ctx);
    };

    const interval = setInterval(updateContext, 15 * 60 * 1000); // 15 minutes
    return () => clearInterval(interval);
  }, []);

  // Generate AI suggestions based on temporal context
  const temporalSuggestions = useMemo(() => {
    return generateSuggestions(context, currentTasks, energyReading);
  }, [context, currentTasks, energyReading]);

  // Get time-based statistics
  const timeStats = useMemo(() => {
    const now = new Date();
    const tasksByTime = currentTasks.reduce(
      (acc, task) => {
        if (task.deadline) {
          const deadline = new Date(task.deadline);
          const dayDiff = Math.ceil(
            (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (dayDiff === 0) acc.today.push(task);
          else if (dayDiff === 1) acc.tomorrow.push(task);
          else if (dayDiff < 7) acc.thisWeek.push(task);
          else acc.upcoming.push(task);
        } else {
          acc.noDeadline.push(task);
        }
        return acc;
      },
      {
        today: [] as typeof currentTasks,
        tomorrow: [] as typeof currentTasks,
        thisWeek: [] as typeof currentTasks,
        upcoming: [] as typeof currentTasks,
        noDeadline: [] as typeof currentTasks,
      }
    );

    const completedCount = currentTasks.filter(t => t.completed).length;
    const completionRate =
      currentTasks.length > 0 ? completedCount / currentTasks.length : 0;

    return {
      byDeadline: tasksByTime,
      completionRate,
      highPriorityPending: currentTasks.filter(
        t =>
          !t.completed && (t.priority === 'critical' || t.priority === 'high')
      ).length,
    };
  }, [currentTasks]);

  // Energy insight
  const energyInsight = useMemo(() => {
    const avgEnergy =
      currentTasks.reduce((sum, t) => sum + (t.energy_level || 5), 0) /
      currentTasks.length;
    const isOptimal = avgEnergy >= 6 && avgEnergy <= 8;

    return {
      average: avgEnergy,
      optimal: isOptimal,
      message: isOptimal
        ? 'Your energy levels are well-balanced for focused work'
        : avgEnergy < 6
          ? 'Consider taking a short break before high-focus tasks'
          : 'Watch for signs of fatigue - plan a break soon',
    };
  }, [currentTasks]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Current Context Snapshot */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Brain className="h-5 w-5 text-primary" />
            Temporal AI Assistant
          </CardTitle>
          <CardDescription>
            Smart suggestions based on your current time and context
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {/* Time Context */}
            <div className="bg-background rounded-lg p-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Time Context
              </h4>
              <div className="text-2xl font-bold mb-1">
                {context.hour < 12
                  ? `${context.hour}:00 AM`
                  : `${context.hour - 12}:00 PM`}
              </div>
              <div className="text-sm text-muted-foreground mb-2">
                {context.timeOfDay} •{' '}
                {format(context.currentTime, 'EEEE, MMM d')}
              </div>
              <Badge variant="outline" className="text-xs">
                {context.isWeekend ? 'Weekend Mode' : 'Workday Mode'}
              </Badge>
            </div>

            {/* Energy Level */}
            <div className="bg-background rounded-lg p-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Energy Level
              </h4>
              <div className="text-2xl font-bold mb-2">{energyReading}/10</div>
              <Progress value={energyReading * 10} className="h-2 mb-2" />
              <p className="text-xs text-muted-foreground">
                {energyInsight.message}
              </p>
            </div>

            {/* Task Stats */}
            <div className="bg-background rounded-lg p-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Today's Progress
              </h4>
              <div className="text-2xl font-bold mb-2">
                {(timeStats.completionRate * 100) | 0}%
              </div>
              <div className="text-xs text-muted-foreground">
                {timeStats.highPriorityPending} high-priority pending
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            AI Recommendations
          </CardTitle>
          <CardDescription>
            Based on temporal context and task analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {suggestions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No suggestions at this moment</p>
                <p className="text-xs mt-2">
                  Your schedule looks well-balanced
                </p>
              </div>
            ) : (
              suggestions.map(suggestion => (
                <div
                  key={suggestion.id}
                  className="border rounded-lg p-3 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <Badge
                      variant="outline"
                      className="text-xs font-medium capitalize"
                    >
                      {suggestion.type.replace('_', ' ')}
                    </Badge>
                    <div className="flex-1">
                      <h5 className="font-medium text-sm">
                        {suggestion.title}
                      </h5>
                      <p className="text-xs text-muted-foreground">
                        {suggestion.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Progress
                          value={suggestion.confidence * 100}
                          className="h-1.5 w-16"
                        />
                        <span className="text-xs text-muted-foreground">
                          {Math.round(suggestion.confidence * 100)}% confidence
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Time-Based Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Time-Based Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Productivity Patterns */}
            <div>
              <h4 className="font-medium mb-3">Productivity Patterns</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span>Morning peak (9-11 AM)</span>
                  <Badge>2 tasks</Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Afternoon dip (2-4 PM)</span>
                  <Badge variant="outline">1 task</Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Evening wind-down (6-8 PM)</span>
                  <Badge>3 tasks</Badge>
                </div>
              </div>
            </div>

            {/* Schedule Recommendations */}
            <div>
              <h4 className="font-medium mb-3">Schedule Recommendations</h4>
              <div className="space-y-2">
                <div className="p-3 bg-green-50 rounded">
                  <p className="text-sm font-medium">
                    ✅ Peak hours: 9-11 AM, 2-4 PM
                  </p>
                </div>
                <div className="p-3 bg-amber-50 rounded">
                  <p className="text-sm font-medium">
                    ⚠️ Schedule break: 11-12 AM
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded">
                  <p className="text-sm font-medium">💡 Energy boost: 3-4 PM</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {timeStats.byDeadline.today.length > 0 && (
              <div>
                <h5 className="text-sm font-medium mb-2">Due Today</h5>
                <div className="space-y-2">
                  {timeStats.byDeadline.today.map(task => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-2 bg-muted/30 rounded"
                    >
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                      <span className="text-sm flex-1">{task.name}</span>
                      <Badge
                        variant={task.completed ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        {task.completed ? 'Done' : 'Pending'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {timeStats.byDeadline.thisWeek.length > 0 && (
              <div>
                <h5 className="text-sm font-medium mb-2">Due This Week</h5>
                <div className="space-y-2">
                  {timeStats.byDeadline.thisWeek.map(task => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-2 bg-muted/30 rounded"
                    >
                      <div className="w-2 h-2 bg-amber-500 rounded-full" />
                      <span className="text-sm flex-1">{task.name}</span>
                      <Badge
                        variant={task.completed ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        {task.completed ? 'Done' : 'Pending'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper function to get current temporal context
function getCurrentContext(): TimeContext {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  let timeOfDay: TimeContext['timeOfDay'];
  if (hour >= 5 && hour < 9) timeOfDay = 'morning';
  else if (hour >= 9 && hour < 12) timeOfDay = 'workday';
  else if (hour >= 12 && hour < 15) timeOfDay = 'afternoon';
  else if (hour >= 15 && hour < 18) timeOfDay = 'evening';
  else if (hour >= 18 && hour < 22) timeOfDay = 'night';
  else timeOfDay = 'morning';

  return {
    hour,
    dayOfWeek,
    isWeekend,
    currentTime: now,
    timeOfDay,
    dayType: 'today',
  };
}

// Generate temporal-based suggestions
function generateSuggestions(
  context: TimeContext,
  tasks: TemporalContextAIProps['currentTasks'],
  energyLevel: number
): TemporalSuggestion[] {
  const suggestions: TemporalSuggestion[] = [];
  const now = new Date();

  // Morning planning suggestion
  if (context.hour >= 8 && context.hour <= 10) {
    const pendingTasks = tasks?.filter(t => !t.completed) || [];
    if (pendingTasks.length > 0) {
      suggestions.push({
        id: 'morning-planning',
        title: 'Morning Planning Session',
        description:
          'Start your day by reviewing pending tasks and prioritizing',
        confidence: 0.95,
        type: 'priority',
        suggested_at: new Date(now.getTime() + 30 * 60 * 1000),
        action: {
          type: 'create_task',
          payload: {
            name: 'Daily planning & prioritization',
            priority: 'low',
          },
        },
      });
    }
  }

  // Energy-based break suggestion
  if (context.hour >= 10 && context.hour <= 14 && energyLevel < 6) {
    suggestions.push({
      id: 'break-suggestion',
      title: 'Take a Break',
      description:
        'Your energy levels suggest a short break before continuing deep work',
      confidence: 0.85,
      type: 'break',
      suggested_at: new Date(now.getTime() + 60 * 60 * 1000),
      action: {
        type: 'create_task',
        payload: {
          name: '5-minute energy break',
          priority: 'low',
        },
      },
    });
  }

  // Critical task suggestion
  const criticalTask = tasks?.find(
    t => t.priority === 'critical' && !t.completed
  );
  if (criticalTask) {
    const daysToDeadline = criticalTask.deadline
      ? Math.ceil(
          (new Date(criticalTask.deadline).getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 7;

    if (daysToDeadline <= 3) {
      suggestions.push({
        id: 'critical-task',
        title: 'Focus on Critical Task',
        description: `"${criticalTask.name}" is due in ${daysToDeadline} days`,
        confidence: 0.98,
        type: 'next_task',
        suggested_at: new Date(now.getTime() + 5 * 60 * 1000),
        action: {
          type: 'reschedule',
          payload: { task_id: criticalTask.id },
        },
      });
    }
  }

  // Afternoon deep work suggestion
  if (context.hour >= 14 && context.hour <= 16 && energyLevel >= 6) {
    const deepWorkTasks =
      tasks?.filter(
        t =>
          t.priority === 'critical' &&
          !t.completed &&
          (!t.deadline || new Date(t.deadline) > now)
      ) || [];

    if (deepWorkTasks.length > 0) {
      const task = deepWorkTasks[0];
      suggestions.push({
        id: 'deep-work',
        title: 'Deep Work Block',
        description: `Your energy is optimal for deep work. Consider: "${task.name}"`,
        confidence: 0.88,
        type: 'timing',
        suggested_at: new Date(now.getTime() + 15 * 60 * 1000),
        action: {
          type: 'create_task',
          payload: {
            name: 'Deep work: ' + task.name,
            priority: task.priority,
          },
        },
      });
    }
  }

  // End of day reflection
  if (context.hour >= 17 && context.hour <= 19) {
    const completedCount = tasks?.filter(t => t.completed).length || 0;
    const totalCount = tasks?.length || 1;
    const completionRate = completedCount / totalCount;

    suggestions.push({
      id: 'end-of-day-reflection',
      title: 'End of Day Reflection',
      description: `Today's completion rate: ${Math.round(completionRate * 100)}%`,
      confidence: 0.9,
      type: 'reflection',
      suggested_at: new Date(now.getTime() + 30 * 60 * 1000),
      action: {
        type: 'add_note',
        payload: {
          task_id: null,
          note: `Daily reflection for ${format(now, 'EEEE, MMM d')}`,
        },
      },
    });
  }

  // Weekend focus suggestion
  if (context.isWeekend) {
    const personalGrowthTasks =
      tasks?.filter(
        t =>
          (t.priority !== 'critical' &&
            !t.completed &&
            t.name.toLowerCase().includes('learn')) ||
          t.name.toLowerCase().includes('growth') ||
          t.name.toLowerCase().includes('skill')
      ) || [];

    if (personalGrowthTasks.length > 0) {
      suggestions.push({
        id: 'weekend-growth',
        title: 'Weekend Growth Time',
        description:
          'Use personal growth time for non-critical skill development',
        confidence: 0.92,
        type: 'priority',
        suggested_at: new Date(now.getTime() + 60 * 60 * 1000),
        action: {
          type: 'create_task',
          payload: {
            name: 'Weekend skill development',
            priority: 'low',
          },
        },
      });
    }
  }

  // Low energy warning
  if (energyLevel < 4 && !context.isWeekend) {
    suggestions.push({
      id: 'low-energy-warning',
      title: 'Low Energy Detected',
      description: 'Consider a walk or coffee break to boost energy',
      confidence: 0.85,
      type: 'energy',
      suggested_at: new Date(now.getTime() + 10 * 60 * 1000),
    });
  }

  return suggestions;
}

// Smart Task Selection based on Temporal Context
export function useTemporalTaskSelection(
  tasks: TemporalContextAIProps['currentTasks']
) {
  const [selectedTask, setSelectedTask] = useState<
    NonNullable<TemporalContextAIProps['currentTasks']>[0] | null
  >(null);

  const getNextBestTask = useCallback(() => {
    const now = new Date();
    const context = getCurrentContext();

    const pendingTasks = tasks?.filter(t => !t.completed) || [];

    if (pendingTasks.length === 0) return null;

    // Priority-based selection
    const criticalTasks = pendingTasks.filter(t => t.priority === 'critical');
    if (criticalTasks.length > 0) {
      return criticalTasks[0];
    }

    // Time-based selection
    if (context.hour >= 9 && context.hour <= 11) {
      // Morning: creative/high-focus
      return (
        pendingTasks.find(t => !t.energy_level || t.energy_level >= 6) ||
        pendingTasks[0]
      );
    }

    if (context.hour >= 14 && context.hour <= 16) {
      // Afternoon: medium focus
      return (
        pendingTasks.find(t => t.priority !== 'critical') || pendingTasks[0]
      );
    }

    return pendingTasks[0];
  }, [tasks]);

  return { selectedTask, setSelectedTask, getNextBestTask };
}
