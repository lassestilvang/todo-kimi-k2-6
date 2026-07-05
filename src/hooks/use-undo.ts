"use client";

import { useState } from "react";
import { toast } from "sonner";

/**
 * Hook for undo functionality on destructive actions
 * Provides a toast with undo button that can reverse the action
 */
export function useUndo<T>() {
  const [pendingAction, setPendingAction] = useState<{
    undo: () => void;
    timeoutId: ReturnType<typeof setTimeout>;
  } | null>(null);

  /**
   * Execute an action with undo capability
   */
  function executeWithUndo(
    action: () => void | Promise<void>,
    undoAction: () => void | Promise<void>,
    message: string,
    undoLabel = "Undo"
  ): void | Promise<void> {
    // Cancel any existing pending undo
    if (pendingAction) {
      clearTimeout(pendingAction.timeoutId);
    }

    const timeoutId = setTimeout(() => {
      setPendingAction(null);
    }, 5000); // 5 second window for undo

    const newPendingAction = { undo: undoAction, timeoutId };
    setPendingAction(newPendingAction);

    // Create undo-able toast
    const result = action();

    // Handle sync action
    if (!(result instanceof Promise)) {
      toast.success(message, {
        action: {
          label: undoLabel,
          onClick: () => {
            clearTimeout(timeoutId);
            setPendingAction(null);
            undoAction();
          },
        },
        duration: 5000,
      });
      return;
    }

    // Handle async action
    return result.then(() => {
      toast.success(message, {
        action: {
          label: undoLabel,
          onClick: () => {
            clearTimeout(timeoutId);
            setPendingAction(null);
            undoAction();
          },
        },
        duration: 5000,
      });
    });
  }

  /**
   * Cancel any pending undo action
   */
  function cancelUndo(): void {
    if (pendingAction) {
      clearTimeout(pendingAction.timeoutId);
      setPendingAction(null);
    }
  }

  return { executeWithUndo, cancelUndo };
}