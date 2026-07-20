// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { Target, Award, TrendingUp, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TaskWithRelations } from "@/types";

interface Skill {
  id: number;
  name: string;
  proficiency_level: number; // 1-5
  evidence_task_ids: number[];
  last_used_at: string | null;
  confidence_score?: number;
}

interface SkillTrackerProps {
  tasks: TaskWithRelations[];
  userId: number;
  className?: string;
}

export function SkillTracker({ tasks, userId, className }: SkillTrackerProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSkills();
  }, [userId]);

  const loadSkills = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would call the knowledge graph API
      // For now, simulate loading from tasks
      const inferredSkills = inferSkillsFromTasks(tasks);
      setSkills(inferredSkills);
    } catch (error) {
      console.error('Failed to load skills:', error);
    } finally {
      setLoading(false);
    }
  };

  const inferSkillsFromTasks = (taskList: TaskWithRelations[]): Skill[] => {
    const skillPatterns: Record<string, string[]> = {
      'design': ['design', 'ui', 'ux', 'interface', 'layout', 'visual'],
      'development': ['code', 'develop', 'implement', 'programming', 'software', 'build'],
      'research': ['research', 'investigate', 'analyze', 'study', 'explore'],
      'writing': ['write', 'document', 'content', 'article', 'post', 'communication'],
      'leadership': ['lead', 'manage', 'team', 'coordination', 'supervise'],
      'planning': ['plan', 'strategy', 'organize', 'schedule', 'timeline'],
      'analysis': ['analyze', 'evaluate', 'assess', 'review', 'critique'],
      'creative': ['creative', 'creative', 'innovate', 'imagine', 'ideate'],
      'technical': ['technical', 'tech', 'technology', 'tools', 'systems'],
    };

    const skillsMap = new Map<string, Skill>();

    taskList.forEach(task => {
      if (!task.completed) return;

      const taskName = task.name.toLowerCase();
      const taskDesc = (task.description || '').toLowerCase();
      const combinedText = taskName + ' ' + taskDesc;

      Object.entries(skillPatterns).forEach(([skillName, keywords]) => {
        const matchedKeywords = keywords.filter(keyword => combinedText.includes(keyword));
        if (matchedKeywords.length > 0) {
          if (!skillsMap.has(skillName)) {
            skillsMap.set(skillName, {
              id: skillsMap.size + 1,
              name: skillName.charAt(0).toUpperCase() + skillName.slice(1) + ' Work',
              proficiency_level: 1,
              evidence_task_ids: [],
              last_used_at: null,
            });
          }

          const skill = skillsMap.get(skillName)!;
          skill.evidence_task_ids.push(task.id);
          // Increment proficiency based on completion count
          skill.proficiency_level = Math.min(5, skill.evidence_task_ids.length);
        }
      });
    });

    return Array.from(skillsMap.values());
  };

  const getProficiencyColor = (level: number) => {
    const colors = {
      5: 'bg-green-500',
      4: 'bg-emerald-500',
      3: 'bg-blue-500',
      2: 'bg-yellow-500',
      1: 'bg-red-500',
    };
    return colors[level as keyof typeof colors] || 'bg-gray-500';
  };

  const getProficiencyLabel = (level: number) => {
    const labels = {
      5: 'Expert',
      4: 'Advanced',
      3: 'Competent',
      2: 'Beginner',
      1: 'Novice',
    };
    return labels[level as keyof typeof labels] || 'Unknown';
  };

  const calculateSkillStats = (skill: Skill) => {
    const totalTasks = tasks.length;
    const evidenceCount = skill.evidence_task_ids?.length || 0;
    const completionRate = evidenceCount / Math.max(totalTasks, 1);

    return {
      evidenceCount,
      completionRate,
    };
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Skills & Expertise Tracker
        </CardTitle>
        <CardDescription>
          Track your developing skills based on completed tasks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="skills" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>

          <TabsContent value="skills" className="space-y-4 mt-4">
            {skills.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No skills tracked yet. Complete tasks to build your skills profile.
              </div>
            ) : (
              <div className="grid gap-4">
                {skills.map((skill) => {
                  const stats = calculateSkillStats(skill);
                  return (
                    <div key={skill.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">{skill.name}</h3>
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-3 h-3 rounded-full ${getProficiencyColor(skill.proficiency_level)}`} />
                            <span className="text-sm text-muted-foreground">{getProficiencyLabel(skill.proficiency_level)}</span>
                            <Badge variant="secondary" className="text-xs">
                              Level {skill.proficiency_level}/5
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">{stats.evidenceCount}</div>
                          <div className="text-xs text-muted-foreground">Tasks</div>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Proficiency Growth</span>
                          <span>{Math.round((skill.proficiency_level / 5) * 100)}%</span>
                        </div>
                        <Progress value={(skill.proficiency_level / 5) * 100} className="h-2" />

                        <div className="flex justify-between text-sm mb-1">
                          <span>Task Consistency</span>
                          <span>{Math.round(stats.completionRate * 100)}%</span>
                        </div>
                        <Progress value={stats.completionRate * 100} className="h-2" />
                      </div>

                      {skill.evidence_task_ids && skill.evidence_task_ids.length > 0 && (
                        <div className="mt-3">
                          <div className="text-xs text-muted-foreground mb-1">Evidence Tasks:</div>
                          <div className="flex flex-wrap gap-1">
                            {skill.evidence_task_ids.slice(0, 3).map((taskId) => {
                              const task = tasks.find(t => t.id === taskId);
                              return task ? (
                                <Badge key={taskId} variant="outline" className="text-xs">
                                  {task.name}
                                </Badge>
                              ) : null;
                            })}
                            {skill.evidence_task_ids.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{skill.evidence_task_ids.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="progress" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Skill Acquisition</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {skills.length > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Total Skills Developed</span>
                        <Badge variant="secondary">{skills.length}</Badge>
                      </div>
                    )}
                    {skills.reduce((acc, skill) => acc + skill.proficiency_level, 0) > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Average Proficiency</span>
                        <Badge variant="secondary">
                          {Math.round(skills.reduce((acc, skill) => acc + skill.proficiency_level, 0) / Math.max(skills.length, 1))}/5
                        </Badge>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Recently Active</span>
                      <Badge variant="secondary">
                        {tasks.filter(t => t.completed).length} completed tasks
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Learning Velocity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Skills Completed (5.0)</span>
                      <Badge variant="secondary">
                        {skills.filter(s => s.proficiency_level >= 5).length}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Skills Growing (4.0-4.9)</span>
                      <Badge variant="secondary">
                        {skills.filter(s => s.proficiency_level >= 4 && s.proficiency_level < 5).length}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{"Skills New (<2.0)"}</span>
                      <Badge variant="secondary">
                        {skills.filter(s => s.proficiency_level < 2).length}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Progress Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center py-8 text-muted-foreground">
                    Progress visualization will show skill acquisition over time
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Recommended Next Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {skills.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      Complete more tasks to get personalized skill recommendations
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {skills.filter(s => s.proficiency_level < 5).slice(0, 3).map((skill) => {
                        const nextLevel = skill.proficiency_level + 1;
                        const evidenceNeeded = Math.max(0, 5 - skill.evidence_task_ids?.length || 0);
                        return (
                          <div key={skill.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">{skill.name}</div>
                              <div className="text-sm text-muted-foreground">
                                Level {nextLevel} needs {evidenceNeeded} more task{evidenceNeeded !== 1 ? 's' : ''}
                              </div>
                            </div>
                            <Badge variant="outline">
                              Next: {nextLevel}/5
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Skill Gaps Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {skills.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      Add skills to analyze your development areas
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">
                        Based on your completed tasks, consider developing:
                      </div>
                      {['Leadership', 'Communication', 'Project Management', 'Technical Writing'].map((skill, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                          <span>{skill}</span>
                          <Badge variant="secondary" className="text-xs">
                            High Priority
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}