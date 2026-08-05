"use client";

import { useState, useEffect } from "react";
import { Flame, CheckCircle2, Brain, Target, RefreshCw, BarChart3, Award, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

interface HabitLoopProps {
  tasks: Array<{
    id: number;
    name: string;
    completed: boolean;
    deadline?: string | null;
  }>;
}

export function HabitLoopEngine({ tasks }: HabitLoopProps) {
  const [habitLoops, setHabitLoops] = useState([]);
  const [activeLoop, setActiveLoop] = useState<null | number>(null);
  const [reflection, setReflection] = useState({
    rating: 3,
    notes: "",
    energy_level: 5 as 1 | 2 | 3 | 4 | 5,
  });

  // Habit Loop data (simplified for demo)
  const defaultHabits = [
    {
      id: 1,
      name: "Morning Planning",
      description: "Review daily goals each morning",
      cue: "When I wake up",
      reward: "Feel prepared for the day",
      streak: 12,
      success_score: 0.85,
      completion_rate: 0.78,
      prediction_7days: 72,
    },
    {
      id: 2,
      name: "Evening Review",
      description: "Reflect on completed tasks before bed",
      cue: "When I get home",
      reward: "Sense of accomplishment",
      streak: 7,
      success_score: 0.72,
      completion_rate: 0.65,
      prediction_7days: 58,
    },
  ];

  const completionHabits = [
    {
      id: 3,
      name: "Deep Work Session",
      description: "Complete 90-minute focused work block",
      streak: 5,
      success_score: 0.65,
      completion_rate: 0.58,
      optimal_time: "10:00",
      prediction_7days: 65,
    },
    {
      id: 4,
      name: "Learning Hour",
      description: "Dedicated time for skill development",
      streak: 3,
      success_score: 0.55,
      completion_rate: 0.50,
      optimal_time: "19:00",
      prediction_7days: 52,
    },
  ];

  const getCurrentStreak = (habits: typeof defaultHabits) => {
    const activeStreaks = habits.filter(h => h.streak > 0);
    return activeStreaks.reduce((sum, h) => sum + h.streak, 0);
  };

  const handleCompleteHabit = (loopId: number) => {
    // In real implementation, this would call the server action
    console.log("Complete habit:", loopId, reflection);
    // Refresh habit data
  };

  const getSuccessLevel = (score: number) => {
    if (score >= 0.9) return { label: "Excellent", color: "text-green-600" };
    if (score >= 0.7) return { label: "Good", color: "text-amber-500" };
    if (score >= 0.5) return { label: "Fair", color: "text-yellow-500" };
    return { label: "Needs Work", color: "text-red-500" };
  };

  const successLevel = getSuccessLevel(0.75);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5" />
              Total Streak Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{getCurrentStreak(defaultHabits)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Brain className="h-3.5 w-3.5" />
              Avg Success Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {Math.round(
                (defaultHabits.reduce((sum, h) => sum + h.success_score, 0) / defaultHabits.length) * 100
              )}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" />
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {Math.round(
                (defaultHabits.reduce((sum, h) => sum + h.completion_rate, 0) / defaultHabits.length) * 100
              )}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              Habit Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge className={successLevel.color}>{successLevel.label}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Habit Loop Framework */}
      <Card>
        <CardHeader>
          <CardTitle>Habit Loop Framework</CardTitle>
          <CardDescription>
            The complete cycle for sustainable habit formation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-5 gap-4">
            {[
              { step: "Cue (Trigger)", icon: "🔔", description: "What triggers the habit?" },
              { step: "Craving", icon: "🧠", description: "Wanting the reward" },
              { step: "Response", icon: "✅", description: "The habit itself" },
              { step: "Reward", icon: "🎉", description: "Positive reinforcement" },
              { step: "Reflection", icon: "💭", description: "What worked? What didn't?" },
            ].map((item, i) => (
              <div key={i} className="text-center p-4 bg-muted/30 rounded-lg">
                <div className="text-2xl mb-2">{item.icon}</div>
                <h4 className="font-medium text-sm mb-1">{item.step}</h4>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Habits */}
      <Card>
        <CardHeader>
          <CardTitle>Active Habits</CardTitle>
          <CardDescription>
            Track your habit streaks and success rates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {completionHabits.map((habit) => (
              <div
                key={habit.id}
                className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-medium">{habit.name}</h4>
                    <p className="text-sm text-muted-foreground">{habit.description}</p>
                    {habit.optimal_time && (
                      <p className="text-xs text-muted-foreground">
                        Optimal time: {habit.optimal_time}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="ml-3">
                    {habit.streak} day streak
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {Math.round(habit.success_score * 100)}%
                    </p>
                    <p className="text-xs text-muted-foreground">Success</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{habit.streak}</p>
                    <p className="text-xs text-muted-foreground">Streak</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {habit.prediction_7days || "--"}%
                    </p>
                    <p className="text-xs text-muted-foreground">7d Prediction</p>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <Progress value={habit.success_score * 100} className="h-2" />
                  <Button size="sm" variant="outline" className="w-full">
                    Log Completion
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Habit Stacking */}
      <Card>
        <CardHeader>
          <CardTitle>Habit Stacking</CardTitle>
          <CardDescription>
            Link habits together: "After X, I will do Y"
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">After existing habits:</h4>
              <div className="space-y-2">
                {[
                  { after: "Morning coffee", habit: "Review daily goals" },
                  { after: "Lunch", habit: "Take a 5-min walk" },
                  { after: "Finish work", habit: "30-min learning session" },
                ].map((stack, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">
                      <span className="font-medium">After</span> " {stack.after}"
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-sm">{stack.habit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Build new stacks:</h4>
              <form className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="After habit..." />
                  <Input placeholder="New habit to do..." />
                </div>
                <Button size="sm" variant="outline">
                  Add Stack
                </Button>
              </form>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Implementation Intentions */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Intentions</CardTitle>
          <CardDescription>
            "When [trigger], I will [response]" - concrete plans for habit success
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { trigger: "When I feel stressed", response: "Take 3 deep breaths" },
              { trigger: "When I reach my desk", response: "Review my top 3 priorities" },
              { trigger: "When I hit 2pm energy dip", response: "Take a 5-minute walk" },
            ].map((intent, i) => (
              <div key={i} className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm">
                  <span className="font-medium">When:</span> {intent.trigger}
                </p>
                <p className="text-sm">
                  <span className="font-medium">I will:</span> {intent.response}
                </p>
              </div>
            ))}

            <form className="space-y-3 pt-3 border-t">
              <Input placeholder="When [trigger situation]..." />
              <Input placeholder="I will [specific action]..." />
              <Button size="sm" variant="outline">
                Add Intention
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Habit Score Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Habit Score Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Progress this week</h4>
              <div className="h-8 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-green-600"
                  style={{ width: "78%" }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                11 of 14 planned habit completions completed
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">Suggestions for improvement</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2">
                  <span className="text-primary font-bold">✓</span>
                  <span>Track energy levels when doing habits</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">✓</span>
                  <span>Set reminders at cue times</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-500 font-bold">⚠</span>
                  <span>Consider reducing habit difficulty - you're overcommitted</span>
                </li>
              </ul>
            </div>

            <Button variant="outline" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Analysis
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Achievement Badges */}
      <Card>
        <CardHeader>
          <CardTitle>Habit Achievements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className={cn(
              "p-3 rounded-lg border text-center",
              completionHabits.some(h => h.streak >= 7) ? "border-yellow-400 bg-yellow-50" : "border-muted bg-muted/30 opacity-50"
            )}>
              <div className="text-2xl mb-1">🔥</div>
              <div className="text-xs font-medium">7-Day Streak</div>
            </div>
            <div className={cn(
              "p-3 rounded-lg border text-center",
              completionHabits.some(h => h.streak >= 30) ? "border-green-400 bg-green-50" : "border-muted bg-muted/30 opacity-50"
            )}>
              <div className="text-2xl mb-1">🌟</div>
              <div className="text-xs font-medium">30-Day Streak</div>
            </div>
            <div className={cn(
              "p-3 rounded-lg border text-center",
              completionHabits.some(h => h.success_score >= 0.8) ? "border-blue-400 bg-blue-50" : "border-muted bg-muted/30 opacity-50"
            )}>
              <div className="text-2xl mb-1">🎯</div>
              <div className="text-xs font-medium">80% Success</div>
            </div>
            <div className={cn(
              "p-3 rounded-lg border text-center",
              completionHabits.some(h => h.streak >= 100) ? "border-purple-400 bg-purple-50" : "border-muted bg-muted/30 opacity-50"
            )}>
              <div className="text-2xl mb-1">👑</div>
              <div className="text-xs font-medium">Century Club</div>
            </div>
            <div className="p-3 rounded-lg border text-center border-muted bg-muted/30 opacity-50">
              <div className="text-2xl mb-1">📚</div>
              <div className="text-xs font-medium">Stack Master</div>
            </div>
            <div className={cn(
              "p-3 rounded-lg border text-center",
              defaultHabits.every(h => h.completion_rate > 0.5) ? "border-indigo-400 bg-indigo-50" : "border-muted bg-muted/30 opacity-50"
            )}>
              <div className="text-2xl mb-1">💪</div>
              <div className="text-xs font-medium">Consistent Developer</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}