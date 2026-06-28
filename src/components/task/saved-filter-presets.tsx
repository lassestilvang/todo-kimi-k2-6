"use client";

import { useState } from "react";
import { Bookmark, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { FilterPreset } from "@/types";

interface SavedFilterPresetsProps {
  currentFilterPreset?: FilterPreset;
  currentListId?: number;
  currentLabelIds?: number[];
  currentPriority?: string;
  onApplyPreset: (preset: FilterPreset) => void;
  onSavePreset: (name: string, preset: FilterPreset) => void;
  onDeletePreset: (presetId: number) => void;
  savedPresets: { id: number; name: string; filter_type: string | null }[];
}

export function SavedFilterPresets({
  currentFilterPreset,
  currentListId,
  currentLabelIds,
  currentPriority,
  onApplyPreset,
  onSavePreset,
  onDeletePreset,
  savedPresets,
}: SavedFilterPresetsProps) {
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState("");

  const currentPresetKey = JSON.stringify({
    filterPreset: currentFilterPreset,
    listId: currentListId,
    labelIds: currentLabelIds,
    priority: currentPriority,
  });

  const handleSave = () => {
    if (!presetName.trim()) return;
    onSavePreset(presetName.trim(), currentFilterPreset || "needs_attention");
    setPresetName("");
    setIsSaveDialogOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      {savedPresets.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button variant="outline" size="sm">
              <Bookmark className="h-4 w-4 mr-1.5" />
              Saved Filters
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {savedPresets.map((preset) => (
              <DropdownMenuItem
                key={preset.id}
                onClick={() => onApplyPreset(preset.filter_type as FilterPreset)}
              >
                {preset.name}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePreset(preset.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogTrigger>
          <Button variant="outline" size="sm" disabled={!currentPresetKey}>
            <Save className="h-4 w-4 mr-1.5" />
            Save Filter
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save Filter Preset</DialogTitle>
            <DialogDescription>
              Save the current filter combination for quick access later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Preset Name</label>
              <Input
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="e.g., My Work Tasks"
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!presetName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}