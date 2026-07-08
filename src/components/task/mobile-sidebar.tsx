"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  LayoutGrid,
  Plus,
  Search,
  Sun,
  Moon,
  Trash2,
  Menu,
  X,
  Repeat,
  BarChart3,
  Bot,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { List as ListType, Label as LabelType, Workspace, ViewType } from "@/types";
import {
  createList,
  deleteList,
  createLabel,
  deleteLabel,
  generateRecurringTasks,
} from "@/lib/actions";
import { toast } from "sonner";
import { WorkspaceSelector } from "@/components/workspace/workspace-selector";

interface MobileSidebarProps {
  lists: ListType[];
  labels: LabelType[];
  currentView: string;
  currentListId?: number;
  overdueCount?: number;
  onViewChange: (view: string, listId?: number) => void;
  onRefresh?: () => void;
  onSearch?: (query: string) => void;
  onNewTask?: () => void;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  onWorkspaceChange?: (workspace: Workspace | null) => void;
}

const views = [
  { id: "today", name: "Today", icon: Calendar },
  { id: "next7", name: "Next 7 Days", icon: CalendarDays },
  { id: "upcoming", name: "Upcoming", icon: CalendarRange },
  { id: "kanban", name: "Kanban", icon: LayoutGrid },
  { id: "all", name: "All", icon: LayoutGrid },
  { id: "graph", name: "Dependencies", icon: LayoutGrid },
  { id: "matrix", name: "Priority Matrix", icon: LayoutGrid },
  { id: "gantt", name: "Gantt Chart", icon: BarChart3 },
  { id: "ai", name: "AI Assistant", icon: Bot },
];

export function MobileSidebar({
  lists,
  labels,
  currentView,
  currentListId,
  overdueCount,
  onViewChange,
  onRefresh,
  onSearch,
  onNewTask,
  workspaces,
  currentWorkspace,
  onWorkspaceChange,
}: MobileSidebarProps) {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [newListDialogOpen, setNewListDialogOpen] = useState(false);
  const [newLabelDialogOpen, setNewLabelDialogOpen] = useState(false);
  const [listName, setListName] = useState("");
  const [listEmoji, setListEmoji] = useState("📋");
  const [listColor, setListColor] = useState("#6366f1");
  const [labelName, setLabelName] = useState("");
  const [labelIcon, setLabelIcon] = useState("🏷️");
  const [labelColor, setLabelColor] = useState("#8b5cf6");
  const [hoveredList, setHoveredList] = useState<number | null>(null);

  const colors = [
    "#6366f1",
    "#ec4899",
    "#f59e0b",
    "#10b981",
    "#3b82f6",
    "#8b5cf6",
    "#ef4444",
    "#14b8a6",
  ];

  const handleCreateList = async () => {
    if (!listName.trim()) return;
    try {
      await createList({ name: listName, emoji: listEmoji, color: listColor });
      setListName("");
      setNewListDialogOpen(false);
      onRefresh?.();
      toast.success("List created");
    } catch {
      toast.error("Failed to create list");
    }
  };

  const handleCreateLabel = async () => {
    if (!labelName.trim()) return;
    try {
      await createLabel({ name: labelName, icon: labelIcon, color: labelColor });
      setLabelName("");
      setNewLabelDialogOpen(false);
      onRefresh?.();
      toast.success("Label created");
    } catch {
      toast.error("Failed to create label");
    }
  };

  const handleDeleteList = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await deleteList(id);
      onRefresh?.();
      toast.success("List deleted");
    } catch {
      toast.error("Failed to delete list");
    }
  };

  const handleDeleteLabel = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await deleteLabel(id);
      onRefresh?.();
      toast.success("Label deleted");
    } catch {
      toast.error("Failed to delete label");
    }
  };

  const handleViewChange = (view: string, listId?: number) => {
    onViewChange(view, listId);
    setIsOpen(false);
  };

  const handleNewTask = () => {
    onNewTask?.();
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden h-8 w-8 fixed top-4 left-4 z-50"
        onClick={() => setIsOpen(true)}
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 z-40 md:hidden"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed top-0 left-0 h-full w-72 max-w-[80vw] bg-sidebar border-r z-50"
            >
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
                      ✓
                    </div>
                    <span className="font-semibold text-lg">TaskFlow</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="px-4 py-3 border-b">
                  <WorkspaceSelector
                    workspaces={workspaces || []}
                    currentWorkspace={currentWorkspace || null}
                    onWorkspaceChange={(ws) => {
                      onWorkspaceChange?.(ws);
                      setIsOpen(false);
                    }}
                    onCreateWorkspace={() => {}}
                  />
                </div>

                <div className="ml-auto mt-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setTheme(theme === "dark" ? "light" : "dark");
                      setIsOpen(false);
                    }}
                  >
                    <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  </Button>
                </div>

                <ScrollArea className="flex-1 px-2">
                  <div className="space-y-1 py-2">
                    <p className="px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Views
                    </p>
                    {views.map((view) => {
                      const Icon = view.icon;
                      const isActive = currentView === view.id;
                      return (
                        <button
                          key={view.id}
                          onClick={() => handleViewChange(view.id)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                              : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="flex-1 text-left">{view.name}</span>
                          {view.id === "today" && (overdueCount ?? 0) > 0 && (
                            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-medium text-white">
                              {overdueCount}
                            </span>
                          )}
                        </button>
                      );
                    })}

                    <div className="px-2 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-2 text-xs"
                        onClick={async () => {
                          const count = await generateRecurringTasks();
                          if (count > 0) {
                            toast.success(`Generated ${count} recurring task(s)`);
                          }
                          onRefresh?.();
                        }}
                      >
                        <Repeat className="h-3.5 w-3.5" />
                        Generate Recurring Tasks
                      </Button>
                    </div>
                  </div>

                  <Separator className="my-2" />

                  <div className="space-y-1 py-2">
                    <div className="flex items-center justify-between px-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Lists
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setNewListDialogOpen(true)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {lists.map((list) => {
                      const isActive = currentView === "list" && currentListId === list.id;
                      return (
                        <button
                          key={list.id}
                          onClick={() => handleViewChange("list", list.id)}
                          onMouseEnter={() => setHoveredList(list.id)}
                          onMouseLeave={() => setHoveredList(null)}
                          className={cn(
                            "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                              : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                          )}
                        >
                          <span className="text-base leading-none">{list.emoji}</span>
                          <span className="flex-1 text-left truncate">{list.name}</span>
                          {!list.is_inbox && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 opacity-0 group-hover:opacity-100"
                              onClick={(e) => handleDeleteList(e, list.id)}
                            >
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <Separator className="my-2" />

                  <div className="space-y-1 py-2">
                    <div className="flex items-center justify-between px-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Labels
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setNewLabelDialogOpen(true)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {labels.map((label) => (
                      <div
                        key={label.id}
                        className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
                      >
                        <span className="text-base leading-none">{label.icon}</span>
                        <span className="flex-1 truncate">{label.name}</span>
                        <button
                          onClick={(e) => handleDeleteLabel(e, label.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* New List Dialog */}
      <Dialog open={newListDialogOpen} onOpenChange={setNewListDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New List</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="List name"
              />
            </div>
            <div className="space-y-2">
              <Label>Emoji</Label>
              <Input
                value={listEmoji}
                onChange={(e) => setListEmoji(e.target.value)}
                placeholder="📋"
                maxLength={2}
              />
            </div>
            <Button onClick={handleCreateList} className="w-full">
              Create List
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Label Dialog */}
      <Dialog open={newLabelDialogOpen} onOpenChange={setNewLabelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Label</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={labelName}
                onChange={(e) => setLabelName(e.target.value)}
                placeholder="Label name"
              />
            </div>
            <div className="space-y-2">
              <Label>Icon</Label>
              <Input
                value={labelIcon}
                onChange={(e) => setLabelIcon(e.target.value)}
                placeholder="🏷️"
                maxLength={2}
              />
            </div>
            <Button onClick={handleCreateLabel} className="w-full">
              Create Label
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating action button */}
      <Button
        size="icon"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg md:hidden z-50"
        onClick={handleNewTask}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </>
  );
}