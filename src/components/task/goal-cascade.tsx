'use client';

import { useState, useMemo } from 'react';
import { Layers, Plus, CheckCircle2, Calendar, Lightbulb } from 'lucide-react';
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
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface GoalCascadeProps {
  vision?: VisionGoal;
  annualGoals?: GoalNode[];
  quarterlyGoals?: GoalNode[];
  monthlyGoals?: GoalNode[];
  weeklyGoals?: GoalNode[];
  dailyTasks?: TaskNode[];
}

interface VisionGoal {
  id: number;
  name: string;
  description?: string;
  target_date?: string;
  progress: number;
}

interface GoalNode {
  id: number;
  title: string;
  description?: string;
  target_value: number;
  current_value: number;
  deadline?: string;
  parent_id?: number;
  children_ids?: number[];
  completed: boolean;
  createdAt: string;
}

interface TaskNode {
  id: number;
  name: string;
  completed: boolean;
  priority: string;
  date?: string | null;
  deadline?: string | null;
}

// Mock data for demonstration
const mockVision: VisionGoal = {
  id: 1,
  name: 'Become a Senior Software Engineer',
  description: 'Develop expertise across the full stack with leadership skills',
  target_date: '2025-12-31',
  progress: 65,
};

const mockAnnualGoals: GoalNode[] = [
  {
    id: 101,
    title: 'Master React Ecosystem',
    description: 'Deep understanding of React, Next.js, and modern patterns',
    target_value: 10,
    current_value: 6,
    deadline: '2025-03-31',
    completed: false,
    createdAt: '2024-01-15',
  },
  {
    id: 102,
    title: 'System Design Skills',
    description: 'Ability to design scalable architectures',
    target_value: 5,
    current_value: 3,
    deadline: '2025-06-30',
    completed: false,
    createdAt: '2024-01-15',
  },
  {
    id: 103,
    title: 'Leadership Experience',
    description: 'Lead at least 2 major projects or initiatives',
    target_value: 2,
    current_value: 1,
    deadline: '2025-12-31',
    completed: false,
    createdAt: '2024-01-15',
  },
];

const mockQuarterlyGoals: GoalNode[] = [
  {
    id: 201,
    title: 'Complete Next.js Certification',
    description: 'Finish advanced Next.js course and certification',
    target_value: 1,
    current_value: 1,
    deadline: '2025-03-15',
    parent_id: 101,
    completed: true,
    createdAt: '2025-01-10',
  },
  {
    id: 202,
    title: 'Build 3 Production Features',
    description: 'Implement and ship 3 complex features',
    target_value: 3,
    current_value: 1,
    deadline: '2025-03-31',
    parent_id: 101,
    completed: false,
    createdAt: '2025-01-10',
  },
];

const mockMonthlyGoals: GoalNode[] = [
  {
    id: 301,
    title: 'Code Review 10 PRs',
    description: 'Review pull requests for the team',
    target_value: 10,
    current_value: 4,
    deadline: '2025-01-31',
    parent_id: 202,
    completed: false,
    createdAt: '2025-01-01',
  },
  {
    id: 302,
    title: 'Write 2 Learning Articles',
    description: 'Share knowledge through technical writing',
    target_value: 2,
    current_value: 0,
    deadline: '2025-01-31',
    parent_id: 101,
    completed: false,
    createdAt: '2025-01-01',
  },
];

const mockWeeklyGoals: GoalNode[] = [
  {
    id: 401,
    title: 'Ship Feature: User Analytics',
    target_value: 1,
    current_value: 0,
    deadline: '2025-01-20',
    parent_id: 301,
    completed: false,
    createdAt: '2025-01-13',
  },
];

const mockDailyTasks: TaskNode[] = [
  {
    id: 501,
    name: 'Design analytics schema',
    completed: true,
    priority: 'high',
    date: '2025-01-16',
  },
  {
    id: 502,
    name: 'Implement analytics API',
    completed: true,
    priority: 'high',
    date: '2025-01-17',
  },
  {
    id: 503,
    name: 'Add analytics to dashboard',
    completed: false,
    priority: 'medium',
    date: '2025-01-18',
  },
];

export function GoalCascade({
  vision = mockVision,
  annualGoals = mockAnnualGoals,
  quarterlyGoals = mockQuarterlyGoals,
  monthlyGoals = mockMonthlyGoals,
  weeklyGoals = mockWeeklyGoals,
  dailyTasks = mockDailyTasks,
}: GoalCascadeProps) {
  const [expandedVisions, setExpandedVisions] = useState<boolean>(true);
  const [expandedYears, setExpandedYears] = useState<Set<number>>(
    new Set([2025])
  );
  const [expandedQuarters, setExpandedQuarters] = useState<Set<number>>(
    new Set(quarterlyGoals.map(g => g.id))
  );

  const calculateProgress = (
    goals: GoalNode[],
    timeframe: 'annual' | 'quarterly' | 'monthly' | 'weekly' = 'annual'
  ) => {
    if (goals.length === 0) return { overall: 0, completed: 0, total: 0 };

    const completed = goals.filter(g => g.completed).length;
    const total = goals.length;

    // Calculate weighted progress
    const weightedProgress = goals.reduce((sum, g) => {
      const progress = g.current_value / g.target_value;
      return sum + progress * g.target_value;
    }, 0);

    return {
      overall: Math.min(
        100,
        Math.round(
          (weightedProgress /
            goals.reduce((sum, g) => sum + g.target_value, 0)) *
            100
        )
      ),
      completed,
      total,
    };
  };

  const getDaysRemaining = (deadline?: string) => {
    if (!deadline) return null;
    const target = new Date(deadline);
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const getRiskLevel = (goal: GoalNode) => {
    if (goal.completed) return 'completed';
    const progress = goal.current_value / goal.target_value;
    const daysLeft = getDaysRemaining(goal.deadline);

    if (daysLeft !== null) {
      if (daysLeft < 0) return 'overdue';
      if (progress < 0.3 && daysLeft < 14) return 'high';
      if (progress < 0.5 && daysLeft < 7) return 'medium';
    }

    return progress > 0.7 ? 'low' : 'medium';
  };

  const riskColors = {
    completed: 'bg-green-500 text-green-700',
    low: 'bg-green-100 text-green-700',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-orange-100 text-orange-700',
    overdue: 'bg-red-100 text-red-700',
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      {/* Vision Statement */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Layers className="h-5 w-5 text-primary" />
            Vision Goal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Collapsible open={expandedVisions} onOpenChange={setExpandedVisions}>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold">{vision.name}</h3>
                {vision.description && (
                  <p className="text-muted-foreground mt-1">
                    {vision.description}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Overall Progress</span>
                  <span className="text-sm font-semibold">
                    {vision.progress}%
                  </span>
                </div>
                <Progress value={vision.progress} className="h-3" />
              </div>

              {vision.target_date && (
                <div className="text-xs text-muted-foreground">
                  Target date:{' '}
                  {format(new Date(vision.target_date), 'MMM d, yyyy')}
                </div>
              )}

              <CollapsibleContent>
                <div className="border-t pt-4 space-y-4">
                  {/* Annual Goals Summary */}
                  <div>
                    <h4 className="font-medium mb-3">
                      Annual Goals ({currentYear})
                    </h4>
                    <div className="grid gap-3">
                      {annualGoals.map(goal => (
                        <GoalItem
                          key={goal.id}
                          goal={goal}
                          level="annual"
                          isCompleted={goal.completed}
                          progress={Math.round(
                            (goal.current_value / goal.target_value) * 100
                          )}
                          daysRemaining={getDaysRemaining(goal.deadline)}
                          riskLevel={getRiskLevel(goal)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Other levels would go here */}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Progress Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Progress Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-3">Velocity Metrics</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Annual Completion Rate</span>
                  <Badge>
                    {calculateProgress(annualGoals).completed}/
                    {calculateProgress(annualGoals).total}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Quarterly Completion Rate</span>
                  <Badge>
                    {calculateProgress(quarterlyGoals).completed}/
                    {calculateProgress(quarterlyGoals).total}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Monthly Completion Rate</span>
                  <Badge>
                    {calculateProgress(monthlyGoals).completed}/
                    {calculateProgress(monthlyGoals).total}
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Recommendations</h4>
              <div className="space-y-2 text-sm">
                {getRiskLevel(mockAnnualGoals[0]) === 'high' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded">
                    <p className="text-amber-800">
                      ⚠️ "Master React Ecosystem" is behind schedule.
                    </p>
                    <p className="text-amber-700 text-xs mt-1">
                      Consider breaking into smaller milestones
                    </p>
                  </div>
                )}
                {getRiskLevel(mockQuarterlyGoals[0]) === 'completed' && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-green-800">
                      ✅ "Complete Next.js Certification" is on track!
                    </p>
                  </div>
                )}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-blue-800">
                    💡 Next milestone: "Ship Feature: User Analytics"
                  </p>
                  <p className="text-blue-700 text-xs mt-1">Due in 4 days</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Tasks Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            This Week's Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {weeklyGoals.map(weekly => {
              const weekTasks = dailyTasks.filter(
                t =>
                  t.date &&
                  new Date(t.date) >= new Date(weekly.deadline || '') &&
                  t.date &&
                  new Date(t.date) <= new Date(weekly.deadline || '')
              );
              const completedTasks = weekTasks.filter(t => t.completed).length;

              return (
                <div key={weekly.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h5 className="font-medium">{weekly.title}</h5>
                      <p className="text-xs text-muted-foreground">
                        {getDaysRemaining(weekly.deadline)} days remaining
                      </p>
                    </div>
                    <Badge variant={weekly.completed ? 'default' : 'outline'}>
                      {weekly.completed ? 'Done' : 'In Progress'}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="flex-1">
                        Tasks completed: {completedTasks}/{weekTasks.length}
                      </span>
                      <Progress
                        value={(completedTasks / weekTasks.length) * 100 || 0}
                        className="w-20 h-1.5"
                      />
                    </div>

                    {weekTasks.map(task => (
                      <div
                        key={task.id}
                        className="flex items-center gap-2 text-xs"
                      >
                        <CheckCircle2
                          className={cn(
                            'h-3 w-3',
                            task.completed
                              ? 'text-green-500'
                              : 'text-muted-foreground'
                          )}
                        />
                        <span
                          className={cn(
                            task.completed &&
                              'line-through text-muted-foreground'
                          )}
                        >
                          {task.name}
                        </span>
                        <Badge variant="outline" className="text-[9px] px-1">
                          {task.priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Goal Creation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Goal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2">Goal Title</label>
                <Input placeholder="e.g., Learn TypeScript Advanced Patterns" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2">Target Value</label>
                <Input type="number" placeholder="100" />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2">Deadline</label>
                <Input type="date" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2">
                  Parent Goal (optional)
                </label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent" />
                  </SelectTrigger>
                  <SelectContent>
                    {annualGoals.map(g => (
                      <SelectItem key={g.id} value={g.id.toString()}>
                        {g.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <Button className="mt-4 w-full">Create Cascaded Goal</Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper component for goal items
const riskColors = {
  completed: 'bg-green-500 text-green-700',
  low: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700',
  overdue: 'bg-red-100 text-red-700',
};

function GoalItem({
  goal,
  level,
  isCompleted,
  progress,
  daysRemaining,
  riskLevel,
}: {
  goal: GoalNode;
  level: string;
  isCompleted: boolean;
  progress: number;
  daysRemaining: number | null;
  riskLevel: string;
}) {
  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h5 className="font-medium">{goal.title}</h5>
          {goal.description && (
            <p className="text-xs text-muted-foreground">{goal.description}</p>
          )}
        </div>
        <Badge
          className={cn(
            riskColors[riskLevel as keyof typeof riskColors],
            'text-xs'
          )}
        >
          {riskLevel === 'completed' ? 'Done' : riskLevel}
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {goal.current_value} / {goal.target_value}
          </span>
          {daysRemaining !== null && (
            <span
              className={cn(
                daysRemaining < 0
                  ? 'text-red-500'
                  : daysRemaining < 7
                    ? 'text-amber-500'
                    : 'text-muted-foreground'
              )}
            >
              {daysRemaining < 0 ? 'Overdue' : `${daysRemaining}d left`}
            </span>
          )}
        </div>

        <Progress value={progress} className="h-1.5" />

        {!isCompleted && (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-6 text-xs">
              +10%
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-xs">
              +25%
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-xs">
              Complete
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
