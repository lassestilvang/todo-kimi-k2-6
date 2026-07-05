"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Save } from "lucide-react";
import type { Template, TemplateCategory } from "@/types";
import { saveTemplateFromTask as saveTemplateAction, getTemplateCategories as getTemplateCategoriesAction } from "@/lib/actions";

interface TaskTemplateTabProps {
  name: string;
  description: string;
  listId: string;
  priority: string;
  selectedLabels: number[];
  subtasks: string[];
  templates: Template[];
  categories: TemplateCategory[];
  selectedCategory: number | null;
  onCategoryChange: (categoryId: number | null) => void;
  onUseTemplate: (template: Template) => void;
  onSuccess: () => void;
}

export function TaskTemplateTab({
  name,
  description,
  listId,
  priority,
  selectedLabels,
  subtasks,
  templates,
  categories,
  selectedCategory,
  onCategoryChange,
  onUseTemplate,
  onSuccess,
}: TaskTemplateTabProps) {
  const handleSaveTemplate = async () => {
    if (!name.trim()) {
      toast.error("Task name is required to save as template");
      return;
    }
    try {
      await saveTemplateAction(
        name,
        description || null,
        Number(listId) || null,
        priority as any,
        selectedLabels,
        subtasks,
        selectedCategory || undefined
      );
      onSuccess();
      toast.success("Template saved");
    } catch {
      toast.error("Failed to save template");
    }
  };

  return (
    <div className="space-y-4 pt-4">
      <h3 className="font-medium">Save as Template</h3>
      <p className="text-sm text-muted-foreground">
        Save this task configuration as a reusable template for future tasks.
      </p>

      {/* Category selection */}
      {categories.length > 0 && (
        <div className="space-y-2">
          <Label>Category (optional)</Label>
          <Select
            value={selectedCategory?.toString() || ""}
            onValueChange={(v) => onCategoryChange(v ? Number(v) : null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a category..." />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={String(cat.id)}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Button
        variant="outline"
        className="w-full"
        onClick={handleSaveTemplate}
      >
        <Save className="h-4 w-4 mr-2" />
        Save Current as Template
      </Button>

      <Separator className="my-4" />

      <h4 className="text-sm font-medium">Saved Templates</h4>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {templates.map((template) => (
          <button
            key={template.id}
            className="w-full text-left text-sm rounded px-2 py-2 hover:bg-accent border"
            onClick={() => onUseTemplate(template)}
          >
            <div className="font-medium">{template.name}</div>
            {template.description && (
              <div className="text-xs text-muted-foreground line-clamp-1">
                {template.description}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}