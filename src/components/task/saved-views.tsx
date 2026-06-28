"use client";

import { useState } from "react";
import { LayoutDashboard, Plus, MoreHorizontal, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { CustomView, ViewType } from "@/types";

interface SavedViewsProps {
  views: CustomView[];
  currentView: ViewType;
  onViewSelect: (view: CustomView) => void;
  onCreateView: (view: { name: string; view_type: ViewType; list_id?: number; label_ids?: number[]; priority?: string }) => void;
  onDeleteView: (viewId: number) => void;
}

export function SavedViews({
  views,
  currentView,
  onViewSelect,
  onCreateView,
  onDeleteView,
}: SavedViewsProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Saved Views</span>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Plus className="h-3 w-3" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Save View</DialogTitle>
              <DialogDescription>
                Save the current view configuration for quick access.
              </DialogDescription>
            </DialogHeader>
            <CreateViewForm
              onSubmit={(data) => {
                onCreateView(data);
                setIsCreateDialogOpen(false);
              }}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-1">
        {views.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No saved views yet
          </p>
        ) : (
          views.map((view) => (
            <div
              key={view.id}
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors",
                currentView === view.view_type && "bg-muted"
              )}
              onClick={() => onViewSelect(view)}
            >
              <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm flex-1">{view.name}</span>
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onDeleteView(view.id)}>
                    <Trash2 className="h-3 w-3 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface CreateViewFormProps {
  onSubmit: (data: { name: string; view_type: ViewType; list_id?: number; label_ids?: number[]; priority?: string }) => void;
  onCancel: () => void;
}

function CreateViewForm({ onSubmit, onCancel }: CreateViewFormProps) {
  const [name, setName] = useState("");
  const [viewType, setViewType] = useState<ViewType>("today");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, view_type: viewType });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">View Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Work Tasks"
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium">View Type</label>
        <Select value={viewType} onValueChange={(v) => setViewType(v as ViewType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="next7">Next 7 Days</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="all">All Tasks</SelectItem>
            <SelectItem value="blocked">Blocked Tasks</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save View</Button>
      </DialogFooter>
    </form>
  );
}

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";