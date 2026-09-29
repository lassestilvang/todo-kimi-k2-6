'use client';

import { GamificationLeaderboard } from '@/components/task/gamification-leaderboard';
import { Trophy } from 'lucide-react';

export default function GamificationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Trophy className="h-8 w-8" />
          Achievements & Leaderboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Earn XP, unlock badges, and climb the ranks
        </p>
      </div>

      <GamificationLeaderboard />
    </div>
  );
}