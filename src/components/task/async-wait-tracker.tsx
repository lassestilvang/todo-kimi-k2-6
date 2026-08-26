'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Hourglass, Bell, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface AsyncWait {
  id: number;
  task_id: number;
  task_name: string;
  waiting_on: string;
  waiting_on_type: string;
  status: 'waiting' | 'nudged' | 'resolved' | 'abandoned';
  days_elapsed: number;
  nudge_due: boolean;
  last_nudge_at: string | null;
}

export function AsyncWaitTracker() {
  const [waits, setWaits] = useState<AsyncWait[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await fetch('/api/async-waits');
      const data = (await r.json()) as { waits: AsyncWait[] };
      setWaits(data.waits);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const action = useCallback(
    async (id: number, action: 'nudge' | 'resolve' | 'abandon') => {
      try {
        await fetch('/api/async-waits', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id, action }),
        });
        toast.success(`Marked ${action}`);
        await load();
      } catch {
        toast.error('Could not update');
      }
    },
    [load]
  );

  const activeWaits = waits.filter(w => w.status === 'waiting' || w.status === 'nudged');
  const nudgesDue = activeWaits.filter(w => w.nudge_due);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Hourglass className="h-4 w-4" />
            Async Waits
          </span>
          {nudgesDue.length > 0 && (
            <Badge variant="destructive">
              {nudgesDue.length} need nudge{nudgesDue.length === 1 ? '' : 's'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : activeWaits.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Nothing waiting on someone. Tag a task "waiting on X" when you ask.
          </div>
        ) : (
          <ul className="space-y-2">
            {activeWaits.map(w => (
              <li
                key={w.id}
                className="rounded-md border p-2 text-sm space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{w.task_name}</div>
                    <div className="text-xs text-muted-foreground">
                      Waiting on <strong>{w.waiting_on}</strong> · {w.days_elapsed}d
                      elapsed
                    </div>
                  </div>
                  {w.nudge_due && (
                    <Badge variant="destructive">
                      <Bell className="h-3 w-3 mr-1" />
                      nudge
                    </Badge>
                  )}
                  {w.status === 'nudged' && (
                    <Badge variant="outline">already nudged</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  {w.nudge_due && (
                    <Button size="sm" variant="outline" onClick={() => action(w.id, 'nudge')}>
                      <Bell className="h-3 w-3" />
                      Send nudge
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => action(w.id, 'resolve')}>
                    <Check className="h-3 w-3" />
                    Resolved
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => action(w.id, 'abandon')}>
                    <X className="h-3 w-3" />
                    Abandon
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
