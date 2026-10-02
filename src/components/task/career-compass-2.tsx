'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Compass,
  Award,
  CheckCircle,
  MapPin,
  GraduationCap,
  TrendingUp,
  Goal,
  Brain,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface Skill {
  id: number;
  user_id: number;
  skill_name: string;
  proficiency_level: number;
  evidence_task_ids: string | null;
  last_used_at: string | null;
  created_at: string;
}

interface CareerPath {
  key: string;
  role: string;
  company: string;
  matchScore: number;
  requiredSkills: string[];
  yourSkills: string[];
  missingSkills: string[];
  nextSteps: string[];
  marketDemand: number;
  salaryRange: string;
  growthRate: number;
}

interface TaskBasic {
  completed?: boolean;
}

interface CareerCompassProps {
  skills?: Skill[];
  tasks?: TaskBasic[];
  loading?: boolean;
}

interface CareerInsight {
  title: string;
  description: string;
  impact: number;
  skillsToGain: string[];
  timeline: string;
}

const careerPaths: Record<string, Omit<CareerPath, 'matchScore' | 'yourSkills' | 'missingSkills' | 'nextSteps' | 'marketDemand' | 'salaryRange' | 'growthRate'>> = {
  'full-stack-developer': {
    role: 'Full Stack Developer',
    company: 'Tech Companies / Startups',
    requiredSkills: ['development', 'design', 'planning', 'technical', 'research'],
    key: 'full-stack-developer',
  },
  'project-manager': {
    role: 'Project Manager',
    company: 'Enterprise / Agencies',
    requiredSkills: ['planning', 'leadership', 'communication', 'project-management'],
    key: 'project-manager',
  },
  'data-analyst': {
    role: 'Data Analyst',
    company: 'Analytics Firms / Tech Companies',
    requiredSkills: ['research', 'analytical', 'writing', 'development'],
    key: 'data-analyst',
  },
  designer: {
    role: 'UI/UX Designer',
    company: 'Design Studios',
    requiredSkills: ['design', 'communication', 'creative', 'research'],
    key: 'designer',
  },
  'product-manager': {
    role: 'Product Manager',
    company: 'SaaS Companies',
    requiredSkills: ['planning', 'leadership', 'communication', 'research'],
    key: 'product-manager',
  },
  'ai-ml-engineer': {
    role: 'AI/ML Engineer',
    company: 'AI Startups / Research Labs',
    requiredSkills: ['research', 'technical', 'development', 'mathematics'],
    key: 'ai-ml-engineer',
  },
  'cybersecurity': {
    role: 'Cybersecurity Specialist',
    company: 'Security Firms / Corporations',
    requiredSkills: ['technical', 'problem-solving', 'research', 'development'],
    key: 'cybersecurity',
  },
  'devops': {
    role: 'DevOps Engineer',
    company: 'Tech Companies / Cloud Firms',
    requiredSkills: ['technical', 'automation', 'development', 'system administration'],
    key: 'devops',
  },
  'sales-engineering': {
    role: 'Sales Engineer',
    company: 'SaaS Companies / Tech Vendors',
    requiredSkills: ['communication', 'technical', 'sales', 'problem-solving'],
    key: 'sales-engineering',
  },
  'technical-writing': {
    role: 'Technical Writer',
    company: 'Software Companies / Documentation Teams',
    requiredSkills: ['technical writing', 'communication', 'writing', 'research'],
    key: 'technical-writing',
  },
};

export function CareerCompass2({ skills = [], tasks = [], loading = false }: CareerCompassProps) {
  const [recommendations, setRecommendations] = useState<CareerPath[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [insights, setInsights] = useState<CareerInsight[]>([]);

  const skillNames = useMemo(() => {
    return new Set(skills.map(s => s.skill_name.toLowerCase()));
  }, [skills]);

  // Generate career path recommendations
  useEffect(() => {
    const generatePaths = Object.entries(careerPaths).map(([_key, path]) => {
      const matchedSkills = path.requiredSkills.filter(skill =>
        skillNames.has(skill)
      );
      const missingSkills = path.requiredSkills.filter(
        skill => !skillNames.has(skill)
      );

      const matchScore = Math.round((matchedSkills.length / path.requiredSkills.length) * 100);

      // Calculate market demand (simplified - in real app would come from API)
      const marketDemand = path.key === 'full-stack-developer' || path.key === 'product-manager' ? 95 :
        path.key === 'ai-ml-engineer' ? 90 :
          path.key === 'data-analyst' ? 85 :
            path.key === 'devops' ? 80 :
              path.key === 'cybersecurity' ? 78 :
                path.key === 'designer' ? 70 :
                  path.key === 'technical-writing' ? 65 :
                    path.key === 'sales-engineering' ? 60 : 50;

      // Generate next steps
      const nextSteps = missingSkills.length > 0
        ? missingSkills.slice(0, 3).map(s => `Learn ${s} skill`)
        : ['Ready to apply for roles in this area', 'Build a portfolio'];

      return {
        ...path,
        matchScore,
        yourSkills: matchedSkills,
        missingSkills,
        nextSteps,
        marketDemand,
        salaryRange: getSalaryRange(path.key),
        growthRate: getGrowthRate(path.key),
      };
    });

    setRecommendations(generatePaths.sort((a, b) => b.matchScore - a.matchScore));
  }, [skills, skillNames]);

  // Generate insights
  useEffect(() => {
    const generateInsights = (): CareerInsight[] => {
      if (skills.length === 0) {
        return [
          {
            title: 'Start Building Skills',
            description: 'Complete more tasks to unlock personalized career recommendations.',
            impact: 90,
            skillsToGain: ['develop', 'plan', 'research'],
            timeline: '2-4 weeks',
          },
        ];
      }

      const insights: CareerInsight[] = [];
      const skillStats = {
        total: skills.length,
        avgLevel: skills.reduce((sum, s) => sum + s.proficiency_level, 0) / skills.length,
        topSkills: skills.sort((a, b) => b.proficiency_level - a.proficiency_level).slice(0, 3),
      };

      // Skill gap insight
      if (skillStats.avgLevel < 3) {
        insights.push({
          title: 'Skill Development Needed',
          description: `Focus on increasing your average proficiency level from ${Math.round(skillStats.avgLevel * 10) / 10} to 4+`,
          impact: 75,
          skillsToGain: skillStats.topSkills.map(s => s.skill_name),
          timeline: '1-3 months',
        });
      }

      // Task completion insight
      const completedTasks = tasks?.filter(t => t.completed)?.length || 0;
      const totalTasks = tasks?.length || 0;
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      if (completionRate < 50) {
        insights.push({
          title: 'Improve Task Completion',
          description: `Your completion rate is ${Math.round(completionRate)}%. Focus on finishing started tasks.`,
          impact: 70,
          skillsToGain: ['planning', 'time management'],
          timeline: '2-4 weeks',
        });
      }

      // High-demand career insight
      const topMatch = recommendations[0];
      if (topMatch && topMatch.matchScore > 50) {
        insights.push({
          title: 'Career Path Opportunity',
          description: `${topMatch.role} is a high-demand role with ${topMatch.growthRate}% annual growth`,
          impact: 85,
          skillsToGain: topMatch.missingSkills,
          timeline: '3-6 months',
        });
      }

      return insights.length > 0 ? insights : [
        {
          title: 'Keep Advancing',
          description: 'Your skills are developing well. Continue completing tasks.',
          impact: 60,
          skillsToGain: skillStats.topSkills.map(s => s.skill_name),
          timeline: 'Ongoing',
        },
      ];
    };

    setInsights(generateInsights());
  }, [skills, tasks, recommendations]);

  const getTopRecommendation = recommendations[0];

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="paths" className="text-xs">Career Paths</TabsTrigger>
          <TabsTrigger value="skills" className="text-xs">Skills</TabsTrigger>
          <TabsTrigger value="planning" className="text-xs">Planning</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          {/* Hero Section */}
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Compass className="h-6 w-6" />
                Career Compass 2.0
              </CardTitle>
              <CardDescription>
                Your personalized career guidance based on skills, tasks, and market trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              {getTopRecommendation ? (
                <div className="text-center">
                  <div className="mb-4">
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {getTopRecommendation.role}
                    </Badge>
                  </div>

                  <div className="mb-4 grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-2xl font-bold">{getTopRecommendation.matchScore}%</div>
                      <div className="text-xs text-muted-foreground">Match Score</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{getTopRecommendation.marketDemand}</div>
                      <div className="text-xs text-muted-foreground">Market Demand</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{getTopRecommendation.growthRate}%</div>
                      <div className="text-xs text-muted-foreground">Growth Rate</div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <Progress
                      value={getTopRecommendation.matchScore}
                      className="h-2 mb-2"
                    />
                    <p className="text-sm text-muted-foreground">
                      {getTopRecommendation.matchScore}% match for {getTopRecommendation.role}
                    </p>
                  </div>

                  <Button
                    onClick={() => {
                      toast.success(`Started journey toward ${getTopRecommendation.role}`);
                    }}
                  >
                    Start Learning Path
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h4 className="font-medium mb-2">Complete more tasks to unlock career insights</h4>
                  <p className="text-sm text-muted-foreground">
                    We will match your skills to career opportunities as you grow
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Career Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight, i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Target className="h-4 w-4 text-purple-500" />
                        {insight.title}
                      </CardTitle>
                      <CardDescription>{insight.description}</CardDescription>
                    </div>
                    <Badge variant="outline">{insight.impact}% impact</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Skills to Gain</p>
                      <div className="flex flex-wrap gap-1">
                        {insight.skillsToGain.slice(0, 3).map(skill => (
                          <Badge key={skill} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Timeline:</span>
                      <Badge variant="secondary" className="text-xs">{insight.timeline}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Career Paths Tab */}
        <TabsContent value="paths">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Career Opportunities
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.map(path => {
                const isRecommended = path === getTopRecommendation;
                const hasMatch = path.matchScore > 30;

                return (
                  <Card
                    key={path.role}
                    className={isRecommended ? 'border-purple-200 bg-purple-50/50' : ''}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{path.role}</CardTitle>
                          <CardDescription>{path.company}</CardDescription>
                        </div>
                        {isRecommended && (
                          <Award className="h-5 w-5 text-purple-500" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Match Score & Market Demand */}
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Match Score</span>
                            <span>{path.matchScore}%</span>
                          </div>
                          <Progress value={path.matchScore} className="h-2 mb-2" />

                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Market Demand: {path.marketDemand}%</span>
                            <span>Growth: {path.growthRate}%/yr</span>
                          </div>
                        </div>

                        {/* Salary Range */}
                        <div className="text-xs">
                          <span className="text-muted-foreground">Salary: </span>
                          <Badge variant="outline" className="text-xs">{path.salaryRange}</Badge>
                        </div>

                        {/* Skills Match */}
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground mb-1">
                            Skills You Have
                          </h4>
                          <div className="flex flex-wrap gap-1">
                            {path.yourSkills.map(skill => (
                              <Badge
                                key={skill}
                                variant="outline"
                                className="text-xs"
                              >
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Missing Skills */}
                        {path.missingSkills.length > 0 && (
                          <div>
                            <h4 className="text-xs font-medium text-muted-foreground mb-1">
                              Skills to Develop
                            </h4>
                            <div className="flex flex-wrap gap-1">
                              {path.missingSkills.map(skill => (
                                <Badge
                                  key={skill}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Next Steps */}
                        <div>
                          <h4 className="textxs font-medium text-muted-foreground mb-1">
                            Next Steps
                          </h4>
                          <ul className="text-xs space-y-1">
                            {path.nextSteps.slice(0, 2).map((step, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                                {step}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <Button
                          variant={isRecommended ? 'default' : 'outline'}
                          size="sm"
                          className="w-full"
                          disabled={!hasMatch}
                        >
                          {isRecommended
                            ? 'Continue Path'
                            : hasMatch
                              ? 'Explore Path'
                              : 'Locked'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* Skills Tab */}
        <TabsContent value="skills">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Skill Development Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium mb-3">Your Top Skills</h4>
                  <div className="space-y-3">
                    {skills.slice(0, 5).map(skill => (
                      <div key={skill.id} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{skill.skill_name}</span>
                          <Badge variant={skill.proficiency_level >= 4 ? 'default' : 'outline'}>
                            Level {skill.proficiency_level}/5
                          </Badge>
                        </div>
                        <Progress value={skill.proficiency_level * 20} className="h-2" />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-3">Skill Categories</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {['development', 'design', 'planning', 'research', 'communication', 'technical', 'analytical', 'leadership'].map(category => {
                      const catSkills = skills.filter(s =>
                        s.skill_name.toLowerCase().includes(category.toLowerCase())
                      );
                      return (
                        <div key={category} className="text-center p-3 border rounded-lg">
                          <p className="font-medium text-sm mb-1">{category}</p>
                          <p className="text-2xl font-bold">{catSkills.length}</p>
                          <p className="text-xs text-muted-foreground">skills</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Planning Tab */}
        <TabsContent value="planning">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Goal className="h-5 w-5" />
                Career Planning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-3">Learning Roadmap</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <div className="flex-1">
                        <p className="font-medium">Current Role Alignment</p>
                        <p className="text-xs text-muted-foreground">
                          {getTopRecommendation?.role || 'Complete more tasks to see alignment'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                      <div className="flex-1">
                        <p className="font-medium">Skill Gap Training</p>
                        <p className="text-xs text-muted-foreground">
                          Focus on: {getTopRecommendation?.missingSkills.slice(0, 2).join(', ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <div className="flex-1">
                        <p className="font-medium">Market Preparation</p>
                        <p className="text-xs text-muted-foreground">
                          Build portfolio, network, prepare for interviews
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <Button className="w-full">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Create Learning Plan
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Helper functions for salary ranges and growth rates
 */
function getSalaryRange(roleKey: string): string {
  const ranges: Record<string, string> = {
    'full-stack-developer': '$85k - $160k',
    'project-manager': '$70k - $140k',
    'data-analyst': '$60k - $120k',
    'designer': '$55k - $110k',
    'product-manager': '$90k - $180k',
    'ai-ml-engineer': '$100k - $180k',
    'cybersecurity': '$80k - $160k',
    'devops': '$85k - $150k',
    'sales-engineering': '$75k - $150k',
    'technical-writing': '$60k - $100k',
  };
  return ranges[roleKey] || '$60k - $120k';
}

function getGrowthRate(roleKey: string): number {
  const rates: Record<string, number> = {
    'full-stack-developer': 15,
    'project-manager': 8,
    'data-analyst': 25,
    'designer': 5,
    'product-manager': 12,
    'ai-ml-engineer': 35,
    'cybersecurity': 32,
    'devops': 22,
    'sales-engineering': 18,
    'technical-writing': 7,
  };
  return rates[roleKey] || 10;
}