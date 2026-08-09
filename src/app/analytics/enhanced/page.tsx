"use client";

import { useState } from "react";
import {
  Brain,
  Battery,
  Lightbulb,
  CheckCircle,
  Users,
  ArrowLeft
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import {
  CognitiveLoadIndicator,
  EnergyBudgetWidget,
  CrossAppSyncHub,
  DecisionShadowTracker,
  MoodAdaptiveTaskViews
} from "@/components/task/enhanced-productivity-dashboard";
import { ProductivityDashboard } from "@/components/task/productivity-dashboard";
import { useTasks } from "@/hooks/use-tasks";

export default function EnhancedAnalyticsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const { tasks } = useTasks({
    initialTasks: [],
    initialLists: [],
    initialLabels: [],
  });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-purple-500" />
            Enhanced Productivity Hub
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered insights for optimal performance
          </p>
        </div>
        <Link href="/analytics">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Classic Analytics
          </Button>
        </Link>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <CognitiveLoadCard />
        <EnergyBudgetCard />
        <DecisionsCard />
        <SyncCard />
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="energy">Energy Planner</TabsTrigger>
          <TabsTrigger value="sync">Task Sync</TabsTrigger>
          <TabsTrigger value="decisions">Decision Journal</TabsTrigger>
          <TabsTrigger value="mood">Mood-Adaptive Views</TabsTrigger>
          <TabsTrigger value="analytics">Productivity Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <CognitiveLoadIndicator />
          <RecommendationsCard />
        </TabsContent>

        <TabsContent value="energy" className="space-y-4">
          <EnergyBudgetWidget />
          <EnergyProfileCard />
        </TabsContent>

        <TabsContent value="sync" className="space-y-4">
          <CrossAppSyncHub />
        </TabsContent>

        <TabsContent value="decisions" className="space-y-4">
          <DecisionShadowTracker />
        </TabsContent>

        <TabsContent value="mood" className="space-y-4">
          <MoodAdaptiveTaskViews tasks={tasks} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <ProductivityDashboard tasks={tasks} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Individual card components
function CognitiveLoadCard() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Cognitive Load</CardTitle>
        <Brain className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">Stable</div>
        <p className="text-xs text-muted-foreground">
          75% completion rate
        </p>
      </CardContent>
    </Card>
  );
}

function EnergyBudgetCard() {
  const balance = 78;
  const dailyLimit = 100;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Energy Budget</CardTitle>
        <Battery className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {balance}/{dailyLimit}
        </div>
        <Progress value={(balance / dailyLimit) * 100} className="mt-2" />
      </CardContent>
    </Card>
  );
}

function DecisionsCard() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Decisions Made</CardTitle>
        <Lightbulb className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">12</div>
        <p className="text-xs text-muted-foreground">
          Avg rating: 3.8/5
        </p>
      </CardContent>
    </Card>
  );
}

function SyncCard() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">External Sources</CardTitle>
        <Users className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">5</div>
        <p className="text-xs text-muted-foreground">
          Pending conversion
        </p>
      </CardContent>
    </Card>
  );
}

function RecommendationsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Recommendations</CardTitle>
        <CardDescription>
          Personalized suggestions based on your productivity patterns
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[
            "Focus on completing high-priority tasks during your peak energy hours (2-4 PM)",
            "Consider batching similar tasks to reduce cognitive switching costs",
            "Your completion rate is 15% higher on Tuesdays and Thursdays"
          ].map((rec, idx) => (
            <div key={idx} className="flex items-start space-x-3 p-3 bg-muted rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <p className="text-sm">{rec}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function EnergyProfileCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Energy Profile</CardTitle>
        <CardDescription>
          Customize your daily energy budget and peak times
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Wake Hour</p>
              <p className="text-lg">7:00</p>
            </div>
            <div>
              <p className="text-sm font-medium">Sleep Hour</p>
              <p className="text-lg">23:00</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Peak Energy Times</p>
            <div className="text-sm text-muted-foreground">
              09:00 - 11:00 • 14:00 - 16:00
            </div>
          </div>
          <Button>Configure Energy Profile</Button>
        </div>
      </CardContent>
    </Card>
  );
}