"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, StopCircle, Clock, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { TaskWithRelations, TimeEntry } from "@/types";
import { toast } from "sonner";
import { addTimeEntry, getTimeEntries, updateTimeEntry, deleteTimeEntry } from "@/lib/actions/time";

interface TimeTrackerProps {
  task: TaskWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TimeTracker({ task, open, onOpenChange }: TimeTrackerProps) {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStart, setCurrentStart] = useState<Date | null>(null);
  const [description, setDescription] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadTimeEntries = async () => {
    const entries = await getTimeEntries(task.id);
    setTimeEntries(entries);
  };

  useEffect(() => {
    if (open) {
      loadTimeEntries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (isRunning && intervalRef.current === null) {
      intervalRef.current = setInterval(() => {
        if (currentStart) {
          setElapsedSeconds(Math.floor((Date.now() - currentStart.getTime()) / 1000));
        }
      }, 1000);
    } else if (!isRunning && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, currentStart]);

  // Activity detection - pause timer when user switches tabs or leaves the page
  useEffect(() => {
    if (!isRunning) return;

    const handleVisibilityChange = () => {
      if (document.hidden && currentStart) {
        handlePause();
      }
    };

    const handleBeforeUnload = () => {
      if (isRunning && currentStart) {
        // Log time up to this point before unloading
        handleStop();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isRunning, currentStart]);

  const handleStart = () => {
    setIsRunning(true);
    setCurrentStart(new Date());
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleStop = async () => {
    if (!currentStart) return;

    const endTime = new Date();
    const durationSeconds = Math.floor((endTime.getTime() - currentStart.getTime()) / 1000);

    try {
      const newEntry = await addTimeEntry({
        task_id: task.id,
        start_time: currentStart.toISOString(),
        end_time: endTime.toISOString(),
        duration_seconds: durationSeconds,
        description: description || undefined,
      });
      setTimeEntries([...timeEntries, newEntry]);
      setDescription("");
      setIsRunning(false);
      setElapsedSeconds(0);
      setCurrentStart(null);
      toast.success(`Logged ${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`);
    } catch (error) {
      toast.error("Failed to log time");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteTimeEntry(id);
      setTimeEntries(timeEntries.filter((e) => e.id !== id));
      toast.success("Time entry deleted");
    } catch {
      toast.error("Failed to delete time entry");
    }
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  const totalTime = timeEntries
    .filter((e) => e.duration_seconds)
    .reduce((sum, e) => sum + (e.duration_seconds || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Time Tracking</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Total time spent</p>
            <p className="text-2xl font-bold">{formatDuration(totalTime)}</p>
          </div>

          {isRunning && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Running</p>
              <p className="text-xl font-mono">{formatDuration(elapsedSeconds)}</p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              variant={isRunning ? "destructive" : "default"}
              onClick={isRunning ? handlePause : handleStart}
            >
              {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            {isRunning && (
              <>
                <Input
                  placeholder="What are you working on?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline" onClick={handleStop}>
                  <StopCircle className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {timeEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No time entries yet</p>
            ) : (
              timeEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-2 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {entry.start_time ? formatDuration(
                        entry.duration_seconds || 0
                      ) : "In progress..."}
                    </div>
                    {entry.description && (
                      <div className="text-xs text-muted-foreground">{entry.description}</div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {new Date(entry.start_time).toLocaleTimeString()}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(entry.id)}
                  >
                    <StopCircle className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}