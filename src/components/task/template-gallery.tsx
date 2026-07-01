"use client";

import { useState, useMemo } from "react";
import { LayoutTemplate, Search, Plus, Tag, Grid, List } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Template, TemplateCategory } from "@/types";

interface TemplateGalleryProps {
  templates: Template[];
  categories: TemplateCategory[];
  onSelectTemplate: (template: Template) => void;
  onCreateTemplate: (template: { name: string; description?: string; list_id?: number; priority?: string; label_ids?: number[]; subtasks?: string[]; category_id?: number }) => void;
  lists?: Array<{ id: number; name: string; emoji: string }>;
}

export function TemplateGallery({
  templates,
  categories,
  onSelectTemplate,
  onCreateTemplate,
  lists = [],
}: TemplateGalleryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch = !searchQuery ||
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (template.description && template.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = !selectedCategory || template.category_id === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [templates, searchQuery, selectedCategory]);

  const renderTemplateCard = (template: Template) => {
    const cardContent = (
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow h-full"
        onClick={() => onSelectTemplate(template)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate">{template.name}</h3>
              {template.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {template.description}
                </p>
              )}
            </div>
            {template.priority !== "none" && (
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs ml-2",
                  template.priority === "critical" && "bg-red-100 text-red-800",
                  template.priority === "high" && "bg-orange-100 text-orange-800",
                  template.priority === "medium" && "bg-yellow-100 text-yellow-800",
                  template.priority === "low" && "bg-blue-100 text-blue-800"
                )}
              >
                {template.priority}
              </Badge>
            )}
          </div>
          {template.subtasks && template.subtasks.length > 0 && (
            <div className="mt-2 text-xs text-muted-foreground">
              {template.subtasks.length} subtask{template.subtasks.length > 1 ? "s" : ""}
            </div>
          )}
        </CardContent>
      </Card>
    );

    return viewMode === "grid" ? cardContent : (
      <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow mb-2">
        <CardContent className="p-3 flex items-center justify-between">
          <div>
            <h3 className="font-medium text-sm">{template.name}</h3>
            {template.description && (
              <p className="text-xs text-muted-foreground truncate max-w-md">
                {template.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {template.priority !== "none" && (
              <Badge variant="secondary" className="text-xs">
                {template.priority}
              </Badge>
            )}
            <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with search and filters */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select
            value={selectedCategory?.toString() || "all"}
            onValueChange={(value) => setSelectedCategory(value === "all" ? null : parseInt(value))}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id.toString()}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
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
                lists={lists}
                categories={categories}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Category quick filter */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
        All ({templates.length})
          </Button>
          {categories.map((cat) => {
            const count = templates.filter(t => t.category_id === cat.id).length;
            return (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.name} ({count})
              </Button>
            );
          })}
        </div>
      )}

      {/* Templates display */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <LayoutTemplate className="h-12 w-12 mx-auto mb-2" />
          <p className="text-sm">No templates found</p>
          {searchQuery && (
            <p className="text-xs mt-1">Try adjusting your search or filters</p>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredTemplates.map(renderTemplateCard)}
        </div>
      ) : (
        <div>
          {filteredTemplates.map((template) => (
            <div key={template.id} onClick={() => onSelectTemplate(template)}>
              {renderTemplateCard(template)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface CreateTemplateFormProps {
  onSubmit: (data: { name: string; description?: string; list_id?: number; priority?: string; label_ids?: number[]; subtasks?: string[]; category_id?: number }) => void;
  onCancel: () => void;
  lists: Array<{ id: number; name: string; emoji: string }>;
  categories: TemplateCategory[];
}

function CreateTemplateForm({ onSubmit, onCancel, lists, categories }: CreateTemplateFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("none");
  const [selectedList, setSelectedList] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      description,
      priority: priority as any,
      list_id: selectedList || undefined,
      category_id: selectedCategory || undefined,
    });
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
      <div className="grid grid-cols-2 gap-4">
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
        <div>
          <label className="text-sm font-medium">List</label>
          <Select
            value={selectedList?.toString() || "none"}
            onValueChange={(value) => setSelectedList(value === "none" ? null : parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select list" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No list</SelectItem>
              {lists.map((list) => (
                <SelectItem key={list.id} value={list.id.toString()}>
                  {list.emoji} {list.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Category</label>
        <Select
          value={selectedCategory?.toString() || "none"}
          onValueChange={(value) => setSelectedCategory(value === "none" ? null : parseInt(value))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No category</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id.toString()}>
                {cat.name}
              </SelectItem>
            ))}
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