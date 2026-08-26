'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ParkingCircle, RotateCcw, Trash2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface ParkedTask {
  id: number;
  name: string;
  description: string | null;
  parked_until: string | null;
  park_reason: string | null;
  priority: string;
  cognitive_load: string;
}

interface ResurrectionCandidate extends ParkedTask {
  daysInLot: number;
}

type Tab = 'lot' | 'resurrect';

export function ParkingLotPanel() {
  const [tasks, setTasks] = useState<ParkedTask[]>([]);
  const [candidates, setCandidates] = useState<ResurrectionCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('lot');
  const [newName, setNewName] = useState('');
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [lot, resurrect] = await Promise.all([
        fetch('/api/parking-lot').then(r => r.json()) as Promise<{ tasks: ParkedTask[] }>,
        fetch('/api/parking-lot?resurrection=1').then(r => r.json()) as Promise<{
          candidates: ResurrectionCandidate[];
        }>,
      ]);
      setTasks(lot.tasks);
      setCandidates(resurrect.candidates);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const park = useCallback(async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const r = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, priority: 'low' }),
      });
      if (!r.ok) throw new Error();
      const data = (await r.json()) as { task: { id: number } };
      await fetch('/api/parking-lot', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ task_id: data.task.id, reason: 'Quick park' }),
      });
      setNewName('');
      toast.success('Parked');
      await load();
      router.refresh();
    } catch {
      toast.error('Could not park');
    }
  }, [newName, load, router]);

  const unpark = useCallback(
    async (taskId: number) => {
      try {
        await fetch(`/api/parking-lot?task_id=${taskId}`, { method: 'DELETE' });
        toast.success('Unparked — back on the active list');
        await load();
        router.refresh();
      } catch {
        toast.error('Could not unpark');
      }
    },
    [load, router]
  );

  const archive = useCallback(
    async (taskId: number) => {
      try {
        await fetch('/api/afterlife', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ task_id: taskId, reason: 'Dropped from parking lot' }),
        });
        toast.success('Sent to afterlife');
        await load();
        router.refresh();
      } catch {
        toast.error('Could not archive');
      }
    },
    [load, router]
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ParkingCircle className="h-4 w-4" />
          Parking Lot
          <Badge variant="outline" className="ml-auto">
            {tasks.length} parked
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Quick park a task…"
            onKeyDown={e => {
              if (e.key === 'Enter') park();
            }}
          />
          <Button onClick={park} disabled={!newName.trim()}>
            Park
          </Button>
        </div>

        <div className="flex gap-2 text-xs">
          <Button
            size="sm"
            variant={tab === 'lot' ? 'default' : 'ghost'}
            onClick={() => setTab('lot')}
          >
            All parked
          </Button>
          <Button
            size="sm"
            variant={tab === 'resurrect' ? 'default' : 'ghost'}
            onClick={() => setTab('resurrect')}
          >
            Ready to revisit ({candidates.length})
          </Button>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : tab === 'lot' ? (
          tasks.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Nothing parked. Add something above when you don't want to think about it today.
            </div>
          ) : (
            <ul className="space-y-2">
              {tasks.map(t => (
                <li
                  key={t.id}
                  className="flex items-start justify-between gap-2 rounded-md border p-2 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{t.name}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {t.parked_until && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          until {t.parked_until}
                        </span>
                      )}
                      {t.park_reason && <span>· {t.park_reason}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => unpark(t.id)}>
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => archive(t.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : candidates.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No resurrection candidates. Tasks parked 30+ days (or past their
            parked-until date) appear here so you can drop or revive them.
          </div>
        ) : (
          <ul className="space-y-2">
            {candidates.map(c => (
              <li
                key={c.id}
                className="rounded-md border p-2 text-sm space-y-1"
              >
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">
                  Parked {c.daysInLot}d ago{c.park_reason ? ` · ${c.park_reason}` : ''}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => unpark(c.id)}>
                    <RotateCcw className="h-3 w-3" />
                    Revive
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => archive(c.id)}>
                    <Trash2 className="h-3 w-3" />
                    Drop forever
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
