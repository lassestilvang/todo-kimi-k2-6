'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Inbox,
  Calendar,
  Mail,
  MessageSquare,
  GitBranch,
  Check,
  X,
  Trash2,
  RefreshCw,
  Plus,
  Filter,
  Search,
  Clock,
  AlertCircle,
  Brain,
  Lightbulb,
  Tag,
  List as ListIcon,
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type InboxSourceType =
  'calendar' | 'email' | 'slack' | 'github' | 'manual' | 'integration';

interface SmartInboxItem {
  id: number;
  source: {
    id: number;
    user_id: number;
    source_type: InboxSourceType;
    external_id: string;
    title: string;
    description?: string;
    due_date?: string;
    priority: 'critical' | 'high' | 'medium' | 'low' | 'none';
    confidence: number;
    priority_score?: number;
    status: 'pending' | 'processing' | 'converted' | 'dismissed';
    metadata?: string;
    created_at: string;
    updated_at: string;
  };
  predicted_priority?: 'critical' | 'high' | 'medium' | 'low' | 'none';
  predicted_due_date?: string;
  suggested_labels?: string[];
  ai_reasoning?: string;
}

interface SmartInboxEnhancedProps {
  className?: string;
  lists?: Array<{ id: number; name: string; emoji: string }>;
  labels?: Array<{ id: number; name: string; color: string }>;
  onTaskCreated?: (taskId: number) => void;
}

const SOURCE_ICONS: Record<InboxSourceType, React.ReactNode> = {
  calendar: <Calendar className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  slack: <MessageSquare className="h-4 w-4" />,
  github: <GitBranch className="h-4 w-4" />,
  manual: <Plus className="h-4 w-4" />,
  integration: <RefreshCw className="h-4 w-4" />,
};

const SOURCE_NAMES: Record<InboxSourceType, string> = {
  calendar: 'Calendar',
  email: 'Email',
  slack: 'Slack',
  github: 'GitHub',
  manual: 'Manual',
  integration: 'Integration',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-200',
  high: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200',
  medium: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200',
  low: 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500',
  none: 'bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-200',
};

export function SmartInbox({
  className,
  lists = [],
  labels = [],
  onTaskCreated,
}: SmartInboxEnhancedProps) {
  const [items, setItems] = useState<SmartInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingBatch, setProcessingBatch] = useState(false);
  const [filter, setFilter] = useState<{
    sourceType?: InboxSourceType;
    priority?: string;
    search?: string;
    sortBy?: 'priority' | 'date' | 'confidence';
  }>({});
  const [selectedItem, setSelectedItem] = useState<SmartInboxItem | null>(null);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [autoTriageEnabled, setAutoTriageEnabled] = useState(true);

  // Fetch inbox items
  useEffect(() => {
    fetchInboxItems();
  }, [filter]);

  const fetchInboxItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.sourceType) params.set('sourceType', filter.sourceType);
      if (filter.priority) params.set('priority', filter.priority);
      if (filter.sortBy) params.set('sortBy', filter.sortBy);

      const response = await fetch(`/api/smart-inbox?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setItems(data.inbox?.items || []);
      } else {
        throw new Error('Failed to fetch inbox');
      }
    } catch (error) {
      toast.error('Failed to load smart inbox');
    } finally {
      setLoading(false);
    }
  };

  // Filter and search items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        if (!item.source.title.toLowerCase().includes(searchLower)) {
          if (
            item.source.description &&
            !item.source.description.toLowerCase().includes(searchLower)
          ) {
            return false;
          }
        }
      }
      return true;
    });
  }, [items, filter]);

  const handleConvert = async (item: SmartInboxItem) => {
    try {
      const taskData = {
        name: item.source.title,
        description: item.source.description,
        deadline: item.predicted_due_date || item.source.due_date,
        priority: item.predicted_priority || item.source.priority,
        list_id: 1,
        label_ids: (item.suggested_labels || []) as any,
        metadata: {
          from_smart_inbox: true,
          source_type: item.source.source_type,
        },
      };

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });

      if (response.ok) {
        const task = await response.json();
        toast.success(`Created task: "${taskData.name}"`);
        setItems(prev => prev.filter(i => i.id !== item.id));
        setShowConvertDialog(false);
        setSelectedItems(new Set());
        onTaskCreated?.(task.id);
      } else {
        throw new Error('Conversion failed');
      }
    } catch (error) {
      toast.error('Failed to convert item');
    }
  };

  const handleDismiss = async (item: SmartInboxItem) => {
    try {
      await fetch('/api/smart-inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dismiss',
          sourceId: item.id,
        }),
      });

      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch (error) {
      toast.error('Failed to dismiss item');
    }
  };

  const handleBulkConvert = async () => {
    if (selectedItems.size === 0) {
      toast.error('No items selected');
      return;
    }

    setProcessingBatch(true);
    try {
      for (const item of items.filter(i => selectedItems.has(i.id))) {
        await handleConvert(item);
      }
      toast.success(`Converted ${selectedItems.size} items to tasks`);
    } catch (error) {
      toast.error('Failed to convert items');
    } finally {
      setProcessingBatch(false);
    }
  };

  const handleBulkDismiss = async () => {
    if (selectedItems.size === 0) {
      toast.error('No items selected');
      return;
    }

    try {
      for (const item of items.filter(i => selectedItems.has(i.id))) {
        await handleDismiss(item);
      }
      toast.success(`Dismissed ${selectedItems.size} items`);
    } catch (error) {
      toast.error('Failed to dismiss items');
    }
  };

  const toggleSelectItem = (id: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const getDaysUntil = (date?: string): number => {
    if (!date) return 0;
    const target = new Date(date);
    const today = new Date();
    const diff = Math.ceil(
      (target.getTime() - today.getTime()) / (1000 * 1000 * 60 * 60 * 24)
    );
    return diff;
  };

  const getDueDateLabel = (date?: string): string => {
    if (!date) return 'No due date';

    const days = getDaysUntil(date);
    if (days < 0) return `Overdue by ${Math.abs(days)} days`;
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    if (days <= 7) return `Due in ${days} days`;
    return format(new Date(date), 'MMM d, yyyy');
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 50) return 'text-blue-600';
    if (confidence >= 30) return 'text-amber-600';
    return 'text-red-600';
  };

  const runAutoTriage = async () => {
    if (items.length === 0) return;

    try {
      const response = await fetch('/api/smart-inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'triage',
          itemIds: items.map(i => i.id),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.updates) {
          setItems(prev =>
            prev.map(item => {
              const update = data.updates.find((u: any) => u.id === item.id);
              return update ? { ...item, ...update } : item;
            })
          );
        }
      }
    } catch (error) {
      console.error('AutoTriage failed:', error);
    }
  };

  // Run auto-triage on load
  useEffect(() => {
    if (autoTriageEnabled && items.length > 0) {
      runAutoTriage();
    }
  }, [items, autoTriageEnabled]);

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Inbox className="h-5 w-5" />
                Smart Inbox
              </CardTitle>
              <CardDescription>
                AI-powered triage from calendar, emails, and other sources
              </CardDescription>
            </div>
            <Badge variant="secondary">
              <Brain className="h-3 w-3 mr-1" />
              AI Enhanced
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          {/* Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search..."
                className="h-8 w-64"
                value={filter.search || ''}
                onChange={e =>
                  setFilter(f => ({ ...f, search: e.target.value }))
                }
              />
              <Select
                value={filter.sourceType || ''}
                onValueChange={v =>
                  setFilter(f => ({
                    ...f,
                    sourceType: v as InboxSourceType | undefined,
                  }))
                }
              >
                <SelectTrigger className="h-8 w-[150px]">
                  <SelectValue placeholder="Filter by source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {(Object.keys(SOURCE_NAMES) as InboxSourceType[]).map(
                    type => (
                      <SelectItem key={type} value={type}>
                        {SOURCE_NAMES[type]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoTriageEnabled}
                  onChange={e => setAutoTriageEnabled(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span>Auto-Triage AI</span>
              </label>
              <span className="text-sm text-muted-foreground">
                {items.length} items
              </span>
              <Button variant="outline" size="sm" onClick={fetchInboxItems}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedItems.size > 0 && (
            <div className="mb-4 p-3 bg-muted/30 rounded-lg flex items-center gap-2">
              <span className="text-sm font-medium">
                {selectedItems.size} selected
              </span>
              <Button size="sm" onClick={handleBulkConvert}>
                <Check className="h-4 w-4 mr-1" /> Convert
              </Button>
              <Button size="sm" variant="outline" onClick={handleBulkDismiss}>
                <X className="h-4 w-4 mr-1" /> Dismiss
              </Button>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold">{items.length}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold">
                {
                  items.filter(
                    i =>
                      i.predicted_priority === 'high' ||
                      i.predicted_priority === 'critical'
                  ).length
                }
              </p>
              <p className="text-xs text-muted-foreground">High Priority</p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold">
                {
                  items.filter(
                    i =>
                      i.source.due_date && getDaysUntil(i.source.due_date) <= 3
                  ).length
                }
              </p>
              <p className="text-xs text-muted-foreground">Due Soon</p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold">
                {
                  items.filter(
                    i => i.suggested_labels && i.suggested_labels.length > 0
                  ).length
                }
              </p>
              <p className="text-xs text-muted-foreground">AI Suggested</p>
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 bg-muted/30 rounded animate-pulse"
                />
              ))}
            </div>
          ) : (
            <>
              {/* Empty State */}
              {filteredItems.length === 0 ? (
                <div className="text-center py-12">
                  <Inbox className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="font-medium mb-2">Smart Inbox is empty</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {autoTriageEnabled
                      ? 'Add tasks from calendar, emails, or other sources to see them here.'
                      : 'Enable AI auto-triage to enhance your inbox.'}
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      onClick={() => setAutoTriageEnabled(!autoTriageEnabled)}
                    >
                      {autoTriageEnabled ? 'Disable' : 'Enable'} AI Triage
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredItems.map(item => (
                    <Card
                      key={item.id}
                      className={cn(
                        'hover:shadow-sm transition-shadow',
                        selectedItems.has(item.id) && 'ring-2 ring-primary'
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedItems.has(item.id)}
                              onChange={() => toggleSelectItem(item.id)}
                              className="mt-1"
                            />
                            <div className="flex items-center justify-center w-10 h-10 bg-muted rounded-full">
                              {SOURCE_ICONS[item.source.source_type] || (
                                <AlertCircle className="h-4 w-4" />
                              )}
                            </div>
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">
                                {item.source.title}
                              </h4>
                              <Badge variant="outline" className="text-xs">
                                {SOURCE_NAMES[item.source.source_type]}
                              </Badge>
                              {item.predicted_priority &&
                                item.predicted_priority !== 'none' && (
                                  <Badge
                                    className={
                                      PRIORITY_COLORS[item.predicted_priority]
                                    }
                                  >
                                    {item.predicted_priority}
                                  </Badge>
                                )}
                              {item.source.confidence && (
                                <Badge variant="secondary" className="text-xs">
                                  Confidence: {item.source.confidence}%
                                </Badge>
                              )}
                            </div>

                            {item.source.description && (
                              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                {item.source.description}
                              </p>
                            )}

                            {/* AI Reasoning */}
                            {item.ai_reasoning && (
                              <div className="mb-2 p-2 bg-blue-50 rounded border-l-4 border-blue-200">
                                <div className="flex items-start gap-2">
                                  <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5" />
                                  <p className="text-xs text-blue-800">
                                    {item.ai_reasoning}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Suggested Labels */}
                            {item.suggested_labels &&
                              item.suggested_labels.length > 0 && (
                                <div className="flex items-center gap-1 mb-2">
                                  <Tag className="h-3 w-3 text-muted-foreground" />
                                  {item.suggested_labels
                                    .slice(0, 3)
                                    .map(label => (
                                      <Badge
                                        key={label}
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {label}
                                      </Badge>
                                    ))}
                                  {item.suggested_labels.length > 3 && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      +{item.suggested_labels.length - 3} more
                                    </Badge>
                                  )}
                                </div>
                              )}

                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>
                                {format(
                                  new Date(item.source.created_at),
                                  'MMM d, HH:mm'
                                )}
                              </span>
                              <span
                                className={getConfidenceColor(
                                  item.source.confidence || 50
                                )}
                              >
                                Confidence: {item.source.confidence || 50}%
                              </span>
                              {item.predicted_due_date && (
                                <span
                                  className={
                                    getDaysUntil(item.predicted_due_date) < 0
                                      ? 'text-red-600'
                                      : ''
                                  }
                                >
                                  {getDueDateLabel(item.predicted_due_date)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Convert Dialog */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Task</DialogTitle>
            <DialogDescription>
              Create a task from this smart inbox item with AI suggestions.
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Task Name</label>
                <Input
                  defaultValue={selectedItem.source.title}
                  id="task-name"
                />
              </div>

              {selectedItem.source.description && (
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    defaultValue={selectedItem.source.description}
                    rows={3}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Due Date</label>
                  <Input
                    type="date"
                    defaultValue={
                      selectedItem.predicted_due_date ||
                      selectedItem.source.due_date ||
                      ''
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <Select
                    defaultValue={
                      selectedItem.predicted_priority ||
                      selectedItem.source.priority
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        ['critical', 'high', 'medium', 'low', 'none'] as const
                      ).map(p => (
                        <SelectItem key={p} value={p}>
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedItem.suggested_labels &&
                selectedItem.suggested_labels.length > 0 && (
                  <div>
                    <label className="text-sm font-medium">Labels</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedItem.suggested_labels.map(label => (
                        <Badge key={label} variant="outline">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConvertDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedItem) handleConvert(selectedItem);
              }}
            >
              Convert with AI Suggestions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
