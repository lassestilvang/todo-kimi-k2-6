"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  Clock,
  TrendingUp,
  Target,
  Zap,
  Activity,
  BarChart3,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TaskDNA {
  taskId: number;
  complexity: number;
  cognitiveLoad: number;
  estimatedTime: number;
  requiredEnergy: number;
  bestTimeSlot: string;
  personaMatch: number;
  dnaTags: string[];
}

interface TaskDNAViewProps {
  task: {
    id: number;
    name: string;
    description?: string;
    priority?: string;
    estimate?: string;
  };
  dna?: TaskDNA;
  isLoading?: boolean;
}

export function TaskDNAView({ task, dna, isLoading }: TaskDNAViewProps) {
  const getColorForLevel = (level: number) => {
    if (level >= 0.8) return "text-green-600";
    if (level >= 0.5) return "text-amber-600";
    return "text-red-600";
  };

  const getTagColor = (tag: string) => {
    const colors: Record<string, string> = {
      complex: "bg-purple-100 text-purple-800",
      simple: "bg-blue-100 text-blue-800",
      high_cognitive: "bg-red-100 text-red-800",
      low_cognitive: "bg-green-100 text-green-800",
      long_session: "bg-orange-100 text-orange-800",
      short_session: "bg-cyan-100 text-cyan-800",
      urgent: "bg-red-100 text-red-800",
      not_urgent: "bg-gray-100 text-gray-800",
      has_dependencies: "bg-yellow-100 text-yellow-800",
      independent: "bg-green-100 text-green-800"
    };
    return colors[tag] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3" />
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded w-5/6" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!dna) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Task DNA not analyzed yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            <span>Task DNA Analysis</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Task Header */}
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{task.name}</h3>
              <Badge
                variant={task.priority === "critical" ? "destructive" :
                  task.priority === "high" ? "default" :
                  task.priority === "medium" ? "secondary" : "outline"}
              >
                {task.priority}
              </Badge>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Complexity */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Complexity</span>
                        <span className={getColorForLevel(dna.complexity)}>
                          {(dna.complexity * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={dna.complexity * 100} className="h-2" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Based on dependencies, description length, and features</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Cognitive Load */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Cognitive Load</span>
                        <span className={getColorForLevel(dna.cognitiveLoad)}>
                          {(dna.cognitiveLoad * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={dna.cognitiveLoad * 100} className="h-2" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Based on priority score and task type</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Time Estimation */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Est. Time</span>
                        <span className="font-medium">
                          {Math.round(dna.estimatedTime / 60)}h {dna.estimatedTime % 60}m
                        </span>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Estimated duration based on task complexity and history</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Persona Match */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Persona Match</span>
                        <span className={cn(
                          dna.personaMatch >= 80 ? "text-green-600" :
                          dna.personaMatch >= 60 ? "text-amber-600" : "text-red-600"
                        )}>
                          {dna.personaMatch}%
                        </span>
                      </div>
                      <Progress value={dna.personaMatch} className="h-2" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Match percentage with your productivity persona</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Tags */}
            <div>
              <span className="text-xs text-muted-foreground mb-2 block">DNA Tags</span>
              <div className="flex flex-wrap gap-2">
                {dna.dnaTags.map((tag) => (
                  <Badge key={tag} className={getTagColor(tag)}>
                    {tag.replace("_", " ")}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Best Time Slot */}
            <div className="pt-3 border-t">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Recommended Time:</span>
                <Badge variant="outline">{dna.bestTimeSlot}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * Persona Match Dashboard component
 */
interface PersonaMatchDashboardProps {
  tasks: Array<{
    id: number;
    name: string;
    dna: TaskDNA;
  }>;
}

export function PersonaMatchDashboard({ tasks }: PersonaMatchDashboardProps) {
  const [sortBy, setSortBy] = useState<"match" | "complexity" | "time">("match");

  const sortedTasks = [...tasks].sort((a, b) => {
    switch (sortBy) {
      case "complexity":
        return b.dna.complexity - a.dna.complexity;
      case "time":
        return a.dna.estimatedTime - b.dna.estimatedTime;
      case "match":
      default:
        return b.dna.personaMatch - a.dna.personaMatch;
    }
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            <span>Task Matching</span>
          </CardTitle>
          <Select value={sortBy} onValueChange={setSortBy as any}>
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="match">Best Match</SelectItem>
              <SelectItem value="complexity">Complexity</SelectItem>
              <SelectItem value="time">Est. Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedTasks.map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="space-y-1">
                <div className="font-medium">{task.name}</div>
                <div className="text-xs text-muted-foreground flex gap-3">
                  <span>Complexity: {(task.dna.complexity * 100).toFixed(0)}%</span>
                  <span>Time: ~{Math.round(task.dna.estimatedTime / 60)}h</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-medium">
                  Match: {task.dna.personaMatch}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {task.dna.bestTimeSlot}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}