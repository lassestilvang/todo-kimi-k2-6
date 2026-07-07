import { useState, useCallback, useRef, useMemo } from "react";
import type { TaskWithRelations, List, Label, FilterPreset, Priority, ViewType } from "@/types";

interface UseTasksOptions {
  initialTasks: TaskWithRelations[];
  initialLists: List[];
  initialLabels: Label[];
}

type SortField = "name" | "date" | "deadline" | "priority" | "created_at" | "updated_at";
type SortDirection = "asc" | "desc";

interface UseTasksResult {
  tasks: TaskWithRelations[];
  lists: List[];
  labels: Label[];
  currentView: string;
  currentListId: number | undefined;
  searchQuery: string;
  currentFilterPreset: FilterPreset | undefined;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  visibleTasks: TaskWithRelations[];
  overdueCount: number;
  sortBy: SortField;
  sortDirection: SortDirection;
  filterListId: number | undefined;
  filterLabelIds: number[];
  filterPriority: Priority | undefined;
  setTasks: (tasks: TaskWithRelations[]) => void;
  setLists: (lists: List[]) => void;
  setLabels: (labels: Label[]) => void;
  setCurrentView: (view: string) => void;
  setCurrentListId: (id: number | undefined) => void;
  setSearchQuery: (query: string) => void;
  setCurrentFilterPreset: (preset: FilterPreset | undefined) => void;
  handleViewChange: (view: string, listId?: number) => void;
  handleSearch: (query: string) => void;
  handleFilterPresetChange: (preset: FilterPreset | undefined) => void;
  handleSort: (field: SortField) => void;
  handleFilterList: (listId: number | undefined) => void;
  handleFilterLabel: (labelId: number) => void;
  handleFilterPriority: (priority: Priority | undefined) => void;
  clearFilters: () => void;
}

export function useTasks({
  initialTasks,
  initialLists,
  initialLabels,
}: UseTasksOptions): UseTasksResult {
  const [tasks, setTasks] = useState<TaskWithRelations[]>(initialTasks);
  const [lists, setLists] = useState<List[]>(initialLists);
  const [labels, setLabels] = useState<Label[]>(initialLabels);
  const [currentView, setCurrentView] = useState<string>("today");
  const [currentListId, setCurrentListId] = useState<number | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentFilterPreset, setCurrentFilterPreset] = useState<FilterPreset | undefined>();
  const [sortBy, setSortBy] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [filterListId, setFilterListId] = useState<number | undefined>();
  const [filterLabelIds, setFilterLabelIds] = useState<number[]>([]);
  const [filterPriority, setFilterPriority] = useState<Priority | undefined>();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Priority order for sorting
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };

  // Cache the Fuse instance to avoid recreating it on every render
  // Use dynamic import for SSR compatibility
  const fuseInstance = useMemo(() => {
    let Fuse: typeof import("fuse.js").default | null = null;

    // Only initialize in browser environment
    if (typeof window !== "undefined") {
      try {
        Fuse = require("fuse.js").default;
      } catch {
        // Fuse.js not available, will fall back to simple filtering
        return null;
      }

      if (Fuse) {
        return new Fuse(tasks, {
          keys: ["name", "description", "notes"],
          threshold: 0.4,
          minMatchCharLength: 2,
          shouldSort: true,
        });
      }
    }
    return null;
  }, [tasks]);

  // Calculate visible tasks with optimized filtering
  const visibleTasks = useMemo(() => {
    let result = tasks;

    // Apply search query (fuzzy search)
    if (searchQuery && fuseInstance) {
      // Update the fuse instance with current tasks
      fuseInstance.setCollection(result);
      result = fuseInstance.search(searchQuery).map((r: { item: TaskWithRelations }) => r.item);
    } else if (!currentFilterPreset && !searchQuery) {
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      if (currentView === "today") {
        result = tasks.filter((t) => t.date === today);
      } else if (currentView === "next7") {
        result = tasks.filter((t) => t.date && t.date >= today && t.date <= nextWeek);
      } else if (currentView === "upcoming") {
        result = tasks.filter((t) => t.date && t.date >= today);
      } else if (currentView === "blocked") {
        result = tasks.filter((t) => t.blocked_by && t.blocked_by.length > 0);
      }
    }

    // Filter out completed tasks
    result = result.filter((t) => !t.completed);

    // Apply additional filters
    if (filterListId !== undefined) {
      result = result.filter((t) => t.list_id === filterListId);
    }
    if (filterLabelIds.length > 0) {
      result = result.filter((t) =>
        filterLabelIds.every((id) => t.labels?.some((l) => l.id === id))
      );
    }
    if (filterPriority !== undefined && filterPriority !== "none") {
      result = result.filter((t) => t.priority === filterPriority);
    }

    // Apply sorting with stable sort
    const sorted = [...result].sort((a, b) => {
      let aValue: string | number, bValue: string | number;

      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "date":
          aValue = a.date || "zzz";
          bValue = b.date || "zzz";
          break;
        case "deadline":
          aValue = a.deadline || "zzz";
          bValue = b.deadline || "zzz";
          break;
        case "priority":
          aValue = priorityOrder[a.priority];
          bValue = priorityOrder[b.priority];
          break;
        case "created_at":
          aValue = a.created_at;
          bValue = b.created_at;
          break;
        case "updated_at":
          aValue = a.updated_at;
          bValue = b.updated_at;
          break;
        default:
          aValue = a.date || "zzz";
          bValue = b.date || "zzz";
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [tasks, currentView, currentFilterPreset, searchQuery, sortBy, sortDirection, filterListId, filterLabelIds, filterPriority, fuseInstance]);

  // Calculate overdue count
  const overdueCount = useMemo(() => {
    return tasks.filter(
      (t) =>
        !t.completed &&
        t.date &&
        new Date(t.date) < new Date() &&
        new Date(t.date) < new Date(new Date().setHours(23, 59, 59, 999))
    ).length;
  }, [tasks]);

  const handleViewChange = useCallback((view: string, listId?: number) => {
    setCurrentView(view);
    setCurrentListId(listId);
    setSearchQuery("");
    setCurrentFilterPreset(undefined);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query) {
      setCurrentView("search");
    } else {
      setCurrentView("today");
    }
  }, []);

  const handleFilterPresetChange = useCallback((preset?: FilterPreset) => {
    setCurrentFilterPreset(preset);
    if (preset) {
      setCurrentView("all");
    }
  }, []);

  const handleSort = useCallback((field: SortField) => {
    setSortBy(field);
    // Toggle direction if clicking the same field, otherwise default to asc
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  }, []);

  const handleFilterList = useCallback((listId: number | undefined) => {
    setFilterListId(listId);
  }, []);

  const handleFilterLabel = useCallback((labelId: number) => {
    setFilterLabelIds((prev) => {
      const next = new Set(prev);
      if (next.has(labelId)) {
        next.delete(labelId);
      } else {
        next.add(labelId);
      }
      return Array.from(next);
    });
  }, []);

  const handleFilterPriority = useCallback((priority: Priority | undefined) => {
    setFilterPriority(priority);
  }, []);

  const clearFilters = useCallback(() => {
    setFilterListId(undefined);
    setFilterLabelIds([]);
    setFilterPriority(undefined);
  }, []);

  return {
    tasks,
    lists,
    labels,
    currentView,
    currentListId,
    searchQuery,
    currentFilterPreset,
    searchInputRef,
    visibleTasks,
    overdueCount,
    sortBy,
    sortDirection,
    filterListId,
    filterLabelIds,
    filterPriority,
    setTasks,
    setLists,
    setLabels,
    setCurrentView,
    setCurrentListId,
    setSearchQuery,
    setCurrentFilterPreset,
    handleViewChange,
    handleSearch,
    handleFilterPresetChange,
    handleSort,
    handleFilterList,
    handleFilterLabel,
    handleFilterPriority,
    clearFilters,
  };
}