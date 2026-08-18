'use client';

import { useState, useEffect } from 'react';
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
  X,
  Settings,
  History,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Workflow {
  id: number;
  name: string;
  description?: string;
  trigger_type: string;
  trigger_config?: any;
  action_type: string;
  action_config?: any;
  condition_json?: any;
  enabled: boolean;
  run_count: number;
  last_run_at?: string;
  created_at: string;
}

interface WorkflowExecution {
  id: number;
  triggered_at: string;
  status: string;
  result_data?: string;
  error_message?: string;
  duration_ms?: number;
}

interface WorkflowBuilderProps {
  className?: string;
}

const TRIGGER_TYPES = [
  {
    value: 'manual',
    label: 'Manual Trigger',
    description: 'Execute on demand',
  },
  {
    value: 'task_created',
    label: 'Task Created',
    description: 'When a new task is created',
  },
  {
    value: 'task_completed',
    label: 'Task Completed',
    description: 'When a task is marked complete',
  },
  { value: 'due_date', label: 'Due Date', description: 'When tasks are due' },
  {
    value: 'schedule',
    label: 'Schedule',
    description: 'At specific times or intervals',
  },
  {
    value: 'cron',
    label: 'Cron Schedule',
    description: 'Using cron expressions',
  },
];

const ACTION_TYPES = [
  {
    value: 'create_task',
    label: 'Create Task',
    description: 'Generate a new task',
  },
  {
    value: 'update_task',
    label: 'Update Task',
    description: 'Modify existing task',
  },
  {
    value: 'send_notification',
    label: 'Send Notification',
    description: 'Send email or alert',
  },
  {
    value: 'log_message',
    label: 'Log Message',
    description: 'Record to activity log',
  },
  {
    value: 'webhook',
    label: 'Call Webhook',
    description: 'Trigger external service',
  },
];

export function WorkflowBuilder({ className }: WorkflowBuilderProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executions, setExecutions] = useState<
    Record<number, WorkflowExecution[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(
    null
  );

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState('manual');
  const [actionType, setActionType] = useState('create_task');
  const [enabled, setEnabled] = useState(true);

  // Action config
  const [taskName, setTaskName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');

  // Execution modal
  const [showExecutions, setShowExecutions] = useState(false);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/workflows');
      if (response.ok) {
        const data = await response.json();
        setWorkflows(data.workflows || []);
      }
    } catch (error) {
      toast.error('Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (workflow?: Workflow) => {
    if (workflow) {
      setEditingWorkflow(workflow);
      setName(workflow.name);
      setDescription(workflow.description || '');
      setTriggerType(workflow.trigger_type);
      setActionType(workflow.action_type);
      setEnabled(workflow.enabled);
      setTaskName(workflow.action_config?.task_name || '');
      setTaskDescription(workflow.action_config?.description || '');
      setTaskPriority(workflow.action_config?.priority || 'medium');
    } else {
      setEditingWorkflow(null);
      setName('');
      setDescription('');
      setTriggerType('manual');
      setActionType('create_task');
      setEnabled(true);
      setTaskName('');
      setTaskDescription('');
      setTaskPriority('medium');
    }
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    try {
      const workflowData = {
        name,
        description,
        trigger_type: triggerType,
        trigger_config: {},
        action_type: actionType,
        action_config: {
          task_name: taskName,
          description: taskDescription,
          priority: taskPriority,
        },
        enabled,
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
      setShowDialog(false);
    } catch (error) {
      toast.error('Failed to save workflow');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/workflows?id=${id}`, {
        method: 'DELETE',
      });
      toast.success('Workflow deleted');
      fetchWorkflows();
    } catch (error) {
      toast.error('Failed to delete workflow');
    }
  };

  const handleToggle = async (workflow: Workflow) => {
    try {
      await fetch(`/api/workflows?id=${workflow.id}`, {
        method: 'PATCH',
      });
      toast.success(`Workflow ${workflow.enabled ? 'paused' : 'enabled'}`);
      fetchWorkflows();
    } catch (error) {
      toast.error('Failed to toggle workflow');
    }
  };

  const handleExecute = async (workflow: Workflow) => {
    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute',
          workflow_id: workflow.id,
          input_data: {},
        }),
      });

      if (response.ok) {
        toast.success('Workflow executed');
        fetchWorkflows();
      } else {
        throw new Error('Execution failed');
      }
    } catch (error) {
      toast.error('Failed to execute workflow');
    }
  };

  const fetchExecutions = async (workflowId: number) => {
    try {
      const response = await fetch(
        `/api/workflows?id=${workflowId}&include_executions=true&limit=50`
      );
      if (response.ok) {
        const data = await response.json();
        setExecutions(prev => ({
          ...prev,
          [workflowId]: data.executions || [],
        }));
      }
    } catch (error) {
      toast.error('Failed to load executions');
    }
  };

  const getTriggerLabel = (type: string) => {
    const trigger = TRIGGER_TYPES.find(t => t.value === type);
    return trigger?.label || type;
  };

  const getActionLabel = (type: string) => {
    const action = ACTION_TYPES.find(a => a.value === type);
    return action?.label || type;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-700';
      case 'running':
        return 'bg-blue-500/10 text-blue-700';
      case 'failed':
        return 'bg-red-500/10 text-red-700';
      case 'skipped':
        return 'bg-gray-500/10 text-gray-700';
      default:
        return 'bg-gray-500/10 text-gray-700';
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5" />
            Workflow Builder
          </CardTitle>
          <CardDescription>
            Create no-code automations for task management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">Your Workflows</h3>
            <Button size="sm" onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              New Workflow
            </Button>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-20 bg-muted/30 rounded animate-pulse"
                />
              ))}
            </div>
          ) : workflows.length === 0 ? (
            <div className="text-center py-12">
              <Workflow className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-medium mb-2">No workflows yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create workflows to automate your task management
              </p>
              <Button onClick={() => openDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Workflow
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {workflows.map(wf => (
                <Card key={wf.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{wf.name}</h4>
                          {wf.enabled ? (
                            <Badge className="bg-green-500/10 text-green-700">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Paused</Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {getTriggerLabel(wf.trigger_type)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Action: {getActionLabel(wf.action_type)}</span>
                          {wf.run_count > 0 && <span>{wf.run_count} runs</span>}
                          {wf.last_run_at && (
                            <span>
                              Last: {new Date(wf.last_run_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExecute(wf)}
                        >
                          <Play className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggle(wf)}
                        >
                          {wf.enabled ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger>
                            <Button variant="ghost" size="sm">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => openDialog(wf)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedWorkflow(wf);
                                setShowExecutions(true);
                              }}
                            >
                              <History className="h-4 w-4 mr-2" />
                              View Executions
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(wf.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workflow Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingWorkflow ? 'Edit Workflow' : 'New Workflow'}
            </DialogTitle>
            <DialogDescription>
              {editingWorkflow
                ? 'Update your automation'
                : 'Create a new no-code workflow'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Input
                placeholder="Workflow name"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div>
              <Textarea
                placeholder="Description (optional)"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Trigger
                </label>
                <Select
                  value={triggerType}
                  onValueChange={v => setTriggerType(v || triggerType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select trigger" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGER_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        <div>
                          <div className="font-medium">{t.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {t.description}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Action</label>
                <Select
                  value={actionType}
                  onValueChange={v => setActionType(v || actionType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map(a => (
                      <SelectItem key={a.value} value={a.value}>
                        <div>
                          <div className="font-medium">{a.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {a.description}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium">Action Configuration</h4>

              <Input
                placeholder="Task name (e.g., {{trigger.task_name}})"
                value={taskName}
                onChange={e => setTaskName(e.target.value)}
              />

              <Textarea
                placeholder="Task description"
                value={taskDescription}
                onChange={e => setTaskDescription(e.target.value)}
                rows={2}
              />

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Priority
                </label>
                <Select
                  value={taskPriority}
                  onValueChange={v => setTaskPriority(v || taskPriority)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              <Save className="h-4 w-4 mr-2" />
              {editingWorkflow ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Executions Modal */}
      <Dialog open={showExecutions} onOpenChange={setShowExecutions}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Workflow Executions</DialogTitle>
            <DialogDescription>Recent execution history</DialogDescription>
          </DialogHeader>

          {selectedWorkflow ? (
            <div className="space-y-3">
              {executions[selectedWorkflow.id]?.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No executions yet
                </p>
              ) : (
                executions[selectedWorkflow.id]?.map(exec => (
                  <div key={exec.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">
                        {new Date(exec.triggered_at).toLocaleString()}
                      </span>
                      <Badge
                        className={cn('text-xs', getStatusColor(exec.status))}
                      >
                        {exec.status}
                      </Badge>
                    </div>
                    {exec.error_message && (
                      <p className="text-sm text-red-600">
                        {exec.error_message}
                      </p>
                    )}
                    {exec.duration_ms && (
                      <p className="text-xs text-muted-foreground">
                        Duration: {exec.duration_ms}ms
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              Select a workflow to view executions
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
