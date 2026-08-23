'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Workflow,
  Play,
  Edit,
  Save,
  Plus,
  CheckCircle2,
  AlertCircle,
  List,
  Code,
  Database,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action';
  subtype:
    | 'manual'
    | 'task_created'
    | 'task_completed'
    | 'due_date'
    | 'schedule'
    | 'create_task'
    | 'update_task'
    | 'send_notification'
    | 'log_message'
    | 'webhook';
  label: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  config?: Record<string, unknown>;
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
    id: 'trigger-manual',
    type: 'trigger',
    subtype: 'manual',
    label: 'Manual Trigger',
    description: 'Execute on demand',
  },
  {
    id: 'trigger-task-created',
    type: 'trigger',
    subtype: 'task_created',
    label: 'Task Created',
    description: 'When a new task is created',
  },
  {
    id: 'trigger-task-completed',
    type: 'trigger',
    subtype: 'task_completed',
    label: 'Task Completed',
    description: 'When a task is marked complete',
  },
  {
    id: 'trigger-due-date',
    type: 'trigger',
    subtype: 'due_date',
    label: 'Due Date',
    description: 'When tasks are due',
  },
  {
    id: 'trigger-schedule',
    type: 'trigger',
    subtype: 'schedule',
    label: 'Schedule',
    description: 'At specific times or intervals',
  },
];

const ACTION_NODES: WorkflowNode[] = [
  {
    id: 'action-create-task',
    type: 'action',
    subtype: 'create_task',
    label: 'Create Task',
    description: 'Generate a new task',
    icon: List,
  },
  {
    id: 'action-update-task',
    type: 'action',
    subtype: 'update_task',
    label: 'Update Task',
    description: 'Modify existing task',
    icon: Edit,
  },
  {
    id: 'action-send-notification',
    type: 'action',
    subtype: 'send_notification',
    label: 'Send Notification',
    description: 'Email, Slack, Discord alert',
    icon: Share2,
  },
  {
    id: 'action-log-message',
    type: 'action',
    subtype: 'log_message',
    label: 'Log Message',
    description: 'Record to activity log',
    icon: Database,
  },
  {
    id: 'action-webhook',
    type: 'action',
    subtype: 'webhook',
    label: 'Call Webhook',
    description: 'Trigger external service',
    icon: Code,
  },
];

interface NodeConfigState {
  [key: string]: {
    name?: string;
    description?: string;
  };
}

function BuilderModal({
  showBuilder,
  editingWorkflow,
  workflowNodes,
  selectedNode,
  nodeConfig,
  setNodeConfig,
  onSave,
  onCancel,
}: {
  showBuilder: boolean;
  editingWorkflow: WorkflowData | null;
  workflowNodes: WorkflowNode[];
  selectedNode: WorkflowNode | null;
  nodeConfig: NodeConfigState;
  setNodeConfig: React.Dispatch<React.SetStateAction<NodeConfigState>>;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={showBuilder} onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {editingWorkflow ? 'Edit Workflow' : 'Build New Workflow'}
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
                    <Tooltip key={node.id}>
                      <TooltipTrigger>
                        <div
                          className="p-2 rounded border bg-orange-50 hover:shadow cursor-move"
                          draggable
                          onDragStart={() => undefined}
                        >
                          <div className="font-medium text-sm">
                            {node.label}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {node.description}
                          </div>
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
                      <Tooltip key={node.id}>
                        <TooltipTrigger>
                          <div
                            className="p-2 rounded border bg-blue-50 hover:shadow cursor-move"
                            draggable
                            onDragStart={() => undefined}
                          >
                            <div className="flex items-center gap-2">
                              {Icon && <Icon className="h-4 w-4" />}
                              <div>
                                <div className="font-medium text-sm">
                                  {node.label}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {node.description}
                                </div>
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
            <div className="space-y-3">
              {workflowNodes.length === 0 ? (
                <div className="text-center py-12">
                  <Workflow className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h4 className="font-medium mb-2">Build your workflow</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Drag nodes from the left to create your automation
                  </p>
                  <div className="text-xs text-muted-foreground">
                    Tip: Start with a trigger, then add actions
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {workflowNodes.map((node) => (
                    <div key={node.id} className="flex items-center gap-3">
                      <div className="absolute left-4 top-4 w-6 h-6 flex items-center justify-center text-muted-foreground/50">
                        {node.type === 'trigger' ? 'v' : '→'}
                      </div>
                      <div
                        className={cn(
                          'p-3 rounded-lg border cursor-move transition-all',
                          node.type === 'trigger'
                            ? 'border-orange-200 bg-orange-50'
                            : 'border-blue-200 bg-blue-50'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          <div>
                            <div className="font-medium text-sm">{node.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {node.description}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Node Config Panel */}
        {selectedNode && (
          <div className="border-t p-4">
            <h4 className="font-medium mb-3">
              Configure: {selectedNode.label}
            </h4>
            <div className="space-y-3">
              <Input
                placeholder="Name/Value"
                value={nodeConfig[selectedNode.id]?.name || ''}
                onChange={e =>
                  setNodeConfig(prev => ({
                    ...prev,
                    [selectedNode.id]: {
                      ...prev[selectedNode.id],
                      name: e.target.value,
                    },
                  }))
                }
              />
              <Textarea
                placeholder="Description or details..."
                rows={2}
                value={nodeConfig[selectedNode.id]?.description || ''}
                onChange={e =>
                  setNodeConfig(prev => ({
                    ...prev,
                    [selectedNode.id]: {
                      ...prev[selectedNode.id],
                      description: e.target.value,
                    },
                  }))
                }
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onSave}>
            <Save className="h-4 w-4 mr-2" />
            {editingWorkflow ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function VisualWorkflowBuilder({ className }: { className?: string }) {
  const [workflows, setWorkflows] = useState<WorkflowData[]>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowData | null>(null);
  const [workflowNodes, setWorkflowNodes] = useState<WorkflowNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);

  // Node config state
  const [nodeConfig, setNodeConfig] = useState<NodeConfigState>({});

  const fetchWorkflows = useCallback(async () => {
    try {
      const response = await fetch('/api/workflows');
      if (response.ok) {
        const data = await response.json();
        setWorkflows(data.workflows || []);
      }
    } catch {
      toast.error('Failed to load workflows');
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const openBuilder = useCallback((_workflow?: WorkflowData) => {
    setEditingWorkflow(_workflow || null);
    if (_workflow?.nodes) {
      setWorkflowNodes(_workflow.nodes);
    } else {
      setWorkflowNodes([]);
    }
    setNodeConfig({});
    setSelectedNode(null);
    setShowBuilder(true);
  }, []);

  const saveWorkflow = useCallback(async () => {
    try {
      const workflowData = {
        name: editingWorkflow?.name || 'New Workflow',
        description: editingWorkflow?.description || '',
        nodes: workflowNodes,
        edges: [], // Would connect nodes in full implementation
        enabled: true,
      };

      if (editingWorkflow) {
        await fetch(`/api/workflows?id=${editingWorkflow.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(workflowData),
        });
        toast.success('Workflow updated');
      } else {
        await fetch('/api/workflows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(workflowData),
        });
        toast.success('Workflow created');
      }

      fetchWorkflows();
      setShowBuilder(false);
    } catch {
      toast.error('Failed to save workflow');
    }
  }, [editingWorkflow, workflowNodes, fetchWorkflows]);

  const handleTemplateClick = useCallback((template: { name: string; nodes: WorkflowNode[]; edges: { source: string; target: string }[] }) => {
    openBuilder({
      id: 0,
      name: template.name,
      nodes: template.nodes,
      edges: template.edges,
      enabled: true,
      run_count: 0,
      created_at: new Date().toISOString(),
    });
  }, [openBuilder]);

  const handleCloseModal = useCallback(() => {
    setShowBuilder(false);
  }, []);

  // Handle save and cancel using callbacks passed to modal
  const modalProps = {
    showBuilder,
    editingWorkflow,
    workflowNodes,
    selectedNode,
    nodeConfig,
    setNodeConfig,
    onSave: saveWorkflow,
    onCancel: handleCloseModal,
  };

  return (
    <div className={cn('space-y-6', className)}>
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
                  onClick={() => handleTemplateClick({
                    name: 'Auto-Create Tasks',
                    nodes: [...TRIGGER_NODES.slice(0, 1), ACTION_NODES[0]],
                    edges: [
                      {
                        source: 'trigger-task-created',
                        target: 'action-create-task',
                      },
                    ],
                  })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Task Creation from Trigger
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleTemplateClick({
                    name: 'Task Completion Tracker',
                    nodes: [
                      ...TRIGGER_NODES.slice(1, 2),
                      ...ACTION_NODES.slice(2, 3),
                    ],
                    edges: [
                      {
                        source: 'trigger-task-completed',
                        target: 'action-send-notification',
                      },
                    ],
                  })}
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
                <p className="text-sm text-muted-foreground">
                  No workflows created yet
                </p>
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
                          <Badge className="bg-green-500/10 text-green-700">
                            Active
                          </Badge>
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

      <BuilderModal {...modalProps} />
    </div>
  );
}