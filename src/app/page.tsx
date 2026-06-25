"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Download, Upload, BarChart3, CalendarPlus, WifiOff } from "lucide-react";
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
import { NotificationProvider } from "@/components/task/notification-provider";
import { ImportExport } from "@/components/task/import-export";
import { CalendarSyncSettings } from "@/components/task/calendar-sync-settings";
import { PwaInstallPrompt } from "@/components/task/pwa-install-prompt";
import { AIAssistant } from "@/components/task/ai-assistant";
import { KeyboardShortcuts } from "@/components/task/keyboard-shortcuts";
import { TaskAnalytics } from "@/components/task/task-analytics";
import { MobileSidebar } from "@/components/task/mobile-sidebar";
import { useTasks } from "@/hooks/use-tasks";
import type { TaskWithRelations, FilterPreset, Template } from "@/types";
import { toast } from "sonner";

const viewTitles: Record<string, string> = {
  today: "Today",
  next7: "Next 7 Days",
  upcoming: "Upcoming",
  all: "All Tasks",
  blocked: "Blocked Tasks",
  calendar_sync: "Calendar Sync",
  calendar: "Calendar",
  graph: "Dependency Graph",
  matrix: "Eisenhower Matrix",
  kanban: "Kanban Board",
  gantt: "Gantt Chart",
  ai: "AI Assistant",
  analytics: "Analytics",
};

export default function Home() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithRelations | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

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
  } = useTasks({
    initialTasks: [],
    initialLists: [],
    initialLabels: [],
  });

  // Check for mobile view and online status
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);

    // Check online status
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("resize", checkMobile);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Get completed tasks for statistics
  const completedTasks = useMemo(() => tasks.filter((t) => t.completed), [tasks]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [listsData, labelsData, , allTasks, templatesData, generatedCount] = await Promise.all([
        (await import("@/lib/actions/tasks")).getLists(),
        (await import("@/lib/actions/tasks")).getLabels(),
        (await import("@/lib/actions/tasks")).getOverdueCount(),
        (await import("@/lib/actions/tasks")).getTasks({ includeCompleted: true }),
        (await import("@/lib/actions/tasks")).getTemplates(),
        (await import("@/lib/actions/tasks")).generateRecurringTasks(),
      ]);
      setLists(listsData);
      setLabels(labelsData);
      setTasks(allTasks);
      setTemplates(templatesData);
      if (generatedCount > 0) {
        toast.success(`Generated ${generatedCount} recurring task(s)`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const handleEditTask = (task: TaskWithRelations) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleNewTask = () => {
    setEditingTask(undefined);
    setModalOpen(true);
  };

  const getViewTitle = () => {
    if (searchQuery) return `Search: "${searchQuery}"`;
    if (currentFilterPreset) {
      const presetLabels: Record<FilterPreset, string> = {
        needs_attention: "Needs Attention",
        this_week: "This Week",
        with_labels: "With Labels",
        with_subtasks: "With Subtasks",
        completed: "Completed",
      };
      return presetLabels[currentFilterPreset];
    }
    if (currentView === "list" && currentListId) {
      const list = lists.find((l) => l.id === currentListId);
      return list ? `${list.emoji} ${list.name}` : "List";
    }
    return viewTitles[currentView] || "Tasks";
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
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchQuery, currentFilterPreset]);

  // Export data
  const handleExport = async (format: "json" | "csv" = "json") => {
    if (format === "json") {
      const data = await (await import("@/lib/actions/tasks")).exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `taskflow-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const csv = await (await import("@/lib/actions/tasks")).exportCsv();
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `taskflow-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Import data
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await (await import("@/lib/actions/tasks")).importData(data);
      toast.success(`Imported ${result.tasks} tasks, ${result.lists} lists, ${result.labels} labels`);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to import data. Check the file format.");
    } finally {
      // Reset input
      e.target.value = "";
    }
  };

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
          onAddTask={(priority) => {
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

    if (currentView === "calendar_sync") {
      return (
        <div className="p-6">
          <CalendarSyncSettings
            accessToken={null}
            onAuth={() => window.location.href = "/api/calendar/sync?action=auth"}
            onSync={loadData}
            lastSynced={undefined}
          />
        </div>
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
      <NotificationProvider tasks={tasks} />

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
        />
      )}

      <div className="flex flex-1 flex-col min-w-0">
        {!isOnline && (
          <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 text-center text-sm">
            <WifiOff className="h-4 w-4 inline mr-1.5" />
            You are offline. Changes will be saved locally and synced when you're back online.
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
      <NotificationProvider tasks={tasks} />
      <PwaInstallPrompt />
    </div>
  );
}