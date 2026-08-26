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
import { BookOpen, Plus, ExternalLink, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ReadingItem {
  id: number;
  url: string | null;
  title: string;
  source: string | null;
  item_type: 'article' | 'video' | 'podcast' | 'paper' | 'book' | 'thread';
  summary: string | null;
  status: 'queued' | 'in_progress' | 'done' | 'archived';
}

export function ReadingQueue() {
  const [items, setItems] = useState<ReadingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState<ReadingItem['item_type']>('article');
  const [summarising, setSummarising] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await fetch('/api/reading-queue');
      const data = (await r.json()) as { items: ReadingItem[] };
      setItems(data.items);
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
    if (!title.trim()) return;
    try {
      await fetch('/api/reading-queue', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          url: url.trim() || null,
          item_type: type,
        }),
      });
      setTitle('');
      setUrl('');
      toast.success('Saved to queue');
      await load();
    } catch {
      toast.error('Could not save');
    }
  }, [title, url, type, load]);

  const setStatus = useCallback(
    async (id: number, status: ReadingItem['status']) => {
      try {
        await fetch('/api/reading-queue', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id, action: 'status', status }),
        });
        await load();
      } catch {
        toast.error('Could not update');
      }
    },
    [load]
  );

  const summarise = useCallback(
    async (id: number, titleToSummarise: string) => {
      try {
        setSummarising(id);
        // Deterministic stub: timestamp + first sentence. Wire to AI later.
        const summary = `Summary for "${titleToSummarise}" — wire up your AI provider for real summaries. (Saved ${new Date().toLocaleString()})`;
        await fetch('/api/reading-queue', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id, action: 'summary', summary }),
        });
        toast.success('Summary added');
        await load();
      } catch {
        toast.error('Could not summarise');
      } finally {
        setSummarising(null);
      }
    },
    [load]
  );

  const remove = useCallback(
    async (id: number) => {
      try {
        await fetch(`/api/reading-queue?id=${id}`, { method: 'DELETE' });
        await load();
      } catch {
        toast.error('Could not delete');
      }
    },
    [load]
  );

  const queued = items.filter(i => i.status !== 'archived');

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-4 w-4" />
          Reading Queue
          <Badge variant="outline" className="ml-auto">{queued.length} pending</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title"
          />
          <Input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="URL (optional)"
          />
          <div className="flex gap-2">
            <Select value={type} onValueChange={v => setType(v as ReadingItem['item_type'])}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="article">Article</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="podcast">Podcast</SelectItem>
                <SelectItem value="paper">Paper</SelectItem>
                <SelectItem value="book">Book</SelectItem>
                <SelectItem value="thread">Thread</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={add} disabled={!title.trim()}>
              <Plus className="h-3 w-3" /> Save
            </Button>
          </div>
        </div>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : queued.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nothing in the queue.</div>
        ) : (
          <ul className="space-y-2">
            {queued.map(i => (
              <li key={i.id} className="rounded-md border p-2 text-sm space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium flex items-center gap-1">
                      {i.title}
                      {i.url && (
                        <a
                          href={i.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted-foreground"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{i.item_type}</Badge>
                      <Badge
                        variant={
                          i.status === 'done'
                            ? 'default'
                            : i.status === 'in_progress'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {i.status}
                      </Badge>
                    </div>
                    {i.summary && (
                      <div className="text-xs text-muted-foreground italic mt-1">
                        {i.summary}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    {i.status !== 'in_progress' && (
                      <Button size="sm" variant="ghost" onClick={() => setStatus(i.id, 'in_progress')}>
                        Start
                      </Button>
                    )}
                    {i.status !== 'done' && (
                      <Button size="sm" variant="ghost" onClick={() => setStatus(i.id, 'done')}>
                        Done
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => summarise(i.id, i.title)}
                      disabled={summarising === i.id}
                    >
                      <Sparkles className="h-3 w-3" />
                      {summarising === i.id ? '…' : 'AI'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(i.id)}>
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
