import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUndo } from "../use-undo";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}));

describe("useUndo hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with no pending action", () => {
    const { result } = renderHook(() => useUndo());
    expect(result.current).toHaveProperty("executeWithUndo");
    expect(result.current).toHaveProperty("cancelUndo");
  });

  it("should execute action without error", async () => {
    const onExecute = vi.fn();
    const onUndo = vi.fn();

    const { result } = renderHook(() => useUndo());

    await act(async () => {
      await result.current.executeWithUndo(onExecute, onUndo, "Item deleted");
    });

    expect(onExecute).toHaveBeenCalled();
  });

  it("should cancel undo", () => {
    const onExecute = vi.fn();
    const onUndo = vi.fn();

    const { result } = renderHook(() => useUndo());

    // Call cancelUndo without any pending action - should not throw
    expect(() => result.current.cancelUndo()).not.toThrow();
  });
});