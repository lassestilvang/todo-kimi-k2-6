'use client';

import { useState, useEffect } from 'react';
import {
  Brain,
  AlertCircle,
  CheckCircle,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useCognitiveLoad } from '@/hooks/use-enhanced-productivity';

interface CognitiveLoadIndicatorProps {
  className?: string;
}

export function CognitiveLoadIndicator({
  className,
}: CognitiveLoadIndicatorProps) {
  const { analysis, loading } = useCognitiveLoad();
  const [localLoad, setLocalLoad] = useState({
    tasks: 5,
    completed: 3,
    energy: 4,
  });

  useEffect(() => {
    if (analysis) {
      setLocalLoad({
        tasks: analysis.avgTaskCount || 5,
        completed: Math.round((analysis.completionRate || 0.5) * 10),
        energy: analysis.avgEnergyLevel || 3,
      });
    }
  }, [analysis]);

  if (loading) return null;

  const completionRate =
    localLoad.tasks > 0 ? (localLoad.completed / localLoad.tasks) * 100 : 0;

  const loadLevel =
    completionRate < 50
      ? 'overloaded'
      : completionRate < 75
        ? 'attention'
        : 'healthy';

  return (
    <Card
      className={`bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 ${className}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Brain className="h-5 w-5 text-purple-600" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Cognitive Load Status</span>
              {loadLevel === 'overloaded' && (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              {loadLevel === 'attention' && (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              )}
              {loadLevel === 'healthy' && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </div>

            <div className="text-sm text-muted-foreground mb-2">
              {analysis?.loadTrend === 'increasing' && (
                <TrendingUp className="h-3 w-3 inline mr-1" />
              )}
              {analysis?.loadTrend === 'decreasing' && (
                <TrendingDown className="h-3 w-3 inline mr-1" />
              )}
              {analysis?.recommendations?.[0]}
            </div>

            <div className="space-y-2">
              <div>
                <span className="text-xs text-muted-foreground">
                  Tasks: {localLoad.tasks} ({completionRate.toFixed(0)}%
                  completed)
                </span>
                <Progress value={completionRate} className="h-2 mt-1" />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold">{localLoad.energy}/5</p>
                  <p className="text-xs text-muted-foreground">Energy</p>
                </div>
                <div>
                  <p className="text-lg font-bold">
                    {analysis?.avgFocusBlocks ?? 2}
                  </p>
                  <p className="text-xs text-muted-foreground">Focus Blocks</p>
                </div>
                <div>
                  <p className="text-lg font-bold">
                    {analysis?.avgInterruptions ?? 1}
                  </p>
                  <p className="text-xs text-muted-foreground">Interruptions</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default CognitiveLoadIndicator;
