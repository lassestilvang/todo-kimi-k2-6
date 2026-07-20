// @ts-nocheck
"use client";

import { useMemo } from "react";
import { Award, Flame, Target, Zap, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TaskWithRelations, Goal } from "@/types";
import { calculateAchievements, getUnlockedAchievements, calculateSkillPoints, type AchievementTier } from "@/lib/gamification";

const TIER_CONFIG: Record<AchievementTier, { color: string; label: string }> = {
  bronze: { color: "bg-amber-600", label: "Bronze" },
  silver: { color: "bg-slate-400", label: "Silver" },
  gold: { color: "bg-yellow-500", label: "Gold" },
  platinum: { color: "bg-purple-500", label: "Platinum" },
  legendary: { color: "bg-gradient-to-r from-yellow-400 to-orange-500", label: "Legendary" },
};

export function AchievementsWall({ tasks, goals, className }: { tasks: TaskWithRelations[], goals: Goal[], className?: string }) {
  const unlockedAchievements = useMemo(() => {
    const context = {
      tasks,
      goals,
      streakDays: 0,
      totalCompleted: tasks.filter((t) => t.completed).length,
      totalHoursLogged: 0,
    };
    const all = calculateAchievements(context);
    return getUnlockedAchievements(all);
  }, [tasks, goals]);

  const skillPoints = useMemo(() => calculateSkillPoints(tasks), [tasks]);
  const avgSkill = Object.values(skillPoints).reduce((a, b) => a + b, 0) / 4;

  return (
    <div className={cn("space-y-6", className)}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Unlocks</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{unlockedAchievements.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Skill Level</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{avgSkill >= 80 ? "Expert" : avgSkill >= 50 ? "Intermediate" : "Beginner"}</p></CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {unlockedAchievements.map((a) => (
          <div key={a.id} className="flex flex-col items-center p-3 bg-muted/50 rounded-lg">
            <span className="text-2xl">{a.icon}</span>
            <span className="text-xs">{a.name}</span>
            <Badge className={TIER_CONFIG[a.tier].color}>{TIER_CONFIG[a.tier].label}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}