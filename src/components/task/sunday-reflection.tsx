'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Heart, Save } from 'lucide-react';
import { toast } from 'sonner';

interface Reflection {
  id: number;
  week_of: string;
  surprised: string | null;
  worked: string | null;
  did_not_work: string | null;
  should_change: string | null;
  gratitude: string | null;
  mood_score: number | null;
}

interface ReflectionFormProps {
  showHeader?: boolean;
}

export function SundayReflection({ showHeader = true }: ReflectionFormProps) {
  const [current, setCurrent] = useState<Reflection | null>(null);
  const [week, setWeek] = useState('');
  const [surprised, setSurprised] = useState('');
  const [worked, setWorked] = useState('');
  const [didNotWork, setDidNotWork] = useState('');
  const [shouldChange, setShouldChange] = useState('');
  const [gratitude, setGratitude] = useState('');
  const [mood, setMood] = useState<number>(7);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await fetch('/api/reflections');
      const data = (await r.json()) as {
        reflection: Reflection | null;
        current_week: string;
      };
      setWeek(data.current_week);
      if (data.reflection) {
        setCurrent(data.reflection);
        setSurprised(data.reflection.surprised ?? '');
        setWorked(data.reflection.worked ?? '');
        setDidNotWork(data.reflection.did_not_work ?? '');
        setShouldChange(data.reflection.should_change ?? '');
        setGratitude(data.reflection.gratitude ?? '');
        setMood(data.reflection.mood_score ?? 7);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async () => {
    try {
      await fetch('/api/reflections', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          surprised: surprised || null,
          worked: worked || null,
          did_not_work: didNotWork || null,
          should_change: shouldChange || null,
          gratitude: gratitude || null,
          mood_score: mood,
        }),
      });
      toast.success('Saved. The system will learn from this.');
      await load();
    } catch {
      toast.error('Could not save');
    }
  }, [surprised, worked, didNotWork, shouldChange, gratitude, mood, load]);

  return (
    <Card>
      {showHeader && (
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Heart className="h-4 w-4 text-red-500" />
            Sunday Reflection
            {week && <Badge variant="outline" className="ml-2">{week}</Badge>}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <>
            <ReflectionField
              label="What surprised you?"
              value={surprised}
              onChange={setSurprised}
            />
            <ReflectionField
              label="What worked?"
              value={worked}
              onChange={setWorked}
            />
            <ReflectionField
              label="What didn't work?"
              value={didNotWork}
              onChange={setDidNotWork}
            />
            <ReflectionField
              label="What should we change?"
              value={shouldChange}
              onChange={setShouldChange}
            />
            <ReflectionField
              label="Gratitude (optional)"
              value={gratitude}
              onChange={setGratitude}
            />
            <div>
              <label className="text-sm font-medium">Mood (1–10)</label>
              <input
                type="range"
                min={1}
                max={10}
                value={mood}
                onChange={e => setMood(parseInt(e.target.value, 10))}
                className="w-full mt-1"
              />
              <div className="text-xs text-muted-foreground">{mood}/10</div>
            </div>
            <Button onClick={save} disabled={!surprised && !worked && !didNotWork && !shouldChange && !gratitude}>
              <Save className="h-3 w-3" />
              {current ? 'Update reflection' : 'Save reflection'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ReflectionField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="A sentence or two…"
        className="mt-1"
      />
    </div>
  );
}
