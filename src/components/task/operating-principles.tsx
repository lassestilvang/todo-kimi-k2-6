'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Lightbulb, Plus, Trash2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface Principle {
  id: number;
  rule: string;
  category:
    | 'scheduling'
    | 'priority'
    | 'focus'
    | 'energy'
    | 'communication'
    | 'other';
  confidence: number;
  active: number;
  source: string;
  evidence_count: number;
}

const CATEGORIES: Principle['category'][] = [
  'scheduling',
  'priority',
  'focus',
  'energy',
  'communication',
  'other',
];

export function OperatingPrinciples() {
  const [principles, setPrinciples] = useState<Principle[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [category, setCategory] = useState<Principle['category']>('scheduling');
  const [inferring, setInferring] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await fetch('/api/principles');
      const data = (await r.json()) as { principles: Principle[] };
      setPrinciples(data.principles);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(async () => {
    if (!draft.trim()) return;
    try {
      await fetch('/api/principles', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rule: draft.trim(), category }),
      });
      setDraft('');
      toast.success('Principle added');
      await load();
    } catch {
      toast.error('Could not save');
    }
  }, [draft, category, load]);

  const toggle = useCallback(
    async (p: Principle) => {
      try {
        await fetch('/api/principles', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: p.id, active: !p.active }),
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
        await fetch(`/api/principles?id=${id}`, { method: 'DELETE' });
        toast.success('Removed');
        await load();
      } catch {
        toast.error('Could not delete');
      }
    },
    [load]
  );

  const infer = useCallback(async () => {
    try {
      setInferring(true);
      const r = await fetch('/api/principles?infer=1');
      const data = (await r.json()) as { inferred: Principle[] };
      if (data.inferred.length === 0) {
        toast('No new patterns yet — keep using TaskFlow and we\'ll learn.');
      } else {
        toast.success(`Found ${data.inferred.length} new principle${data.inferred.length === 1 ? '' : 's'}`);
      }
      await load();
    } catch {
      toast.error('Inference failed');
    } finally {
      setInferring(false);
    }
  }, [load]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            Operating Principles
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={infer}
            disabled={inferring}
          >
            <Sparkles className="h-3 w-3" />
            {inferring ? 'Inferring…' : 'Infer from behavior'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="E.g. Email at 9:30am only"
            onKeyDown={e => {
              if (e.key === 'Enter') create();
            }}
            className="flex-1"
          />
          <Select
            value={category}
            onValueChange={v => setCategory(v as Principle['category'])}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={create} disabled={!draft.trim()}>
            <Plus className="h-3 w-3" />
            Add
          </Button>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : principles.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No principles yet. Add one above, or hit "Infer from behavior" to let
            TaskFlow propose rules from your patterns.
          </div>
        ) : (
          <ul className="space-y-2">
            {principles.map(p => (
              <li
                key={p.id}
                className="flex items-start gap-2 rounded-md border p-2 text-sm"
              >
                <Lightbulb
                  className={`h-4 w-4 mt-0.5 ${p.active ? 'text-yellow-500' : 'text-muted-foreground'}`}
                />
                <div className="flex-1 min-w-0">
                  <div
                    className={p.active ? '' : 'text-muted-foreground line-through'}
                  >
                    {p.rule}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{p.category}</Badge>
                    <Badge variant="secondary">
                      {Math.round(p.confidence * 100)}% confidence
                    </Badge>
                    {p.source === 'inferred' && (
                      <Badge variant="outline">inferred</Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => toggle(p)}>
                    {p.active ? 'pause' : 'enable'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => remove(p.id)}
                  >
                    <Trash2 className="h-3 w-3" />
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
