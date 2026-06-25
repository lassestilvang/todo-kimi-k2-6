"use client";

import { useState } from "react";
import { LayoutTemplate, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Template, TemplateCategory } from "@/types";

interface TemplateGalleryProps {
  templates: Template[];
  categories: TemplateCategory[];
  onSelectTemplate: (template: Template) => void;
  onCreateTemplate: (template: { name: string; description?: string; list_id?: number; priority?: string; label_ids?: number[]; subtasks?: string[]; category_id?: number }) => void;
}

export function TemplateGallery({
  templates,
  categories,
  onSelectTemplate,
  onCreateTemplate,
}: TemplateGalleryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = !searchQuery ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.description && template.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !selectedCategory || template.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger>
            <Button size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Template</DialogTitle>
              <DialogDescription>
                Save the current task configuration as a reusable template.
              </DialogDescription>
            </DialogHeader>
            <CreateTemplateForm
              onSubmit={(data) => {
                onCreateTemplate(data);
                setIsCreateDialogOpen(false);
              }}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {filteredTemplates.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <LayoutTemplate className="h-12 w-12 mx-auto mb-2" />
          <p className="text-sm">No templates found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredTemplates.map((template) => (
            <button
              key={template.id}
              className="text-left p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              onClick={() => onSelectTemplate(template)}
            >
              <div className="font-medium text-sm">{template.name}</div>
              {template.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {template.description}
                </p>
              )}
              {template.priority !== "none" && (
                <div className="mt-2">
                  <span className={cn(
                    "text-xs px-2 py-1 rounded-full",
                    template.priority === "critical" && "bg-red-100 text-red-800",
                    template.priority === "high" && "bg-orange-100 text-orange-800",
                    template.priority === "medium" && "bg-yellow-100 text-yellow-800",
                    template.priority === "low" && "bg-blue-100 text-blue-800",
                  )}>
                    {template.priority}
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface CreateTemplateFormProps {
  onSubmit: (data: { name: string; description?: string; list_id?: number; priority?: string; label_ids?: number[]; subtasks?: string[]; category_id?: number }) => void;
  onCancel: () => void;
}

function CreateTemplateForm({ onSubmit, onCancel }: CreateTemplateFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("none");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, description, priority: priority as any });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Template name"
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium">Description</label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Template description"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Priority</label>
        <Select value={priority} onValueChange={(value) => setPriority(value as any)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Create</Button>
      </DialogFooter>
    </form>
  );
}