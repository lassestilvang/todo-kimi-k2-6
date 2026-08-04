"use client";

import { useMemo } from "react";
import {
  Brain,
  Target,
  Lightbulb,
  Users,
  MapPin,
  CheckCircle2,
  Trophy,
  Clock,
  Star,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TaskWithRelations } from "@/types";

interface CareerNavigatorProps {
  tasks: TaskWithRelations[];
  userId?: number;
}

interface Skill {
  name: string;
  proficiency: number; // 1-5
  evidence: string[];
  suggestedLevel: number;
}

interface CareerPath {
  role: string;
  matchScore: number;
  requiredSkills: string[];
  recommendedActions: string[];
}

interface LearningResource {
  title: string;
  url: string;
  type: "course" | "article" | "video" | "book";
  estimatedTime: string;
}

export function CareerNavigator({ tasks, userId }: CareerNavigatorProps) {
  // Extract skills from completed tasks
  const skills = useMemo((): Skill[] => {
    const skillMap = new Map<string, { count: number; tasks: typeof tasks }>();

    // Extract skills from task names and descriptions
    tasks.forEach(task => {
      if (!task.completed) return;

      const text = (task.name + " " + (task.description || "")).toLowerCase();

      // Skill keywords mapping
      const skillKeywords: Record<string, string[]> = {
        "react": ["react", "jsx", "component", "hooks", "state"],
        "typescript": ["typescript", "types", "interface", "generic"],
        "node.js": ["nodejs", "node.js", "server", "express", "api"],
        "python": ["python", "django", "flask", "data science"],
        "javascript": ["javascript", "js", "frontend", "backend"],
        "design": ["design", "ui/ux", "figma", "sketch", "figma"],
        "project-management": ["project", "agile", "scrum", "kanban", "planning"],
        "communication": ["communication", "presentation", "meeting", "client"],
        "leadership": ["lead", "manage", "mentor", "team", "direct"],
        "data-analysis": ["analysis", "analytics", "reporting", "dashboard"],
        "machine-learning": ["ml", "ai", "model", "training", "tensor"],
        "devops": ["devops", "ci/cd", "docker", "kubernetes", "deployment"],
        "security": ["security", "auth", "encrypt", "vulnerability"],
      };

      Object.entries(skillKeywords).forEach(([skill, keywords]) => {
        const matches = keywords.some(k => text.includes(k.toLowerCase()));
        if (matches) {
          const existing = skillMap.get(skill);
          if (existing) {
            existing.count++;
          } else {
            skillMap.set(skill, { count: 1, tasks: [task] });
          }
        }
      });
    });

    // Convert to skill array with proficiency (max 5)
    return Array.from(skillMap.entries()).map(([name, data]) => {
      const proficiency = Math.min(Math.ceil(data.count / 2), 5);
      return {
        name,
        proficiency,
        evidence: data.tasks.slice(0, 3).map(t => t.name),
        suggestedLevel: proficiency + 1,
      };
    }).sort((a, b) => b.proficiency - a.proficiency);
  }, [tasks]);

  // Generate career paths based on skills
  const careerPaths = useMemo((): CareerPath[] => {
    const totalSkillValue = skills.reduce((sum, s) => sum + s.proficiency, 0);

    const allPaths: CareerPath[] = [
      {
        role: "Senior Software Engineer",
        matchScore: Math.min(90, totalSkillValue * 8),
        requiredSkills: ["javascript", "typescript", "react", "node.js"],
        recommendedActions: [
          "Build 2 more full-stack projects",
          "Contribute to open-source",
          "Learn advanced TypeScript patterns",
        ],
      },
      {
        role: "Frontend Specialist",
        matchScore: Math.min(85, totalSkillValue * 7 + skills.filter(s => s.name.includes("react") || s.name.includes("design")).length * 5),
        requiredSkills: ["react", "typescript", "design"],
        recommendedActions: [
          "Master React performance optimization",
          "Learn UI/UX design principles",
          "Build component library",
        ],
      },
      {
        role: "Backend Engineer",
        matchScore: Math.min(80, totalSkillValue * 7),
        requiredSkills: ["node.js", "python", "api"],
        recommendedActions: [
          "Learn microservices architecture",
          "Study system design",
          "Build authentication systems",
        ],
      },
      {
        role: "Team Lead",
        matchScore: Math.min(75, totalSkillValue * 6 + skills.filter(s => s.name.includes("leadership") || s.name.includes("project")).length * 6),
        requiredSkills: ["leadership", "project-management", "communication"],
        recommendedActions: [
          "Take initiative on projects",
          "Mentor junior team members",
          "Lead planning sessions",
        ],
      },
      {
        role: "Data Analyst",
        matchScore: Math.min(70, totalSkillValue * 5 + skills.filter(s => s.name.includes("data-analysis") || s.name.includes("python")).length * 8),
        requiredSkills: ["python", "data-analysis", "javascript"],
        recommendedActions: [
          "Learn SQL and data visualization",
          "Complete data analysis projects",
          "Study statistics",
        ],
      },
    ];

    return allPaths;
  }, [skills]);

  // Generate learning resources
  const learningResources = useMemo((): LearningResource[] => {
    const topSkills = skills.slice(0, 3);
    const resources: LearningResource[] = [];

    topSkills.forEach(skill => {
      if (skill.name.includes("react") || skill.name.includes("typescript")) {
        resources.push({
          title: `Advanced ${skill.name} Patterns`,
          url: "https://fettblog.eu/typescript-advanced-types/",
          type: "course",
          estimatedTime: "4h",
        });
        resources.push({
          title: `Mastering ${skill.name} Hooks`,
          url: "https://react.dev/reference/react",
          type: "video",
          estimatedTime: "2h",
        });
      }
      if (skill.name.includes("node.js") || skill.name.includes("api")) {
        resources.push({
          title: "Node.js Design Patterns",
          url: "https://refactoring.guru/design-patterns/nodejs",
          type: "article",
          estimatedTime: "3h",
        });
        resources.push({
          title: "Building RESTful APIs",
          url: "https://restfulapi.net/",
          type: "course",
          estimatedTime: "5h",
        });
      }
      if (skill.name.includes("design")) {
        resources.push({
          title: "UI/UX Design Fundamentals",
          url: "https://www.nngroup.com/articles/",
          type: "course",
          estimatedTime: "6h",
        });
      }
      if (skill.name.includes("leadership")) {
        resources.push({
          title: "Leading Technical Teams",
          url: "https://www.amazon.com/",
          type: "book",
          estimatedTime: "8h",
        });
      }
    });

    // Deduplicate and limit
    return [...new Map(resources.map(r => [r.title, r])).values()].slice(0, 6);
  }, [skills]);

  // Calculate skill growth rate
  const growthRate = useMemo(() => {
    const completedMonths = tasks.filter(t => t.completed && t.completed_at);
    if (completedMonths.length === 0) return 0;

    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const recentCompletions = completedMonths.filter(
      t => t.completed_at && new Date(t.completed_at) >= lastMonth
    ).length;

    return recentCompletions;
  }, [tasks]);

  return (
    <div className="space-y-6">
      {/* Skill Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Career Navigator
          </CardTitle>
          <CardDescription>
            AI-powered career pathing based on your completed work
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Skills Progress */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Star className="h-4 w-4" />
                Your Skills
              </h4>

              {skills.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Complete more tasks to see your skills develop
                </p>
              ) : (
                <div className="space-y-3">
                  {skills.map(skill => (
                    <div key={skill.name} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-sm">{skill.name}</h5>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Level {skill.proficiency}/5
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {skill.evidence.length} tasks
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Evidenced by:</span>
                        <span className="font-mono text-xs">{skill.evidence.slice(0, 2).join(", ")}</span>
                      </div>

                      {skill.suggestedLevel > skill.proficiency && (
                        <div className="mt-2 text-xs">
                          <span className="text-muted-foreground">
                            Next level: {skill.suggestedLevel} - Complete {(skill.suggestedLevel - skill.proficiency) * 2} more related tasks
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Career Paths */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Recommended Paths
              </h4>

              <div className="space-y-3">
                {careerPaths.map(path => (
                  <div key={path.role} className="border rounded-lg p-3 hover:shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <h5 className="font-medium text-sm">{path.role}</h5>
                      <Badge>{path.matchScore}% match</Badge>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-2">
                      {path.requiredSkills.map(skill => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      <span>Recommended: {path.recommendedActions[0]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Growth Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Skill Growth
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Trophy className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{skills.length}</span>
              </div>
              <p className="text-sm text-muted-foreground">Skills Identified</p>
            </div>

            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold">
                  {Math.round(skills.reduce((sum, s) => sum + s.proficiency, 0) / skills.length || 0)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Avg Proficiency</p>
            </div>

            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <ArrowRight className="h-5 w-5 text-blue-500" />
                <span className="text-2xl font-bold">{growthRate}</span>
              </div>
              <p className="text-sm text-muted-foreground">Tasks This Month</p>
            </div>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Your skills improve by completing related tasks. Each skill is extracted from your task history.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Learning Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Learning Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          {learningResources.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Complete tasks in key areas to receive personalized learning recommendations
            </p>
          ) : (
            <div className="space-y-3">
              {learningResources.map((resource, idx) => (
                <div key={idx} className="border rounded-lg p-3 hover:shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h5 className="font-medium text-sm">{resource.title}</h5>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Badge variant="outline" className="text-xs">{resource.type}</Badge>
                        <span>{resource.estimatedTime} estimated</span>
                      </div>
                    </div>
                    <Button size="sm" asChild>
                      <a href={resource.url} target="_blank" rel="noopener noreferrer">
                        Learn More
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            30-Day Career Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {skills.slice(0, 3).map((skill, idx) => (
              <div key={skill.name} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-medium">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <h5 className="font-medium text-sm">Advance {skill.name}</h5>
                  <p className="text-xs text-muted-foreground">
                    Complete {Math.max(1, skill.suggestedLevel - skill.proficiency) * 2} more related tasks
                  </p>
                </div>
                {skill.suggestedLevel > skill.proficiency && (
                  <Button size="sm" variant="outline">
                    Find Tasks
                  </Button>
                )}
              </div>
            ))}

            {skills.length < 3 && (
              <div className="text-center py-4 text-muted-foreground">
                <p className="text-sm">Complete more tasks to see your personalized career plan</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}