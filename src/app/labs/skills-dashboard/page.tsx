'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Brain,
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

interface SkillAnalysis {
  total_skills: number;
  average_proficiency: number;
  most_recent_skill: string | null;
  recommendations: Array<{
    skill_name: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export default function SkillsDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [skills, setSkills] = useState<Skill[]>([]);
  const [analysis, setAnalysis] = useState<SkillAnalysis | null>(null);
  const [growthRate, setGrowthRate] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const loadSkills = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/skills');
      if (response.ok) {
        const data = await response.json();
        setSkills(data.skills || []);
        setAnalysis(data.analysis || null);
        setGrowthRate(data.growth_rate || 0);
      }

      // Load skill extraction recommendations
      const extractResponse = await fetch('/api/skills/extract');
      if (extractResponse.ok) {
        const extractData = await extractResponse.json();
        const recommendations = extractData.analysis?.recommendations || [];
        if (analysis) {
          setAnalysis({
            ...analysis,
            recommendations: recommendations.length > 0 ? recommendations : analysis.recommendations,
          });
        }
      }
    } catch (error) {
      console.error('Failed to load skills:', error);
    } finally {
      setLoading(false);
    }
  }, [analysis]);

  useEffect(() => {
    loadSkills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getSkillColor = (level: number): string => {
    if (level >= 4) return 'bg-green-500';
    if (level >= 3) return 'bg-amber-500';
    if (level >= 2) return 'bg-blue-500';
    return 'bg-gray-500';
  };

  const getGrowthRateColor = (rate: number): string => {
    if (rate >= 0.8) return 'text-green-600';
    if (rate >= 0.5) return 'text-amber-600';
    return 'text-gray-600';
  };

  const getSkillKeywords = (skillName: string): string[] => {
    const keywords: Record<string, string[]> = {
      'project management': ['plan', 'schedule', 'coordinate', 'timeline', 'deadline'],
      'technical writing': ['write', 'document', 'report', 'create', 'draft'],
      'research': ['research', 'investigate', 'analyze', 'study', 'examine'],
      'development': ['code', 'develop', 'implement', 'server', 'api'],
      'design': ['design', 'ui', 'ux', 'prototype', 'layout'],
      'communication': ['present', 'meeting', 'discuss', 'communicate', 'email'],
      'leadership': ['lead', 'manage', 'team', 'mentor', 'guide'],
      'problem-solving': ['solve', 'fix', 'troubleshoot', 'debug', 'optimize'],
      'time management': ['schedule', 'time', 'deadline', 'estimate', 'track'],
      'data analysis': ['analyze', 'data', 'metrics', 'report', 'insight'],
      'testing': ['test', 'qa', 'review', 'fix', 'validate'],
      'marketing': ['launch', 'campaign', 'promote', 'brand', 'growth'],
      'sales': ['sell', 'pitch', 'negotiate', 'close', 'deal'],
      'finance': ['budget', 'cost', 'invoice', 'financial', 'revenue'],
      'workflow optimization': ['optimize', 'improve', 'streamline', 'automate', 'efficiency'],
    };
    return keywords[skillName] || [];
  };

  if (status === 'loading' || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading skills dashboard...</p>
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
            Skills Dashboard
          </h1>
          <p className="text-muted-foreground">
            Track your skill development and growth over time
          </p>
        </div>
        <Button variant="outline" onClick={loadSkills}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Skills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{skills.length}</p>
            {analysis && <p className="text-xs text-muted-foreground">skills tracked</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Avg Proficiency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{analysis?.average_proficiency?.toFixed(1) ?? '0.0'}</p>
            <p className="text-xs text-muted-foreground">out of 5</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Growth Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${getGrowthRateColor(growthRate)}`}>
              {Math.round(growthRate * 100)}%
            </p>
            <p className="text-xs text-muted-foreground">skills used recently</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Skill Gaps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {analysis?.recommendations?.filter(r => r.priority === 'high').length ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">high priority gaps</p>
          </CardContent>
        </Card>
      </div>

      {/* Priority Skill Gaps */}
      {analysis?.recommendations && analysis.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🎯 Skill Gap Recommendations</CardTitle>
            <CardDescription>Skills to focus on based on your recent work</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.recommendations
                .sort((a, b) => {
                  const priorityOrder = { high: 0, medium: 1, low: 2 };
                  return priorityOrder[a.priority] - priorityOrder[b.priority];
                })
                .slice(0, 5)
                .map((rec, idx) => (
                  <div key={idx} className="p-3 border rounded-lg">
                    <div className="flex items-start gap-3">
                      <Badge
                        className={`px-2 py-1 text-xs font-medium ${
                          rec.priority === 'high'
                            ? 'bg-red-100 text-red-800'
                            : rec.priority === 'medium'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {rec.priority} priority
                      </Badge>
                      <div>
                        <h4 className="font-medium">{rec.skill_name}</h4>
                        <p className="text-sm text-muted-foreground">{rec.reason}</p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skills Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Your Skills</CardTitle>
          <CardDescription>Click on a skill to see detailed insights</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded" />
              ))}
            </div>
          ) : skills.length > 0 ? (
            <div className="space-y-4">
              {skills.map((skill) => (
                <div
                  key={skill.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => {
                    // Could navigate to skill detail page
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-medium">{skill.skill_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Proficiency: {skill.proficiency_level} / 5
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">
                        Level {skill.proficiency_level}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div
                        className={`w-3 h-3 rounded-full ${getSkillColor(skill.proficiency_level)}`}
                      />
                      <span>{getSkillKeywords(skill.skill_name).slice(0, 3).join(', ')}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Progress value={(skill.proficiency_level / 5) * 100} className="flex-1" />
                      <span className="text-xs font-medium">
                        {Math.round((skill.proficiency_level / 5) * 100)}%
                      </span>
                    </div>

                    {skill.last_used_at && (
                      <p className="text-xs text-muted-foreground">
                        Last used: {new Date(skill.last_used_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No skills tracked yet</h3>
              <p className="text-muted-foreground mb-4">
                Complete some tasks to automatically extract skills.
              </p>
              <Button variant="outline" onClick={() => router.push('/labs/decision-journal')}>
                View Decision Journal
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Learning Path */}
      <Card>
        <CardHeader>
          <CardTitle>📚 Personalized Learning Path</CardTitle>
          <CardDescription>Recommended next steps for skill development</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium mb-2">Weekly Goal: 5 skill-building tasks</h4>
              <p className="text-sm text-blue-700 mb-2">
                Complete tasks that align with your target skills
              </p>
              <div className="flex items-center gap-2">
                <Progress value={30} className="flex-1 h-2" />
                <span className="text-xs">30%</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg">
                <h5 className="font-medium text-sm mb-2">Skill Categories</h5>
                <p className="text-xs text-muted-foreground">
                  Project Management • Technical Writing • Research
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <h5 className="font-medium text-sm mb-2">Recommended Resources</h5>
                <p className="text-xs text-muted-foreground">
                  AI templates • Skill assessments • Learning paths
                </p>
              </div>
            </div>

            <Button variant="outline" className="w-full" onClick={() => router.push('/labs/ai-parsing')}>
              Generate AI Skill Development Plan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI-Powered Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Learning Recommendations
          </CardTitle>
          <CardDescription>Get personalized learning suggestions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button variant="outline" className="w-full" onClick={() => router.push('/labs/ai-parsing')}>
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