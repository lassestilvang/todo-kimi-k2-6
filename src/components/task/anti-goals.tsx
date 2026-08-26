'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Ban, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface AntiGoal {
  id: number;
  title: string;
  reason: string | null;
  active: number;
  valid_until: string | null;
}

export function AntiGoals() {
  const [items, setItems] = useState<AntiGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await fetch('/api/anti-goals');
      const data = (await r.json()) as { anti_goals: AntiGoal[] };
      setItems(data.anti_goals);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const add = useCallback(async () => {
    if (!draft.trim()) return;
    try {
      await fetch('/api/anti-goals', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: draft.trim(), reason: reason.trim() || null }),
      });
      setDraft('');
      setReason('');
      toast.success('Anti-goal added');
      await load();
    } catch {
      toast.error('Could not save');
    }
  }, [draft, reason, load]);

  const toggle = useCallback(
    async (a: AntiGoal) => {
      try {
        await fetch('/api/anti-goals', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: a.id, active: !a.active }),
        });
        await load();
      } catch {
        toast.error('Could not toggle');
      }
    },
    [load]
  );

  const remove = useCallback(
    async (id: number) => {
      try {
        await fetch(`/api/anti-goals?id=${id}`, { method: 'DELETE' });
        await load();
      } catch {
        toast.error('Could not delete');
      }
    },
    [load]
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Ban className="h-4 w-4 text-red-500" />
          Anti-Goals
          <Badge variant="outline" className="ml-auto">{items.filter(i => i.active).length} active</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Things you're explicitly NOT doing this quarter — they're used to filter suggestions.
        </p>
        <div className="space-y-2">
          <Input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="E.g. No new SaaS purchases"
          />
          <Input
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Why? (optional)"
          />
          <Button onClick={add} disabled={!draft.trim()}>
            <Plus className="h-3 w-3" /> Add
          </Button>
        </div>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">No anti-goals yet.</div>
        ) : (
          <ul className="space-y-2">
            {items.map(a => (
              <li
                key={a.id}
                className={`rounded-md border p-2 text-sm ${a.active ? '' : 'opacity-50'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className={a.active ? 'font-medium' : 'line-through'}>{a.title}</div>
                    {a.reason && (
                      <div className="text-xs text-muted-foreground">{a.reason}</div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => toggle(a)}>
                      {a.active ? 'pause' : 'enable'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(a.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
