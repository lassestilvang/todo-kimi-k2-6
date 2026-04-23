"use client";

import { useState, useCallback, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { TaskList } from "@/components/task/task-list";
import { TaskModal } from "@/components/task/task-modal";
import type { TaskWithRelations, List, Label } from "@/types";
import {
  getLists,
  getLabels,
  getTasks,
  getOverdueCount,
} from "@/lib/actions/tasks";

const viewTitles: Record<string, string> = {
  today: "Today",
  next7: "Next 7 Days",
  upcoming: "Upcoming",
  all: "All Tasks",
};

export default function Home() {
  const [lists, setLists] = useState<List[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [currentView, setCurrentView] = useState("today");
  const [currentListId, setCurrentListId] = useState<number | undefined>();
  const [overdueCount, setOverdueCount] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithRelations | undefined>();
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = useCallback(async () => {
    const [listsData, labelsData, overdue] = await Promise.all([
      getLists(),
      getLabels(),
      getOverdueCount(),
    ]);
    setLists(listsData);
    setLabels(labelsData);
    setOverdueCount(overdue);

    let tasksData: TaskWithRelations[];
    if (searchQuery) {
      tasksData = await getTasks({ searchQuery, includeCompleted: true });
    } else if (currentView === "list" && currentListId) {
      tasksData = await getTasks({ listId: currentListId, includeCompleted: true });
    } else {
      tasksData = await getTasks({
        view: currentView as "today" | "next7" | "upcoming" | "all",
        includeCompleted: true,
      });
    }
    setTasks(tasksData);
  }, [currentView, currentListId, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleViewChange = (view: string, listId?: number) => {
    setCurrentView(view);
    setCurrentListId(listId);
    setSearchQuery("");
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query) {
      setCurrentView("search");
    } else {
      setCurrentView("today");
    }
  };

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
    if (currentView === "list" && currentListId) {
      const list = lists.find((l) => l.id === currentListId);
      return list ? `${list.emoji} ${list.name}` : "List";
    }
    return viewTitles[currentView] || "Tasks";
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
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
      <div className="flex flex-1 flex-col min-w-0">
        <TaskList
          tasks={tasks}
          lists={lists}
          viewTitle={getViewTitle()}
          onRefresh={loadData}
          onEditTask={handleEditTask}
        />
      </div>
      <Button
        size="icon"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
        onClick={handleNewTask}
      >
        <Plus className="h-6 w-6" />
      </Button>
      <TaskModal
        task={editingTask}
        lists={lists}
        labels={labels}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={loadData}
      />
    </div>
  );
}
