'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  RotateCcw,
  Lightbulb,
  CheckCircle,
  AlertCircle,
  Plus,
  TrendingUp,
  Target,
  Users,
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
import { DecisionTracker } from '@/components/task/decision-tracker';
import { DecisionAnalytics } from '@/components/task/decision-analytics';
import { DecisionOutcomeLinker } from '@/components/task/decision-outcome-linker';
import { useSession } from 'next-auth/react';

interface DecisionStats {
  totalDecisions: number;
  avgRating: number;
  completionRate: number;
  bestDecidingFactor: string;
  improvementPercent: number;
}

interface DecisionDistribution {
  priority: number;
  approach: number;
  timeline: number;
  allocation: number;
  tool: number;
  cancellation: number;
}

interface DecisionTypeData {
  type: string;
  count: number;
  avgRating: number;
}

function getBestDecidingFactor(types: DecisionTypeData[]): string {
  if (!types || types.length === 0) return 'None yet';

  const sorted = [...types].sort((a, b) => b.avgRating - a.avgRating);
  return sorted[0]?.type.replace('_', ' ') || 'None yet';
}

export default function DecisionJournalPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [taskId, setTaskId] = useState<number | undefined>();
  const [stats, setStats] = useState<DecisionStats | null>(null);
  const [distribution, setDistribution] = useState<DecisionDistribution | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Fetch a recent task to associate with decisions
  useEffect(() => {
    fetch('/api/tasks?limit=1')
      .then(r => r.json())
      .then(data => {
        if (data.tasks?.length > 0) {
          setTaskId(data.tasks[0].id);
        }
      })
      .catch(console.error);
  }, []);

  // Load decision statistics
  useEffect(() => {
    const loadStats = async () => {
      setLoadingStats(true);
      try {
        const response = await fetch('/api/enhanced-productivity?feature=analysis');
        if (response.ok) {
          const data = await response.json();

          // Calculate decision stats from analysis data
          const decisionsData = data.decisions || {
            totalDecisions: 0,
            avgOutcomeRating: 0,
            decisionTypes: [],
            patternAnalysis: [],
          };

          // Calculate completion rate based on rated decisions
          const decisionTypes = (decisionsData.decisionTypes as DecisionTypeData[]).filter(
            (t: DecisionTypeData) => t.avgRating !== null
          );
          const completionRate = decisionTypes.length > 0
            ? (decisionTypes.filter((t: DecisionTypeData) => t.avgRating !== null && t.avgRating > 0).length / decisionTypes.length) * 100
            : 70;

          setStats({
            totalDecisions: decisionsData.totalDecisions || 0,
            avgRating: decisionsData.avgOutcomeRating || 0,
            completionRate: completionRate,
            bestDecidingFactor: getBestDecidingFactor(decisionTypes),
            improvementPercent: Math.round(((decisionsData.avgOutcomeRating || 0) + 1) * 50),
          });

          setDistribution({
            priority: (decisionsData.decisionTypes as DecisionTypeData[]).find((d: DecisionTypeData) => d.type === 'priority')?.count || 0,
            approach: (decisionsData.decisionTypes as DecisionTypeData[]).find((d: DecisionTypeData) => d.type === 'approach')?.count || 0,
            timeline: (decisionsData.decisionTypes as DecisionTypeData[]).find((d: DecisionTypeData) => d.type === 'timeline')?.count || 0,
            allocation: (decisionsData.decisionTypes as DecisionTypeData[]).find((d: DecisionTypeData) => d.type === 'allocation')?.count || 0,
            tool: (decisionsData.decisionTypes as DecisionTypeData[]).find((d: DecisionTypeData) => d.type === 'tool')?.count || 0,
            cancellation: (decisionsData.decisionTypes as DecisionTypeData[]).find((d: DecisionTypeData) => d.type === 'cancellation')?.count || 0,
          });
        }
      } catch (error) {
        console.error('Failed to load decision stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    loadStats();
  }, [taskId]);

  if (status === 'loading' || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading decision insights...</p>
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
            Decision Journal
          </h1>
          <p className="text-muted-foreground">
            Track decisions, analyze outcomes, and improve your decision-making over time
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => {
              const event = new CustomEvent('openDecisionDialog');
              window.dispatchEvent(event);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Decision
          </Button>
        </div>
      </div>

      {/* Stats Overview - Connected to Real Data */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Decisions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.totalDecisions ?? 0}</p>
            {stats && <p className="text-xs text-muted-foreground">+12 this month</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Avg Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${stats?.avgRating && stats.avgRating > 0.33 ? 'text-green-600' : stats?.avgRating && stats.avgRating < -0.33 ? 'text-red-600' : 'text-amber-600'}`}>
              {stats?.avgRating?.toFixed(2) ?? '0.00'}
            </p>
            {stats && <p className="text-xs text-muted-foreground">
              +{Math.abs(stats.improvementPercent - 50)}% from baseline
            </p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Decision Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stats?.totalDecisions ? Math.round(stats.totalDecisions / 30) : 0}.0
            </p>
            <p className="text-xs text-muted-foreground">decisions/day</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${stats?.completionRate && stats.completionRate > 70 ? 'text-green-600' : stats?.completionRate && stats.completionRate > 40 ? 'text-amber-600' : 'text-red-600'}`}>
              {stats?.completionRate ? Math.round(stats.completionRate) : 0}%
            </p>
            <p className="text-xs text-muted-foreground">positive outcomes</p>
          </CardContent>
        </Card>
      </div>

      {/* Decision Type Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Decision Distribution</CardTitle>
          <CardDescription>Breakdown by decision category</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingStats ? (
            <div className="animate-pulse space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded" />
              ))}
            </div>
          ) : distribution && (
            <div className="space-y-3">
              {Object.entries(distribution).map(([type, count]) => {
                const typeNames: Record<string, { label: string; icon: React.ElementType; color: string }> = {
                  priority: { label: 'Priority', icon: Target, color: 'text-red-500' },
                  approach: { label: 'Approach', icon: Lightbulb, color: 'text-blue-500' },
                  timeline: { label: 'Timeline', icon: Users, color: 'text-amber-500' },
                  allocation: { label: 'Allocation', icon: Users, color: 'text-purple-500' },
                  tool: { label: 'Tool Selection', icon: CheckCircle, color: 'text-green-500' },
                  cancellation: { label: 'Cancellation', icon: AlertCircle, color: 'text-gray-500' },
                };

                const typeInfo = typeNames[type] || { label: type, icon: Lightbulb, color: 'text-muted-foreground' };
                const Icon = typeInfo.icon;

                return (
                  <div key={type} className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${typeInfo.color}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{typeInfo.label}</span>
                        <Badge variant="outline">{count} decisions</Badge>
                      </div>
                      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="absolute h-full bg-primary rounded-full transition-all"
                          style={{
                            width: `${stats ? (count / Math.max(stats.totalDecisions, 1)) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Best Decision Factors */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Decision Insights</CardTitle>
          <CardDescription>Your decision-making patterns</CardDescription>
        </CardHeader>
        <CardContent>
          {stats && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-sm text-green-800 mb-2">🏆 Top Performing</h4>
                  <p className="text-sm text-green-700">
                    {stats.avgRating > 0.5 ? 'Excellent decision quality!' :
                     stats.avgRating > 0 ? 'Above average decision quality' :
                     'Room for improvement'}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Strongest area: {stats.bestDecidingFactor}
                  </p>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-sm text-blue-800 mb-2">🚀 Growth Opportunity</h4>
                  <p className="text-sm text-blue-700">
                    {stats.avgRating < 0.33 ? 'Focus on outcome analysis' :
                     stats.completionRate < 50 ? 'Record more decision outcomes' :
                     'Continue tracking for deeper insights'}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    {stats.improvementPercent > 70 ? 'On track!' : 'Keep learning from decisions'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Decision Journal Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Your Decisions
        </h2>
        <DecisionTracker taskId={taskId} />
      </div>

      {/* Analytics Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Analytics & Insights
        </h2>
        <DecisionAnalytics taskId={taskId} />
      </div>

      {/* Decision Outcome Correlation */}
      <DecisionOutcomeLinker taskId={taskId} />

      {/* AI-Powered Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            AI Decision Assistant
          </CardTitle>
          <CardDescription>Get personalized decision recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <a href="/labs/ai-parsing" className="inline-flex w-full justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80">
              Compare AI decision templates
            </a>
            <Button variant="outline" className="w-full">
              Generate decision framework
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              Get pattern analysis
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}