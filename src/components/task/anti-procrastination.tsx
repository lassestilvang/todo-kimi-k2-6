'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Hammer, ParkingCircle, Trash2, Play, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface ProcrastinationSignal {
  id: number;
  task_id: number;
  task_name: string;
  reschedule_count: number;
  days_since_created: number;
  severity: 'low' | 'medium' | 'high';
  suggested_action:
    | 'break_down'
    | 'park'
    | 'drop'
    | 'schedule_kickstart'
    | 'buddy'
    | 'keep_going';
  message: string;
}

const SEVERITY_COLOR: Record<ProcrastinationSignal['severity'], string> = {
  low: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300',
  medium: 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
  high: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',
};

const ACTION_ICON: Record<ProcrastinationSignal['suggested_action'], React.ComponentType<{ className?: string }>> = {
  break_down: Hammer,
  park: ParkingCircle,
  drop: Trash2,
  schedule_kickstart: Play,
  buddy: Users,
  keep_going: AlertCircle,
};

const ACTION_LABEL: Record<ProcrastinationSignal['suggested_action'], string> = {
  break_down: 'Break it down',
  park: 'Park it',
  drop: 'Drop it',
  schedule_kickstart: '30-min kickstart',
  buddy: 'Get a buddy',
  keep_going: 'Keep going',
};

export function AntiProcrastination() {
  const [signals, setSignals] = useState<ProcrastinationSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await fetch('/api/procrastination');
      if (!r.ok) throw new Error('Failed');
      const data = (await r.json()) as { signals: ProcrastinationSignal[] };
      setSignals(data.signals);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const park = useCallback(
    async (taskId: number) => {
      try {
        await fetch('/api/parking-lot', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ task_id: taskId, reason: 'Procrastination' }),
        });
        toast.success('Parked.');
        await load();
        router.refresh();
      } catch {
        toast.error('Could not park');
      }
    },
    [load, router]
  );

  const drop = useCallback(
    async (taskId: number) => {
      try {
        await fetch('/api/afterlife', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ task_id: taskId, reason: 'Dropped via anti-procrastination' }),
        });
        toast.success('Archived to afterlife.');
        await load();
        router.refresh();
      } catch {
        toast.error('Could not drop');
      }
    },
    [load, router]
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="py-4 text-sm text-muted-foreground">
          Scanning for stuck tasks…
        </CardContent>
      </Card>
    );
  }

  if (signals.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="h-4 w-4 text-green-500" />
            Nothing stuck
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No procrastination patterns detected. Keep going.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            Stuck tasks ({signals.length})
          </span>
          <Button size="sm" variant="ghost" onClick={load}>
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {signals.map(sig => {
          const Icon = ACTION_ICON[sig.suggested_action];
          return (
            <div
              key={sig.id}
              className="rounded-md border p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-sm">{sig.task_name}</div>
                  <div className="text-xs text-muted-foreground">{sig.message}</div>
                </div>
                <Badge className={SEVERITY_COLOR[sig.severity]}>
                  {sig.severity}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => park(sig.task_id)}
                >
                  <ParkingCircle className="h-3 w-3" />
                  Park
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => drop(sig.task_id)}
                >
                  <Trash2 className="h-3 w-3" />
                  Drop
                </Button>
                <Button size="sm" variant="ghost" disabled>
                  <Icon className="h-3 w-3" />
                  {ACTION_LABEL[sig.suggested_action]}
                </Button>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>Rescheduled {sig.reschedule_count}×</span>
                <span>Open {sig.days_since_created}d</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
