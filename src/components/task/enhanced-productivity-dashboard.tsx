"use client";

import { useState, useEffect } from "react";
import {
  Brain,
  Battery,
  Lightbulb,
  Calendar,
  Settings,
  RefreshCw,
  Heart,
  Target,
  Clock,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Activity
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCognitiveLoad,
  useEnergyBudget,
  useExternalTasks,
  useDecisionShadow,
  useMoodTracking
} from "@/hooks/use-enhanced-productivity";
import { format } from "date-fns";

// Re-export components for centralized imports
export { CognitiveLoadIndicator } from "./cognitive-load-indicator";
export { EnergyBudgetWidget } from "./energy-budget-widget";
export { CrossAppSyncHub } from "./cross-app-sync-hub";
export { DecisionShadowTracker } from "./decision-shadow-tracker";
export { MoodAdaptiveTaskViews } from "./mood-adaptive-task-views";

interface EnhancedProductivityDashboardProps {
  className?: string;
}

export function EnhancedProductivityDashboard({ className }: EnhancedProductivityDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const cognitiveLoad = useCognitiveLoad();
  const energyBudget = useEnergyBudget();
  const externalTasks = useExternalTasks();
  const decisionShadow = useDecisionShadow();

  // Log cognitive load on component mount
  useEffect(() => {
    const logDefaultLoad = async () => {
      await cognitiveLoad.logLoad({
        taskCount: 5,
        completedCount: 3,
        focusBlocks: 2,
        interruptionCount: 1,
        avgTimePerTask: 30
      });
    };
    logDefaultLoad();
  }, []);

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Cognitive Load Indicator */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cognitive Load</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cognitiveLoad.analysis?.loadTrend === "stable" ? "Stable" :
               cognitiveLoad.analysis?.loadTrend === "increasing" ? "Rising" : "Falling"}
            </div>
            <p className="text-xs text-muted-foreground">
              {cognitiveLoad.analysis?.completionRate !== undefined &&
                `${Math.round(cognitiveLoad.analysis.completionRate * 100)}% completion rate`}
            </p>
          </CardContent>
        </Card>

        {/* Energy Budget */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Energy Budget</CardTitle>
            <Battery className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {energyBudget.budget?.balance ?? 100}/{energyBudget.budget?.dailyLimit ?? 100}
            </div>
            <Progress value={(energyBudget.budget?.balance ?? 100) / (energyBudget.budget?.dailyLimit ?? 100) * 100} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {energyBudget.budget?.percentageUsed ?? 0}% used today
            </p>
          </CardContent>
        </Card>

        {/* Decisions Made */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Decisions Made</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {decisionShadow.analysis?.totalDecisions ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg rating: {decisionShadow.analysis?.avgOutcomeRating?.toFixed(1) ?? "N/A"}
            </p>
          </CardContent>
        </Card>

        {/* External Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">External Sources</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {externalTasks.tasks?.length ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Pending conversion</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="energy">Energy Planner</TabsTrigger>
          <TabsTrigger value="sync">Task Sync</TabsTrigger>
          <TabsTrigger value="decisions">Decision Journal</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Recommendations</CardTitle>
              <CardDescription>
                Personalized suggestions based on your productivity patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cognitiveLoad.analysis?.recommendations?.map((rec: string, idx: number) => (
                  <div key={idx} className="flex items-start space-x-3 p-3 bg-muted rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <p className="text-sm">{rec}</p>
                  </div>
                ))}
                {!cognitiveLoad.analysis?.recommendations && (
                  <p className="text-muted-foreground">Load more data for recommendations</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Today's Focus</CardTitle>
              <CardDescription>
                Tasks optimized for your current energy level
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {decisionShadow.analysis?.patternAnalysis?.map((pattern: { pattern: string; recommendation: string }, idx: number) => (
                  <div key={idx} className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-medium">{pattern.pattern}</p>
                      <p className="text-sm text-muted-foreground">{pattern.recommendation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="energy">
          <Card>
            <CardHeader>
              <CardTitle>Energy Profile Settings</CardTitle>
              <CardDescription>
                Customize your energy levels and daily budget
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Wake Hour</p>
                    <p className="text-lg">{energyBudget.profile?.wake_hour ?? 7}:00</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Sleep Hour</p>
                    <p className="text-lg">{energyBudget.profile?.sleep_hour ?? 23}:00</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Daily Energy Budget</p>
                  <Progress value={(energyBudget.budget?.balance ?? 100) / (energyBudget.budget?.dailyLimit ?? 100) * 100} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{energyBudget.budget?.balance ?? 100} points used</span>
                    <span>{energyBudget.budget?.dailyLimit ?? 100} points budget</span>
                  </div>
                </div>

                <Button>Configure Energy Profile</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync">
          <Card>
            <CardHeader>
              <CardTitle>External Task Sources</CardTitle>
              <CardDescription>
                Convert external tasks from other apps
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {externalTasks.tasks && externalTasks.tasks.length > 0 ? (
                  externalTasks.tasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{task.title}</p>
                        <p className="text-sm text-muted-foreground">
                          From: {task.external_app_type} • Confidence: {task.confidence}%
                        </p>
                      </div>
                      <Button onClick={() => externalTasks.convertToTask(task.id)}>
                        Convert to Task
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No pending external tasks</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="decisions">
          <Card>
            <CardHeader>
              <CardTitle>Decision Analysis</CardTitle>
              <CardDescription>
                Review your decision patterns and outcomes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{decisionShadow.analysis?.totalDecisions ?? 0}</p>
                    <p className="text-sm text-muted-foreground">Total Decisions</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">
                      {Math.round(decisionShadow.analysis?.avgOutcomeRating ?? 0)}/5
                    </p>
                    <p className="text-sm text-muted-foreground">Avg Rating</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Decision Pattern Insights</h4>
                  {decisionShadow.analysis?.patternAnalysis?.map((p: { pattern: string; recommendation: string }, idx: number) => (
                    <div key={idx} className="border-l-2 border-purple-200 pl-4 mb-3">
                      <p className="font-medium">{p.pattern}</p>
                      <p className="text-sm text-muted-foreground">{p.recommendation}</p>
                    </div>
                  ))}
                  {!decisionShadow.analysis?.patternAnalysis && (
                    <p className="text-muted-foreground">No pattern data yet</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}