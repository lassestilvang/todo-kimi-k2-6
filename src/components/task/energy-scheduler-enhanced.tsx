'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Zap,
  Brain,
  Calendar,
  BarChart3,
  Check,
  X,
  List,
  AlertCircle,
  Flame,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface EnergyForecast {
  hour: number;
  energy: number;
}

interface EnergyRecommendations {
  energyBalance: number;
  recommendations: string[];
  optimalHours: number[];
  avoidHours: number[];
  energyForecast: EnergyForecast[];
}

interface ScheduledTask {
  taskId: number;
  suggestedDate: string;
  suggestedStartTime: string;
  suggestedEndTime: string;
  confidence: number;
  reason: string;
  energyAllocation: number;
}

interface Task {
  id: number;
  name: string;
  priority: string;
  completed: boolean;
}

interface EnergySchedulerEnhancedProps {
  tasks: Task[];
  className?: string;
  onSchedule?: (taskId: number, date: string) => void;
}

export function EnergySchedulerEnhanced({
  tasks,
  className,
  onSchedule,
}: EnergySchedulerEnhancedProps) {
  const [recommendations, setRecommendations] =
    useState<EnergyRecommendations | null>(null);
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [selectedListId, setSelectedListId] = useState<number | null>(null);

  useEffect(() => {
    loadRecommendations();
  }, [selectedDate]);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/enhanced-productivity/energy-scheduling?action=recommendations`
      );
      const data = await response.json();
      setRecommendations(data);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
      toast.error('Failed to load energy recommendations');
    } finally {
      setLoading(false);
    }
  };

  const scheduleTasks = async () => {
    if (!tasks.length) return;

    setLoading(true);
    try {
      const response = await fetch(
        '/api/enhanced-productivity/energy-scheduling',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'schedule',
            taskIds: tasks.filter(t => !t.completed).map(t => t.id),
            date: selectedDate,
          }),
        }
      );
      const data = await response.json();

      if (data.totalEnergySpent !== undefined) {
        setScheduledTasks(data.scheduledTasks);
        toast.success(
          `Scheduled ${data.scheduledTasks.length} tasks energy-optimally`
        );
      } else if (data.error) {
        toast.error(data.error);
      } else {
        toast.success('Tasks scheduled');
      }
    } catch (error) {
      console.error('Failed to schedule tasks:', error);
      toast.error('Failed to schedule tasks');
    } finally {
      setLoading(false);
    }
  };

  const getEnergyColor = (energy: number) => {
    if (energy >= 7) return 'text-emerald-500';
    if (energy >= 5) return 'text-amber-500';
    if (energy >= 3) return 'text-orange-500';
    return 'text-red-500';
  };

  const getEnergyBg = (energy: number) => {
    if (energy >= 7) return 'bg-emerald-500';
    if (energy >= 5) return 'bg-amber-500';
    if (energy >= 3) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const incompleteTasks = tasks.filter(t => !t.completed);
  const priorityCounts = {
    critical: incompleteTasks.filter(t => t.priority === 'critical').length,
    high: incompleteTasks.filter(t => t.priority === 'high').length,
    medium: incompleteTasks.filter(t => t.priority === 'medium').length,
    low: incompleteTasks.filter(t => t.priority === 'low').length,
  };

  if (loading && !recommendations) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 bg-gray-200 rounded" />
            <div className="h-24 bg-gray-200 rounded" />
            <div className="h-24 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Flame className="h-5 w-5 text-amber-500" />
            Energy-Scheduled Tasks
          </h3>
          <p className="text-sm text-muted-foreground">
            Optimized based on your energy profile and task priorities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="w-auto"
          />
          <Button
            onClick={scheduleTasks}
            disabled={loading || !incompleteTasks.length}
          >
            {loading ? 'Scheduling...' : 'Analyze & Schedule'}
          </Button>
        </div>
      </div>

      {/* Energy Forecast */}
      {recommendations && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Today&apos;s Energy Forecast
            </CardTitle>
            <CardDescription>
              Peak hours: {recommendations.optimalHours.length} | Avoid:{' '}
              {recommendations.avoidHours.length}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recommendations.energyForecast.map(forecast => (
                <div key={forecast.hour} className="flex items-center gap-3">
                  <div className="w-12 text-sm font-mono">
                    {formatHour(forecast.hour)}
                  </div>
                  <div className="flex-1 h-3 bg-gray-200 rounded overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded transition-all',
                        getEnergyBg(forecast.energy)
                      )}
                      style={{ width: `${forecast.energy * 10}%` }}
                    />
                  </div>
                  <div
                    className={cn(
                      'w-8 text-sm font-medium',
                      getEnergyColor(forecast.energy)
                    )}
                  >
                    {forecast.energy}
                  </div>
                  {recommendations.optimalHours.includes(forecast.hour) && (
                    <Badge variant="secondary" className="text-xs">
                      Peak
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations?.recommendations &&
        recommendations.recommendations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {recommendations.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

      {/* Priority Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Priority Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {Object.entries(priorityCounts).map(
              ([priority, count]) =>
                count > 0 && (
                  <div key={priority} className="flex items-center gap-2">
                    <Badge
                      variant={
                        priority === 'critical'
                          ? 'destructive'
                          : priority === 'high'
                            ? 'default'
                            : priority === 'medium'
                              ? 'secondary'
                              : 'outline'
                      }
                    >
                      {priority}: {count}
                    </Badge>
                  </div>
                )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Tasks */}
      {scheduledTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Scheduled for {selectedDate}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scheduledTasks.map((task, i) => (
                <motion.div
                  key={task.taskId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-3 rounded-lg border bg-muted/50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Task #{task.taskId}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.reason}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs">
                          {task.suggestedStartTime} - {task.suggestedEndTime}
                        </span>
                        <Zap className="h-3 w-3 text-amber-500" />
                        <span className="text-xs">
                          {task.energyAllocation} energy units
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant={task.confidence > 0.7 ? 'default' : 'secondary'}
                    >
                      {Math.round(task.confidence * 100)}% confidence
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Energy Balance */}
      {recommendations && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Energy Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Remaining Energy</span>
                  <span>{recommendations.energyBalance} / 100</span>
                </div>
                <div className="h-3 bg-gray-200 rounded overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded transition-all',
                      recommendations.energyBalance > 50
                        ? 'bg-emerald-500'
                        : recommendations.energyBalance > 20
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                    )}
                    style={{
                      width: `${Math.min(recommendations.energyBalance, 100)}%`,
                    }}
                  />
                </div>
              </div>

              {incompleteTasks.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">
                    Estimated energy needed: {incompleteTasks.length} tasks
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSelectedDate(new Date().toISOString().split('T')[0])
                      }
                    >
                      Today
                    </Button>
                    <Button variant="outline" size="sm">
                      This Week
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
