"use client";

import { useState, useEffect, useMemo } from "react";
import {
  UserCheck,
  TrendingUp,
  BookOpen,
  Award,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { toast } from "sonner";

interface Skill {
  id: number;
  user_id: number;
  skill_name: string;
  proficiency_level: number; // 1-5
  evidence_task_ids: string | null; // JSON array
  last_used_at: string | null;
  created_at: string;
}

interface Task {
  id: number;
  name: string;
  completed: boolean;
  completed_at: string | null;
  description?: string | null;
  labels?: Array<{ name: string }>;
}

interface SkillsGrowthTrackerProps {
  tasks?: Task[];
}

interface SkillRecommendation {
  skill_name: string;
  recommended: boolean;
  reason: string;
}

interface CareerPath {
  role: string;
  matchScore: number;
  requiredSkills: string[];
  yourSkills: number;
}

const skillKeywords: Record<string, string[]> = {
  "design": ["design", "ui", "ux", "interface", "prototype", "mockup", "wireframe"],
  "development": ["code", "develop", "server", "api", "backend", "frontend", "implement", "feature"],
  "research": ["research", "analyze", "study", "investigate", "survey", "data analysis"],
  "writing": ["write", "document", "content", "copy", "blog", "article", "report"],
  "leadership": ["lead", "manage", "team", "coordinate", "organize", "mentor", "guide"],
  "planning": ["plan", "schedule", "organize", "strategy", "roadmap", "timeline"],
  "communication": ["email", "present", "meeting", "call", "discuss", "talks"],
  "problem-solving": ["debug", "fix", "solve", "troubleshoot", "issue", "bug"],
  "marketing": ["campaign", "promote", "advert", "seo", "social", "growth"],
  "sales": ["sell", "pitch", "demo", "client", "customer", "proposal"],
  "finance": ["budget", "cost", "invoice", "payment", "pricing", "financial"],
  "project-management": ["project", "milestone", "deliverable", "scope", "deadline"],
  "analytical": ["analyze", "metrics", "kpi", "report", "insight", "data"],
  "creative": ["create", "brainstorm", "innovate", "concept", "idea"],
  "technical": ["setup", "configure", "deploy", "integration", "automation"],
};

export function SkillsGrowthTracker({ tasks = [] }: SkillsGrowthTrackerProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [collapsedSkills, setCollapsedSkills] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Extract skills from completed tasks
  const extractedSkills = useMemo(() => {
    const skillCounts: Record<string, { count: number; tasks: number[] }> = {};

    tasks
      .filter(t => t.completed && t.completed_at)
      .forEach(task => {
        const taskName = task.name.toLowerCase();
        const taskDesc = ((task as any).description || "").toLowerCase();
        const combined = `${taskName} ${taskDesc}`;

        Object.entries(skillKeywords).forEach(([skill, keywords]) => {
          if (keywords.some(k => combined.includes(k))) {
            if (!skillCounts[skill]) {
              skillCounts[skill] = { count: 0, tasks: [] };
            }
            skillCounts[skill].count++;
            skillCounts[skill].tasks.push(task.id);
          }
        });
      });

    return {
      skills: Object.entries(skillCounts).map(([name, data], index) => ({
        id: `${name}-${index}`,
        name,
        proficiency: Math.min(5, Math.floor(data.count / 2) + 1),
        tasks: data.tasks,
        lastCompleted: tasks
          .filter(t => t.completed && data.tasks.includes(t.id))
          .sort((a, b) => {
            const aDate = a.completed_at ? new Date(a.completed_at).getTime() : 0;
            const bDate = b.completed_at ? new Date(b.completed_at).getTime() : 0;
            return bDate - aDate;
          })[0]?.completed_at,
      })),
      skillCounts,
    };
  }, [tasks]);

  // Calculate progress metrics
  const progressMetrics = useMemo(() => {
    const { skillCounts } = extractedSkills;
    const completedTasks = tasks.filter(t => t.completed).length;
    const totalTasks = tasks.length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Skill diversity
    const uniqueSkills = Object.keys(skillKeywords);
    const skillsCovered = Object.keys(skillCounts).length;

    return {
      completionRate,
      totalCompleted: completedTasks,
      skillsDiscovered: skillsCovered,
      totalPossibleSkills: uniqueSkills.length,
      skillDiversity: skillsCovered / uniqueSkills.length,
    };
  }, [tasks, extractedSkills]);

  // Generate skill recommendations
  const recommendations = useMemo(() => {
    const recommendations: string[] = [];

    // Based on current skill level
    if (progressMetrics.completionRate > 70) {
      recommendations.push("Try tackling a new skill area to broaden your expertise");
    }

    // Based on streak
    const recentTasks = tasks
      .filter(t => t.completed && t.completed_at)
      .sort((a, b) => {
        const aDate = a.completed_at ? new Date(a.completed_at).getTime() : 0;
        const bDate = b.completed_at ? new Date(b.completed_at).getTime() : 0;
        return bDate - aDate;
      })
      .slice(0, 5);

    if (recentTasks.length >= 3) {
      const types = new Set(recentTasks.map(t => t.name.split(' ')[0]));
      if (types.size === 1) {
        recommendations.push("Try diversifying your task types to build varied skills");
      }
    }

    // Based on skills not yet covered
    const coveredSkills = Object.keys(extractedSkills.skillCounts);
    const uncoveredSkills = Object.keys(skillKeywords).filter(s => !coveredSkills.includes(s));

    if (uncoveredSkills.length > 0) {
      recommendations.push(`Explore new areas: ${uncoveredSkills.slice(0, 2).join(', ')}`);
    }

    return recommendations;
  }, [tasks, progressMetrics, extractedSkills]);

  // Load skills from API/database
  useEffect(() => {
    const loadSkills = async () => {
      try {
        const response = await fetch("/api/skills");
        if (response.ok) {
          const data = await response.json();
          const savedSkills = data.skills as Skill[];

          // Merge API skills with extracted skills
          const mergedSkills = new Map<number | string, Skill>();

          // Add API skills
          savedSkills.forEach(skill => mergedSkills.set(skill.id, skill));

          // Merge with extracted skills
          extractedSkills.skills.forEach(es => {
            const existing = Array.from(mergedSkills.values()).find(s => s.skill_name === es.name);
            if (!existing) {
              mergedSkills.set(es.name, {
                id: 0, // Will be assigned by DB on save
                user_id: 0,
                skill_name: es.name,
                proficiency_level: es.proficiency,
                evidence_task_ids: es.tasks ? JSON.stringify(es.tasks) : null,
                last_used_at: es.lastCompleted,
                created_at: new Date().toISOString()
              });
            }
          });

          setSkills(Array.from(mergedSkills.values()) as Skill[]);
        } else {
          // Fallback to extracted skills - convert to Skill format
          const convertedSkills: Skill[] = extractedSkills.skills.map(es => ({
            id: 0,
            user_id: 0,
            skill_name: es.name,
            proficiency_level: es.proficiency,
            evidence_task_ids: es.tasks ? JSON.stringify(es.tasks) : null,
            last_used_at: es.lastCompleted,
            created_at: new Date().toISOString()
          }));
          setSkills(convertedSkills);
        }
      } catch (error) {
        console.error("Failed to load skills from API:", error);
        const convertedSkills: Skill[] = extractedSkills.skills.map(es => ({
          id: 0,
          user_id: 0,
          skill_name: es.name,
          proficiency_level: es.proficiency,
          evidence_task_ids: es.tasks ? JSON.stringify(es.tasks) : null,
          last_used_at: es.lastCompleted,
          created_at: new Date().toISOString()
        }));
        setSkills(convertedSkills);
      } finally {
        setLoading(false);
      }
    };

    loadSkills();
  }, [extractedSkills]);

  const toggleSkillCollapse = (skillId: number) => {
    const newSet = new Set(collapsedSkills);
    const idStr = String(skillId);
    if (newSet.has(idStr)) {
      newSet.delete(idStr);
    } else {
      newSet.add(idStr);
    }
    setCollapsedSkills(newSet);
  };

  const getSkillLevelText = (level: number) => {
    const levels = ["Beginner", "Novice", "Intermediate", "Advanced", "Expert", "Master"];
    return levels[level] || "Beginner";
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const hasSkills = skills.length > 0;

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{Math.round(progressMetrics.completionRate)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Skills Developed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{skills.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{progressMetrics.totalCompleted}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Skill Diversity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{Math.round(progressMetrics.skillDiversity * 100)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recommendations.map((rec, i) => (
                <li key={i} className="text-sm p-3 bg-muted/50 rounded">
                  {rec}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Skills List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Your Skills
          </CardTitle>
          <CardDescription>
            Skills developed through your task completion history
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasSkills ? (
            <div className="space-y-3">
              {skills.map((skill) => {
                const isCollapsed = collapsedSkills.has(skill.id);
                const level = Math.max(1, skill.proficiency_level);

                return (
                  <Collapsible
                    key={skill.id}
                    open={!isCollapsed}
                    onOpenChange={() => toggleSkillCollapse(skill.id)}
                  >
                    <div className="border rounded-lg p-3">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{level}/5</Badge>
                            <h4 className="font-medium">{skill.skill_name}</h4>
                            <span className="text-xs text-muted-foreground">
                              ({getSkillLevelText(level)})
                            </span>
                          </div>
                          {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mt-3 space-y-3">
                          <div className="space-y-2">
                            <Label className="text-xs">Proficiency Level: {level}/5</Label>
                            <Progress value={(level / 5) * 100} className="h-2" />
                          </div>

                          {skill.last_used_at && (
                            <div className="text-xs text-muted-foreground">
                              Last used: {format(new Date(skill.last_used_at), "MMM d, yyyy")}
                            </div>
                          )}

                          <div className="text-xs">
                            <span className="text-muted-foreground">Evidence: </span>
                            <span>{skill.evidence_task_ids ? JSON.parse(skill.evidence_task_ids).length : 0} task(s)</span>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h4 className="font-medium mb-2">No skills tracked yet</h4>
              <p className="text-sm text-muted-foreground">
                Complete more tasks to see your skills develop over time
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Skill Development Chart (simplified) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Skill Growth
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {skills.slice(0, 5).map((skill) => {
              const level = Math.max(1, skill.proficiency_level);
              return (
                <div key={skill.id} className="text-center">
                  <div className="text-xs text-muted-foreground mb-1 truncate">
                    {skill.skill_name}
                  </div>
                  <div className="flex items-center justify-center gap-0.5 mb-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${
                          i < level ? 'bg-blue-500' : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {level}/5
                  </Badge>
                </div>
              );
            })}
          </div>
          {skills.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              More skills will appear as you complete more tasks
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Re-export types
export type { Skill, Task };