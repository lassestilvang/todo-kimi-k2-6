'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shuffle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface ContextSwitchStats {
  today_count: number;
  week_count: number;
  avg_session_minutes: number;
  estimated_productivity_drop_pct: number;
  level: 'low' | 'moderate' | 'high' | 'severe';
  recommendation: string;
}

const LEVEL_COLOR: Record<ContextSwitchStats['level'], string> = {
  low: 'text-green-600',
  moderate: 'text-yellow-600',
  high: 'text-orange-600',
  severe: 'text-red-600',
};

export function ContextSwitchMeter() {
  const [stats, setStats] = useState<ContextSwitchStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await fetch('/api/context-switches');
      if (!r.ok) throw new Error('Failed');
      const data = (await r.json()) as { stats: ContextSwitchStats };
      setStats(data.stats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const record = useCallback(async () => {
    try {
      await fetch('/api/context-switches', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      await load();
    } catch {
      toast.error('Could not record');
    }
  }, [load]);

  const reset = useCallback(async () => {
    try {
      await fetch('/api/context-switches', { method: 'DELETE' });
      await load();
      toast.success('Today\'s switches reset');
    } catch {
      toast.error('Could not reset');
    }
  }, [load]);

  if (loading || !stats) {
    return (
      <Card>
        <CardContent className="py-4 text-sm text-muted-foreground">
          Loading switching tax…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <Shuffle className="h-4 w-4" />
            Context-Switching Tax
          </span>
          <Badge
            variant="outline"
            className={LEVEL_COLOR[stats.level]}
          >
            {stats.level.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-2xl font-bold">{stats.today_count}</div>
            <div className="text-xs text-muted-foreground">today</div>
          </div>
          <div>
            <div className="text-2xl font-bold">
              {stats.estimated_productivity_drop_pct}%
            </div>
            <div className="text-xs text-muted-foreground">est. drop</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{stats.avg_session_minutes}m</div>
            <div className="text-xs text-muted-foreground">avg focus</div>
          </div>
        </div>

        <p className="text-sm">{stats.recommendation}</p>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={record}>
            Record a switch
          </Button>
          <Button size="sm" variant="ghost" onClick={reset}>
            <RefreshCw className="h-3 w-3" />
            Reset today
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
