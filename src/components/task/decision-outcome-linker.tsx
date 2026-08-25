'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface DecisionOutcomeLink {
  decision_id: number;
  decision_type: string;
  question: string;
  outcome: string | null;
  outcome_rating: number | null;
  correlated_task_id: number | null;
  correlation_strength: number;
  was_successful: boolean | null;
}

interface TaskWithOutcome {
  id: number;
  name: string;
  completed: boolean;
  completed_at: string | null;
  outcome_rating: number | null;
}

interface DecisionOutcomeLinkerProps {
  taskId?: number;
  limit?: number;
}

export function DecisionOutcomeLinker({ taskId, limit = 10 }: DecisionOutcomeLinkerProps) {
  const [links, setLinks] = useState<DecisionOutcomeLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasCorrelation, setHasCorrelation] = useState(false);

  useEffect(() => {
    fetchDecisionOutcomeLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchDecisionOutcomeLinks() {
    setLoading(true);
    try {
      // Fetch decisions
      const decisionsResponse = await fetch('/api/decisions');
      const decisionsData = await decisionsResponse.json();

      // Fetch tasks
      const tasksResponse = await fetch(taskId ? `/api/tasks/${taskId}` : '/api/tasks?limit=50');
      const tasksData = await tasksResponse.json();

      const tasksList: TaskWithOutcome[] = taskId
        ? [{ id: taskId, ...tasksData.task, ...tasksData.task }]
        : (tasksData.tasks || []);

      // Correlate decisions with task outcomes
      const correlatedLinks = correlateDecisionsWithTasks(decisionsData.decisions || [], tasksList);
      setLinks(correlatedLinks);
      setHasCorrelation(correlatedLinks.some((l: DecisionOutcomeLink) => l.correlation_strength > 0.7));
    } catch (error) {
      console.error('Failed to fetch decision-outcome links:', error);
      toast.error('Failed to load decision-outcome correlations');
    } finally {
      setLoading(false);
    }
  }

  function correlateDecisionsWithTasks(
    decisions: Array<{ id: number; decision_type: string; question: string; outcome: string | null; outcome_rating: number | null }>,
    tasks: TaskWithOutcome[]
  ): DecisionOutcomeLink[] {
    const links: DecisionOutcomeLink[] = [];

    for (const decision of decisions) {
      // Try to find related tasks by name pattern matching
      const relatedTask = tasks.find(task => {
        const questionLower = decision.question.toLowerCase();
        const taskNameLower = task.name.toLowerCase();

        // Match decision question to task name
        const keywords = questionLower.split(/[\s?.!]+/).filter(k => k.length > 3);
        return keywords.some(kw => taskNameLower.includes(kw));
      });

      const correlation = relatedTask
        ? calculateCorrelationStrength(decision, relatedTask)
        : { task_id: null as unknown as number, strength: 0 };

      links.push({
        decision_id: decision.id,
        decision_type: decision.decision_type,
        question: decision.question,
        outcome: decision.outcome,
        outcome_rating: decision.outcome_rating,
        correlated_task_id: correlation.task_id,
        correlation_strength: correlation.strength,
        was_successful: decision.outcome_rating !== null ? decision.outcome_rating > 0 : null,
      });
    }

    return links.slice(0, limit);
  }

  function calculateCorrelationStrength(decision: { question: string; outcome_rating: number | null }, task: TaskWithOutcome): { task_id: number; strength: number } {
    let strength = 0;
    const questionLower = decision.question.toLowerCase();
    const taskNameLower = task.name.toLowerCase();

    // Direct name match
    if (taskNameLower.includes(questionLower.split(' ')[0])) {
      strength += 0.4;
    }

    // Keyword overlap
    const keywords = questionLower.split(/[\s?.!]+/).filter((k: string) => k.length > 3);
    const overlap = keywords.filter((kw: string) => taskNameLower.includes(kw)).length;
    strength += (overlap / keywords.length) * 0.3;

    // Task completion status
    if (task.completed) {
      strength += 0.2;
    }

    // Quality of outcome
    if (task.outcome_rating !== null) {
      strength += 0.1;
    }

    return { task_id: task.id, strength: Math.min(1, strength) };
  }

  function getDecisionTypeColor(type: string): string {
    const colors: Record<string, string> = {
      priority: 'bg-red-100 text-red-800',
      approach: 'bg-blue-100 text-blue-800',
      timeline: 'bg-amber-100 text-amber-800',
      tool: 'bg-green-100 text-green-800',
      allocation: 'bg-purple-100 text-purple-800',
      cancellation: 'bg-gray-100 text-gray-800',
    };
    return colors[type] || 'bg-muted';
  }

  function formatRating(rating: number | null): string {
    if (rating === null) return 'Not rated';
    if (rating > 0.5) return '✅ Positive';
    if (rating < -0.5) return '❌ Negative';
    return '⚪ Mixed';
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Decision-to-Task Correlation</CardTitle>
          <CardDescription>Analyzing decision outcomes...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Decision-to-Task Correlation
          {hasCorrelation && <CheckCircle className="h-5 w-5 text-green-500" />}
        </CardTitle>
        <CardDescription>
          {hasCorrelation
            ? 'Decisions linked to actual task outcomes'
            : 'No strong correlations found'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasCorrelation ? (
          <div className="space-y-3">
            {links.map(link => (
              <div
                key={link.decision_id}
                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <Badge className={getDecisionTypeColor(link.decision_type)}>
                      {link.decision_type}
                    </Badge>
                    <p className="text-sm font-medium">{link.question}</p>
                    <p className="text-xs text-muted-foreground">
                      {link.outcome || 'No outcome recorded'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {link.correlation_strength > 0.5 && link.correlated_task_id && (
                      <Badge variant="outline">
                        Correlation: {Math.round(link.correlation_strength * 100)}%
                      </Badge>
                    )}

                    {link.was_successful !== null && (
                      <Badge variant={link.was_successful ? 'default' : 'destructive'}>
                        {formatRating(link.outcome_rating)}
                      </Badge>
                    )}
                  </div>
                </div>

                {link.correlated_task_id && (
                  <div className="mt-3 pt-3 border-t">
                    <a
                      href={`/tasks/${link.correlated_task_id}`}
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View related task
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              No correlated decisions found. Complete some tasks and record decision outcomes to see correlations.
            </p>
          </div>
        )}

        <div className="mt-4 flex justify-between items-center">
          <Button variant="ghost" size="sm" onClick={fetchDecisionOutcomeLinks}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh correlations
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}