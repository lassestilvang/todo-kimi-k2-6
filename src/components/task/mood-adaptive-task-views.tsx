'use client';

import { useState, useEffect } from 'react';
import {
  Brain,
  Heart,
  Zap,
  Cloud,
  Filter,
  SortAsc,
  Lightbulb,
  Activity,
  CheckCircle,
  Clock,
  AlertCircle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useMoodTracking,
  useEnergyBudget,
} from '@/hooks/use-enhanced-productivity';

interface MoodAdaptiveTaskViewsProps {
  className?: string;
  tasks?: Array<{
    id: number;
    name: string;
    description?: string | null;
    deadline?: string | null;
    priority: string;
    completed: boolean;
    estimate?: string | null;
    tags?: string[];
  }>;
}

type MoodType = 'energized' | 'balanced' | 'tired' | 'stressed' | 'inspired';
type EnergyType = 'high' | 'medium' | 'low';

interface Task {
  id: number;
  name: string;
  description?: string | null;
  deadline?: string | null;
  priority: string;
  completed: boolean;
  estimate?: string | null;
  tags?: string[];
}

export function MoodAdaptiveTaskViews({
  className,
  tasks = [],
}: MoodAdaptiveTaskViewsProps) {
  const { recommendations, loading: moodLoading } = useMoodTracking();
  const energyBudget = useEnergyBudget();
  const [activeMoodView, setActiveMoodView] = useState<MoodType>('balanced');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Determine current mood from energy and explicit mood input
  const currentEnergy = energyBudget.budget?.balance ?? 100;
  const energyPercent =
    (currentEnergy / (energyBudget.budget?.dailyLimit ?? 100)) * 100;

  const deriveMoodFromEnergy = (): MoodType => {
    if (energyPercent > 70) return 'energized';
    if (energyPercent > 40) return 'balanced';
    return 'tired';
  };

  useEffect(() => {
    if (recommendations?.primary_mood) {
      setActiveMoodView(recommendations.primary_mood);
    } else {
      setActiveMoodView(deriveMoodFromEnergy());
    }
  }, [recommendations]);

  const getMoodColor = (mood: MoodType): string => {
    const colors: Record<MoodType, string> = {
      energized: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      balanced: 'bg-green-100 text-green-800 border-green-200',
      tired: 'bg-blue-100 text-blue-800 border-blue-200',
      stressed: 'bg-red-100 text-red-800 border-red-200',
      inspired: 'bg-purple-100 text-purple-800 border-purple-200',
    };
    return colors[mood];
  };

  const getMoodIcon = (mood: MoodType): React.ReactNode => {
    const icons: Record<MoodType, React.ReactNode> = {
      energized: <Zap className="h-4 w-4" />,
      balanced: <Activity className="h-4 w-4" />,
      tired: <Cloud className="h-4 w-4" />,
      stressed: <AlertCircle className="h-4 w-4" />,
      inspired: <Lightbulb className="h-4 w-4" />,
    };
    return icons[mood];
  };

  const getFilteredTasks = (mood: MoodType): Task[] => {
    if (!tasks || tasks.length === 0) return [];

    const parseEstimateMinutes = (
      estimate: string | null | undefined
    ): number | null => {
      if (!estimate) return null;
      const match = estimate.match(/(\d+)\s*min/i);
      return match ? parseInt(match[1], 10) : null;
    };

    switch (mood) {
      case 'energized':
        return tasks.filter(
          t => t.priority === 'high' || t.priority === 'critical'
        );
      case 'balanced':
        return tasks.filter(t => !t.completed);
      case 'tired':
        return tasks.filter(t => {
          const mins = parseEstimateMinutes(t.estimate);
          return mins !== null && mins <= 15;
        });
      case 'stressed':
        return tasks.filter(t => t.priority === 'critical');
      case 'inspired':
        return tasks.filter(
          t =>
            t.tags &&
            t.tags.some((tag: string) =>
              ['creative', 'idea', 'brainstorm'].includes(tag)
            )
        );
      default:
        return tasks;
    }
  };

  const moodFilteredTasks = getFilteredTasks(activeMoodView);

  if (moodLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Mood & Energy Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Mood-Adaptive Views
          </CardTitle>
          <CardDescription>
            Task suggestions based on your current energy and mood
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Badge className={`${getMoodColor(activeMoodView)} border`}>
                {getMoodIcon(activeMoodView)}
                {activeMoodView.charAt(0).toUpperCase() +
                  activeMoodView.slice(1)}{' '}
                State
              </Badge>
            </div>
            <Select
              value={activeMoodView}
              onValueChange={(v: any) => setActiveMoodView(v)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select mood view" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="energized">
                  Energized - High impact tasks
                </SelectItem>
                <SelectItem value="balanced">
                  Balanced - Daily routine
                </SelectItem>
                <SelectItem value="tired">Tired - Quick wins</SelectItem>
                <SelectItem value="stressed">
                  Stressed - Urgent priorities
                </SelectItem>
                <SelectItem value="inspired">
                  Inspired - Creative work
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Energy Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Your Energy Level</span>
              <span className="text-sm text-muted-foreground">
                {Math.round(energyPercent)}%
              </span>
            </div>
            <Progress value={energyPercent} className="h-3" />
            <p className="text-xs text-muted-foreground mt-1">
              Balance: {energyBudget.budget?.balance ?? 100} /{' '}
              {energyBudget.budget?.dailyLimit ?? 100} pts
            </p>
          </div>

          {/* Mood-based Recommendations */}
          {recommendations?.recommendations && (
            <div className="bg-muted/50 rounded-lg p-3 mb-4">
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                AI Recommendations
              </h4>
              <ul className="space-y-1">
                {recommendations.recommendations
                  .slice(0, 3)
                  .map((rec: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Views Toggle */}
      <Card>
        <CardHeader>
          <CardTitle>
            Tasks for{' '}
            {activeMoodView.charAt(0).toUpperCase() + activeMoodView.slice(1)}{' '}
            Mood
          </CardTitle>
          <CardDescription>
            {moodFilteredTasks.length} tasks matched your current state
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              List View
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              Grid View
            </Button>
          </div>

          {moodFilteredTasks.length > 0 ? (
            <div>
              {viewMode === 'list' ? (
                <div className="space-y-3">
                  {moodFilteredTasks.slice(0, 10).map(task => (
                    <TaskItem key={task.id} task={task} mood={activeMoodView} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {moodFilteredTasks.slice(0, 10).map(task => (
                    <TaskGridItem
                      key={task.id}
                      task={task}
                      mood={activeMoodView}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No tasks match this mood view. Try adjusting your mood filter or
                add new tasks.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface TaskItemProps {
  task: Task;
  mood: MoodType;
}

function TaskItem({ task, mood }: TaskItemProps) {
  const getTaskMoodMatch = (task: Task, mood: MoodType): string => {
    const tags = task.tags || [];
    const tagString = tags.join(' ').toLowerCase();

    if (mood === 'energized' && tagString.includes('urgent')) return 'perfect';
    if (mood === 'balanced' && tagString.includes('daily')) return 'perfect';
    if (mood === 'tired') {
      const estimate = task.estimate;
      if (estimate) {
        const match = estimate.match(/(\d+)\s*min/i);
        if (match) {
          const mins = parseInt(match[1], 10);
          if (mins <= 15) return 'perfect';
        }
      }
    }
    if (mood === 'inspired' && tagString.includes('creative')) return 'perfect';
    if (mood === 'stressed' && task.priority === 'critical') return 'perfect';

    return 'recommended';
  };

  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg bg-card hover:shadow-sm transition-shadow">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium text-sm">{task.name}</h4>
          <Badge variant="outline" className="text-xs">
            {getTaskMoodMatch(task, mood)}
          </Badge>
        </div>
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          {task.deadline && <Clock className="h-3 w-3" />}
          <span>
            {task.deadline
              ? new Date(task.deadline).toLocaleDateString()
              : 'No due date'}
          </span>
          {task.priority && (
            <>
              <div className="w-1 h-1 bg-gray-300 rounded-full" />
              <Badge variant="outline" className="text-xs">
                {task.priority}
              </Badge>
            </>
          )}
        </div>
      </div>
      <Button variant="ghost" size="sm">
        <CheckCircle className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface TaskGridItemProps {
  task: Task;
  mood: MoodType;
}

function TaskGridItem({ task, mood }: TaskGridItemProps) {
  return (
    <div className="border rounded-lg p-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-sm line-clamp-2">{task.name}</h4>
        <Badge variant="outline" className="text-xs">
          {task.priority}
        </Badge>
      </div>
      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {task.description}
        </p>
      )}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {task.deadline && <Clock className="h-3 w-3" />}
        <span>
          {task.deadline
            ? new Date(task.deadline).toLocaleDateString()
            : 'No due date'}
        </span>
      </div>
    </div>
  );
}
