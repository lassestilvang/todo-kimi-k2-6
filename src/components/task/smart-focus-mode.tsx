'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Focus, Minimize2, Brain, Clock, Zap, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useEnhancedProductivity } from '@/hooks/use-enhanced-productivity';
import type { TaskWithRelations } from '@/types';

interface SmartFocusModeProps {
  task: TaskWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ContextState {
  location?: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  isWorkingHours: boolean;
  detectedPurpose?: string;
}

interface AiSuggestion {
  type: 'break' | 'deep-work' | 'shallow-work' | 'distraction';
  confidence: number;
  message: string;
  durationMinutes: number;
}

export function SmartFocusMode({
  task,
  open,
  onOpenChange,
}: SmartFocusModeProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [context, setContext] = useState<ContextState>({
    timeOfDay: 'afternoon',
    isWorkingHours: true,
  });
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [notificationsMuted, setNotificationsMuted] = useState(false);
  const [energyLevel, setEnergyLevel] = useState<number>(5);
  const [adaptedTimerSettings, setAdaptedTimerSettings] = useState({
    pomodoroMinutes: 25,
    breakMinutes: 5,
  });

  const { energyBudget } = useEnhancedProductivity();
  const profile = energyBudget?.profile;

  // Detect context
  useEffect(() => {
    const detectContext = async () => {
      const now = new Date();
      const hour = now.getHours();

      // Determine time of day
      let timeOfDay: 'morning' | 'afternoon' | 'evening' = 'afternoon';
      if (hour < 12) timeOfDay = 'morning';
      else if (hour < 18) timeOfDay = 'afternoon';
      else timeOfDay = 'evening';

      // Check if within working hours
      const workStart = profile?.work_hours?.start ?? 9;
      const workEnd = profile?.work_hours?.end ?? 17;
      const isWorkingHours = hour >= workStart && hour < workEnd;

      setContext({ timeOfDay, isWorkingHours });
    };

    detectContext();
  }, [profile]);

  // Generate AI suggestions based on context
  useEffect(() => {
    const generateSuggestions = async () => {
      const suggestions: AiSuggestion[] = [];

      // Deep work suggestion when energy is high and no interruptions
      if (energyLevel >= 7 && context.isWorkingHours) {
        suggestions.push({
          type: 'deep-work',
          confidence: 0.85,
          message: 'High energy detected - ideal time for deep, focused work',
          durationMinutes: 90,
        });
      }

      // Break suggestion when energy is low
      if (energyLevel <= 3) {
        suggestions.push({
          type: 'break',
          confidence: 0.9,
          message: 'Energy is low - take a short break to recharge',
          durationMinutes: 10,
        });
      }

      setAiSuggestions(suggestions);
    };

    generateSuggestions();
  }, [energyLevel, context.isWorkingHours]);

  const toggleFullscreen = useCallback(() => {
    if (!open) return;
    setIsFullscreen(prev => !prev);
  }, [open]);

  const toggleNotifications = useCallback(() => {
    setNotificationsMuted(prev => !prev);
  }, []);

  const adjustEnergyLevel = useCallback((adjustment: -1 | 0 | 1) => {
    setEnergyLevel(prev => Math.max(1, Math.min(10, prev + adjustment)));
  }, []);

  const applyEnergyBasedSettings = useCallback(() => {
    const energy = energyBudget?.budget?.balance ?? 50;
    const basePomodoro = 25;
    const baseBreak = 5;

    let pomodoroMinutes = basePomodoro;
    let breakMinutes = baseBreak;

    if (energy >= 80) {
      pomodoroMinutes = 30;
      breakMinutes = 3;
    } else if (energy <= 30) {
      pomodoroMinutes = 20;
      breakMinutes = 7;
    }

    setAdaptedTimerSettings({ pomodoroMinutes, breakMinutes });
  }, [energyBudget?.budget?.balance]);

  useEffect(() => {
    applyEnergyBasedSettings();
  }, [applyEnergyBasedSettings]);

  if (!open) return null;

  return (
    <AnimatePresence>
      open && (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn(
          'fixed inset-0 z-50 bg-background/95 backdrop-blur-sm',
          'flex items-center justify-center p-4',
          isFullscreen && 'p-0'
        )}
        onClick={toggleFullscreen}
      >
        <Card
          className={cn(
            'w-full max-w-2xl mx-auto',
            isFullscreen && 'w-full h-full rounded-none'
          )}
          onClick={e => e.stopPropagation()}
        >
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Smart Focus Mode
            </CardTitle>
            <div className="flex gap-2">
              <Badge variant="outline" onClick={toggleNotifications}>
                {notificationsMuted ? '🔇 Unmute' : '🔔 Mute'}
              </Badge>
              <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Focus className="h-4 w-4" />
                )}
              </Button>
              <X
                className="h-5 w-5 cursor-pointer"
                onClick={() => onOpenChange(false)}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Context Info */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Time</p>
                <p className="font-semibold capitalize">{context.timeOfDay}</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Hours</p>
                <p className="font-semibold">
                  {context.isWorkingHours ? 'Working' : 'Rest'}
                </p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Energy</p>
                <div className="flex items-center justify-center gap-1">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span className="font-semibold">
                    {energyBudget?.budget?.balance ?? 50}
                  </span>
                  <button
                    onClick={() => adjustEnergyLevel(-1)}
                    className="hover:bg-muted rounded-full p-1"
                  >
                    -
                  </button>
                  <button
                    onClick={() => adjustEnergyLevel(1)}
                    className="hover:bg-muted rounded-full p-1"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* AI Suggestions */}
            {aiSuggestions.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  AI Suggestions
                </h3>
                {aiSuggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border bg-card flex items-center gap-3"
                  >
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full',
                        suggestion.type === 'deep-work' && 'bg-blue-500',
                        suggestion.type === 'break' && 'bg-green-500',
                        suggestion.type === 'shallow-work' && 'bg-purple-500',
                        suggestion.type === 'distraction' && 'bg-red-500'
                      )}
                    />
                    <div className="flex-1">
                      <p className="text-sm">{suggestion.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {suggestion.durationMinutes} min
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {Math.round(suggestion.confidence * 100)}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Timer Settings */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pomodoro Settings
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Work</p>
                  <p className="text-lg font-semibold">
                    {adaptedTimerSettings.pomodoroMinutes} min
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Break</p>
                  <p className="text-lg font-semibold">
                    {adaptedTimerSettings.breakMinutes} min
                  </p>
                </div>
              </div>
            </div>

            {/* Task Info */}
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">{task?.name}</p>
              {task?.priority && (
                <Badge
                  variant={
                    task.priority === 'critical'
                      ? 'destructive'
                      : task.priority === 'high'
                        ? 'default'
                        : task.priority === 'medium'
                          ? 'secondary'
                          : 'outline'
                  }
                  className="mt-1"
                >
                  {task.priority}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
      )
    </AnimatePresence>
  );
}
