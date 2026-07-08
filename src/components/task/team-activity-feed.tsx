"use client";

import { useState, useEffect, useMemo } from "react";
import { Clock, User, CheckSquare, List, Tag, Share2, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TaskLog, User as UserType } from "@/types";

interface ActivityLog {
  id: number;
  user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number;
  details: string;
  created_at: string;
}

interface TeamActivityFeedProps {
  workspaceId?: number | null;
  className?: string;
}

interface TeamActivityFeedProps {
  workspaceId?: number | null;
  className?: string;
}

interface ActivityWithUser extends ActivityLog {
  user?: UserType;
}

const activityIcons: Record<string, React.ReactNode> = {
  task_created: <CheckSquare className="h-4 w-4" />,
  task_completed: <CheckSquare className="h-4 w-4" />,
  task_updated: <List className="h-4 w-4" />,
  task_deleted: <List className="h-4 w-4" />,
  task_assigned: <User className="h-4 w-4" />,
  label_created: <Tag className="h-4 w-4" />,
  label_updated: <Tag className="h-4 w-4" />,
  share_created: <Share2 className="h-4 w-4" />,
  comment_added: <MessageSquare className="h-4 w-4" />,
  default: <Clock className="h-4 w-4" />,
};

const activityLabels: Record<string, string> = {
  task_created: "Task created",
  task_completed: "Task completed",
  task_updated: "Task updated",
  task_deleted: "Task deleted",
  task_assigned: "Task assigned",
  label_created: "Label created",
  label_updated: "Label updated",
  share_created: "Task shared",
  comment_added: "Comment added",
};

function formatTimeAgo(date: string): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function TeamActivityFeed({ workspaceId, className }: TeamActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      setIsLoading(true);
      try {
        const params = workspaceId ? `?workspace_id=${workspaceId}` : "";
        const res = await fetch(`/api/activity${params}`);
        if (res.ok) {
          const data = await res.json();
          setActivities(data);
        }
      } catch (error) {
        console.error("Failed to fetch activities:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();

    // Poll for new activities every 30 seconds
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, [workspaceId]);

  const recentActivities = useMemo(() => {
    return activities.slice(0, 20);
  }, [activities]);

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-muted"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recentActivities.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="pt-6 text-center">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm text-muted-foreground">
            No recent activity. Start by creating or assigning some tasks!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="text-base">Team Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {recentActivities.map((activity) => {
            const Icon = activityIcons[activity.action] || activityIcons.default;
            const label = activityLabels[activity.action] || activity.action;
            const timeAgo = formatTimeAgo(activity.created_at);

            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 rounded-lg p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center">
                  {Icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {activity.user?.name || activity.user?.email.split('@')[0] || "Someone"}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 truncate">
                    {activity.details || activity.entity_type + " #" + activity.entity_id}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}