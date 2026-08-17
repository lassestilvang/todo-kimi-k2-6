'use client';

import { useState, useEffect } from 'react';
import { Battery, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import {
  useEnergyBudget,
  useMoodTracking,
} from '@/hooks/use-enhanced-productivity';

interface EnergyBudgetWidgetProps {
  className?: string;
}

export function EnergyBudgetWidget({ className }: EnergyBudgetWidgetProps) {
  const { profile, budget, loading, logEnergy, updateProfile } =
    useEnergyBudget();
  const { getRecommendations } = useMoodTracking();

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse">Loading energy data...</div>
        </CardContent>
      </Card>
    );
  }

  const handleEnergyLog = async (spent: number) => {
    await logEnergy({
      date: new Date().toISOString().split('T')[0],
      energy_spent: spent,
      activities: [
        {
          task_id: null,
          energy_cost: spent,
          timestamp: new Date().toISOString(),
        },
      ],
    });
  };

  const handleMoodLog = async () => {
    const res = await getRecommendations();
    // Mood logging would typically come from a form
    return res;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Energy Budget Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Battery className="h-5 w-5" />
            Energy Budget
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-2xl font-bold">
                  {budget?.balance ?? 100}/{budget?.dailyLimit ?? 100}
                </span>
                <span className="text-sm text-muted-foreground">points</span>
              </div>
              <Progress
                value={
                  ((budget?.balance ?? 100) / (budget?.dailyLimit ?? 100)) * 100
                }
                className="h-3"
              />
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-lg font-bold">{budget?.spent ?? 0}</p>
                <p className="text-xs text-muted-foreground">Spent</p>
              </div>
              <div className="border-l border-r border-muted">
                <p className="text-lg font-bold">{budget?.recovered ?? 0}</p>
                <p className="text-xs text-muted-foreground">Recovered</p>
              </div>
              <div>
                <p className="text-lg font-bold">
                  {Math.max(0, (budget?.balance ?? 100) - (budget?.spent ?? 0))}
                </p>
                <p className="text-xs text-muted-foreground">Available</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Energy Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => handleEnergyLog(5)}
          >
            <Clock className="h-4 w-4 mr-2" />
            Log 5-min Task (+5 energy)
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => handleEnergyLog(15)}
          >
            <Clock className="h-4 w-4 mr-2" />
            Log 15-min Task (+15 energy)
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => handleEnergyLog(30)}
          >
            <Clock className="h-4 w-4 mr-2" />
            Log 30-min Task (+30 energy)
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => handleMoodLog()}
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            Get Mood-Based Recommendations
          </Button>
        </CardContent>
      </Card>

      {/* Energy Profile */}
      {profile && (
        <Card>
          <CardHeader>
            <CardTitle>Your Energy Peaks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {profile.peak_energy_times?.map((peak, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {peak.start} - {peak.end}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
