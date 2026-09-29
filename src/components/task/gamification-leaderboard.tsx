'use client';

import { useState, useEffect } from 'react';
import {
  Trophy,
  Star,
  Award,
  Target,
  Flame,
  Zap,
  Crown,
  Medal,
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
import { calculateUserLevel, getUserAchievements, getLeaderboard, checkAchievements } from '@/lib/actions/gamification';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

interface UserLevel {
  user_id: number;
  level: number;
  total_xp: number;
  xp_to_next_level: number;
  rank: string;
  badges_earned: number;
  tasks_completed: number;
}

interface Achievement {
  id: number;
  user_id: number;
  achievement_type: string;
  title: string;
  description: string;
  badge_icon: string;
  badge_color: string;
  xp_reward: number;
  unlocked_at: string;
}

interface LeaderboardEntry {
  user_id: number;
  user_name: string;
  level: number;
  total_xp: number;
  tasks_completed: number;
  rank: number;
}

export function GamificationLeaderboard() {
  const [level, setLevel] = useState<UserLevel | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Check for new achievements
      const newAchievements = await checkAchievements(user.id);
      if (newAchievements.length > 0) {
        toast.success(
          `🏆 Unlocked ${newAchievements.length} new achievement${newAchievements.length > 1 ? 's' : ''}!`
        );
      }

      const [levelData, achievementData, leaderboardData] = await Promise.all([
        calculateUserLevel(user.id),
        getUserAchievements(user.id),
        getLeaderboard(20),
      ]);

      setLevel(levelData);
      setAchievements(achievementData);
      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-orange-500" />;
      default:
        return <span className="text-sm font-bold">#{rank}</span>;
    }
  };

  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'Diamond':
        return 'bg-gradient-to-r from-blue-400 to-cyan-300 text-white';
      case 'Platinum':
        return 'bg-gradient-to-r from-gray-300 to-gray-100 text-gray-900';
      case 'Gold':
        return 'bg-gradient-to-r from-yellow-400 to-yellow-200 text-yellow-900';
      case 'Silver':
        return 'bg-gradient-to-r from-gray-400 to-gray-200 text-gray-900';
      case 'Bronze':
        return 'bg-gradient-to-r from-orange-400 to-orange-200 text-orange-900';
      default:
        return 'bg-gray-200 text-gray-900';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Level Card */}
      {level && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Your Level
                </CardTitle>
                <CardDescription>Track your progress and achievements</CardDescription>
              </div>
              <Badge className={`${getRankColor(level.rank)} border-0`}>
                {level.rank}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {level.level}
                </div>
                <p className="text-xs text-muted-foreground">Level</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {level.total_xp}
                </div>
                <p className="text-xs text-muted-foreground">Total XP</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {level.tasks_completed}
                </div>
                <p className="text-xs text-muted-foreground">Tasks Done</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {level.badges_earned}
                </div>
                <p className="text-xs text-muted-foreground">Badges</p>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>XP to Level {level.level + 1}</span>
                <span>{level.xp_to_next_level} XP needed</span>
              </div>
              <Progress
                value={(level.total_xp % 100) || 100}
                className="h-3"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Your Achievements
          </CardTitle>
          <CardDescription>
            {achievements.length} badges unlocked
          </CardDescription>
        </CardHeader>
        <CardContent>
          {achievements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Complete tasks to unlock achievements!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {achievements.map(achievement => (
                <div
                  key={achievement.id}
                  className="border rounded-lg p-3 text-center hover:shadow-md transition-shadow"
                >
                  <div className="text-3xl mb-2">{achievement.badge_icon}</div>
                  <h4 className="font-medium text-sm">{achievement.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {achievement.description}
                  </p>
                  <Badge variant="outline" className="mt-2 text-xs">
                    +{achievement.xp_reward} XP
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Leaderboard
          </CardTitle>
          <CardDescription>Top performers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {leaderboard.slice(0, 10).map((entry, idx) => (
              <div
                key={entry.user_id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  entry.user_id === user?.id ? 'bg-primary/5 border-primary' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8">
                    {getRankIcon(entry.rank)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {entry.user_name}
                      {entry.user_id === user?.id && (
                        <span className="text-xs text-muted-foreground ml-2">(You)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Level {entry.level} • {entry.tasks_completed} tasks
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">{entry.total_xp} XP</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Daily Challenges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5" />
            Daily Challenges
          </CardTitle>
          <CardDescription>Bonus XP opportunities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { title: 'Complete 3 tasks today', reward: 50, progress: 1, total: 3 },
              { title: 'Reach a 5-day streak', reward: 100, progress: 4, total: 5 },
              { title: 'Complete a high-priority task', reward: 30, progress: 0, total: 1 },
            ].map((challenge, idx) => (
              <div key={idx} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{challenge.title}</h4>
                  <Badge variant="outline">
                    <Zap className="h-3 w-3 mr-1" />
                    {challenge.reward} XP
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>{challenge.progress} / {challenge.total}</span>
                  </div>
                  <Progress
                    value={(challenge.progress / challenge.total) * 100}
                    className="h-2"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}