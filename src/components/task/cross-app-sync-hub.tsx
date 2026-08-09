"use client";

import {
  Database,
  ExternalLink,
  RefreshCw,
  Settings,
  Shield,
  CheckCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useExternalTasks } from "@/hooks/use-enhanced-productivity";

export function CrossAppSyncHub() {
  const { tasks, loading, convertToTask } = useExternalTasks();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">Loading external tasks...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sync Connections Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Your Integrations</CardTitle>
          <CardDescription>
            Connect with external task management services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <IntegrationCard
              name="Trello"
              icon={<Database className="h-5 w-5" />}
              status="connected"
              lastSync="2 hours ago"
            />
            <IntegrationCard
              name="Notion"
              icon={<ExternalLink className="h-5 w-5" />}
              status="disconnected"
              lastSync="Never"
            />
            <IntegrationCard
              name="Asana"
              icon={<Shield className="h-5 w-5" />}
              status="connected"
              lastSync="5 hours ago"
            />
          </div>

          <Button className="mt-4 w-full" variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Manage All Integrations
          </Button>
        </CardContent>
      </Card>

      {/* External Tasks Panel */}
      <Card>
        <CardHeader>
          <CardTitle>External Tasks</CardTitle>
          <CardDescription>
            Tasks found in connected services that need your attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tasks && tasks.length > 0 ? (
            <div className="space-y-3">
              {tasks.map(task => (
                <ExternalTaskCard
                  key={task.id}
                  task={task}
                  onConvert={() => convertToTask(task.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No pending external tasks</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface IntegrationCardProps {
  name: string;
  icon: React.ReactNode;
  status: "connected" | "disconnected";
  lastSync: string;
}

function IntegrationCard({ name, icon, status, lastSync }: IntegrationCardProps) {
  return (
    <Card className={`transition-all ${status === "connected" ? "border-green-200" : "border-muted"}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-medium">{name}</span>
            <Badge variant={status === "connected" ? "default" : "secondary"}>
              {status}
            </Badge>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mb-3">
          Last sync: {lastSync}
        </div>
        {status === "connected" ? (
          <Button size="sm" variant="ghost" className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync Now
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="w-full">
            Connect
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface ExternalTask {
  id: number;
  external_id: string;
  external_app_type: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  confidence: number;
  energy_cost_estimate: number;
  created_at: string;
}

interface ExternalTaskCardProps {
  task: ExternalTask;
  onConvert: () => void;
}

function ExternalTaskCard({ task, onConvert }: ExternalTaskCardProps) {
  const priorityColors: Record<string, string> = {
    critical: "bg-red-100 text-red-800",
    high: "bg-amber-100 text-amber-800",
    medium: "bg-blue-100 text-blue-800",
    low: "bg-green-100 text-green-800",
    none: "bg-gray-100 text-gray-800"
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-medium">{task.title}</h4>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        </div>
        <Badge className={priorityColors[task.priority] || "bg-gray-100"}>
          {task.priority}
        </Badge>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
        <span>From: {task.external_app_type}</span>
        <span>Confidence: {task.confidence}%</span>
        <span>Energy: {task.energy_cost_estimate}</span>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1">
          Dismiss
        </Button>
        <Button size="sm" onClick={onConvert} className="flex-1">
          Convert
        </Button>
      </div>
    </div>
  );
}