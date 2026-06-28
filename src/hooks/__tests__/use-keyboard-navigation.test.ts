import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, cleanup, act } from "@testing-library/react";
import { useKeyboardNavigation, useTaskKeyboardNavigation } from "../use-keyboard-navigation";

describe("useKeyboardNavigation", () => {
  afterEach(() => {
    cleanup();
  });

  it("should be defined", () => {
    expect(typeof useKeyboardNavigation).toBe("function");
  });

  it("should return initial state", () => {
    const items = [
      { id: 1, completed: false },
      { id: 2, completed: true },
    ];
    const { result } = renderHook(() => useKeyboardNavigation({ items }));
    expect(result.current.selectedIndex).toBe(0);
    expect(result.current.isFocused).toBe(false);
  });

  describe("navigation functions", () => {
    const items = [
      { id: 1, completed: false },
      { id: 2, completed: false },
      { id: 3, completed: false },
    ];

    it("goToNext should increment selectedIndex", () => {
      const { result } = renderHook(() => useKeyboardNavigation({ items }));

      act(() => {
        result.current.goToNext();
      });

      expect(result.current.selectedIndex).toBe(1);
    });

    it("goToNext should not exceed items.length - 1", () => {
      const { result } = renderHook(() => useKeyboardNavigation({ items }));

      act(() => {
        result.current.goToNext();
        result.current.goToNext();
        result.current.goToNext();
      });

      expect(result.current.selectedIndex).toBe(2);
    });

    it("goToPrevious should decrement selectedIndex", () => {
      const { result } = renderHook(() => useKeyboardNavigation({ items }));

      act(() => {
        result.current.goToNext();
        result.current.goToPrevious();
      });

      expect(result.current.selectedIndex).toBe(0);
    });

    it("goToPrevious should not go below 0", () => {
      const { result } = renderHook(() => useKeyboardNavigation({ items }));

      act(() => {
        result.current.goToPrevious();
      });

      expect(result.current.selectedIndex).toBe(0);
    });

    it("goToFirst should set selectedIndex to 0", () => {
      const { result } = renderHook(() => useKeyboardNavigation({ items }));

      act(() => {
        result.current.goToNext();
        result.current.goToNext();
        result.current.goToFirst();
      });

      expect(result.current.selectedIndex).toBe(0);
    });

    it("goToLast should set selectedIndex to last item", () => {
      const { result } = renderHook(() => useKeyboardNavigation({ items }));

      act(() => {
        result.current.goToLast();
      });

      expect(result.current.selectedIndex).toBe(2);
    });
  });

  describe("action callbacks", () => {
    it("selectCurrent should call onSelect with current item id", () => {
      const items = [
        { id: 10, completed: false },
        { id: 20, completed: false },
      ];
      const onSelect = vi.fn();
      const { result } = renderHook(() =>
        useKeyboardNavigation({ items, onSelect })
      );

      act(() => {
        result.current.selectCurrent();
      });

      expect(onSelect).toHaveBeenCalledWith(10);
    });

    it("editCurrent should call onEdit with current item id", () => {
      const items = [{ id: 5, completed: false }];
      const onEdit = vi.fn();
      const { result } = renderHook(() =>
        useKeyboardNavigation({ items, onEdit })
      );

      act(() => {
        result.current.editCurrent();
      });

      expect(onEdit).toHaveBeenCalledWith(5);
    });

    it("deleteCurrent should call onDelete with current item id", () => {
      const items = [{ id: 7, completed: false }];
      const onDelete = vi.fn();
      const { result } = renderHook(() =>
        useKeyboardNavigation({ items, onDelete })
      );

      act(() => {
        result.current.deleteCurrent();
      });

      expect(onDelete).toHaveBeenCalledWith(7);
    });

    it("toggleComplete should call onComplete with toggled completed state", () => {
      const items = [{ id: 1, completed: false }];
      const onComplete = vi.fn();
      const { result } = renderHook(() =>
        useKeyboardNavigation({ items, onComplete })
      );

      act(() => {
        result.current.toggleComplete();
      });

      expect(onComplete).toHaveBeenCalledWith(1, true);
    });
  });

  describe("edge cases", () => {
    it("should handle empty items array", () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({ items: [] })
      );
      expect(result.current.selectedIndex).toBe(0);
      expect(result.current.goToNext).not.toThrow();
      expect(result.current.goToPrevious).not.toThrow();
    });

    it("should handle items with undefined callbacks", () => {
      const items = [{ id: 1, completed: false }];
      const { result } = renderHook(() =>
        useKeyboardNavigation({ items })
      );

      expect(() => {
        act(() => {
          result.current.selectCurrent();
          result.current.editCurrent();
          result.current.deleteCurrent();
          result.current.toggleComplete();
        });
      }).not.toThrow();
    });

    it("should adjust selectedIndex when items shrink", () => {
      const { result, rerender } = renderHook(
        ({ items }) => useKeyboardNavigation({ items }),
        { initialProps: { items: [{ id: 1 }, { id: 2 }, { id: 3 }] } }
      );

      act(() => {
        result.current.goToLast();
      });
      expect(result.current.selectedIndex).toBe(2);

      // Rerender with fewer items
      rerender({ items: [{ id: 1 }, { id: 2 }] });
      expect(result.current.selectedIndex).toBe(1);
    });

    it("should handle empty items with goToLast", () => {
      const { result } = renderHook(() =>
        useKeyboardNavigation({ items: [] })
      );

      expect(() => {
        act(() => {
          result.current.goToLast();
        });
      }).not.toThrow();
    });
  });
});

describe("useTaskKeyboardNavigation", () => {
  afterEach(() => {
    cleanup();
  });

  it("should be defined", () => {
    expect(typeof useTaskKeyboardNavigation).toBe("function");
  });

  it("should return initial state", () => {
    const items = [{ id: 1 }, { id: 2 }];
    const { result } = renderHook(() => useTaskKeyboardNavigation(items));
    expect(result.current.selectedIndex).toBe(0);
    expect(result.current.isSelectMode).toBe(false);
  });

  it("should navigate through items", () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const { result } = renderHook(() => useTaskKeyboardNavigation(items));

    act(() => {
      result.current.goToNext();
      result.current.goToNext();
    });

    expect(result.current.selectedIndex).toBe(2);
  });

  it("should handle select mode", () => {
    const items = [{ id: 1 }, { id: 2 }];
    const { result } = renderHook(() => useTaskKeyboardNavigation(items));

    act(() => {
      result.current.setIsSelectMode(true);
    });

    expect(result.current.isSelectMode).toBe(true);
  });

  it("should handle empty items", () => {
    const { result } = renderHook(() => useTaskKeyboardNavigation([]));
    expect(result.current.selectedIndex).toBe(0);
  });

  it("should handle goToLast with empty items", () => {
    const { result } = renderHook(() => useTaskKeyboardNavigation([]));

    expect(() => {
      act(() => {
        result.current.goToLast();
      });
    }).not.toThrow();
  });

  it("should set selectedIndex to -1 when goToLast is called with empty items", () => {
    const { result } = renderHook(() => useTaskKeyboardNavigation([]));

    act(() => {
      result.current.goToLast();
    });
    // When items is empty, items.length - 1 = -1
    expect(result.current.selectedIndex).toBe(-1);
  });

  it("should handle select mode toggle", () => {
    const items = [{ id: 1 }, { id: 2 }];
    const { result } = renderHook(() => useTaskKeyboardNavigation(items));

    act(() => {
      result.current.setIsSelectMode(true);
    });
    expect(result.current.isSelectMode).toBe(true);

    act(() => {
      result.current.setIsSelectMode(false);
    });
    expect(result.current.isSelectMode).toBe(false);
  });
});