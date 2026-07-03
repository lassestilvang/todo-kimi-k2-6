"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, FolderTree, ListTree } from "lucide-react";
import { toast } from "sonner";
import type { TemplateCategory, CustomView } from "@/types";

export default function SettingsPage() {
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [customViews, setCustomViews] = useState<CustomView[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDesc, setNewCategoryDesc] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [catsRes, viewsRes] = await Promise.all([
        fetch("/api/template-categories"),
        fetch("/api/custom-views?userId=1"), // Would use actual user ID
      ]);
      setCategories(await catsRes.json());
      setCustomViews(await viewsRes.json());
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const res = await fetch("/api/template-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName, description: newCategoryDesc }),
      });

      if (res.ok) {
        const category = await res.json();
        setCategories([...categories, category]);
        setNewCategoryName("");
        setNewCategoryDesc("");
        toast.success("Category created");
      }
    } catch {
      toast.error("Failed to create category");
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      const res = await fetch(`/api/template-categories?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setCategories(categories.filter((c) => c.id !== id));
        toast.success("Category deleted");
      }
    } catch {
      toast.error("Failed to delete category");
    }
  };

  const handleDeleteCustomView = async (id: number) => {
    try {
      const res = await fetch(`/api/custom-views?id=${id}&userId=1`, { method: "DELETE" });
      if (res.ok) {
        setCustomViews(customViews.filter((v) => v.id !== id));
        toast.success("View deleted");
      }
    } catch {
      toast.error("Failed to delete view");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="space-y-8">
        {/* Template Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              Template Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>New Category</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
                <Button onClick={handleCreateCategory}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                placeholder="Description (optional)"
                value={newCategoryDesc}
                onChange={(e) => setNewCategoryDesc(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Existing Categories</Label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No categories yet</p>
                ) : (
                  categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-3 border rounded"
                    >
                      <div>
                        <p className="font-medium">{cat.name}</p>
                        {cat.description && (
                          <p className="text-sm text-muted-foreground">{cat.description}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCategory(cat.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Custom Views */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListTree className="h-5 w-5" />
              Custom Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {customViews.length === 0 ? (
                <p className="text-sm text-muted-foreground">No custom views yet. Create one from the task list.</p>
              ) : (
                customViews.map((view) => (
                  <div
                    key={view.id}
                    className="flex items-center justify-between p-3 border rounded"
                  >
                    <div>
                      <p className="font-medium">{view.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {view.view_type} view • {view.sort_field} ({view.sort_direction})
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCustomView(view.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}