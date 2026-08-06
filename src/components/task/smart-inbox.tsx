"use client";

import { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { format } from "date-fns";

type InboxSourceType = "calendar" | "email" | "slack" | "github" | "manual" | "integration";

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
    priority: "critical" | "high" | "medium" | "low" | "none";
    confidence: number;
    status: "pending" | "processing" | "converted" | "dismissed";
    metadata?: Record<string, any>;
    created_at: string;
    updated_at: string;
  };
  priority_score: number;
}

interface SmartInboxProps {
  className?: string;
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
  calendar: "Calendar",
  email: "Email",
  slack: "Slack",
  github: "GitHub",
  manual: "Manual",
  integration: "Integration",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-200",
  high: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200",
  medium: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200",
  low: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-200",
  none: "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-200",
};

export function SmartInbox({ className }: SmartInboxProps) {
  const [items, setItems] = useState<SmartInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{
    sourceType?: InboxSourceType;
    priority?: string;
    search?: string;
  }>({});
  const [selectedItem, setSelectedItem] = useState<SmartInboxItem | null>(null);
  const [showConvertDialog, setShowConvertDialog] = useState(false);

  // Fetch inbox items
  useEffect(() => {
    fetchInboxItems();
  }, [filter]);

  const fetchInboxItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.sourceType) params.set("sourceType", filter.sourceType);
      if (filter.priority) params.set("priority", filter.priority);

      const response = await fetch(`/api/smart-inbox?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setItems(data.inbox?.items || []);
      } else {
        throw new Error("Failed to fetch inbox");
      }
    } catch (error) {
      toast.error("Failed to load smart inbox");
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
          if (item.source.description && !item.source.description.toLowerCase().includes(searchLower)) {
            return false;
          }
        }
      }
      return true;
    });
  }, [items, filter]);

  const handleConvert = async (item: SmartInboxItem) => {
    try {
      const response = await fetch("/api/smart-inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "convert",
          sourceId: item.id,
        }),
      });

      if (response.ok) {
        toast.success(`Converted "${item.source.title}" to a task`);
        setItems(prev => prev.filter(i => i.id !== item.id));
        setShowConvertDialog(false);
      } else {
        throw new Error("Conversion failed");
      }
    } catch (error) {
      toast.error("Failed to convert item");
    }
  };

  const handleDismiss = async (item: SmartInboxItem) => {
    try {
      await fetch("/api/smart-inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "dismiss",
          sourceId: item.id,
        }),
      });

      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch (error) {
      toast.error("Failed to dismiss item");
    }
  };

  const handleBulkConvert = async () => {
    const selectedIds = filteredItems
      .filter(i => {
        // In real implementation, track selected items
        return true;
      })
      .map(i => i.id);

    if (selectedIds.length === 0) {
      toast.error("No items selected");
      return;
    }

    try {
      const response = await fetch("/api/smart-inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulkConvert",
          sourceIds: selectedIds,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Converted ${data.result.created} items`);
        fetchInboxItems();
      } else {
        throw new Error("Bulk conversion failed");
      }
    } catch (error) {
      toast.error("Failed to convert items");
    }
  };

  const getDaysUntil = (date?: string): number => {
    if (!date) return 0;
    const target = new Date(date);
    const today = new Date();
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getDueDateLabel = (date?: string): string => {
    if (!date) return "No due date";

    const days = getDaysUntil(date);
    if (days < 0) return `Overdue by ${Math.abs(days)} days`;
    if (days === 0) return "Due today";
    if (days === 1) return "Due tomorrow";
    if (days <= 7) return `Due in ${days} days`;
    return format(new Date(date), "MMM d, yyyy");
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            Smart Inbox
          </CardTitle>
          <CardDescription>
            Tasks from calendar, emails, and other sources
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search..."
                className="h-8 w-64"
                value={filter.search || ""}
                onChange={(e) => setFilter(f => ({ ...f, search: e.target.value }))}
              />
              <Select
                value={filter.sourceType || ""}
                onValueChange={(v) => setFilter(f => ({ ...f, sourceType: v as InboxSourceType | undefined }))}
              >
                <SelectTrigger className="h-8 w-[150px]">
                  <SelectValue placeholder="Filter by source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {(Object.keys(SOURCE_NAMES) as InboxSourceType[]).map(type => (
                    <SelectItem key={type} value={type}>
                      {SOURCE_NAMES[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {items.length} items
              </span>
              <Button variant="outline" size="sm" onClick={fetchInboxItems}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold">{items.length}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold">
                {items.filter(i => i.priority_score > 70).length}
              </p>
              <p className="text-xs text-muted-foreground">High Priority</p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold">
                {items.filter(i => i.source.due_date && getDaysUntil(i.source.due_date) <= 3).length}
              </p>
              <p className="text-xs text-muted-foreground">Due Soon</p>
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-muted/30 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* Empty State */}
              {filteredItems.length === 0 ? (
                <div className="text-center py-12">
                  <Inbox className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="font-medium mb-2">No items in smart inbox</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Connect your calendar, email, or other sources to see tasks here.
                  </p>
                  <Button onClick={() => {/* Open connection dialog */}}>
                    Connect Sources
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredItems.map(item => (
                    <Card key={item.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="flex items-center justify-center w-10 h-10 bg-muted rounded-full">
                              {SOURCE_ICONS[item.source.source_type] || <AlertCircle className="h-4 w-4" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">{item.source.title}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {SOURCE_NAMES[item.source.source_type]}
                                </Badge>
                                {item.source.priority !== "none" && (
                                  <Badge className={PRIORITY_COLORS[item.source.priority]}>
                                    {item.source.priority}
                                  </Badge>
                                )}
                              </div>
                              {item.source.description && (
                                <p className="text-sm text-muted-foreground mb-2">
                                  {item.source.description}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>{format(new Date(item.source.created_at), "MMM d, HH:mm")}</span>
                                <span>Confidence: {item.source.confidence}%</span>
                                {item.source.due_date && (
                                  <span className={getDaysUntil(item.source.due_date) < 0 ? "text-red-600" : ""}>
                                    {getDueDateLabel(item.source.due_date)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              Score: {item.priority_score}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger>
                                <Button variant="ghost" size="sm">
                                  <X className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => {
                                  setSelectedItem(item);
                                  setShowConvertDialog(true);
                                }}>
                                  <Check className="h-4 w-4 mr-2" />
                                  Convert to Task
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDismiss(item)}>
                                  <X className="h-4 w-4 mr-2" />
                                  Dismiss
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDismiss(item)}>
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
              Create a task from this smart inbox item. The item will be removed after conversion.
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Task Name</label>
                <Input defaultValue={selectedItem.source.title} id="task-name" />
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
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConvertDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              if (selectedItem) handleConvert(selectedItem);
            }}>
              Convert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}