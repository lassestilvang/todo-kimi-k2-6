"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Tag, Save, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CreateTaskInput } from "@/types";

interface TaskSnippet {
  id: string;
  name: string;
  template: CreateTaskInput;
  createdAt: Date;
  useCount: number;
}

interface TaskSnippetsProps {
  onInsertSnippet: (snippet: CreateTaskInput) => void;
  className?: string;
}

export function TaskSnippets({ onInsertSnippet, className }: TaskSnippetsProps) {
  const [snippets, setSnippets] = useState<TaskSnippet[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [currentTask, setCurrentTask] = useState<Partial<CreateTaskInput>>({});

  // Load snippets from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("task-snippets");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSnippets(parsed.map((s: TaskSnippet) => ({
          ...s,
          createdAt: new Date(s.createdAt),
        })));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save snippets to localStorage
  const saveSnippets = (updated: TaskSnippet[]) => {
    localStorage.setItem("task-snippets", JSON.stringify(updated));
    setSnippets(updated);
  };

  const createSnippet = () => {
    if (!newName.trim()) return;

    const snippet: TaskSnippet = {
      id: Date.now().toString(),
      name: newName,
      template: { ...currentTask } as CreateTaskInput,
      createdAt: new Date(),
      useCount: 0,
    };

    saveSnippets([...snippets, snippet]);
    setNewName("");
    setIsCreating(false);
  };

  const deleteSnippet = (id: string) => {
    saveSnippets(snippets.filter(s => s.id !== id));
  };

  const useSnippet = (snippet: TaskSnippet) => {
    // Increment use count
    const updated = snippets.map(s =>
      s.id === snippet.id ? { ...s, useCount: s.useCount + 1 } : s
    );
    saveSnippets(updated);
    onInsertSnippet(snippet.template);
  };

  const captureCurrentAsSnippet = (task: Partial<CreateTaskInput>) => {
    setCurrentTask(task);
    setIsCreating(true);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-1.5">
          <Tag className="h-4 w-4" />
          Task Snippets
        </h3>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger>
            <Button variant="outline" size="sm">
              <Plus className="h-3 w-3 mr-1" />
              New Snippet
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Task Snippet</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Snippet Name</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Meeting follow-up"
                />
              </div>
              <div className="text-xs text-muted-foreground">
                Currently captures: {Object.keys(currentTask).length} field(s)
              </div>
              <Button onClick={createSnippet} className="w-full">Create Snippet</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {snippets.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">
              No snippets saved yet. Create templates for common tasks!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {snippets
            .sort((a, b) => b.useCount - a.useCount)
            .map((snippet) => (
              <Card key={snippet.id} className="cursor-pointer hover:bg-muted/30 transition-colors">
                <CardContent className="p-3 flex items-center justify-between">
                  <div onClick={() => useSnippet(snippet)} className="flex-1">
                    <div className="font-medium text-sm">{snippet.name}</div>
                    {snippet.template.priority && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {snippet.template.priority} priority
                      </Badge>
                    )}
                    {snippet.template.list_id && (
                      <span className="text-xs text-muted-foreground ml-2">
                        List: {snippet.template.list_id}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Used {snippet.useCount} times
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => deleteSnippet(snippet.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}