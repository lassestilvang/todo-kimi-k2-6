'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skull, Repeat2 } from 'lucide-react';

interface AfterlifeEntry {
  id: number;
  name: string;
  priority: string | null;
  completed_count: number;
  resurrect_count: number;
  deleted_at: string;
  tags: string | null;
}

interface AfterlifePattern {
  name: string;
  times_deleted: number;
  times_resurrected: number;
  suggestion: string;
}

export function TaskAfterlife() {
  const [entries, setEntries] = useState<AfterlifeEntry[]>([]);
  const [patterns, setPatterns] = useState<AfterlifePattern[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [e, p] = await Promise.all([
        fetch('/api/afterlife').then(r => r.json()) as Promise<{ entries: AfterlifeEntry[] }>,
        fetch('/api/afterlife?patterns=1').then(r => r.json()) as Promise<{ patterns: AfterlifePattern[] }>,
      ]);
      setEntries(e.entries);
      setPatterns(p.patterns);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-4 text-sm text-muted-foreground">
          Digging up bones…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Skull className="h-4 w-4" />
          Task Afterlife
          <Badge variant="outline" className="ml-auto">{entries.length} archived</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Soft-deleted tasks live here. If a name recurs, we surface a pattern — maybe it's
          time to drop it permanently or template it.
        </p>

        {patterns.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2 flex items-center gap-1">
              <Repeat2 className="h-4 w-4" />
              Repeated patterns
            </div>
            <ul className="space-y-2">
              {patterns.map(p => (
                <li
                  key={p.name}
                  className="rounded-md border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 p-2 text-sm"
                >
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Deleted {p.times_deleted}× · Resurrected {p.times_resurrected}×
                  </div>
                  <div className="text-xs italic mt-1">{p.suggestion}</div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {entries.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nothing archived yet.</div>
        ) : (
          <ul className="space-y-1">
            {entries.slice(0, 10).map(e => (
              <li
                key={e.id}
                className="rounded-md border p-2 text-sm flex items-center justify-between gap-2"
              >
                <span className="line-through text-muted-foreground flex-1 min-w-0 truncate">
                  {e.name}
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(e.deleted_at).toLocaleDateString()}
                </span>
                {e.resurrect_count > 0 && (
                  <Badge variant="outline">↺{e.resurrect_count}</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
