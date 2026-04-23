"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Inbox,
  Calendar,
  CalendarDays,
  CalendarRange,
  LayoutGrid,
  Plus,
  Search,
  Settings,
  Sun,
  Moon,
  ChevronRight,
  Tag,
  Trash2,
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { List, Label as LabelType } from "@/types";
import {
  createList,
  deleteList,
  createLabel,
  deleteLabel,
} from "@/lib/actions/tasks";

interface AppSidebarProps {
  lists: List[];
  labels: LabelType[];
  currentView: string;
  currentListId?: number;
  overdueCount: number;
  onViewChange: (view: string, listId?: number) => void;
  onRefresh: () => void;
  onSearch: (query: string) => void;
}

const views = [
  { id: "today", name: "Today", icon: Calendar },
  { id: "next7", name: "Next 7 Days", icon: CalendarDays },
  { id: "upcoming", name: "Upcoming", icon: CalendarRange },
  { id: "all", name: "All", icon: LayoutGrid },
];

const priorityColors: Record<string, string> = {
  high: "text-red-500",
  medium: "text-amber-500",
  low: "text-blue-500",
  none: "text-muted-foreground",
};

export function AppSidebar({
  lists,
  labels,
  currentView,
  currentListId,
  overdueCount,
  onViewChange,
  onRefresh,
  onSearch,
}: AppSidebarProps) {
  const { theme, setTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [newListOpen, setNewListOpen] = useState(false);
  const [newLabelOpen, setNewLabelOpen] = useState(false);
  const [listName, setListName] = useState("");
  const [listEmoji, setListEmoji] = useState("📋");
  const [listColor, setListColor] = useState("#6366f1");
  const [labelName, setLabelName] = useState("");
  const [labelIcon, setLabelIcon] = useState("🏷️");
  const [labelColor, setLabelColor] = useState("#8b5cf6");
  const [hoveredList, setHoveredList] = useState<number | null>(null);

  const handleCreateList = async () => {
    if (!listName.trim()) return;
    await createList({ name: listName, emoji: listEmoji, color: listColor });
    setListName("");
    setNewListOpen(false);
    onRefresh();
  };

  const handleCreateLabel = async () => {
    if (!labelName.trim()) return;
    await createLabel({ name: labelName, icon: labelIcon, color: labelColor });
    setLabelName("");
    setNewLabelOpen(false);
    onRefresh();
  };

  const handleDeleteList = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    await deleteList(id);
    onRefresh();
  };

  const handleDeleteLabel = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    await deleteLabel(id);
    onRefresh();
  };

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

  return (
    <TooltipProvider delay={0}>
      <div className="flex h-full w-72 flex-col border-r bg-sidebar">
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
            ✓
          </div>
          <span className="font-semibold text-lg">TaskFlow</span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-8 w-8"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </div>

        <div className="px-3 pb-2">
          <AnimatePresence>
            {searchOpen ? (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="relative"
              >
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  autoFocus
                  placeholder="Search tasks..."
                  className="pl-9 h-9"
                  onChange={(e) => onSearch(e.target.value)}
                  onBlur={() => {
                    if (!onSearch.length) setSearchOpen(false);
                  }}
                />
              </motion.div>
            ) : (
              <Button
                variant="outline"
                className="w-full justify-start gap-2 h-9 text-muted-foreground"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="h-4 w-4" />
                Search
              </Button>
            )}
          </AnimatePresence>
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
                  onClick={() => onViewChange(view.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-left">{view.name}</span>
                  {view.id === "today" && overdueCount > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-medium text-white">
                      {overdueCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <Separator className="my-2" />

          <div className="space-y-1 py-2">
            <div className="flex items-center justify-between px-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Lists
              </p>
              <Dialog open={newListOpen} onOpenChange={setNewListOpen}>
                <DialogTrigger>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </DialogTrigger>
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
                    <div className="space-y-2">
                      <Label>Color</Label>
                      <div className="flex flex-wrap gap-2">
                        {colors.map((c) => (
                          <button
                            key={c}
                            onClick={() => setListColor(c)}
                            className={cn(
                              "h-8 w-8 rounded-full border-2 transition-all",
                              listColor === c
                                ? "border-white shadow-md scale-110"
                                : "border-transparent hover:scale-105"
                            )}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                    <Button onClick={handleCreateList} className="w-full">
                      Create List
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {lists.map((list) => {
              const isActive = currentView === "list" && currentListId === list.id;
              return (
                <button
                  key={list.id}
                  onClick={() => onViewChange("list", list.id)}
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
                  <AnimatePresence>
                    {hoveredList === list.id && !list.is_inbox && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 opacity-60 hover:opacity-100"
                          onClick={(e) => handleDeleteList(e, list.id)}
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
              <Dialog open={newLabelOpen} onOpenChange={setNewLabelOpen}>
                <DialogTrigger>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </DialogTrigger>
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
                    <div className="space-y-2">
                      <Label>Color</Label>
                      <div className="flex flex-wrap gap-2">
                        {colors.map((c) => (
                          <button
                            key={c}
                            onClick={() => setLabelColor(c)}
                            className={cn(
                              "h-8 w-8 rounded-full border-2 transition-all",
                              labelColor === c
                                ? "border-white shadow-md scale-110"
                                : "border-transparent hover:scale-105"
                            )}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                    <Button onClick={handleCreateLabel} className="w-full">
                      Create Label
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
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
    </TooltipProvider>
  );
}
