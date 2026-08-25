'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Target,
  CheckCircle2,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useSession } from 'next-auth/react';

interface Skill {
  id: number;
  skill_name: string;
  proficiency_level: number;
  evidence_task_ids: string | null;
  last_used_at: string | null;
  created_at: string;
}

interface LearningPath {
  skill: string;
  currentLevel: number;
  targetLevel: number;
  recommendedTasks: Array<{
    title: string;
    estimatedHours: number;
    description: string;
    completed: boolean;
  }>;
  resources: Array<{
    name: string;
    type: 'article' | 'video' | 'course' | 'todo';
    url: string;
  }>;
  progress: number;
}

export default function LearningPathPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [skills, setSkills] = useState<Skill[]>([]);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);

  const generateLearningPaths = (
    skills: Skill[],
    recommendations: Array<{ skill_name: string; reason: string; priority: 'high' | 'medium' | 'low' }>
  ): LearningPath[] => {
    const skillMap = new Map(skills.map(s => [s.skill_name, s]));

    // Default task templates
    const taskTemplates: Record<string, (proficiency: number) => Array<{ title: string; estimatedHours: number; description: string; completed: boolean }>> = {
      'project management': (level) => [
        {
          title: 'Create a project plan from scratch',
          estimatedHours: 2,
          description: 'Use your planning skills to create a comprehensive project plan',
          completed: level >= 2,
        },
        {
          title: 'Track project milestones',
          estimatedHours: 1,
          description: 'Apply time management to keep projects on track',
          completed: level >= 3,
        },
        {
          title: 'Lead a team meeting',
          estimatedHours: 0.5,
          description: 'Practice leadership skills in a real scenario',
          completed: level >= 4,
        },
      ],
      'technical writing': (level) => [
        {
          title: 'Write a technical documentation page',
          estimatedHours: 1.5,
          description: 'Apply your writing skills to create clear documentation',
          completed: level >= 2,
        },
        {
          title: 'Create a user guide',
          estimatedHours: 2,
          description: 'Document processes and procedures',
          completed: level >= 3,
        },
      ],
      'research': (level) => [
        {
          title: 'Conduct a literature review',
          estimatedHours: 3,
          description: 'Deep dive research using multiple sources',
          completed: level >= 2,
        },
        {
          title: 'Create a research synthesis',
          estimatedHours: 2,
          description: 'Analyze and summarize findings from multiple sources',
          completed: level >= 3,
        },
      ],
      'development': (level) => [
        {
          title: 'Build a feature from design to deployment',
          estimatedHours: 4,
          description: 'End-to-end development experience',
          completed: level >= 2,
        },
        {
          title: 'Code review and refactor existing code',
          estimatedHours: 2,
          description: 'Improve code quality and maintainability',
          completed: level >= 3,
        },
      ],
      'design': (level) => [
        {
          title: 'Create a user interface prototype',
          estimatedHours: 2.5,
          description: 'Design and prototype a new UI',
          completed: level >= 2,
        },
        {
          title: 'Conduct a design critique',
          estimatedHours: 1,
          description: 'Review and iterate on design work',
          completed: level >= 3,
        },
      ],
    };

    // Combine recommendations with skill data
    const allSkills = recommendations.map(rec => {
      const skill = skillMap.get(rec.skill_name);
      return {
        skill: rec.skill_name,
        currentLevel: skill?.proficiency_level || 1,
        targetLevel: Math.min(5, (skill?.proficiency_level || 1) + 1),
        recommendedTasks: taskTemplates[rec.skill_name]?.(skill?.proficiency_level || 1) || [],
        resources: [
          { name: `Learn ${rec.skill_name}`, type: 'article' as const, url: `https://example.com/learn/${encodeURIComponent(rec.skill_name)}` },
          { name: `Practice ${rec.skill_name}`, type: 'todo' as const, url: '/tasks/new' },
        ],
        progress: ((skill?.proficiency_level || 1) / 5) * 100,
      };
    });

    // Add high-priority recommendations that aren't in skill data
    recommendations
      .filter(rec => !skillMap.has(rec.skill_name))
      .forEach(rec => {
        allSkills.push({
          skill: rec.skill_name,
          currentLevel: 1,
          targetLevel: 3,
          recommendedTasks: [],
          resources: [
            { name: `Learn ${rec.skill_name}`, type: 'article' as const, url: `https://example.com/learn/${encodeURIComponent(rec.skill_name)}` },
            { name: `Apply ${rec.skill_name} to a task`, type: 'todo' as const, url: '/tasks/new' },
          ],
          progress: 0,
        });
      });

    return allSkills;
  };

  const loadLearningPaths = async () => {
    setLoading(true);
    try {
      // Load skills
      const skillsResponse = await fetch('/api/skills');
      if (skillsResponse.ok) {
        const data = await skillsResponse.json();
        setSkills(data.skills || []);

        // Generate learning paths
        const paths = generateLearningPaths(data.skills || [], data.analysis?.recommendations || []);
        setLearningPaths(paths);
      }
    } catch (error) {
      console.error('Failed to load learning paths:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load on mount
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    loadLearningPaths();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === 'loading' || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading learning paths...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Personalized Learning Paths
          </h1>
          <p className="text-muted-foreground">
            AI-generated recommendations based on your task history and skill gaps
          </p>
        </div>
        <Button variant="outline" onClick={loadLearningPaths}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Your Learning Journey</CardTitle>
          <CardDescription>Overall skill development progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(learningPaths.reduce((sum, p) => sum + p.progress, 0) / Math.max(learningPaths.length, 1))}%
                </span>
              </div>
              <Progress value={learningPaths.reduce((sum, p) => sum + p.progress, 0) / Math.max(learningPaths.length, 1)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{skills.length}</p>
                <p className="text-xs text-muted-foreground">Skills Tracked</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {learningPaths.filter(p => p.currentLevel >= p.targetLevel).length}
                </p>
                <p className="text-xs text-muted-foreground">Skills Mastered</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {learningPaths.reduce((sum, p) => sum + p.recommendedTasks.filter(t => t.completed).length, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Tasks Completed</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Learning Paths */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : learningPaths.length > 0 ? (
        <div className="space-y-4">
          {learningPaths.map((path, idx) => (
            <Card key={idx}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    {path.skill}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={path.currentLevel >= path.targetLevel ? 'default' : 'outline'}>
                      Level {path.currentLevel}/{path.targetLevel}
                    </Badge>
                    <Badge variant="secondary">
                      {path.progress.toFixed(0)}% complete
                    </Badge>
                  </div>
                </div>
                <CardDescription>
                  {path.currentLevel >= path.targetLevel
                    ? 'You\'ve mastered this skill!'
                    : `Recommended to move from level ${path.currentLevel} to ${path.targetLevel}`}
                </CardDescription>
              </CardHeader>
              <CardContent>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Skill Level</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(path.progress)}%
                  </span>
                </div>
                <Progress value={path.progress} />
              </div>

              {/* Recommended Tasks */}
              {path.recommendedTasks.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-sm mb-2">Recommended Tasks</h4>
                  <div className="space-y-2">
                    {path.recommendedTasks.map((task, taskIdx) => (
                      <div key={taskIdx} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="flex-shrink-0">
                          {task.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{task.title}</p>
                          <p className="text-xs text-muted-foreground">{task.description}</p>
                        </div>
                        <div className="text-xs text-muted-foreground">{task.estimatedHours}h</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resources */}
              <div>
                <h4 className="font-medium text-sm mb-2">Learning Resources</h4>
                <div className="flex flex-wrap gap-2">
                  {path.resources.map((resource, resIdx) => (
                    <Button key={resIdx} variant="outline" size="sm" onClick={() => {
                      if (resource.url.startsWith('http')) {
                        window.open(resource.url, '_blank');
                      } else {
                        router.push(resource.url);
                      }
                    }}>
                      {resource.type === 'todo' ? 'Create Task' : 'Open Resource'}
                    </Button>
                  ))}
                </div>
              </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="font-medium mb-2">No learning paths yet</h3>
              <p className="text-muted-foreground mb-4">
                Complete some tasks and record outcomes to generate personalized learning paths.
              </p>
              <Button variant="outline" onClick={() => router.push('/labs/skills-dashboard')}>
                View Skills Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI-Powered Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            AI Learning Recommendations
          </CardTitle>
          <CardDescription>Get personalized learning suggestions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button variant="outline" className="w-full" onClick={() => router.push('/labs/ai-parsing?mode=learning')}>
              Generate AI Learning Plan
            </Button>
            <Button variant="outline" className="w-full">
              Get Skill Gap Analysis
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              View Progress Trends
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}