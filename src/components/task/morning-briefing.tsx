'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sun, AlertTriangle, Clock, Sparkles, Volume2, Pause } from 'lucide-react';
import { toast } from 'sonner';

interface Briefing {
  generated_at: string;
  greeting: string;
  due_today: Array<{ id: number; name: string; priority: string }>;
  overdue: Array<{ id: number; name: string; priority: string; days_overdue: number }>;
  top_three: Array<{ id: number; name: string; priority: string; why: string }>;
  principle_of_the_day: string | null;
  nudges_needed: number;
  context_switch_level: string;
  cognitive_load_warning: string | null;
  procrastination_alerts: number;
  one_thing_to_do_first: { id: number; name: string; reason: string };
  summary: string;
}

interface MorningBriefingProps {
  autoSpeak?: boolean;
  onClose?: () => void;
}

export function MorningBriefing({ autoSpeak = false, onClose }: MorningBriefingProps) {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [speaking, setSpeaking] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await fetch('/api/briefing');
      if (!r.ok) throw new Error('Failed to load');
      const data = (await r.json()) as { briefing: Briefing };
      setBriefing(data.briefing);
    } catch (e) {
      toast.error('Could not load your briefing');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const speak = useCallback(() => {
    if (!briefing) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      toast.error('Voice not supported in this browser');
      return;
    }
    const lines: string[] = [
      `${briefing.greeting}. ${briefing.summary}.`,
      briefing.one_thing_to_do_first.name
        ? `Start with: ${briefing.one_thing_to_do_first.name}. ${briefing.one_thing_to_do_first.reason}`
        : '',
      briefing.principle_of_the_day
        ? `Today's principle: ${briefing.principle_of_the_day}`
        : '',
      briefing.cognitive_load_warning
        ? `Heads up: ${briefing.cognitive_load_warning}`
        : '',
      briefing.overdue.length
        ? `You have ${briefing.overdue.length} overdue task${briefing.overdue.length === 1 ? '' : 's'}.`
        : '',
    ].filter(Boolean);

    const utterance = new SpeechSynthesisUtterance(lines.join(' '));
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }, [briefing]);

  useEffect(() => {
    if (autoSpeak && briefing && !speaking) speak();
  }, [autoSpeak, briefing, speaking, speak]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Sun className="h-4 w-4 animate-pulse" />
            Preparing your briefing…
          </div>
        </CardContent>
      </Card>
    );
  }
  if (!briefing) return null;

  const priorityColor = (p: string) =>
    p === 'critical'
      ? 'destructive'
      : p === 'high'
      ? 'default'
      : 'secondary';

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-yellow-500" />
            {briefing.greeting}
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={speak}
              aria-label="Read briefing aloud"
              title="Read aloud"
            >
              {speaking ? <Pause className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            {onClose && (
              <Button size="sm" variant="ghost" onClick={onClose}>
                ✕
              </Button>
            )}
          </div>
        </CardTitle>
        <p className="text-sm text-muted-foreground">{briefing.summary}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {briefing.one_thing_to_do_first.id > 0 && (
          <div className="rounded-lg border bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 p-4">
            <div className="flex items-center gap-2 text-sm font-medium mb-1">
              <Sparkles className="h-4 w-4 text-yellow-600" />
              Start with this
            </div>
            <div className="font-medium">{briefing.one_thing_to_do_first.name}</div>
            <div className="text-xs text-muted-foreground">
              {briefing.one_thing_to_do_first.reason}
            </div>
          </div>
        )}

        {briefing.top_three.length > 0 && (
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
              Top three
            </div>
            <ol className="space-y-1">
              {briefing.top_three.map(t => (
                <li
                  key={t.id}
                  className="flex items-start gap-2 text-sm rounded-md px-2 py-1 hover:bg-accent"
                >
                  <Badge variant={priorityColor(t.priority) as 'destructive' | 'default' | 'secondary'}>
                    {t.priority}
                  </Badge>
                  <div className="flex-1">
                    <div>{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.why}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {briefing.overdue.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-destructive mb-2">
              <AlertTriangle className="h-3 w-3" />
              {briefing.overdue.length} overdue
            </div>
            <ul className="text-sm space-y-1">
              {briefing.overdue.slice(0, 3).map(t => (
                <li key={t.id} className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span>{t.name}</span>
                  <Badge variant="outline" className="ml-auto">
                    {t.days_overdue}d late
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}

        {briefing.principle_of_the_day && (
          <div className="rounded-md bg-secondary/30 p-3 text-sm">
            <span className="font-medium">Today's principle: </span>
            {briefing.principle_of_the_day}
          </div>
        )}

        {briefing.cognitive_load_warning && (
          <div className="rounded-md border border-orange-300 bg-orange-50 dark:bg-orange-950/20 p-3 text-sm">
            {briefing.cognitive_load_warning}
          </div>
        )}

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground pt-2 border-t">
          {briefing.nudges_needed > 0 && (
            <Badge variant="outline">
              {briefing.nudges_needed} async nudge{briefing.nudges_needed === 1 ? '' : 's'}
            </Badge>
          )}
          {briefing.context_switch_level !== 'low' && (
            <Badge variant="outline">
              Context switches: {briefing.context_switch_level}
            </Badge>
          )}
          {briefing.procrastination_alerts > 0 && (
            <Badge variant="outline">
              {briefing.procrastination_alerts} stuck task
              {briefing.procrastination_alerts === 1 ? '' : 's'}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
