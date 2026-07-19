"use client";

import { useState } from "react";
import { TaskConnection, Task } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, Filter, ExternalLink, Lightbulb, BookOpen, AlertTriangle, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";

interface TaskConnectionsTabProps {
  task: Task;
  connections?: TaskConnection[];
  relatedTasks?: Task[];
  onConnectionsChange?: (connections: TaskConnection[]) => void;
}

const connectionTypes = [
  { value: "prerequisite", label: "Prerequisite", description: "Must be completed before this task" },
  { value: "inspiration", label: "Inspiration", description: "This task was inspired by" },
  { value: "similar", label: "Similar", description: "Similar approach or outcome" },
  { value: "contrast", label: "Contrast", description: "Different approach to compare" },
  { value: "related", label: "Related", description: "Related but independent" },
  { value: "learned_from", label: "Learned From", description: "Lessons learned" },
];

export function TaskConnectionsTab({ task, connections = [], relatedTasks = [], onConnectionsChange }: TaskConnectionsTabProps) {
  const [showAddConnection, setShowAddConnection] = useState(false);
  const [newConnection, setNewConnection] = useState({
    targetTaskId: "",
    connectionType: "related" as const,
    notes: "",
    strength: 0.5,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);

  // Filter tasks (excluding current task)
  const availableTasks = relatedTasks.filter(t => t.id !== task.id);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query) {
      const filtered = availableTasks.filter(t =>
        t.name.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredTasks(filtered);
    } else {
      setFilteredTasks(availableTasks);
    }
  };

  const handleAddConnection = async () => {
    if (!newConnection.targetTaskId) return;

    try {
      const response = await fetch("/api/task-connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_task_id: task.id,
          target_task_id: parseInt(newConnection.targetTaskId),
          connection_type: newConnection.connectionType,
          notes: newConnection.notes || undefined,
          strength: newConnection.strength,
        }),
      });

      if (response.ok) {
        const createdConnection = await response.json();
        onConnectionsChange?.([...connections, createdConnection]);
        setNewConnection({
          targetTaskId: "",
          connectionType: "related",
          notes: "",
          strength: 0.5,
        });
        setShowAddConnection(false);
        toast.success("Connection added");
      }
    } catch (error) {
      toast.error("Failed to add connection");
    }
  };

  const handleDeleteConnection = async (connectionId: number) => {
    try {
      await fetch(`/api/task-connections/${connectionId}`, { method: "DELETE" });
      onConnectionsChange?.(connections.filter(c => c.id !== connectionId));
      toast.success("Connection removed");
    } catch (error) {
      toast.error("Failed to remove connection");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          <Link className="h-4 w-4" />
          Knowledge Graph Connections
        </h3>
        <Button
          size="sm"
          onClick={() => setShowAddConnection(true)}
        >
          Add Connection
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Connect this task to other tasks to build a knowledge graph of your work.
      </p>

      {/* Add Connection Form */}
      {showAddConnection && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div>
                <Label>Connection Type</Label>
                <Select
                  value={newConnection.connectionType}
                  onValueChange={(value) => setNewConnection({ ...newConnection, connectionType: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {connectionTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div>{type.label}</div>
                          <div className="text-xs text-muted-foreground">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Target Task</Label>
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>

              <div>
                <Label>Notes (optional)</Label>
                <Input
                  placeholder="Add context about this connection..."
                  value={newConnection.notes}
                  onChange={(e) => setNewConnection({ ...newConnection, notes: e.target.value })}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleAddConnection}>Add Connection</Button>
                <Button variant="outline" onClick={() => setShowAddConnection(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Connections */}
      {connections.length > 0 ? (
        <div className="space-y-3">
          {connections.map((connection) => {
            const targetTask = relatedTasks.find(t => t.id === (connection as any).target_task_id || (connection as any).source_task_id);
            return (
              <Card key={connection.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {connectionTypes.find(t => t.value === connection.connection_type)?.label || connection.connection_type}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {(connection as any).target_task_id || (connection as any).source_task_id}
                        </Badge>
                      </div>
                      {connection.notes && (
                        <p className="text-sm text-muted-foreground">
                          {connection.notes}
                        </p>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Added: {new Date(connection.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteConnection(connection.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-sm text-muted-foreground mb-2">
            No connections yet. Connect this task to build your knowledge graph.
          </p>
          <Button variant="outline" onClick={() => setShowAddConnection(true)}>
            Add First Connection
          </Button>
        </div>
      )}

      {/* Insights Section */}
      {connections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This task is connected to {connections.length} other task(s).
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Use connections to:
              <ul className="list-disc list-inside mt-1">
                <li>Track dependencies and blockers</li>
                <li>Learn from past decisions</li>
                <li>Discover related work patterns</li>
              </ul>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}