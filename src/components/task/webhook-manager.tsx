'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Webhook, Plus, Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Hook {
  id: number;
  name: string;
  slug: string;
  workflow_id: number | null;
  secret: string | null;
  active: number;
  call_count: number;
  last_called_at: string | null;
  created_at: string;
}

export function WebhookManager() {
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await fetch('/api/webhooks');
      const data = (await r.json()) as { webhooks: Hook[] };
      setHooks(data.webhooks);
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
    if (!name.trim() || !slug.trim()) return;
    try {
      const r = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim() }),
      });
      if (!r.ok) throw new Error();
      const data = (await r.json()) as { webhook: Hook };
      toast.success('Webhook ready');
      setName('');
      setSlug('');
      void navigator.clipboard?.writeText(
        `${window.location.origin}/api/webhooks/in/${data.webhook.slug}`
      ).catch(() => undefined);
      await load();
    } catch {
      toast.error('Could not create');
    }
  }, [name, slug, load]);

  const toggle = useCallback(
    async (h: Hook) => {
      try {
        await fetch('/api/webhooks', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: h.id, active: !h.active }),
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
        await fetch(`/api/webhooks?id=${id}`, { method: 'DELETE' });
        await load();
      } catch {
        toast.error('Could not delete');
      }
    },
    [load]
  );

  const copyUrl = useCallback((slug: string) => {
    const url = `${window.location.origin}/api/webhooks/in/${slug}`;
    void navigator.clipboard?.writeText(url).then(
      () => toast.success('URL copied'),
      () => toast.error('Copy failed')
    );
  }, []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Webhook className="h-4 w-4" />
          Webhooks
          <Badge variant="outline" className="ml-auto">{hooks.length} configured</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Receive events from GitHub, Stripe, RSS, or anything that can POST. Each
          hook creates a task from the inbound payload's title.
        </p>
        <div className="flex flex-wrap gap-2">
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Name (e.g. GitHub PRs)"
            className="flex-1 min-w-[150px]"
          />
          <Input
            value={slug}
            onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
            placeholder="slug"
            className="w-32"
          />
          <Button onClick={add} disabled={!name.trim() || !slug.trim()}>
            <Plus className="h-3 w-3" /> Create
          </Button>
        </div>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : hooks.length === 0 ? (
          <div className="text-sm text-muted-foreground">No webhooks yet.</div>
        ) : (
          <ul className="space-y-2">
            {hooks.map(h => (
              <li key={h.id} className="rounded-md border p-2 text-sm space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium flex items-center gap-1">
                      {h.name}
                      <Badge variant={h.active ? 'default' : 'outline'}>
                        {h.active ? 'active' : 'paused'}
                      </Badge>
                    </div>
                    <code className="text-xs text-muted-foreground break-all">
                      /api/webhooks/in/{h.slug}
                    </code>
                    <div className="text-xs text-muted-foreground">
                      Called {h.call_count}× · last {h.last_called_at ?? 'never'}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button size="sm" variant="ghost" onClick={() => copyUrl(h.slug)}>
                      <Copy className="h-3 w-3" /> URL
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggle(h)}>
                      {h.active ? 'pause' : 'enable'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(h.id)}>
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
