"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, BarChart3, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { TaskList } from "@/components/task/task-list";
import { TaskModal } from "@/components/task/task-modal";
import { TaskStats } from "@/components/task/task-stats";
import { TaskCalendar } from "@/components/task/task-calendar";
import { TaskDependencyGraph } from "@/components/task/task-dependency-graph";
import { GanttChart } from "@/components/task/gantt-chart";
import { EisenhowerMatrix } from "@/components/task/eisenhower-matrix";
import { KanbanBoard } from "@/components/task/kanban-board";
import { FocusMode } from "@/components/task/focus-mode";
import { ImportExport } from "@/components/task/import-export";
import { CalendarSyncSettings } from "@/components/task/calendar-sync-settings";
import { PwaInstallPrompt } from "@/components/task/pwa-install-prompt";
import { KeyboardShortcuts } from "@/components/task/keyboard-shortcuts";
import { TaskAnalytics } from "@/components/task/task-analytics";
import { MobileSidebar } from "@/components/task/mobile-sidebar";
import { GoalsDashboard } from "@/components/task/goals-dashboard";
import { useTasks } from "@/hooks/use-tasks";
import type { TaskWithRelations, FilterPreset, Template, Goal, Workspace } from "@/types";
import { toast } from "sonner";

export default function Home() {
  const { status } = useSession();
  const tNav = useTranslations("navigation");
  const tPresets = useTranslations("filterPresets");
  const tTasks = useTranslations("tasks");

  const viewTitles: Record<string, string> = {
    today: tNav("today"),
    next7: tNav("next7Days"),
    upcoming: tNav("upcoming"),
    all: "All Tasks",
    blocked: tNav("blocked"),
    calendar_sync: tNav("calendarSync"),
    calendar: tNav("calendar"),
    graph: tNav("graph"),
    matrix: tNav("matrix"),
    kanban: tNav("kanban"),
    gantt: tNav("gantt"),
    ai: tNav("ai"),
    analytics: tNav("analytics"),
    goals: tNav("goals"),
  };
  const [templates, setTemplates] = useState<Template[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithRelations | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);

  const {
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
    setSearchQuery,
    setCurrentFilterPreset,
    handleViewChange,
    handleSearch,
    handleSort,
    handleFilterList,
    handleFilterLabel,
    handleFilterPriority,
    clearFilters,
  } = useTasks({
    initialTasks: [],
    initialLists: [],
    initialLabels: [],
  });

  // Show login page if not authenticated (handled by LoginRequired component)
  if (status === "unauthenticated") {
    // This redirect is handled at the session level
  }

  // Check for mobile view and online status
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    const checkOnline = () => {
      setIsOnline(navigator.onLine);
    };

    checkMobile();
    checkOnline();
    window.addEventListener("resize", checkMobile);
    window.addEventListener("online", checkOnline);
    window.addEventListener("offline", checkOnline);

    return () => {
      window.removeEventListener("resize", checkMobile);
      window.removeEventListener("online", checkOnline);
      window.removeEventListener("offline", checkOnline);
    };
  }, []);

  // Get completed tasks for statistics
  const completedTasks = useMemo(() => tasks.filter((t) => t.completed), [tasks]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [listsData, labelsData, workspacesData, allTasks, templatesData, generatedCount, goalsData] = await Promise.all([
        (await import("@/lib/actions/tasks")).getLists(),
        (await import("@/lib/actions/tasks")).getLabels(),
        (async () => {
          try {
            const res = await fetch("/api/workspaces");
            return res.json();
          } catch {
            return [];
          }
        })(),
        (await import("@/lib/actions/tasks")).getTasks({ includeCompleted: true }),
        (await import("@/lib/actions/templates")).getTemplates(),
        (await import("@/lib/actions/tasks")).generateRecurringTasks(),
        (await import("@/lib/actions/goals")).getGoals(),
      ]);
      setLists(listsData);
      setLabels(labelsData);
      setWorkspaces(workspacesData);
      setTasks(allTasks);
      setTemplates(templatesData);
      setGoals(goalsData);
      if (generatedCount > 0) {
        toast.success(`Generated ${generatedCount} recurring task(s)`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on mount - intentionally only runs once (data fetching pattern)
  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEditTask = (task: TaskWithRelations) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleNewTask = () => {
    setEditingTask(undefined);
    setModalOpen(true);
  };

  const getViewTitle = () => {
    if (searchQuery) return `${tTasks("searchPlaceholder", { query: searchQuery })}`;
    if (currentFilterPreset) {
      const presetLabels: Record<FilterPreset, string> = {
        needs_attention: tPresets("needsAttention"),
        this_week: tPresets("thisWeek"),
        with_labels: tPresets("withLabels"),
        with_subtasks: tPresets("withSubtasks"),
        completed: tNav("completed"),
      };
      return presetLabels[currentFilterPreset];
    }
    if (currentView === "list" && currentListId) {
      const list = lists.find((l) => l.id === currentListId);
      return list ? `${list.emoji} ${list.name}` : "List";
    }
    return viewTitles[currentView] || tNav("today");
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global shortcuts
      if (e.key === "n" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleNewTask();
      }

      if (e.key === "/" && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      if (e.key === "?" && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        // Open keyboard shortcuts dialog
        const event = new KeyboardEvent("keydown", { key: "?" });
        document.dispatchEvent(event);
      }

      if (e.key === "Escape") {
        if (searchQuery) {
          setSearchQuery("");
          setCurrentView("today");
        }
        if (currentFilterPreset) {
          setCurrentFilterPreset(undefined);
        }
      }

      // Quick navigation shortcuts
      if (e.key === "1" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleViewChange("today");
      }
      if (e.key === "2" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleViewChange("kanban");
      }
      if (e.key === "3" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleViewChange("analytics");
      }

      // View navigation shortcuts
      if (e.key === "g" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleViewChange("gantt");
      }
      if (e.key === "m" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleViewChange("matrix");
      }
      if (e.key === "c" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleViewChange("calendar");
      }
      if (e.key === "a" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleViewChange("ai");
      }

      if (e.key === "g" && e.shiftKey && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleViewChange("goals");
      }

      // Assignment shortcut (Shift+A) - only when modal is open
      if (e.key === "a" && e.shiftKey && modalOpen) {
        e.preventDefault();
        // Switch to assign tab in modal
        const assignEvent = new CustomEvent("openAssignTab");
        document.dispatchEvent(assignEvent);
      }

      // Focus mode shortcut
      if (e.key === "f" && e.shiftKey && !modalOpen) {
        e.preventDefault();
        handleViewChange("focus");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchQuery, currentFilterPreset, modalOpen, setCurrentView, setSearchQuery, setCurrentFilterPreset, handleViewChange, searchInputRef]);

  // Render view-specific content
  const renderViewContent = () => {
    if (currentView === "calendar") {
      return (
        <TaskCalendar
          tasks={tasks}
          onTaskClick={handleEditTask}
        />
      );
    }

    if (currentView === "graph") {
      return (
        <TaskDependencyGraph
          tasks={tasks}
          onTaskClick={handleEditTask}
        />
      );
    }

    if (currentView === "matrix") {
      return (
        <EisenhowerMatrix
          tasks={tasks}
          onTaskClick={handleEditTask}
          onAddTask={() => {
            setEditingTask(undefined);
            setModalOpen(true);
          }}
        />
      );
    }

    if (currentView === "kanban") {
      return (
        <KanbanBoard
          tasks={tasks}
          lists={lists}
          onTaskClick={handleEditTask}
          onTaskCreate={(task) => {
            setEditingTask(task as TaskWithRelations);
            setModalOpen(true);
          }}
        />
      );
    }

    if (currentView === "gantt") {
      return (
        <GanttChart
          tasks={tasks}
          onTaskClick={handleEditTask}
        />
      );
    }

    if (currentView === "analytics") {
      return (
        <TaskAnalytics
          tasks={tasks}
          completedTasks={completedTasks}
        />
      );
    }

    if (currentView === "goals") {
      return (
        <div className="p-6">
          <GoalsDashboard
            goals={goals}
            onUpdateProgress={(id, increment) => {
              (async () => {
                try {
                  await (await import("@/lib/actions/goals")).updateGoalProgress(id, increment);
                  loadData();
                } catch {
                  toast.error("Failed to update goal progress");
                }
              })();
            }}
            onResetGoal={(id) => {
              (async () => {
                try {
                  await (await import("@/lib/actions/goals")).resetGoal(id);
                  loadData();
                } catch {
                  toast.error("Failed to reset goal");
                }
              })();
            }}
          />
        </div>
      );
    }

    if (currentView === "calendar_sync") {
      return (
        <div className="p-6">
          <CalendarSyncSettings
            accessToken={null}
            onAuth={() => { window.location.href = "/api/calendar/sync?action=auth"; }}
            onSync={loadData}
          />
        </div>
      );
    }

    if (currentView === "focus") {
      const currentTask = tasks.find(t => !t.completed);
      return (
        <FocusMode
          task={currentTask || {
            id: 1,
            name: "Select a task to focus on",
            description: null,
            notes: null,
            list_id: 1,
            date: null,
            deadline: null,
            estimate: null,
            actual_time: null,
            priority: "none",
            recurring: "none",
            recurring_config: null,
            completed: false,
            completed_at: null,
            created_at: "",
            updated_at: "",
            sort_order: 0,
            labels: [],
            subtasks: [],
            reminders: [],
            logs: [],
            comments: [],
            attachments: [],
            blockers: [],
            blocked_by: [],
            time_entries: [],
            recurring_exceptions: [],
          }}
          open={true}
          onOpenChange={(open) => !open && handleViewChange("today")}
        />
      );
    }

    // Default: task list view
    return (
      <>
        <div className="flex items-center justify-between border-b px-6 py-3 bg-muted/30">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleViewChange("analytics")}
              className="hidden md:flex"
            >
              <BarChart3 className="h-4 w-4 mr-1.5" />
              Analytics
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {filterListId && (
              <Button variant="outline" size="sm" onClick={() => handleFilterList(undefined)}>
                Clear List Filter
              </Button>
            )}
          </div>
        </div>
        <TaskList
          tasks={visibleTasks}
          lists={lists}
          labels={labels}
          viewTitle={getViewTitle()}
          onRefresh={loadData}
          onEditTask={handleEditTask}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSort={handleSort}
          filterListId={filterListId}
          filterLabelIds={filterLabelIds}
          filterPriority={filterPriority}
          onFilterList={handleFilterList}
          onFilterLabel={handleFilterLabel}
          onFilterPriority={handleFilterPriority}
          onClearFilters={clearFilters}
        />
      </>
    );
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Mobile sidebar */}
      {isMobile && (
        <MobileSidebar
          lists={lists}
          labels={labels}
          currentView={currentView}
          currentListId={currentListId}
          overdueCount={overdueCount}
          onViewChange={handleViewChange}
          onRefresh={loadData}
          onSearch={handleSearch}
          onNewTask={handleNewTask}
          workspaces={workspaces}
          currentWorkspace={currentWorkspace}
          onWorkspaceChange={setCurrentWorkspace}
        />
      )}

      {/* Desktop sidebar */}
      {!isMobile && (
        <AppSidebar
          lists={lists}
          labels={labels}
          currentView={currentView}
          currentListId={currentListId}
          overdueCount={overdueCount}
          onViewChange={handleViewChange}
          onRefresh={loadData}
          onSearch={handleSearch}
          workspaces={workspaces}
          currentWorkspace={currentWorkspace}
          onWorkspaceChange={setCurrentWorkspace}
        />
      )}

      <div className="flex flex-1 flex-col min-w-0">
        {/* Workspace Header */}
        {currentWorkspace && (
          <div className="border-b px-6 py-3 bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{currentWorkspace.name}</Badge>
              <span className="text-sm text-muted-foreground truncate">
                {currentWorkspace.description}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentWorkspace(null)}
            >
              Switch Workspace
            </Button>
          </div>
        )}
        {!isOnline && (
          <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 text-center text-sm">
            <WifiOff className="h-4 w-4 inline mr-1.5" />
            You are offline. Changes will be saved locally and synced when you are back online.
          </div>
        )}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading your tasks...</p>
            </div>
          </div>
        ) : (
          <>
            <TaskStats tasks={tasks} lists={lists} completedTasks={completedTasks} />
            {renderViewContent()}
          </>
        )}
      </div>

      {/* Floating action button - desktop */}
      {!isMobile && (
        <Button
          size="icon"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
          onClick={handleNewTask}
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      {/* Import/Export buttons */}
      <div className="fixed bottom-20 right-6 flex gap-2">
        <ImportExport onRefresh={loadData} />
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => handleViewChange("ai")}
          title="AI Assistant"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M12 2L14 8H20L10 13L14 19L2 16L8 10L2 4L12 2Z" />
          </svg>
        </Button>
      </div>

      <TaskModal
        task={editingTask}
        lists={lists}
        labels={labels}
        templates={templates}
        allTasks={tasks}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={loadData}
      />
      <KeyboardShortcuts />
      <PwaInstallPrompt />
    </div>
  );
}