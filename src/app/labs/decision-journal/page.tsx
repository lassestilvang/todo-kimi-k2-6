"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Brain,
  RotateCcw,
  BarChart3,
  History,
  Lightbulb,
  Award,
  CheckCircle,
  AlertCircle,
  Plus,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DecisionTracker } from "@/components/task/decision-tracker";
import { DecisionAnalytics } from "@/components/task/decision-analytics";
import { DecisionTemplateBuilder } from "@/components/task/decision-template-builder";
import { useSession } from "next-auth/react";

export default function DecisionJournalPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [taskId, setTaskId] = useState<number | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading" || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Fetch a recent task to associate with decisions
  useEffect(() => {
    fetch("/api/tasks?limit=1")
      .then(r => r.json())
      .then(data => {
        if (data.tasks?.length > 0) {
          setTaskId(data.tasks[0].id);
        }
      })
      .catch(console.error);
  }, []);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Decision Journal</h1>
          <p className="text-muted-foreground">
            Track your decisions, analyze outcomes, and improve your decision-making over time
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              // Refresh analytics
              handleRefresh();
            }}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => {
              // Open new decision dialog
              const event = new CustomEvent("openDecisionDialog");
              window.dispatchEvent(event);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Decision
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Decisions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">42</p>
            <p className="text-xs text-muted-foreground">+12 this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Avg Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">0.78</p>
            <p className="text-xs text-muted-foreground">+0.12 from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Decision Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">4.2</p>
            <p className="text-xs text-muted-foreground">decisions/day</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">68%</p>
            <p className="text-xs text-muted-foreground">positive outcomes</p>
          </CardContent>
        </Card>
      </div>

      {/* Decision Journal Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Decisions</h2>
        <DecisionTracker taskId={taskId} />
      </div>

      {/* Analytics Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Analytics & Insights</h2>
        <DecisionAnalytics taskId={taskId} />
      </div>

      {/* Decision Templates */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Decision Templates
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Templates</CardTitle>
              <CardDescription>AI-generated templates for common decisions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {[
                  { type: "priority", desc: "Decide task priority based on deadline and impact" },
                  { type: "approach", desc: "Choose the best approach for problem solving" },
                  { type: "tool", desc: "Select the right tool for the job" },
                  { type: "timeline", desc: "Estimate realistic timelines" },
                ].map(item => (
                  <div key={item.type} className="p-3 border rounded-lg">
                    <h4 className="font-medium text-sm">{item.desc}</h4>
                    <Button size="sm" variant="link" className="p-0">
                      Use template
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Improvement Insights</CardTitle>
              <CardDescription>Based on your decision patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-amber-50/50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm">Timeline decisions need improvement</h4>
                    <p className="text-sm text-muted-foreground">
                      Your timeline decisions have a lower success rate. Consider adding buffer time.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-green-50/50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm">Priority decisions are excellent</h4>
                    <p className="text-sm text-muted-foreground">
                      Your priority decisions are well-reasoned. Keep up the good work!
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}