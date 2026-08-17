'use client';

import { useState } from 'react';
import {
  CheckSquare,
  XCircle,
  Archive,
  Trash2,
  Move,
  Tag,
  ArrowUpDown,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Task } from '@/types';

interface BatchOperationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
  selectedIds: Set<number>;
  onComplete: () => void;
  lists: { id: number; name: string }[];
  labels: { id: number; name: string }[];
}

export function BatchOperationModal({
  open,
  onOpenChange,
  tasks,
  selectedIds,
  onComplete,
  lists,
  labels,
}: BatchOperationModalProps) {
  const [operation, setOperation] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState<string>('');

  const selectedTasks = tasks.filter(t => selectedIds.has(t.id));
  const pendingTasks = selectedTasks.filter(t => !t.completed);
  const completedTasks = selectedTasks.filter(t => t.completed);

  const handleOperation = async () => {
    setIsProcessing(true);
    try {
      // Call the batch operation API
      await performBatchAction(operation, confirmationInput);
      toast.success(
        `Successfully ${getOperationLabel(operation)} ${selectedTasks.length} tasks`
      );
      onComplete();
      onOpenChange(false);
      setOperation('');
      setConfirmationInput('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Operation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const getOperationLabel = (op: string) => {
    const labels: Record<string, string> = {
      complete: 'completed',
      uncomplete: 'uncompleted',
      delete: 'deleted',
      archive: 'archived',
      unarchive: 'unarchived',
      move: 'moved',
      set_priority: 'updated priority',
      add_labels: 'added labels to',
      remove_labels: 'removed labels from',
    };
    return labels[op] || 'operated on';
  };

  const getOperationIcon = (op: string) => {
    const icons: Record<string, React.ReactNode> = {
      complete: <CheckSquare className="h-4 w-4" />,
      uncomplete: <XCircle className="h-4 w-4" />,
      delete: <Trash2 className="h-4 w-4" />,
      archive: <Archive className="h-4 w-4" />,
      unarchive: <RefreshCw className="h-4 w-4" />,
      move: <Move className="h-4 w-4" />,
      set_priority: <ArrowUpDown className="h-4 w-4" />,
      add_labels: <Tag className="h-4 w-4" />,
      remove_labels: <Tag className="h-4 w-4" />,
    };
    return icons[op] || <CheckSquare className="h-4 w-4" />;
  };

  const getConfirmationInput = (op: string): string => {
    if (op === 'delete') return 'delete';
    if (op === 'archive') return 'archive';
    return '';
  };

  const requireConfirmation = ['delete', 'archive'].includes(operation);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Batch Operations</DialogTitle>
          <DialogDescription>
            Perform actions on {selectedTasks.length} selected task
            {selectedTasks.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Selection Summary */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground mb-1">Selected</p>
                <p className="text-lg font-bold">{selectedTasks.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground mb-1">Pending</p>
                <p className="text-lg font-bold">{pendingTasks.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground mb-1">Completed</p>
                <p className="text-lg font-bold">{completedTasks.length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Operation Selection */}
          <div className="space-y-3">
            <h4 className="font-medium">Choose Operation</h4>

            <div className="grid gap-2">
              {/* Complete/Uncomplete */}
              <div
                className={cn(
                  'border rounded-lg p-3 cursor-pointer transition-all',
                  operation === 'complete'
                    ? 'ring-2 ring-primary bg-primary/5'
                    : 'hover:shadow'
                )}
                onClick={() => setOperation('complete')}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'p-2 rounded',
                      operation === 'complete' && 'bg-primary/10'
                    )}
                  >
                    {getOperationIcon('complete')}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium">Mark Complete</h5>
                    <p className="text-xs text-muted-foreground">
                      Mark all selected pending tasks as completed
                    </p>
                    {pendingTasks.length === 0 && pendingTasks.length > 0 && (
                      <Badge variant="destructive" className="text-xs mt-1">
                        No pending tasks
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Archive/Unarchive */}
              <div
                className={cn(
                  'border rounded-lg p-3 cursor-pointer transition-all',
                  operation === 'archive'
                    ? 'ring-2 ring-primary bg-primary/5'
                    : 'hover:shadow'
                )}
                onClick={() => setOperation('archive')}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'p-2 rounded',
                      operation === 'archive' && 'bg-primary/10'
                    )}
                  >
                    {getOperationIcon('archive')}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium">Archive</h5>
                    <p className="text-xs text-muted-foreground">
                      Hide completed tasks from active view
                    </p>
                  </div>
                </div>
              </div>

              {/* Delete */}
              <div
                className={cn(
                  'border rounded-lg p-3 cursor-pointer transition-all border-destructive',
                  operation === 'delete'
                    ? 'ring-2 ring-destructive bg-destructive/5'
                    : 'hover:shadow'
                )}
                onClick={() => setOperation('delete')}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'p-2 rounded',
                      operation === 'delete' && 'bg-destructive/10'
                    )}
                  >
                    {getOperationIcon('delete')}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium text-destructive">Delete</h5>
                    <p className="text-xs text-muted-foreground">
                      Permanently delete selected tasks
                    </p>
                  </div>
                </div>
              </div>

              {/* Move */}
              <div
                className={cn(
                  'border rounded-lg p-3 cursor-pointer transition-all',
                  operation === 'move'
                    ? 'ring-2 ring-primary bg-primary/5'
                    : 'hover:shadow'
                )}
                onClick={() => setOperation('move')}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'p-2 rounded',
                      operation === 'move' && 'bg-primary/10'
                    )}
                  >
                    {getOperationIcon('move')}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium">Move to List</h5>
                    <p className="text-xs text-muted-foreground">
                      Move tasks to another list
                    </p>
                  </div>
                </div>
              </div>

              {/* Set Priority */}
              <div
                className={cn(
                  'border rounded-lg p-3 cursor-pointer transition-all',
                  operation === 'set_priority'
                    ? 'ring-2 ring-primary bg-primary/5'
                    : 'hover:shadow'
                )}
                onClick={() => setOperation('set_priority')}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'p-2 rounded',
                      operation === 'set_priority' && 'bg-primary/10'
                    )}
                  >
                    {getOperationIcon('set_priority')}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium">Set Priority</h5>
                    <p className="text-xs text-muted-foreground">
                      Change priority for all selected tasks
                    </p>
                  </div>
                </div>
              </div>

              {/* Add Labels */}
              <div
                className={cn(
                  'border rounded-lg p-3 cursor-pointer transition-all',
                  operation === 'add_labels'
                    ? 'ring-2 ring-primary bg-primary/5'
                    : 'hover:shadow'
                )}
                onClick={() => setOperation('add_labels')}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'p-2 rounded',
                      operation === 'add_labels' && 'bg-primary/10'
                    )}
                  >
                    {getOperationIcon('add_labels')}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium">Add Labels</h5>
                    <p className="text-xs text-muted-foreground">
                      Add labels to selected tasks
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Operation-specific settings */}
          {operation === 'move' && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Select Target List</h4>
              <Select
                value={confirmationInput}
                onValueChange={v => v !== null && setConfirmationInput(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a list" />
                </SelectTrigger>
                <SelectContent>
                  {lists.map(list => (
                    <SelectItem key={list.id} value={list.id.toString()}>
                      {list.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {operation === 'set_priority' && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Select Priority</h4>
              <Select
                value={confirmationInput}
                onValueChange={v => v !== null && setConfirmationInput(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {operation === 'add_labels' && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Select Labels</h4>
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {labels.map(label => (
                  <label
                    key={label.id}
                    className="flex items-center space-x-2 p-2 border rounded cursor-pointer"
                  >
                    <Checkbox
                      checked={confirmationInput
                        .split(',')
                        .map(n => parseInt(n))
                        .includes(label.id)}
                      onCheckedChange={checked => {
                        if (checked) {
                          setConfirmationInput(prev => {
                            const ids = prev
                              ? prev.split(',').map(n => parseInt(n))
                              : [];
                            return [...ids, label.id].join(',');
                          });
                        } else {
                          setConfirmationInput(prev => {
                            if (!prev) return '';
                            const ids = prev
                              .split(',')
                              .map(n => parseInt(n))
                              .filter(id => id !== label.id);
                            return ids.length > 0 ? ids.join(',') : '';
                          });
                        }
                      }}
                    />
                    <span className="text-sm">{label.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Warning for destructive actions */}
          {(operation === 'delete' || operation === 'archive') && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-medium text-amber-800 mb-1">
                    This action cannot be undone
                  </h5>
                  <p className="text-sm text-amber-700">
                    {operation === 'delete'
                      ? 'These tasks will be permanently removed from your account.'
                      : 'Archived tasks can be restored from the archived view.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Confirmation input for destructive actions */}
          {requireConfirmation && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">
                Type <code>{confirmationInput}</code> to confirm
              </h4>
              <Input
                value={confirmationInput}
                onChange={e => setConfirmationInput(e.target.value)}
                placeholder={confirmationInput}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleOperation}
            disabled={
              isProcessing ||
              (requireConfirmation &&
                confirmationInput !== getConfirmationInput(operation)) ||
              (operation === 'move' && !confirmationInput) ||
              (operation === 'set_priority' && !confirmationInput) ||
              (operation === 'add_labels' && !confirmationInput)
            }
            variant={operation === 'delete' ? 'destructive' : 'default'}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {getOperationIcon(operation)}
                <span className="ml-2">
                  {operation === 'delete' ? 'Delete' : 'Apply'}{' '}
                  {selectedTasks.length} Task
                  {selectedTasks.length !== 1 ? 's' : ''}
                </span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

async function performBatchAction(
  operationType: string,
  confirmationValue: string
): Promise<void> {
  // This would call the server action
  // For now, this is a placeholder
  if (operationType === 'delete' && confirmationValue !== 'delete') {
    throw new Error('Confirmation required');
  }
}
