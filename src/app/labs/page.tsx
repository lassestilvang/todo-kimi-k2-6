"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Brain,
  TestTube,
  Calculator,
  Zap,
  Smile,
  BarChart3,
  LayoutDashboard,
  Calendar,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeProvider } from "@/components/theme-provider";

// Import our new components
import { TaskFlowLabs } from "@/components/task/taskflow-labs";
import { EnergyScheduler } from "@/components/task/energy-scheduler";
import { TaskSuccessStories } from "@/components/task/task-success-stories";
import { SkillsGrowthTracker } from "@/components/task/skills-growth-tracker";

type ActiveLab = "ai" | "skills" | "energy" | "stories";

export default function LabsPage() {
  const [activeLab, setActiveLab] = useState<ActiveLab>("ai");

  const labs = [
    { id: "ai" as ActiveLab, name: "AI Playground", icon: Brain, description: "Compare AI models on task parsing" },
    { id: "skills" as ActiveLab, name: "Skills Tracker", icon: Calculator, description: "Track skill development" },
    { id: "energy" as ActiveLab, name: "Energy Scheduler", icon: Zap, description: "Optimize task timing" },
    { id: "stories" as ActiveLab, name: "Success Stories", icon: Smile, description: "Reflect on completed tasks" },
  ];

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        {/* Header */}
        <div className="bg-card border-b">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <Brain className="h-8 w-8 text-purple-500" />
                  TaskFlow Labs
                </h1>
                <p className="text-muted-foreground mt-1">
                  Experiment with AI-powered productivity features
                </p>
              </div>
              <Link href="/analytics">
                <Button variant="ghost" size="sm">
                  <LayoutDashboard className="h-4 w-4 mr-1" />
                  View Analytics
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Lab Navigation */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Choose a Lab</CardTitle>
              <CardDescription>
                Experiment with different AI-powered productivity tools
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {labs.map((lab) => {
                  const Icon = lab.icon;
                  return (
                    <Button
                      key={lab.id}
                      variant={activeLab === lab.id ? "default" : "outline"}
                      className="justify-start h-auto py-3"
                      onClick={() => setActiveLab(lab.id)}
                    >
                      <Icon className="h-5 w-5 mr-2" />
                      <div className="text-left">
                        <div className="font-medium">{lab.name}</div>
                        <div className="text-xs opacity-80">{lab.description}</div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Lab Content */}
          {activeLab === "ai" && <TaskFlowLabs />}

          {activeLab === "skills" && (
            <SkillsGrowthTracker tasks={[
              { id: 1, name: "Design task", completed: true, completed_at: new Date().toISOString(), labels: [{ name: "design" }] },
              { id: 2, name: "Code feature", completed: true, completed_at: new Date().toISOString(), description: "Implement user authentication" },
              { id: 3, name: "Write documentation", completed: true, completed_at: new Date().toISOString(), description: "Create user guide" },
            ]} />
          )}

          {activeLab === "energy" && (
            <EnergyScheduler tasks={[
              { id: 1, name: "Morning task", priority: "high", estimated_duration: 45, date: new Date().toISOString().split("T")[0] },
              { id: 2, name: "Afternoon work", priority: "medium", estimated_duration: 60 },
            ]} />
          )}

          {activeLab === "stories" && (
            <TaskSuccessStories
              task={{
                id: 1,
                name: "Sample Task",
                completed: true,
                completed_at: new Date().toISOString(),
              }}
            />
          )}
        </div>

        {/* Footer */}
        <footer className="border-t py-8">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <p className="text-muted-foreground mb-4">
              TaskFlow Labs is a playground for experimenting with AI-powered productivity features.
              Results are stored locally and not shared with third parties.
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <span>v0.1.0</span>
              <span>•</span>
              <Link href="https://github.com" className="hover:text-foreground">
                <RefreshCw className="h-4 w-4" />
              </Link>
              <span>•</span>
              <Link href="/labs/ai-parsing">
                <Button variant="ghost" size="sm">
                  AI Parsing
                </Button>
              </Link>
              <Link href="/labs/project-planning">
                <Button variant="ghost" size="sm">
                  Project Planner
                </Button>
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </ThemeProvider>
  );
}