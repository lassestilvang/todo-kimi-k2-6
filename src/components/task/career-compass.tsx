'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Compass,
  Award,
  Lightbulb,
  CheckCircle,
  MapPin,
  GraduationCap,
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
  role: string;
  company: string;
  matchScore: number;
  requiredSkills: string[];
  yourSkills: string[];
  missingSkills: string[];
  nextSteps: string[];
}

interface CareerCompassProps {
  skills?: Skill[];
}

const careerPaths: Record<string, CareerPath> = {
  'full-stack-developer': {
    role: 'Full Stack Developer',
    company: 'Tech Companies',
    matchScore: 0,
    requiredSkills: [
      'development',
      'design',
      'planning',
      'technical',
      'research',
    ],
    yourSkills: [],
    missingSkills: [],
    nextSteps: [],
  },
  'project-manager': {
    role: 'Project Manager',
    company: 'Enterprise / Agencies',
    matchScore: 0,
    requiredSkills: [
      'planning',
      'leadership',
      'communication',
      'project-management',
    ],
    yourSkills: [],
    missingSkills: [],
    nextSteps: [],
  },
  'data-analyst': {
    role: 'Data Analyst',
    company: 'Analytics Firms',
    matchScore: 0,
    requiredSkills: ['research', 'analytical', 'writing', 'development'],
    yourSkills: [],
    missingSkills: [],
    nextSteps: [],
  },
  designer: {
    role: 'UI/UX Designer',
    company: 'Design Studios',
    matchScore: 0,
    requiredSkills: ['design', 'communication', 'creative', 'research'],
    yourSkills: [],
    missingSkills: [],
    nextSteps: [],
  },
  'product-manager': {
    role: 'Product Manager',
    company: 'SaaS Companies',
    matchScore: 0,
    requiredSkills: ['planning', 'leadership', 'communication', 'research'],
    yourSkills: [],
    missingSkills: [],
    nextSteps: [],
  },
};

export function CareerCompass({ skills = [] }: CareerCompassProps) {
  const [recommendations, setRecommendations] = useState<CareerPath[]>([]);
  const [loading, setLoading] = useState(true);

  const skillNames = new Set(skills.map(s => s.skill_name.toLowerCase()));

  const generateCareerPaths = useMemo(() => {
    const paths = Object.entries(careerPaths).map(([key, path]) => {
      // Calculate match score
      const matchedSkills = path.requiredSkills.filter(skill =>
        skillNames.has(skill)
      );
      const skillMatchCount = matchedSkills.length;
      const totalRequired = path.requiredSkills.length;
      const missingSkills = path.requiredSkills.filter(
        skill => !skillNames.has(skill)
      );

      const matchScore = Math.round((skillMatchCount / totalRequired) * 100);

      // Calculate next steps
      const nextSteps =
        missingSkills.length > 0
          ? missingSkills.slice(0, 3).map(s => `Learn ${s} skill`)
          : ['Ready to apply for roles in this area', 'Build a portfolio'];

      return {
        ...path,
        matchScore,
        yourSkills: matchedSkills,
        missingSkills,
        nextSteps,
      };
    });

    // Sort by match score
    return paths.sort((a, b) => b.matchScore - a.matchScore);
  }, [skillNames]);

  useEffect(() => {
    setRecommendations(generateCareerPaths);
    setLoading(false);
  }, [generateCareerPaths]);

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
      {/* Hero Section */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Compass className="h-6 w-6" />
            Career Compass
          </CardTitle>
          <CardDescription>
            Your personalized career guidance based on skills and
            accomplishments
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

              <div className="mb-4">
                <Progress
                  value={getTopRecommendation.matchScore}
                  className="h-2 mb-2"
                />
                <p className="text-sm text-muted-foreground">
                  {getTopRecommendation.matchScore}% match for{' '}
                  {getTopRecommendation.role}
                </p>
              </div>

              <Button
                onClick={() => {
                  toast.success(
                    `Started journey toward ${getTopRecommendation.role}`
                  );
                }}
              >
                Start Learning Path
              </Button>
            </div>
          ) : (
            <div className="text-center py-6">
              <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h4 className="font-medium mb-2">
                Complete more tasks to unlock career insights
              </h4>
              <p className="text-sm text-muted-foreground">
                We will match your skills to career opportunities as you grow
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Career Paths Grid */}
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
                className={
                  isRecommended ? 'border-purple-200 bg-purple-50/50' : ''
                }
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
                    {/* Match Score */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Match Score</span>
                        <span>{path.matchScore}%</span>
                      </div>
                      <Progress value={path.matchScore} className="h-2" />
                    </div>

                    {/* Skills Match */}
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-1">
                        Skills Match
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
                          Gap to Close
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
                      <h4 className="text-xs font-medium text-muted-foreground mb-1">
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

                    {/* Action */}
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

      {/* Career Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Career Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recommendations.length > 0 ? (
              <>
                <div className="p-3 bg-amber-50/50 rounded-lg">
                  <p className="text-sm">
                    <strong>Top Skill:</strong>{' '}
                    {skills.reduce(
                      (max, s) =>
                        s.proficiency_level >
                        (max.skill?.proficiency_level || 0)
                          ? { skill: s, proficiency: s.proficiency_level }
                          : max,
                      {} as { skill?: Skill; proficiency: number }
                    ).skill?.skill_name || 'None'}
                  </p>
                </div>

                <div className="p-3 bg-green-50/50 rounded-lg">
                  <p className="text-sm">
                    <strong>Recommendation:</strong> Focus on{' '}
                    {recommendations[0]?.missingSkills[0]} skill to unlock{' '}
                    {recommendations[0]?.role} role
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Complete more tasks to unlock personalized career
                recommendations
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
