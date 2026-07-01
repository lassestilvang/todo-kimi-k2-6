"use client";

import { useState } from "react";
import { Edit, Trash2, Plus, FolderTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { TemplateCategory } from "@/types";

interface TemplateCategoriesManagerProps {
  categories: TemplateCategory[];
  onCreate: (input: { name: string; description?: string }) => Promise<TemplateCategory>;
  onUpdate: (id: number, input: { name?: string; description?: string }) => Promise<TemplateCategory>;
  onDelete: (id: number) => Promise<void>;
}

export function TemplateCategoriesManager({
  categories,
  onCreate,
  onUpdate,
  onDelete,
}: TemplateCategoriesManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TemplateCategory | null>(null);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      await onCreate({ name: newName, description: newDescription || undefined });
      setNewName("");
      setNewDescription("");
      toast.success("Category created");
    } catch (error) {
      toast.error("Failed to create category");
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingCategory || !editingCategory.name.trim()) return;
    try {
      await onUpdate(editingCategory.id, {
        name: editingCategory.name,
        description: editingCategory.description ?? undefined,
      });
      setEditingCategory(null);
      toast.success("Category updated");
    } catch (error) {
      toast.error("Failed to update category");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await onDelete(id);
      toast.success("Category deleted");
    } catch (error) {
      toast.error("Failed to delete category");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Template Categories</h3>
          <p className="text-sm text-muted-foreground">
            Organize your task templates into categories
          </p>
        </div>
        <Dialog>
          <DialogTrigger>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              New Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Template Category</DialogTitle>
              <DialogDescription>
                Create a new category to organize your task templates.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Work, Personal, Projects"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description (optional)</label>
                <Textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe this category..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setNewName(""); setNewDescription(""); }}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FolderTree className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No categories yet. Create your first category to get started.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {categories.map((category) => (
            <div
              key={category.id}
              className="border rounded-lg p-3 flex items-center justify-between"
            >
              <div className="flex-1">
                <h4 className="font-medium">{category.name}</h4>
                {category.description && (
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Dialog>
                  <DialogTrigger>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Category</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <label className="text-sm font-medium">Name</label>
                        <Input
                          value={category.name}
                          onChange={(e) => setEditingCategory({ ...category, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Description</label>
                        <Textarea
                          value={category.description || ""}
                          onChange={(e) => setEditingCategory({ ...category, description: e.target.value })}
                          rows={3}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setEditingCategory(null)}>
                          Cancel
                        </Button>
                        <Button onClick={handleUpdate}>Save</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(category.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}