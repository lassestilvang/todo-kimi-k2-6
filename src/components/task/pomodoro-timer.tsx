"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Pause, StopCircle, RotateCcw } from "lucide-react";
import type { TaskWithRelations } from "@/types";

interface PomodoroTimerProps {
  task: TaskWithRelations;
}

export function PomodoroTimer({ task }: PomodoroTimerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes default
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [customTime, setCustomTime] = useState(25);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      setCompletedPomodoros((prev) => prev + 1);
      setTimeLeft(25 * 60);
      // Could play sound or show notification here
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStart = () => {
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleStop = () => {
    setIsRunning(false);
    setTimeLeft(25 * 60);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(customTime * 60);
    setCompletedPomodoros(0);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const minutes = parseInt(e.target.value) || 25;
    setCustomTime(minutes);
    setTimeLeft(minutes * 60);
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="font-medium mb-2">Pomodoro Timer</h3>
        <p className="text-sm text-muted-foreground">
          Current task: <span className="font-medium">{task.name}</span>
        </p>
      </div>

      <div className="text-center">
        <div className="text-6xl font-bold mb-2">{formatTime(timeLeft)}</div>
        <p className="text-sm text-muted-foreground">
          Completed: {completedPomodoros} pomodoros
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Label htmlFor="pomodoro-time" className="text-sm">
          Minutes:
        </Label>
        <Input
          id="pomodoro-time"
          type="number"
          min="1"
          max="60"
          value={customTime}
          onChange={handleTimeChange}
          disabled={isRunning}
          className="w-16"
        />
      </div>

      <div className="flex items-center gap-2">
        {!isRunning ? (
          <Button onClick={handleStart} disabled={timeLeft === 0}>
            <Play className="h-4 w-4 mr-2" />
            Start
          </Button>
        ) : (
          <Button onClick={handlePause} variant="outline">
            <Pause className="h-4 w-4 mr-2" />
            Pause
          </Button>
        )}
        <Button variant="outline" onClick={handleStop}>
          <StopCircle className="h-4 w-4 mr-2" />
          Stop
        </Button>
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>

      <div className="text-xs text-muted-foreground">
        <p>• Focus for {customTime} minutes</p>
        <p>• Take a 5-minute break after each pomodoro</p>
        <p>• After 4 pomodoros, take a longer break</p>
      </div>
    </div>
  );
}