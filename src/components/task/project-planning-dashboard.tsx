"use client";

import { useState, useMemo } from "react";
import {
  FolderGit,
  Calendar,
  Badge,
  Progress,
  Briefcase,
  Settings,
  Play,
  RefreshCw,
  CheckCircle2,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, addDays, eachDayOfInterval, parseISO } from "date-fns";
import { toast } from "sonner";

interface ProjectPhase {
  id: number;
  name: string;
  description?: string;
  duration_days: number;
  priority: "critical" | "high" | "medium" | "low" | "none";
  start_date?: string;
  end_date?: string;
  completed: boolean;
}

interface ProjectPlan {
  id: number;
  name: string;
  description?: string;
  phases: ProjectPhase[];
  total_duration_days: number;
  created_at: string;
}

interface ProjectPlanningDashboardProps {
  projectName?: string;
  projectDescription?: string;
}

const priorityColors: Record<string, string> = {
  critical: "bg-red-500/10 text-red-700 dark:text-red-300",
  high: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  medium: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  low: "bg-green-500/10 text-green-700 dark:text-green-300",
  none: "bg-gray-500/10 text-gray-700 dark:text-gray-300",
};

export function ProjectPlanningDashboard({ projectName, projectDescription }: ProjectPlanningDashboardProps) {
  const [projects, setProjects] = useState<ProjectPlan[]>([]);
  const [activeProject, setActiveProject] = useState<ProjectPlan | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [deadline, setDeadline] = useState<string>("");
  const [availableHours, setAvailableHours] = useState<number>(8);
  const [localName, setLocalName] = useState(projectName || "");
  const [localDescription, setLocalDescription] = useState(projectDescription || "");

  // Generate a project plan from AI
  const generateProjectPlan = async () => {
    if (!localName.trim()) {
      toast.error("Project name is required");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "generateProjectPlan",
          input: {
            projectName: localName,
            description: localDescription,
            constraints: {
              startDate,
              deadline: deadline || undefined,
              availableHoursPerDay: availableHours,
            },
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newProject: ProjectPlan = {
          id: Date.now(),
          name: localName,
          description: localDescription,
          phases: data.phases.map((p: any, i: number) => ({
            id: i + 1,
            name: p.name,
            description: p.description,
            duration_days: p.duration_days || 30,
            priority: p.priority || "medium",
            completed: false,
          })),
          total_duration_days: data.total_duration_days || 90,
          created_at: new Date().toISOString(),
        };

        // Calculate dates for phases
        let currentStart = parseISO(startDate);
        newProject.phases.forEach(phase => {
          const endDate = addDays(currentStart, phase.duration_days);
          phase.start_date = format(currentStart, "yyyy-MM-dd");
          phase.end_date = format(endDate, "yyyy-MM-dd");
          currentStart = endDate;
        });

        setProjects(prev => [...prev, newProject]);
        setActiveProject(newProject);
        setShowCreateDialog(false);
        toast.success(`Project plan created with ${newProject.phases.length} phases`);
      } else {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Failed to generate plan");
      }
    } catch (error: any) {
      toast.error(`Failed to generate project plan: ${error.message || "Unknown error"}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Calculate project timeline
  const timeline = useMemo(() => {
    if (!activeProject) return [];

    const days = eachDayOfInterval({
      start: parseISO(startDate),
      end: addDays(parseISO(startDate), activeProject.total_duration_days),
    });

    return days.map(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const phase = activeProject.phases.find(p =>
        p.start_date && p.end_date &&
        new Date(p.start_date) <= day &&
        new Date(p.end_date) >= day
      );
      return { day, isCurrent: phase?.priority === "critical", phase };
    });
  }, [activeProject, startDate]);

  // Calculate progress
  const progress = useMemo(() => {
    if (!activeProject || activeProject.phases.length === 0) return 0;
    const completed = activeProject.phases.filter(p => p.completed).length;
    return Math.round((completed / activeProject.phases.length) * 100);
  }, [activeProject]);

  // Reset form when dialog opens
  const handleOpenDialog = () => {
    setLocalName(projectName || "");
    setLocalDescription(projectDescription || "");
    setStartDate(new Date().toISOString().split("T")[0]);
    setDeadline("");
    setAvailableHours(8);
    setShowCreateDialog(true);
  };

  if (!activeProject) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderGit className="h-5 w-5" />
              Project Planning Dashboard
            </CardTitle>
            <CardDescription>
              Create and manage project plans with AI-generated phase breakdowns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h4 className="font-medium mb-2">No active project</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Create a project plan to get started with structured project management
              </p>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button onClick={handleOpenDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Project Plan
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Create New Project Plan</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Project Name</Label>
                      <Input
                        placeholder="e.g., Q3 Marketing Campaign"
                        value={localName}
                        onChange={(e) => setLocalName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        placeholder="What's this project about? Any key requirements or constraints?"
                        value={localDescription}
                        onChange={(e) => setLocalDescription(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Deadline</Label>
                        <Input
                          type="date"
                          value={deadline}
                          onChange={(e) => setDeadline(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Hours/Day</Label>
                        <Input
                          type="number"
                          min={1}
                          max={12}
                          value={availableHours}
                          onChange={(e) => setAvailableHours(parseInt(e.target.value) || 8)}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={generateProjectPlan} disabled={isGenerating}>
                        {isGenerating ? "Generating..." : "Generate Plan"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active Project Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderGit className="h-5 w-5" />
                {activeProject.name}
              </CardTitle>
              <CardDescription className="mt-1">
                {activeProject.description || "No description"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={activeProject.phases.some(p => p.priority === "critical") ? "destructive" : "default"}>
                {activeProject.total_duration_days} days
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Project Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{activeProject.phases.filter(p => p.completed).length}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{activeProject.phases.filter(p => p.priority === "critical").length}</p>
              <p className="text-xs text-muted-foreground">Critical</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{activeProject.total_duration_days}</p>
              <p className="text-xs text-muted-foreground">Total Days</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phases List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Project Phases
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activeProject.phases.map((phase, index) => (
              <div
                key={phase.id}
                className="border rounded-lg p-3 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={priorityColors[phase.priority]}>
                        {phase.priority}
                      </Badge>
                      <h4 className="font-medium">{phase.name}</h4>
                      {index === 0 && (
                        <Badge variant="outline" className="text-xs">
                          Phase {index + 1}
                        </Badge>
                      )}
                    </div>
                    {phase.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {phase.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Duration: {phase.duration_days} days</span>
                      {phase.start_date && (
                        <span>
                          {format(parseISO(phase.start_date), "MMM d")} - {format(parseISO(phase.end_date!), "MMM d")}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant={phase.completed ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const updated = {
                        ...activeProject,
                        phases: activeProject.phases.map(p =>
                          p.id === phase.id ? { ...p, completed: !p.completed } : p
                        ),
                      };
                      setActiveProject(updated);
                      setProjects(prev => prev.map(p =>
                        p.id === activeProject.id ? updated : p
                      ));
                    }}
                  >
                    {phase.completed ? <CheckCircle2 className="h-4 w-4" /> : "Mark Complete"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Timeline View */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Project Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-1 mb-4">
            {timeline.map((item, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full ${
                  item.isCurrent ? 'bg-red-500' : item.phase ? 'bg-blue-500' : 'bg-gray-300'
                }`}
                title={item.phase?.name || format(item.day, "yyyy-MM-dd")}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Timeline view: Red = Critical phases, Blue = Other phases, Gray = Not yet scheduled
          </p>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => {
          const updated = {
            ...activeProject,
            phases: activeProject.phases.map(p => ({ ...p, completed: false })),
          };
          setActiveProject(updated);
          setProjects(prev => prev.map(p => p.id === activeProject.id ? updated : p));
        }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset Progress
        </Button>
        <Button variant="outline">
          <Play className="h-4 w-4 mr-2" />
          Export to Tasks
        </Button>
        <Button>
          <Calendar className="h-4 w-4 mr-2" />
          Schedule in Calendar
        </Button>
      </div>
    </div>
  );
}