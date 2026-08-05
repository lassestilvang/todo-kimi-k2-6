"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Workflow,
  Play,
  Pause,
  Edit,
  Trash2,
  Save,
  RefreshCw,
  Plus,
  ArrowRight,
  Clock,
  Check,
  Settings,
  History,
  DragOverlay,
  CheckCircle2,
  AlertCircle,
  List,
  Mail,
  Code,
  Database,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface WorkflowNode {
  id: string;
  type: "trigger" | "action";
  subtype: "manual" | "task_created" | "task_completed" | "due_date" | "schedule" | "create_task" | "update_task" | "send_notification" | "log_message" | "webhook";
  label: string;
  description: string;
  config?: Record<string, any>;
}

interface WorkflowData {
  id: number;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: Array<{ source: string; target: string }>;
  enabled: boolean;
  run_count: number;
  last_run_at?: string;
  created_at: string;
}

const TRIGGER_NODES: WorkflowNode[] = [
  {
    id: "trigger-manual",
    type: "trigger",
    subtype: "manual",
    label: "Manual Trigger",
    description: "Execute on demand",
  },
  {
    id: "trigger-task-created",
    type: "trigger",
    subtype: "task_created",
    label: "Task Created",
    description: "When a new task is created",
  },
  {
    id: "trigger-task-completed",
    type: "trigger",
    subtype: "task_completed",
    label: "Task Completed",
    description: "When a task is marked complete",
  },
  {
    id: "trigger-due-date",
    type: "trigger",
    subtype: "due_date",
    label: "Due Date",
    description: "When tasks are due",
  },
  {
    id: "trigger-schedule",
    type: "trigger",
    subtype: "schedule",
    label: "Schedule",
    description: "At specific times or intervals",
  },
];

const ACTION_NODES: WorkflowNode[] = [
  {
    id: "action-create-task",
    type: "action",
    subtype: "create_task",
    label: "Create Task",
    description: "Generate a new task",
    icon: List,
  },
  {
    id: "action-update-task",
    type: "action",
    subtype: "update_task",
    label: "Update Task",
    description: "Modify existing task",
    icon: Edit,
  },
  {
    id: "action-send-notification",
    type: "action",
    subtype: "send_notification",
    label: "Send Notification",
    description: "Email, Slack, Discord alert",
    icon: Share2,
  },
  {
    id: "action-log-message",
    type: "action",
    subtype: "log_message",
    label: "Log Message",
    description: "Record to activity log",
    icon: Database,
  },
  {
    id: "action-webhook",
    type: "action",
    subtype: "webhook",
    label: "Call Webhook",
    description: "Trigger external service",
    icon: Code,
  },
];

export function VisualWorkflowBuilder({ className }: { className?: string }) {
  const [workflows, setWorkflows] = useState<WorkflowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowData | null>(null);

  // Visual builder state
  const [availableNodes, setAvailableNodes] = useState<WorkflowNode[]>([]);
  const [workflowNodes, setWorkflowNodes] = useState<WorkflowNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [draggedNode, setDraggedNode] = useState<WorkflowNode | null>(null);

  // Node config state
  const [nodeConfig, setNodeConfig] = useState<Record<string, any>>({});

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/workflows");
      if (response.ok) {
        const data = await response.json();
        setWorkflows(data.workflows || []);
      }
    } catch (error) {
      toast.error("Failed to load workflows");
    } finally {
      setLoading(false);
    }
  };

  const openBuilder = (workflow?: WorkflowData) => {
    setEditingWorkflow(workflow || null);
    if (workflow?.nodes) {
      setWorkflowNodes(workflow.nodes);
    } else {
      setWorkflowNodes([]);
    }
    setShowBuilder(true);
  };

  const handleDragStart = (event: any) => {
    setDraggedNode(event?.active?.data?.current?.node || null);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (!over) return;

    // Handle dropping from palette
    if (over.id === "palette-drop-zone") {
      const newType = active.data?.current?.type as keyof typeof ACTION_NODES | keyof typeof TRIGGER_NODES;
      const subtype = active.data?.current?.subtype;
      const nodeList = newType?.startsWith("action") ? ACTION_NODES : TRIGGER_NODES;
      const node = (nodeList as WorkflowNode[]).find(n => n.id === subtype || n.subtype === subtype);
      if (node) {
        setWorkflowNodes([...workflowNodes, { ...node, id: `node-${Date.now()}` }]);
      }
      return;
    }

    // Handle reordering within workflow
    const oldIndex = workflowNodes.findIndex(n => n.id === active.id);
    const newIndex = workflowNodes.findIndex(n => n.id === over.id);

    if (oldIndex !== newIndex && oldIndex > -1 && newIndex > -1) {
      setWorkflowNodes(arrayMove(workflowNodes, oldIndex, newIndex));
    }
  };

  // Sortable node component
  const SortableWorkflowNode = ({ node, isSelected, onClick }: {
    node: WorkflowNode;
    isSelected: boolean;
    onClick: () => void;
  }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: node.id,
      data: { node },
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const Icon = node.icon || (node.type === "trigger" ? AlertCircle : CheckCircle2);

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={onClick}
        className={cn(
          "p-3 rounded-lg border cursor-move transition-all",
          node.type === "trigger"
            ? "border-orange-200 bg-orange-50"
            : "border-blue-200 bg-blue-50",
          isSelected && "ring-2 ring-primary",
          isDragging && "rotate-2"
        )}
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <div>
            <div className="font-medium text-sm">{node.label}</div>
            <div className="text-xs text-muted-foreground">{node.description}</div>
          </div>
        </div>
      </div>
    );
  };

  const saveWorkflow = async () => {
    try {
      const workflowData = {
        name: editingWorkflow?.name || "New Workflow",
        description: editingWorkflow?.description || "",
        nodes: workflowNodes,
        edges: [], // Would connect nodes in full implementation
        enabled: true,
      };

      if (editingWorkflow) {
        await fetch(`/api/workflows?id=${editingWorkflow.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(workflowData),
        });
        toast.success("Workflow updated");
      } else {
        await fetch("/api/workflows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(workflowData),
        });
        toast.success("Workflow created");
      }

      fetchWorkflows();
      setShowBuilder(false);
    } catch (error) {
      toast.error("Failed to save workflow");
    }
  };

  // Visual builder modal
  const BuilderModal = () => (
    <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {editingWorkflow ? "Edit Workflow" : "Build New Workflow"}
          </DialogTitle>
          <DialogDescription>
            Drag and drop nodes to create your automation
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* Node Palette */}
          <div className="w-64 flex-shrink-0 border-r p-4 overflow-y-auto">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Triggers
                </h3>
                <div className="space-y-2">
                  {TRIGGER_NODES.map(node => (
                    <Tooltip key={node.id} provider="ripple">
                      <TooltipTrigger asChild>
                        <div
                          className="p-2 rounded border bg-orange-50 hover:shadow cursor-move"
                          draggable
                          onDragStart={() => setDraggedNode(node)}
                        >
                          <div className="font-medium text-sm">{node.label}</div>
                          <div className="text-xs text-muted-foreground">{node.description}</div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{node.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Actions
                </h3>
                <div className="space-y-2">
                  {ACTION_NODES.map(node => {
                    const Icon = node.icon;
                    return (
                      <Tooltip key={node.id} provider="ripple">
                        <TooltipTrigger asChild>
                          <div
                            className="p-2 rounded border bg-blue-50 hover:shadow cursor-move"
                            draggable
                            onDragStart={() => setDraggedNode(node)}
                          >
                            <div className="flex items-center gap-2">
                              {Icon && <Icon className="h-4 w-4" />}
                              <div>
                                <div className="font-medium text-sm">{node.label}</div>
                                <div className="text-xs text-muted-foreground">{node.description}</div>
                              </div>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{node.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 p-4 overflow-y-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="space-y-3">
                {workflowNodes.length === 0 ? (
                  <div className="text-center py-12">
                    <Workflow className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h4 className="font-medium mb-2">Build your workflow</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Drag nodes from the left to create your automation
                    </p>
                    <div className="text-xs text-muted-foreground">
                      💡 Tip: Start with a trigger, then add actions
                    </div>
                  </div>
                ) : (
                  <SortableContext items={workflowNodes.map(n => n.id)}>
                    <div className="space-y-2">
                      {workflowNodes.map((node, index) => (
                        <div key={node.id} className="flex items-center gap-3">
                          <div className="absolute left-4 top-4 w-6 h-6 flex items-center justify-center text-muted-foreground/50">
                            {index === 0 ? "⇣" : "⇢"}
                          </div>
                          <SortableWorkflowNode
                            node={node}
                            isSelected={selectedNode?.id === node.id}
                            onClick={() => setSelectedNode(node)}
                          />
                        </div>
                      ))}
                    </div>
                  </SortableContext>
                )}
              </div>
            </DndContext>
          </div>
        </div>

        {/* Node Config Panel */}
        {selectedNode && (
          <div className="border-t p-4">
            <h4 className="font-medium mb-3">Configure: {selectedNode.label}</h4>
            <div className="space-y-3">
              <Input
                placeholder="Name/Value"
                value={nodeConfig[selectedNode.id]?.name || ""}
                onChange={e => setNodeConfig(prev => ({
                  ...prev,
                  [selectedNode.id]: { ...prev[selectedNode.id], name: e.target.value }
                }))}
              />
              <Textarea
                placeholder="Description or details..."
                rows={2}
                value={nodeConfig[selectedNode.id]?.description || ""}
                onChange={e => setNodeConfig(prev => ({
                  ...prev,
                  [selectedNode.id]: { ...prev[selectedNode.id], description: e.target.value }
                }))}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowBuilder(false)}>
            Cancel
          </Button>
          <Button onClick={saveWorkflow}>
            <Save className="h-4 w-4 mr-2" />
            {editingWorkflow ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className={cn("space-y-6", className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5" />
            Visual Workflow Builder
          </CardTitle>
          <CardDescription>
            Drag-and-drop automation builder. No coding required!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Quick Templates */}
            <div>
              <h3 className="font-medium mb-3">Quick Templates</h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => openBuilder()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Empty Workflow
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => openBuilder({
                    id: 0,
                    name: "Auto-Create Tasks",
                    nodes: [...TRIGGER_NODES.slice(0, 1), ACTION_NODES[0]],
                    edges: [{ source: "trigger-task-created", target: "action-create-task" }],
                    enabled: true,
                    run_count: 0,
                    created_at: new Date().toISOString(),
                  } as any)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Task Creation from Trigger
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => openBuilder({
                    id: 0,
                    name: "Task Completion Tracker",
                    nodes: [...TRIGGER_NODES.slice(1, 2), ACTION_NODES.slice(2, 3)],
                    edges: [{ source: "trigger-task-completed", target: "action-send-notification" }],
                    enabled: true,
                    run_count: 0,
                    created_at: new Date().toISOString(),
                  } as any)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Notify on Completion
                </Button>
              </div>
            </div>

            {/* Existing Workflows */}
            <div>
              <h3 className="font-medium mb-3">Your Workflows</h3>
              {workflows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No workflows created yet</p>
              ) : (
                <div className="space-y-2">
                  {workflows.slice(0, 5).map(wf => (
                    <div
                      key={wf.id}
                      className="border rounded-lg p-3 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{wf.name}</h4>
                        {wf.enabled ? (
                          <Badge className="bg-green-500/10 text-green-700">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Paused</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">
                        {wf.nodes?.length || 0} nodes • {wf.run_count} runs
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost">
                          <Play className="h-3 w-3 mr-1" />
                          Run
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <BuilderModal />
    </div>
  );
}