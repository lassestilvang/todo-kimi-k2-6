"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Focus, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TaskWithRelations } from "@/types";

interface FocusModeProps {
  task: TaskWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FocusMode({ task, open, onOpenChange }: FocusModeProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const enterFullscreen = () => {
    document.documentElement.requestFullscreen();
  };

  const exitFullscreen = () => {
    document.exitFullscreen();
  };

  const toggleFullscreen = () => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] bg-background rounded-xl shadow-2xl border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Focus className="h-5 w-5" />
                <h2 className="font-semibold">Focus Mode</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleFullscreen}
                  title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl font-bold mb-4"
              >
                {task.name}
              </motion.h1>

              {task.description && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-lg text-muted-foreground mb-6"
                >
                  {task.description}
                </motion.p>
              )}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {task.date && (
                    <div>
                      <span className="text-muted-foreground">Date</span>
                      <p className="font-medium">
                        {new Date(task.date).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {task.priority !== "none" && (
                    <div>
                      <span className="text-muted-foreground">Priority</span>
                      <p className="font-medium capitalize">{task.priority}</p>
                    </div>
                  )}
                </div>

                {task.subtasks && task.subtasks.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Subtasks</h3>
                    <ul className="space-y-2">
                      {task.subtasks.map((subtask, index) => (
                        <motion.li
                          key={subtask.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * index }}
                          className={cn(
                            "text-sm",
                            subtask.completed && "line-through text-muted-foreground"
                          )}
                        >
                          • {subtask.name}
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}