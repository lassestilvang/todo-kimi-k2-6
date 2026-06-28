import { useState, useCallback, useEffect } from "react";

interface UseKeyboardNavigationOptions {
  items: { id: number; completed?: boolean }[];
  onSelect?: (id: number) => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  onComplete?: (id: number, completed: boolean) => void;
}

export function useKeyboardNavigation({
  items,
  onSelect,
  onEdit,
  onDelete,
  onComplete,
}: UseKeyboardNavigationOptions) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

  const goToNext = useCallback(() => {
    setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
  }, [items.length]);

  const goToPrevious = useCallback(() => {
    setSelectedIndex((prev) => Math.max(prev - 1, 0));
  }, [items.length]);

  const goToFirst = useCallback(() => setSelectedIndex(0), []);
  const goToLast = useCallback(() => setSelectedIndex(items.length - 1), [items.length]);

  const selectCurrent = useCallback(() => {
    if (items[selectedIndex]) {
      onSelect?.(items[selectedIndex].id);
    }
  }, [items, selectedIndex, onSelect]);

  const editCurrent = useCallback(() => {
    if (items[selectedIndex]) {
      onEdit?.(items[selectedIndex].id);
    }
  }, [items, selectedIndex, onEdit]);

  const deleteCurrent = useCallback(() => {
    if (items[selectedIndex]) {
      onDelete?.(items[selectedIndex].id);
    }
  }, [items, selectedIndex, onDelete]);

  const toggleComplete = useCallback(() => {
    if (items[selectedIndex] && onComplete) {
      onComplete(items[selectedIndex].id, !items[selectedIndex].completed);
    }
  }, [items, selectedIndex, onComplete]);

  useEffect(() => {
    if (items.length > 0 && selectedIndex >= items.length) {
      setSelectedIndex(items.length - 1);
    }
  }, [items.length, selectedIndex]);

  return {
    selectedIndex,
    setSelectedIndex,
    isFocused,
    setIsFocused,
    goToNext,
    goToPrevious,
    goToFirst,
    goToLast,
    selectCurrent,
    editCurrent,
    deleteCurrent,
    toggleComplete,
  };
}

export function useTaskKeyboardNavigation(items: { id: number; completed?: boolean }[]) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSelectMode, setIsSelectMode] = useState(false);

  const goToNext = useCallback(() => {
    setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
  }, [items.length]);

  const goToPrevious = useCallback(() => {
    setSelectedIndex((prev) => Math.max(prev - 1, 0));
  }, [items.length]);

  const goToFirst = useCallback(() => setSelectedIndex(0), []);
  const goToLast = useCallback(() => setSelectedIndex(items.length - 1), [items.length]);

  return {
    selectedIndex,
    setSelectedIndex,
    isSelectMode,
    setIsSelectMode,
    goToNext,
    goToPrevious,
    goToFirst,
    goToLast,
  };
}