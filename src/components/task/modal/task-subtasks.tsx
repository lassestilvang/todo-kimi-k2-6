"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";

interface TaskSubtasksProps {
  subtasks: string[];
  onSubtaskAdd: (name: string) => void;
  onSubtaskRemove: (index: number) => void;
  onSubtaskChange: (index: number, value: string) => void;
}

export function TaskSubtasks({
  subtasks,
  onSubtaskAdd,
  onSubtaskRemove,
  onSubtaskChange,
}: TaskSubtasksProps) {
  const [subtaskInput, setSubtaskInput] = useState("");

  const handleAdd = () => {
    if (!subtaskInput.trim()) return;
    onSubtaskAdd(subtaskInput.trim());
    setSubtaskInput("");
  };

  return (
    <div className="space-y-2">
      <Label>Subtasks</Label>
      <div className="flex gap-2">
        <Input
          value={subtaskInput}
          onChange={(e) => setSubtaskInput(e.target.value)}
          placeholder="Add a subtask..."
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button variant="outline" size="icon" onClick={handleAdd}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <AnimatePresence>
        {subtasks.length > 0 && (
          <div className="space-y-1 mt-2">
            {subtasks.map((subtask, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm"
              >
                <Input
                  value={subtask}
                  onChange={(e) => onSubtaskChange(index, e.target.value)}
                  className="flex-1 border-none bg-transparent p-0 text-sm focus-visible:ring-0"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onSubtaskRemove(index)}
                >
                  <Trash2 className="h-3 w-3 text-red-500" />
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}