'use client';

import { useState, useMemo } from 'react';
import {
  Workflow,
  GitBranch,
  ArrowRight,
  CheckSquare,
  AlertCircle,
  CheckCircle2,
  Clock,
  Brain,
  TrendingUp,
  Filter,
  Search,
  LayoutGrid,
  Layers,
  Zap,
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Task, TaskConnection } from '@/types';

interface TaskFlowVisualizationProps {
  tasks: Task[];
  connections?: TaskConnection[];
  className?: string;
}

// Mock data for demonstration
const mockTasks: Task[] = [
  {
    id: 1,
    user_id: 1,
    name: 'Design database schema',
    description: 'Create the database schema for the new feature',
    priority: 'high',
    completed: true,
    completed_at: '2025-01-18',
    created_at: '2025-01-10',
    updated_at: '2025-01-18',
    date: null,
    deadline: '2025-01-20',
    estimate: null,
    actual_time: null,
    notes: null,
    list_id: null,
    recurring: 'none',
    recurring_config: null,
    sort_order: 0,
    archived: false,
  },
  {
    id: 2,
    user_id: 1,
    name: 'Implement task flow visualization',
    description: 'Build the interactive visualization component',
    priority: 'critical',
    completed: false,
    completed_at: null,
    created_at: '2025-01-12',
    updated_at: '2025-01-19',
    date: null,
    deadline: '2025-01-25',
    estimate: null,
    actual_time: null,
    notes: null,
    list_id: null,
    recurring: 'none',
    recurring_config: null,
    sort_order: 1,
    archived: false,
  },
  {
    id: 3,
    user_id: 1,
    name: 'Update API routes',
    description: 'Add new API endpoints for the visualization',
    priority: 'high',
    completed: false,
    completed_at: null,
    created_at: '2025-01-14',
    updated_at: '2025-01-19',
    date: null,
    deadline: '2025-01-22',
    estimate: null,
    actual_time: null,
    notes: null,
    list_id: null,
    recurring: 'none',
    recurring_config: null,
    sort_order: 2,
    archived: false,
  },
  {
    id: 4,
    user_id: 1,
    name: 'Write tests for visualization',
    description: 'Unit and integration tests for the new component',
    priority: 'medium',
    completed: false,
    completed_at: null,
    created_at: '2025-01-13',
    updated_at: '2025-01-19',
    date: null,
    deadline: '2025-01-26',
    estimate: null,
    actual_time: null,
    notes: null,
    list_id: null,
    recurring: 'none',
    recurring_config: null,
    sort_order: 3,
    archived: false,
  },
  {
    id: 5,
    user_id: 1,
    name: 'Deploy to production',
    description: 'Push the new features to production environment',
    priority: 'critical',
    completed: false,
    completed_at: null,
    created_at: '2025-01-15',
    updated_at: '2025-01-19',
    date: null,
    deadline: '2025-01-30',
    estimate: null,
    actual_time: null,
    notes: null,
    list_id: null,
    recurring: 'none',
    recurring_config: null,
    sort_order: 4,
    archived: false,
  },
];

const mockConnections: TaskConnection[] = [
  {
    id: 1,
    source_task_id: 1,
    target_task_id: 2,
    connection_type: 'prerequisite',
    strength: 1.0,
    notes: null,
    created_at: '2025-01-10',
  },
  {
    id: 2,
    source_task_id: 2,
    target_task_id: 3,
    connection_type: 'prerequisite',
    strength: 1.0,
    notes: null,
    created_at: '2025-01-12',
  },
  {
    id: 3,
    source_task_id: 2,
    target_task_id: 4,
    connection_type: 'prerequisite',
    strength: 1.0,
    notes: null,
    created_at: '2025-01-13',
  },
  {
    id: 4,
    source_task_id: 4,
    target_task_id: 5,
    connection_type: 'prerequisite',
    strength: 1.0,
    notes: null,
    created_at: '2025-01-13',
  },
  {
    id: 5,
    source_task_id: 3,
    target_task_id: 5,
    connection_type: 'prerequisite',
    strength: 0.8,
    notes: null,
    created_at: '2025-01-14',
  },
];

interface Node {
  task: Task;
  level: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

type ViewMode = 'timeline' | 'matrix' | 'dependencies' | 'connections';

export function TaskFlowVisualization({
  tasks = mockTasks,
  connections = mockConnections,
  className,
}: TaskFlowVisualizationProps) {
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [expandedTask, setExpandedTask] = useState<number | null>(null);

  // Filter tasks based on search and filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch =
        task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.description &&
          task.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesFilter =
        filter === 'all' ||
        (filter === 'completed' && task.completed) ||
        (filter === 'pending' && !task.completed) ||
        (filter === 'critical' && task.priority === 'critical') ||
        (filter === 'high' && task.priority === 'high');

      return matchesSearch && matchesFilter;
    });
  }, [tasks, searchTerm, filter]);

  // Calculate flow layout
  const nodes = useMemo(() => {
    const nodes: Node[] = [];
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const dependencies = new Map<number, number[]>([]);

    // Build dependency graph
    connections.forEach(conn => {
      if (!dependencies.has(conn.source_task_id)) {
        dependencies.set(conn.source_task_id, []);
      }
      dependencies.get(conn.source_task_id)!.push(conn.target_task_id);
    });

    // Calculate levels (topological sort)
    const levels = new Map<number, number>();
    const visited = new Set<number>();

    const calculateLevel = (taskId: number): number => {
      if (levels.has(taskId)) return levels.get(taskId)!;
      if (!visited.has(taskId)) {
        visited.add(taskId);
        const deps = dependencies.get(taskId) || [];
        if (deps.length === 0) {
          levels.set(taskId, 0);
        } else {
          const maxDepLevel = Math.max(...deps.map(calculateLevel));
          levels.set(taskId, maxDepLevel + 1);
        }
      }
      return levels.get(taskId)!;
    };

    tasks.forEach(task => calculateLevel(task.id));

    // Group tasks by level
    const levelGroups: Map<number, Task[]> = new Map();
    tasks.forEach(task => {
      const level = levels.get(task.id) || 0;
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)!.push(task);
    });

    // Calculate positions
    let nodeId = 0;
    levelGroups.forEach((levelTasks, level) => {
      const count = levelTasks.length;
      levelTasks.forEach((task, index) => {
        const x = ((index + 1) / (count + 1)) * 100;
        nodes.push({
          task,
          level,
          x,
          y: level * 200,
          width: 200,
          height: 80,
        });
        nodeId++;
      });
    });

    return nodes;
  }, [tasks, connections]);

  // Calculate blockers for each task
  const calculateBlockers = (taskId: number): Task[] => {
    const blockers: Task[] = [];
    const visited = new Set<number>();

    const findBlockers = (id: number) => {
      if (visited.has(id)) return;
      visited.add(id);

      const deps = connections.filter(c => c.target_task_id === id);
      deps.forEach(dep => {
        const sourceTask = tasks.find(t => t.id === dep.source_task_id);
        if (sourceTask && !sourceTask.completed) {
          blockers.push(sourceTask);
          findBlockers(sourceTask.id);
        }
      });
    };

    findBlockers(taskId);
    return blockers;
  };

  // Calculate dependent tasks
  const calculateDependents = (taskId: number): Task[] => {
    const dependents: Task[] = [];
    const visited = new Set<number>();

    const findDependents = (id: number) => {
      if (visited.has(id)) return;
      visited.add(id);

      const deps = connections.filter(c => c.source_task_id === id);
      deps.forEach(dep => {
        const targetTask = tasks.find(t => t.id === dep.target_task_id);
        if (targetTask) {
          dependents.push(targetTask);
          findDependents(targetTask.id);
        }
      });
    };

    findDependents(taskId);
    return dependents;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-amber-500 text-amber-900';
      case 'low':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-300 text-gray-800';
    }
  };

  const getConnectionTypeLabel = (type: string) => {
    switch (type) {
      case 'prerequisite':
        return 'Prerequisite';
      case 'inspiration':
        return 'Inspiration';
      case 'similar':
        return 'Similar';
      case 'contrast':
        return 'Contrast';
      case 'related':
        return 'Related';
      case 'learned_from':
        return 'Learned From';
      default:
        return type;
    }
  };

  const renderTimelineView = () => (
    <div className="space-y-4">
      <div className="flex gap-2 mb-4">
        {['all', 'pending', 'completed', 'critical', 'high'].map(status => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        ))}
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border -z-0" />

        {/* Tasks as timeline nodes */}
        <div className="space-y-8">
          {filteredTasks.map((task, index) => {
            const blockers = calculateBlockers(task.id);
            const dependents = calculateDependents(task.id);

            return (
              <Tooltip key={task.id}>
                <TooltipTrigger>
                  <div className="flex items-start gap-4">
                    {/* Timeline marker */}
                    <div className="flex-shrink-0 z-10">
                      <div
                        className={cn(
                          'flex items-center justify-center w-8 h-8 rounded-full',
                          task.completed ? 'bg-green-500' : 'bg-primary'
                        )}
                      >
                        {task.completed ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                      {blockers.length > 0 && (
                        <div className="absolute -top-1 -right-1 flex gap-0.5">
                          {blockers.slice(0, 3).map((_, i) => (
                            <AlertCircle
                              key={i}
                              className="h-4 w-4 text-red-500 fill-current"
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Task Card */}
                    <Card
                      className={cn(
                        'flex-1 transition-shadow hover:shadow-md',
                        expandedTask === task.id && 'ring-2 ring-primary'
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{task.name}</h4>
                              <Badge
                                className={getPriorityColor(task.priority)}
                              >
                                {task.priority}
                              </Badge>
                            </div>
                            {task.description && (
                              <p className="text-sm text-muted-foreground mb-2">
                                {task.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>
                                Deadline:{' '}
                                {task.deadline
                                  ? format(new Date(task.deadline), 'MMM d')
                                  : 'No deadline'}
                              </span>
                              {dependents.length > 0 && (
                                <span>Blocks: {dependents.length} tasks</span>
                              )}
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setExpandedTask(
                                expandedTask === task.id ? null : task.id
                              )
                            }
                          >
                            <Layers className="h-4 w-4" />
                          </Button>
                        </div>

                        {expandedTask === task.id && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="space-y-3">
                              <div>
                                <h5 className="text-sm font-medium mb-2">
                                  Connections
                                </h5>
                                <div className="bg-muted/30 rounded-lg p-3">
                                  <p className="text-xs">
                                    {getConnectionTypeLabel('prerequisite')}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Connected to:{' '}
                                    {task.completed
                                      ? 'Database Schema'
                                      : 'API Routes'}
                                  </p>
                                </div>
                              </div>

                              <div>
                                <h5 className="text-sm font-medium mb-2">
                                  Analytics
                                </h5>
                                <div className="grid grid-cols-2 gap-4 text-center">
                                  <div>
                                    <p className="text-lg font-bold">85%</p>
                                    <p className="text-xs text-muted-foreground">
                                      Risk
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-lg font-bold">High</p>
                                    <p className="text-xs text-muted-foreground">
                                      Critical Path
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{task.name}</p>
                  <p className="text-xs opacity-70">
                    {task.completed ? 'Completed' : 'In Progress'}
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderMatrixView = () => (
    <div>
      <div className="grid gap-4">
        {/* Matrix header */}
        <div className="grid grid-cols-[150px_1fr] gap-4">
          <div />
          {filteredTasks.map(task => (
            <div key={task.id} className="text-center">
              <Badge variant="outline" className="text-xs">
                {task.name
                  .split(' ')
                  .map(w => w[0])
                  .join('')
                  .slice(0, 3)}
              </Badge>
            </div>
          ))}
        </div>

        {/* Connection matrices */}
        <div className="space-y-2">
          {filteredTasks.map(task => (
            <div
              key={task.id}
              className="grid grid-cols-[150px_1fr] gap-4 items-center"
            >
              <div className="font-medium text-sm">{task.name}</div>
              <div className="grid gap-2">
                {filteredTasks.map(otherTask => {
                  if (task.id === otherTask.id) return null;
                  const connection = connections.find(
                    c =>
                      (c.source_task_id === task.id &&
                        c.target_task_id === otherTask.id) ||
                      (c.source_task_id === otherTask.id &&
                        c.target_task_id === task.id)
                  );
                  const isBlocker =
                    connection?.connection_type === 'prerequisite' &&
                    task.id === connection.source_task_id;
                  const isDependent =
                    connection?.connection_type === 'prerequisite' &&
                    task.id === connection.target_task_id;

                  return (
                    <Badge
                      key={otherTask.id}
                      variant={
                        isBlocker
                          ? 'default'
                          : isDependent
                            ? 'outline'
                            : 'secondary'
                      }
                      className="text-xs cursor-pointer"
                      title={getConnectionTypeLabel(
                        connection?.connection_type || 'none'
                      )}
                    >
                      {isBlocker ? '↓' : isDependent ? '↑' : '—'}
                    </Badge>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderDependenciesView = () => (
    <div className="space-y-4">
      <div className="grid gap-4">
        {filteredTasks.map(task => {
          const blockers = calculateBlockers(task.id);
          const dependents = calculateDependents(task.id);

          return (
            <Card key={task.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <Badge className={getPriorityColor(task.priority)}>
                      {task.priority}
                    </Badge>
                    <div className="text-xs mt-1">
                      {task.completed ? '✓ Done' : '○ Doing'}
                    </div>
                  </div>

                  <div className="flex-1">
                    <h4 className="font-medium">{task.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {task.description}
                    </p>
                  </div>

                  <div className="hidden md:block">
                    <div className="text-xs font-medium mb-1">
                      Prerequisites
                    </div>
                    <div className="space-y-1">
                      {blockers.length > 0 ? (
                        blockers.map(b => (
                          <div key={b.id} className="text-xs">
                            <Badge variant="outline" className="text-xs">
                              {b.name}
                            </Badge>
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          None
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="hidden md:block">
                    <div className="text-xs font-medium mb-1">Will Block</div>
                    <div className="space-y-1">
                      {dependents.length > 0 ? (
                        dependents.slice(0, 3).map(d => (
                          <div key={d.id} className="text-xs">
                            <Badge variant="secondary" className="text-xs">
                              {d.name}
                            </Badge>
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          None
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5" />
            Task Flow Visualization
          </CardTitle>
          <CardDescription>
            Visualize task dependencies and progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select
                value={filter}
                onValueChange={v => setFilter(v || filter)}
              >
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tasks</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="critical">Critical Only</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                {(['timeline', 'matrix', 'dependencies'] as ViewMode[]).map(
                  mode => (
                    <Button
                      key={mode}
                      variant={viewMode === mode ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode(mode)}
                    >
                      {mode === 'timeline' && 'Timeline'}
                      {mode === 'matrix' && 'Matrix'}
                      {mode === 'dependencies' && 'Dependencies'}
                    </Button>
                  )
                )}
              </div>
            </div>

            {/* Results summary */}
            <div className="text-sm text-muted-foreground">
              Showing {filteredTasks.length} of {tasks.length} tasks
            </div>

            {/* View content */}
            {viewMode === 'timeline' && renderTimelineView()}
            {viewMode === 'matrix' && renderMatrixView()}
            {viewMode === 'dependencies' && renderDependenciesView()}
          </div>
        </CardContent>
      </Card>

      {/* Analytics Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Critical Path
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">3 tasks</p>
            <p className="text-xs text-muted-foreground">
              Longest dependency chain
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              Blocked Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">0</p>
            <p className="text-xs text-muted-foreground">Tasks with blockers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Brain className="h-3.5 w-3.5" />
              Avg Progression
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">82%</p>
            <p className="text-xs text-muted-foreground">Average completion</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
