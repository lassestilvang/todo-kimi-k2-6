"use client";

import { useState } from "react";
import { Trash2, CalendarX2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import type { RecurringException } from "@/types";

interface RecurringExceptionsProps {
  taskId: number;
  exceptions: RecurringException[];
  onAddException: (date: string) => Promise<void>;
  onRemoveException: (id: number) => Promise<void>;
}

export function RecurringExceptions({
  taskId,
  exceptions,
  onAddException,
  onRemoveException,
}: RecurringExceptionsProps) {
  const [newExceptionDate, setNewExceptionDate] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddException = async () => {
    if (!newExceptionDate) return;
    setIsAdding(true);
    try {
      await onAddException(newExceptionDate);
      setNewExceptionDate("");
    } catch (error) {
      console.error("Failed to add exception:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveException = async (id: number) => {
    try {
      await onRemoveException(id);
    } catch (error) {
      console.error("Failed to remove exception:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recurring Task Exceptions</CardTitle>
        <CardDescription>
          Skip this task on specific dates. Useful for holidays or days you don't want the task to recur.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="exception-date" className="text-sm">
                Skip on date
              </Label>
              <Input
                id="exception-date"
                type="date"
                value={newExceptionDate}
                onChange={(e) => setNewExceptionDate(e.target.value)}
                disabled={isAdding}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleAddException}
                disabled={isAdding || !newExceptionDate}
                size="sm"
                variant="outline"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {exceptions.length > 0 ? (
            <div className="space-y-2">
              <Label className="text-sm">Skipped dates</Label>
              <ul className="space-y-1">
                {exceptions.map((exception) => (
                  <li
                    key={exception.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <span>{new Date(exception.exception_date).toLocaleDateString()}</span>
                    <Button
                      onClick={() => handleRemoveException(exception.id)}
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No exceptions set</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}