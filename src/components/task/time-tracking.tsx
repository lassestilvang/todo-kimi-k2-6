"use client";

import { useState, useEffect, useRef } from "react";
import { Clock, Play, Pause, StopCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { TimeEntry } from "@/types";

interface TimeTrackingProps {
  taskId: number;
  timeEntries: TimeEntry[];
  onLogTime: (taskId: number, entry: { start_time: string; end_time?: string; duration_seconds?: number; description?: string }) => void;
  onDeleteEntry: (entryId: number) => void;
}

export function TimeTracking({
  taskId,
  timeEntries,
  onLogTime,
  onDeleteEntry,
}: TimeTrackingProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [description, setDescription] = useState("");
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning && startTime) {
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000));
      }, 1000);
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
  }, [isRunning, startTime]);

  const handleStart = () => {
    setStartTime(new Date());
    setElapsed(0);
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleStop = () => {
    setIsRunning(false);
    setElapsed(0);
    setStartTime(null);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleLogTime = () => {
    if (elapsed === 0) return;
    onLogTime(taskId, {
      start_time: new Date().toISOString(),
      duration_seconds: elapsed,
      description: description || undefined,
    });
    setElapsed(0);
    setDescription("");
    setIsPopoverOpen(false);
  };

  const totalTime = timeEntries.reduce((sum, entry) => sum + (entry.duration_seconds || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Time Tracking</span>
        </div>
        <span className="text-xs text-muted-foreground">
          Total: {formatTime(totalTime)}
        </span>
      </div>

      {/* Timer */}
      <div className="flex items-center gap-2">
        <div className="flex-1 font-mono text-lg font-bold text-center">
          {formatTime(elapsed)}
        </div>
        <div className="flex gap-1">
          {!isRunning ? (
            <Button variant="outline" size="sm" onClick={handleStart}>
              <Play className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handlePause}>
              <Pause className="h-4 w-4" />
            </Button>
          )}
          {elapsed > 0 && (
            <Button variant="outline" size="sm" onClick={handleStop}>
              <StopCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Log Time Popover */}
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger>
          <Button variant="outline" size="sm" disabled={elapsed === 0}>
            <Plus className="h-4 w-4 mr-1.5" />
            Log Time
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Duration (seconds)</Label>
              <Input
                type="number"
                value={elapsed}
                onChange={(e) => setElapsed(Number(e.target.value))}
                className="text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Description (optional)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What did you work on?"
                className="text-xs"
              />
            </div>
            <Button size="sm" onClick={handleLogTime} className="w-full">
              Log Time
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Time Entries */}
      {timeEntries.length > 0 && (
        <div className="border-t pt-3">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {timeEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between text-xs">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">
                    {formatTime(entry.duration_seconds || 0)}
                  </div>
                  {entry.description && (
                    <div className="text-muted-foreground truncate">
                      {entry.description}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteEntry(entry.id)}
                  className="text-destructive h-5 w-5 p-0"
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}