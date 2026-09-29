'use client';

import { useState, useEffect } from 'react';
import {
  Trophy,
  ShieldAlert,
  Users,
  Mic,
  FileText,
  ShoppingBag,
  Bot,
  Bell,
  ChevronRight,
  Sparkles,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { calculateUserLevel } from '@/lib/actions/gamification';
import { getRiskDashboard } from '@/lib/actions/risk-assessment';
import { generateDailyDigest } from '@/lib/actions/notification-digest';
import { getFeed } from '@/lib/actions/social-feed';

interface CommandCenterData {
  level: { level: number; rank: string; total_xp: number; tasks_completed: number } | null;
  risk: { total_risks: number; critical_risks: number; high_risks: number } | null;
  digest: { overdue: unknown[]; due_today: unknown[]; upcoming: unknown[]; completed_today: number } | null;
  feed: { recent_count: number; team_activity: number } | null;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: typeof Trophy;
  href: string;
  color: string;
  badge?: string | number;
}

export function CommandCenter() {
  const { user } = useAuth();
  const [data, setData] = useState<CommandCenterData>({
    level: null,
    risk: null,
    digest: null,
    feed: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    loadAll();
  }, [user?.id]);

  const loadAll = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [level, risk, digest, feed] = await Promise.allSettled([
        calculateUserLevel(user.id),
        getRiskDashboard(),
        generateDailyDigest(user.id),
        getFeed({ limit: 5 }),
      ]);

      setData({
        level: level.status === 'fulfilled' ? level.value : null,
        risk: risk.status === 'fulfilled' ? risk.value : null,
        digest: digest.status === 'fulfilled' ? digest.value : null,
        feed: feed.status === 'fulfilled' ? { recent_count: feed.value.length, team_activity: feed.value.length } : null,
      });
    } finally {
      setLoading(false);
    }
  };

  const quickActions: QuickAction[] = [
    {
      id: 'voice',
      title: 'Voice Command',
      description: 'Create tasks hands-free',
      icon: Mic,
      href: '/labs/voice-control',
      color: 'text-purple-500',
    },
    {
      id: 'meeting',
      title: 'Meeting Assistant',
      description: 'AI-powered notes & action items',
      icon: Bot,
      href: '/labs/meeting-assistant',
      color: 'text-blue-500',
    },
    {
      id: 'wiki',
      title: 'Project Wiki',
      description: 'Knowledge base & docs',
      icon: FileText,
      href: '/labs/project-wiki',
      color: 'text-green-500',
    },
    {
      id: 'marketplace',
      title: 'Task Marketplace',
      description: 'Trade tasks with team',
      icon: ShoppingBag,
      href: '/labs/marketplace',
      color: 'text-orange-500',
    },
    {
      id: 'gamification',
      title: 'Achievements',
      description: 'Track your progress',
      icon: Trophy,
      href: '/labs/gamification',
      color: 'text-yellow-500',
    },
    {
      id: 'social',
      title: 'Team Feed',
      description: 'See team activity',
      icon: Users,
      href: '/labs/social-feed',
      color: 'text-pink-500',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <Card className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">
                Welcome back, {user?.name || 'Commander'}!
              </h2>
              <p className="text-muted-foreground">
                Your AI-powered productivity command center
              </p>
            </div>
            {data.level && (
              <div className="text-right">
                <div className="text-3xl font-bold">Level {data.level.level}</div>
                <Badge variant="secondary">{data.level.rank}</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">
                  {data.digest?.completed_today ?? 0}
                </div>
                <div className="text-xs text-muted-foreground">Completed today</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Bell className="h-8 w-8 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">
                  {(data.digest?.overdue?.length ?? 0) + (data.digest?.due_today?.length ?? 0)}
                </div>
                <div className="text-xs text-muted-foreground">Need attention</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-8 w-8 text-red-500" />
              <div>
                <div className="text-2xl font-bold">
                  {(data.risk?.critical_risks ?? 0) + (data.risk?.high_risks ?? 0)}
                </div>
                <div className="text-xs text-muted-foreground">High risks</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">
                  {data.level?.total_xp ?? 0}
                </div>
                <div className="text-xs text-muted-foreground">Total XP</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Jump to any of your AI-powered tools</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {quickActions.map(action => {
              const Icon = action.icon;
              return (
                <Link key={action.id} href={action.href}>
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto py-3 hover:bg-muted/50"
                  >
                    <Icon className={`h-5 w-5 mr-3 ${action.color}`} />
                    <div className="text-left flex-1">
                      <div className="font-medium text-sm">{action.title}</div>
                      <div className="text-xs opacity-70">{action.description}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 ml-2 opacity-50" />
                  </Button>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Activity insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Your Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Level</span>
                <span className="font-bold">{data.level?.level ?? 1}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Rank</span>
                <Badge variant="secondary">{data.level?.rank ?? 'Bronze'}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tasks Completed</span>
                <span className="font-bold">{data.level?.tasks_completed ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total XP</span>
                <span className="font-bold">{data.level?.total_xp ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-500" />
              Risk Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Risks</span>
                <span className="font-bold">{data.risk?.total_risks ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Critical</span>
                <Badge variant="destructive">{data.risk?.critical_risks ?? 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">High</span>
                <Badge variant="default">{data.risk?.high_risks ?? 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Team Activity</span>
                <Badge variant="outline">{data.feed?.team_activity ?? 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
