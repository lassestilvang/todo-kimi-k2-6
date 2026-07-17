"use client";

import { useState, useEffect } from "react";
import { Brain, Lightbulb, TrendingUp, Target, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import type { TaskWithRelations } from "@/types";

interface Insight {
  id: string;
  type: "lesson_learned" | "pattern_observed" | "success_factor" | "failure_reason";
  title: string;
  content: string;
  confidence: number;
  context_tags: string[];
  task_id: number | null;
  created_at: string;
}

interface Skill {
  id: number;
  name: string;
  proficiency_level: number;
  evidence_task_ids: number[];
}

interface InsightsPanelProps {
  tasks: TaskWithRelations[];
  userId: number;
  onInsightClick?: (insight: Insight) => void;
  className?: string;
}

export function InsightsPanel({ tasks, userId, onInsightClick, className }: InsightsPanelProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("insights");

  useEffect(() => {
    loadInsightsAndSkills();
  }, [userId]);

  const loadInsightsAndSkills = async () => {
    try {
      setLoading(true);
      // Simulate loading - in real implementation, call API
      const mockInsights: Insight[] = generateMockInsights(tasks);
      const mockSkills: Skill[] = generateMockSkills(tasks);

      setInsights(mockInsights);
      setSkills(mockSkills);
    } catch (error) {
      console.error('Failed to load insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInsightIcon = (type: Insight["type"]) => {
    switch (type) {
      case "lesson_learned":
        return <Lightbulb className="h-4 w-4" />;
      case "pattern_observed":
        return <TrendingUp className="h-4 w-4" />;
      case "success_factor":
        return <CheckCircle className="h-4 w-4" />;
      case "failure_reason":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Brain className="h-4 w-4" />;
    }
  };

  const getInsightColor = (type: Insight["type"]) => {
    switch (type) {
      case "lesson_learned":
        return "bg-blue-500/10 border-blue-500/20";
      case "pattern_observed":
        return "bg-green-500/10 border-green-500/20";
      case "success_factor":
        return "bg-emerald-500/10 border-emerald-500/20";
      case "failure_reason":
        return "bg-orange-500/10 border-orange-500/20";
      default:
        return "bg-purple-500/10 border-purple-500/20";
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600";
    if (confidence >= 0.6) return "text-blue-600";
    if (confidence >= 0.4) return "text-yellow-600";
    return "text-gray-600";
  };

  const generateMockInsights = (taskList: TaskWithRelations[]): Insight[] => {
    const completedTasks = taskList.filter(t => t.completed);
    const insights: Insight[] = [];

    // Generate insights based on task patterns
    if (completedTasks.length > 0) {
      // Insight about task completion patterns
      const taskTypes = completedTasks.map(t => t.priority);
      const mostCommonPriority = getMostCommon(taskTypes);

      insights.push({
        id: "insight-1",
        type: "pattern_observed",
        title: `${mostCommonPriority.charAt(0).toUpperCase() + mostCommonPriority.slice(1)} Priority Tasks Completed Most",
        content: `You tend to complete ${mostCommonPriority} priority tasks most frequently. This suggests a natural working rhythm that aligns with task importance levels.`,
        confidence: 0.8,
        context_tags: ["priority", "completion", "behavior"],
        task_id: null,
        created_at: new Date().toISOString(),
      });
    }

    if (completedTasks.some(t => t.time_entries?.length > 0)) {
      // Insight about time tracking
      const avgTime = completedTasks.reduce((sum, t) => {
        if (t.time_entries && t.time_entries.length > 0) {
          return sum + t.time_entries.reduce((timeSum, entry) => timeSum + (entry.duration_seconds || 0), 0);
        }
        return sum;
      }, 0) / completedTasks.filter(t => t.time_entries?.length > 0).length;

      insights.push({
        id: "insight-2",
        type: "success_factor",
        title: "Time Tracking Reveals Productivity Patterns",
        content: `On average, your tasks take ${Math.round(avgTime / 60)} minutes to complete. This data can help you estimate future tasks more accurately.`,
        confidence: 0.7,
        context_tags: ["time-tracking", "estimation", "productivity"],
        task_id: null,
        created_at: new Date().toISOString(),
      });
    }

    if (completedTasks.some(t => t.priority === 'high' || t.priority === 'critical')) {
      // Insight about high-priority task completion
      const complexTasks = completedTasks.filter(t => t.priority === 'high' || t.priority === 'critical').length;
      const totalTasks = completedTasks.length;

      insights.push({
        id: "insight-3",
        type: "lesson_learned",
        title: "You're Good at Handling Complex Tasks",
        content: `Successfully completed ${complexTasks} out of ${totalTasks} complex (${Math.round(complexTasks/totalTasks*100)}%) priority tasks. This shows strong problem-solving capabilities.`,
        confidence: 0.75,
        context_tags: ["complexity", "problem-solving", "capability"],
        task_id: null,
        created_at: new Date().toISOString(),
      });
    }

    return insights;
  };

  const generateMockSkills = (taskList: TaskWithRelations[]): Skill[] => {
    const skills: Skill[] = [];

    // Infer skills from task names and descriptions
    const skillPatterns: Record<string, string[]> = {
      'design': ['design', 'ui', 'ux', 'interface', 'layout', 'visual'],
      'development': ['code', 'develop', 'implement', 'programming', 'software', 'build'],
      'research': ['research', 'investigate', 'analyze', 'study', 'explore'],
      'writing': ['write', 'document', 'content', 'article', 'post'],
      'leadership': ['lead', 'manage', 'team', 'coordination', 'supervise'],
    };

    const skillsMap = new Map<string, Skill>();

    taskList.forEach(task => {
      if (!task.completed) return;

      const taskName = task.name.toLowerCase();
      const taskDesc = (task.description || '').toLowerCase();
      const combinedText = taskName + ' ' + taskDesc;

      Object.entries(skillPatterns).forEach(([skillKey, keywords]) => {
        const matchedKeywords = keywords.filter(keyword => combinedText.includes(keyword));
        if (matchedKeywords.length > 0) {
          if (!skillsMap.has(skillKey)) {
            skillsMap.set(skillKey, {
              id: skillsMap.size + 1,
              name: skillKey.charAt(0).toUpperCase() + skillKey.slice(1) + ' Work',
              proficiency_level: 1,
              evidence_task_ids: [],
            });
          }

          const skill = skillsMap.get(skillKey)!;
          skill.evidence_task_ids.push(task.id);
          skill.proficiency_level = Math.min(5, skill.evidence_task_ids.length);
        }
      });
    });

    return Array.from(skillsMap.values());
  };

  const getMostCommon = (arr: string[]): string => {
    const frequency: Record<string, number> = {};
    let maxFreq = 0;
    let mostCommon = arr[0];

    arr.forEach(item => {
      frequency[item] = (frequency[item] || 0) + 1;
      if (frequency[item] > maxFreq) {
        maxFreq = frequency[item];
        mostCommon = item;
      }
    });

    return mostCommon;
  };

  const renderInsights = () => {
    if (insights.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No insights available yet.</p>
          <p className="text-sm">Complete more tasks to generate AI-powered insights</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {insights.map((insight) => (
          <Card
            key={insight.id}
            className={`cursor-pointer transition-all hover:scale-102 ${getInsightColor(insight.type)}`}
            onClick={() => onInsightClick && onInsightClick(insight)}
          >
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-background/50">
                  {getInsightIcon(insight.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                    {insight.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
                    {insight.content}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {insight.type.replace('_', ' ')}
                      </Badge>
                      {insight.context_tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className={`text-xs font-medium ${getConfidenceColor(insight.confidence)}`">
                      {Math.round(insight.confidence * 100)}% confidence
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
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
          <Brain className="h-5 w-5" />
          AI Insights & Skills
        </CardTitle>
        <CardDescription>
          Discover patterns, lessons learned, and skill development from your task history
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="insights" className="space-y-4 mt-4">
            {renderInsights()}
          </TabsContent>

          <TabsContent value="skills" className="space-y-4 mt-4">
            {skills.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No skills tracked yet.</p>
                <p className="text-sm">Complete more tasks to track skill development</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {skills.map((skill) => (
                  <Card key={skill.id} className="hover:bg-muted/50 transition-colors">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-lg">{skill.name}</h3>
                        <Badge variant="secondary">
                          Level {skill.proficiency_level}/5
                        </Badge>
                      </div>
                      <Progress value={(skill.proficiency_level / 5) * 100} className="h-2 mb-2" />
                      <div className="text-sm text-muted-foreground">
                        Evidence from {skill.evidence_task_ids.length} task{skill.evidence_task_ids.length !== 1 ? 's' : ''}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Insight Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      { type: 'lesson_learned', count: insights.filter(i => i.type === 'lesson_learned').length, color: 'bg-blue-500' },
                      { type: 'pattern_observed', count: insights.filter(i => i.type === 'pattern_observed').length, color: 'bg-green-500' },
                      { type: 'success_factor', count: insights.filter(i => i.type === 'success_factor').length, color: 'bg-emerald-500' },
                      { type: 'failure_reason', count: insights.filter(i => i.type === 'failure_reason').length, color: 'bg-orange-500' },
                    ].map((item) => (
                      <div key={item.type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${item.color}`} />
                          <span className="text-sm">{item.type.replace('_', ' ')}</span>
                        </div>
                        <Badge variant="secondary">{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Insight Quality</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Average Confidence</span>
                      <Badge variant="secondary">
                        {insights.length > 0 ? Math.round(insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length * 100) : 0}%
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total Insights</span>
                      <Badge variant="secondary">{insights.length}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Skill Categories</span>
                      <Badge variant="secondary">{skills.length}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}