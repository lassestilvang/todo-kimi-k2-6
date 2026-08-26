'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Bot, Plus, Trash2, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface AutopilotDecision {
  id: number;
  decision_type: string;
  question: string;
  chosen_option: string;
  rationale: string | null;
  overridden: number;
  week_of: string | null;
  created_at: string;
}

interface Guardrail {
  id: number;
  scope: string;
  allowed_values: string | null;
  denied_values: string | null;
}

export function AutopilotPanel() {
  const [decisions, setDecisions] = useState<AutopilotDecision[]>([]);
  const [guardrails, setGuardrails] = useState<Guardrail[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState('');
  const [denied, setDenied] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [d, g] = await Promise.all([
        fetch('/api/autopilot').then(r => r.json()) as Promise<{ decisions: AutopilotDecision[] }>,
        fetch('/api/autopilot?guardrails=1').then(r => r.json()) as Promise<{ guardrails: Guardrail[] }>,
      ]);
      setDecisions(d.decisions);
      setGuardrails(g.guardrails);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addGuardrail = useCallback(async () => {
    if (!scope.trim()) return;
    try {
      const deniedValues = denied
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      await fetch('/api/autopilot', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scope: scope.trim(), denied_values: deniedValues }),
      });
      setScope('');
      setDenied('');
      toast.success('Guardrail saved');
      await load();
    } catch {
      toast.error('Could not save');
    }
  }, [scope, denied, load]);

  const removeGuardrail = useCallback(
    async (id: number) => {
      try {
        await fetch(`/api/autopilot?id=${id}`, { method: 'DELETE' });
        await load();
      } catch {
        toast.error('Could not delete');
      }
    },
    [load]
  );

  const override = useCallback(
    async (id: number) => {
      try {
        await fetch('/api/autopilot', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id, action: 'override' }),
        });
      } catch {
        /* ignore */
      }
    },
    []
  );

  const decide = useCallback(async () => {
    try {
      const r = await fetch('/api/autopilot', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          decision_type: 'sample',
          question: 'Which project file should we use for this demo?',
          candidates: ['plan.md', 'notes.md', 'draft.md', 'final.md'],
        }),
      });
      const data = (await r.json()) as { chosen: string; rationale: string };
      toast(`AI picked: ${data.chosen}\n\n${data.rationale}`);
      await load();
    } catch {
      toast.error('Could not decide');
    }
  }, [load]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-4 w-4 text-purple-500" />
          Decision Autopilot
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center gap-1 text-sm font-medium mb-1">
            <Shield className="h-4 w-4" /> Guardrails
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Rules the autopilot must respect. e.g. <code>scope=messaging,
            denied=coworkers-in-senior-mgmt</code>.
          </p>
          <div className="flex gap-2">
            <Input
              value={scope}
              onChange={e => setScope(e.target.value)}
              placeholder="scope (e.g. messaging)"
              className="flex-1"
            />
            <Input
              value={denied}
              onChange={e => setDenied(e.target.value)}
              placeholder="denied,comma,separated"
              className="flex-1"
            />
            <Button onClick={addGuardrail} disabled={!scope.trim()}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          {guardrails.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs">
              {guardrails.map(g => {
                let deniedVals: string[] = [];
                try {
                  deniedVals = g.denied_values ? (JSON.parse(g.denied_values) as string[]) : [];
                } catch {
                  /* malformed JSON; ignore */
                }
                return (
                  <li key={g.id} className="flex items-center gap-2 rounded border p-1">
                    <code className="font-mono">{g.scope}</code>
                    {deniedVals.length > 0 && (
                      <Badge variant="outline">denies: {deniedVals.join(', ')}</Badge>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => removeGuardrail(g.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">Recent decisions</div>
            <Button size="sm" variant="outline" onClick={decide}>
              <Bot className="h-3 w-3" />
              Make a sample decision
            </Button>
          </div>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : decisions.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No autopilot decisions yet. They'll appear here when routines fire.
            </div>
          ) : (
            <ul className="space-y-1 text-xs">
              {decisions.slice(0, 8).map(d => (
                <li key={d.id} className="rounded border p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{d.question}</span>
                    <Badge variant="outline">{d.decision_type}</Badge>
                  </div>
                  <div className="text-muted-foreground mt-1">
                    chose <strong>{d.chosen_option}</strong>
                  </div>
                  {d.rationale && (
                    <div className="text-muted-foreground italic">{d.rationale}</div>
                  )}
                  {d.overridden === 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => override(d.id)}
                      className="mt-1 text-xs h-6"
                    >
                      I would have chosen differently
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
