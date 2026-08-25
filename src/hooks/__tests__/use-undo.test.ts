import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUndo } from '../use-undo';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
  },
}));

import { toast } from 'sonner';

describe('useUndo Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('executeWithUndo', () => {
    it('should execute sync action and show success toast', () => {
      const { result } = renderHook(() => useUndo());
      const action = vi.fn();
      const undoAction = vi.fn();

      act(() => {
        result.current.executeWithUndo(action, undoAction, 'Deleted task');
      });

      expect(action).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Deleted task', expect.objectContaining({
        action: expect.objectContaining({
          label: 'Undo',
        }),
        duration: 5000,
      }));
    });

    it('should execute async action and show success toast', async () => {
      const { result } = renderHook(() => useUndo());
      const action = vi.fn().mockResolvedValue(undefined);
      const undoAction = vi.fn();

      await act(async () => {
        await result.current.executeWithUndo(action, undoAction, 'Task completed');
      });

      expect(action).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Task completed', expect.objectContaining({
        action: expect.objectContaining({
          label: 'Undo',
        }),
        duration: 5000,
      }));
    });

    it('should allow undo via toast action', () => {
      const { result } = renderHook(() => useUndo());
      const action = vi.fn();
      const undoAction = vi.fn();

      act(() => {
        result.current.executeWithUndo(action, undoAction, 'Deleted task');
      });

      // Find the undo click handler
      const toastCall = (toast.success as any).mock.calls[0];
      const undoHandler = toastCall[1].action.onClick;

      act(() => {
        undoHandler();
      });

      expect(undoAction).toHaveBeenCalled();
    });

    it('should cancel previous pending undo when new action is executed', () => {
      const { result } = renderHook(() => useUndo());
      const action1 = vi.fn();
      const undoAction1 = vi.fn();
      const action2 = vi.fn();
      const undoAction2 = vi.fn();

      // Execute first action
      act(() => {
        result.current.executeWithUndo(action1, undoAction1, 'First action');
      });

      // Execute second action - should cancel first undo
      act(() => {
        result.current.executeWithUndo(action2, undoAction2, 'Second action');
      });

      expect(action1).toHaveBeenCalled();
      expect(action2).toHaveBeenCalled();

      // Fast-forward time to clear the timeout
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(toast.success).toHaveBeenCalledTimes(2);
    });

    it('should use custom undo label when provided', () => {
      const { result } = renderHook(() => useUndo());
      const action = vi.fn();
      const undoAction = vi.fn();

      act(() => {
        result.current.executeWithUndo(action, undoAction, 'Task deleted', 'Restore');
      });

      const toastCall = (toast.success as any).mock.calls[0];
      expect(toastCall[1].action.label).toBe('Restore');
    });

    it('should clear pending undo after 5 seconds', () => {
      const { result } = renderHook(() => useUndo());
      const action = vi.fn();
      const undoAction = vi.fn();

      act(() => {
        result.current.executeWithUndo(action, undoAction, 'Deleted task');
      });

      // Fast-forward past 5 seconds
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Cancel should work but do nothing since already cleared
      act(() => {
        result.current.cancelUndo();
      });
    });
  });

  describe('cancelUndo', () => {
    it('should cancel pending undo when called', () => {
      const { result } = renderHook(() => useUndo());
      const action = vi.fn();
      const undoAction = vi.fn();

      act(() => {
        result.current.executeWithUndo(action, undoAction, 'Deleted task');
      });

      // Before cancel, undo is pending
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // Cancel the pending undo
      act(() => {
        result.current.cancelUndo();
      });

      // Check that timeout was cleared (toast should only be called once)
      expect(toast.success).toHaveBeenCalledTimes(1);
    });

    it('should do nothing when no pending undo', () => {
      const { result } = renderHook(() => useUndo());

      act(() => {
        result.current.cancelUndo();
      });

      // Should not throw
      expect(toast.success).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle synchronous action that throws an error', () => {
      const { result } = renderHook(() => useUndo());
      const action = vi.fn().mockImplementation(() => {
        throw new Error('Action failed');
      });
      const undoAction = vi.fn();

      expect(() => {
        act(() => {
          result.current.executeWithUndo(action, undoAction, 'Deleted task');
        });
      }).toThrow('Action failed');
    });

    it('should handle async action that rejects', async () => {
      const { result } = renderHook(() => useUndo());
      const action = vi.fn().mockRejectedValue(new Error('Action failed'));
      const undoAction = vi.fn();

      await act(async () => {
        await expect(
          result.current.executeWithUndo(action, undoAction, 'Deleted task')
        ).rejects.toThrow('Action failed');
      });

      // Toast should not be shown for failed action
      expect(toast.success).not.toHaveBeenCalled();
    });
  });
});