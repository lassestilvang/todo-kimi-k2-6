'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Brain,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  BarChart3,
  History,
  Lightbulb,
  Award,
  Calendar,
  Users,
  AlertCircle,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge as BadgeComponent } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface DecisionEntry {
  id: number;
  task_id?: number | null;
  task_name?: string;
  decision_type:
    | 'priority'
    | 'approach'
    | 'tool'
    | 'timeline'
    | 'allocation'
    | 'cancellation';
  question: string;
  rationale: string;
  chosen_option_id?: number | null;
  outcome?: string | null;
  outcome_notes?: string | null;
  outcome_rating?: number | null; // -1 to 1
  created_at: string;
  updated_at: string;
  options?: Array<{
    id: number;
    option_text: string;
    pros?: string[] | null;
    cons?: string[] | null;
  }>;
}

interface DecisionTrackerProps {
  taskName?: string;
  taskId?: number;
}

const decisionTypes = [
  {
    value: 'priority',
    label: 'Priority Decision',
    icon: Brain,
    color: 'bg-red-500/10 text-red-600',
  },
  {
    value: 'approach',
    label: 'Approach Decision',
    icon: Lightbulb,
    color: 'bg-blue-500/10 text-blue-600',
  },
  {
    value: 'tool',
    label: 'Tool Selection',
    icon: Award,
    color: 'bg-green-500/10 text-green-600',
  },
  {
    value: 'timeline',
    label: 'Timeline Decision',
    icon: Calendar,
    color: 'bg-amber-500/10 text-amber-600',
  },
  {
    value: 'allocation',
    label: 'Resource Allocation',
    icon: Users,
    color: 'bg-purple-500/10 text-purple-600',
  },
  {
    value: 'cancellation',
    label: 'Cancellation Decision',
    icon: AlertCircle,
    color: 'bg-gray-500/10 text-gray-600',
  },
];

export function DecisionTracker({ taskName, taskId }: DecisionTrackerProps) {
  const [decisions, setDecisions] = useState<DecisionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingDecision, setEditingDecision] = useState<DecisionEntry | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState({
    decision_type: 'approach' as const,
    question: '',
    rationale: '',
    options: [{ option_text: '', pros: '', cons: '' }],
  });

  // Load decisions
  useEffect(() => {
    loadDecisions();
  }, []);

  const loadDecisions = async () => {
    try {
      const url = taskId
        ? `/api/decisions?task_id=${taskId}`
        : '/api/decisions';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setDecisions(Array.isArray(data) ? data : data.decisions || []);
      }
    } catch (error) {
      console.error('Failed to load decisions:', error);
      toast.error('Failed to load decisions');
    } finally {
      setLoading(false);
    }
  };

  // Calculate decision stats
  const decisionStats = useMemo(() => {
    const total = decisions.length;
    const withOutcomes = decisions.filter(d => d.outcome).length;
    const rated = decisions.filter(d => d.outcome_rating !== null);

    const avgRating =
      rated.reduce((sum, d) => sum + (d.outcome_rating || 0), 0) /
      (rated.length || 1);

    const typeStats = decisionTypes.reduce(
      (acc, type) => {
        const typeDecisions = decisions.filter(
          d => d.decision_type === type.value
        );
        const typeRated = typeDecisions.filter(d => d.outcome_rating !== null);
        acc[type.value] = {
          count: typeDecisions.length,
          avgRating:
            typeRated.reduce((sum, d) => sum + (d.outcome_rating || 0), 0) /
            (typeRated.length || 1),
        };
        return acc;
      },
      {} as Record<string, { count: number; avgRating: number }>
    );

    return {
      total,
      completionRate: total > 0 ? (withOutcomes / total) * 100 : 0,
      avgRating,
      typeStats,
    };
  }, [decisions]);

  // Filtered decisions
  const filteredDecisions = useMemo(() => {
    return decisions.filter(d => {
      const matchesSearch =
        d.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.task_name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType =
        filterType === 'all' || d.decision_type === filterType;
      return matchesSearch && matchesType;
    });
  }, [decisions, searchQuery, filterType]);

  // Handle creating a decision
  const handleCreateDecision = async () => {
    if (!formData.question.trim()) {
      toast.error('Question is required');
      return;
    }

    try {
      const response = await fetch('/api/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: taskId || null,
          decision_type: formData.decision_type,
          question: formData.question,
          rationale: formData.rationale,
          options: formData.options.filter(o => o.option_text.trim()),
        }),
      });

      if (response.ok) {
        const decision = await response.json();
        setDecisions(prev => [decision, ...prev]);
        setShowCreateDialog(false);
        setFormData({
          decision_type: 'approach',
          question: '',
          rationale: '',
          options: [{ option_text: '', pros: '', cons: '' }],
        });
        toast.success('Decision recorded');
      } else {
        throw new Error('Failed to create decision');
      }
    } catch (error) {
      toast.error('Failed to create decision');
    }
  };

  // Handle updating outcome
  const handleUpdateOutcome = async (
    id: number,
    outcome: string,
    rating: number | null
  ) => {
    try {
      const response = await fetch('/api/decisions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, outcome, outcome_rating: rating }),
      });
      if (response.ok) {
        const updated = await response.json();
        setDecisions(prev => prev.map(d => (d.id === id ? updated : d)));
        toast.success('Outcome recorded');
      }
    } catch {
      toast.error('Failed to update outcome');
    }
  };

  const getRatingColor = (rating: number | null) => {
    if (rating === null) return 'text-gray-400';
    if (rating > 0.33) return 'text-green-500';
    if (rating < -0.33) return 'text-red-500';
    return 'text-amber-500';
  };

  const RatingBadge = ({ value }: { value: number | null }) => {
    if (value === null) return null;
    const label =
      value >= 0.5 ? 'Positive' : value <= -0.5 ? 'Negative' : 'Neutral';
    const color =
      value > 0.33 ? 'default' : value < -0.33 ? 'destructive' : 'secondary';
    return (
      <BadgeComponent
        className={color === 'default' ? '' : color === 'destructive' ? '' : ''}
      >
        {label}
      </BadgeComponent>
    );
  };

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Decisions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{decisionStats.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              With Outcomes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {Math.round(decisionStats.completionRate)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Avg Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${getRatingColor(decisionStats.avgRating)}`}
            >
              {decisionStats.avgRating.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              +{Math.round((decisionStats.avgRating + 1) * 50)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Decision Type Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Decision Types</CardTitle>
          <CardDescription>Your decision-making patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {decisionTypes.map(type => {
              const stats = decisionStats.typeStats[type.value] || {
                count: 0,
                avgRating: 0,
              };
              const Icon = type.icon;
              return (
                <div key={type.value} className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <BadgeComponent className={type.color}>
                      {type.label}
                    </BadgeComponent>
                    <span className="text-sm text-muted-foreground">
                      {stats.count}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Avg Rating: {stats.avgRating.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger>
            <Button>
              <Brain className="h-4 w-4 mr-2" />
              New Decision
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record a Decision</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {taskName && (
                <div className="space-y-2">
                  <Label>Related Task</Label>
                  <p className="text-sm">{taskName}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Decision Type</Label>
                <Select
                  value={formData.decision_type}
                  onValueChange={v =>
                    setFormData({ ...formData, decision_type: v as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {decisionTypes.map(t => {
                      const Icon = t.icon;
                      return (
                        <SelectItem key={t.value} value={t.value}>
                          <Icon className="h-4 w-4 mr-2" />
                          {t.label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Question</Label>
                <Textarea
                  placeholder="What decision do you need to make?"
                  value={formData.question}
                  onChange={e =>
                    setFormData({ ...formData, question: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Rationale (optional)</Label>
                <Textarea
                  placeholder="Why are you making this decision?"
                  value={formData.rationale}
                  onChange={e =>
                    setFormData({ ...formData, rationale: e.target.value })
                  }
                  rows={2}
                />
              </div>

              <Button onClick={handleCreateDecision}>Record Decision</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button
          variant="outline"
          onClick={() => {
            setFilterType('all');
            setSearchQuery('');
          }}
        >
          <Search className="h-4 w-4 mr-2" />
          Clear Filters
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <Input
            placeholder="Search decisions..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <Select
          value={filterType}
          onValueChange={v => {
            if (v !== null) setFilterType(v);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {decisionTypes.map(t => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Decisions List */}
      {filteredDecisions.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h4 className="font-medium mb-2">No decisions yet</h4>
              <p className="text-sm mb-4">
                Start recording your important decisions to track your
                decision-making patterns
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredDecisions.map(decision => {
            const Icon =
              decisionTypes.find(t => t.value === decision.decision_type)
                ?.icon || Brain;
            return (
              <Card key={decision.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="h-4 w-4" />
                        <BadgeComponent>
                          {decisionTypes.find(
                            t => t.value === decision.decision_type
                          )?.label || 'Decision'}
                        </BadgeComponent>
                        <span className="text-xs text-muted-foreground">
                          {new Date(decision.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-medium">{decision.question}</h4>
                      {decision.task_name && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Task: {decision.task_name}
                        </p>
                      )}
                      {decision.rationale && (
                        <p className="text-sm text-muted-foreground mt-2">
                          <span className="font-medium">Rationale:</span>{' '}
                          {decision.rationale}
                        </p>
                      )}
                      {decision.options && decision.options.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground mb-1">
                            Options:
                          </p>
                          <ul className="text-xs list-disc list-inside text-muted-foreground">
                            {decision.options.map((opt, i) => (
                              <li key={i}>{opt.option_text}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Outcome Section */}
                    {decision.outcome ? (
                      <div className="ml-4 flex-shrink-0">
                        <div className="flex items-center gap-2">
                          {decision.outcome_rating !== null &&
                            decision.outcome_rating !== undefined && (
                              <>
                                {decision.outcome_rating > 0 ? (
                                  <ThumbsUp className="h-4 w-4 text-green-500" />
                                ) : decision.outcome_rating < 0 ? (
                                  <ThumbsDown className="h-4 w-4 text-red-500" />
                                ) : (
                                  <div className="w-4 h-4 rounded-full bg-amber-500" />
                                )}
                                <span className="text-xs text-muted-foreground">
                                  Rating: {decision.outcome_rating}
                                </span>
                              </>
                            )}
                        </div>
                      </div>
                    ) : (
                      <Dialog
                        open={editingDecision?.id === decision.id}
                        onOpenChange={open => {
                          if (!open) setEditingDecision(null);
                        }}
                      >
                        <DialogTrigger>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingDecision(decision)}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Record Outcome</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Outcome</Label>
                              <Textarea
                                placeholder="What was the result of your decision?"
                                defaultValue={decision.outcome || ''}
                                onBlur={e =>
                                  handleUpdateOutcome(
                                    decision.id,
                                    e.target.value,
                                    null
                                  )
                                }
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Rating (-1 to 1)</Label>
                              <Select
                                defaultValue={
                                  decision.outcome_rating?.toString() || ''
                                }
                                onValueChange={v => {
                                  const rating = v ? parseFloat(v) : null;
                                  handleUpdateOutcome(
                                    decision.id,
                                    decision.outcome || '',
                                    rating
                                  );
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select rating" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="-1">
                                    🔴 -1 (Poor)
                                  </SelectItem>
                                  <SelectItem value="-0.5">
                                    🔶 -0.5 (Fair)
                                  </SelectItem>
                                  <SelectItem value="0">
                                    ⚪ 0 (Neutral)
                                  </SelectItem>
                                  <SelectItem value="0.5">
                                    🟢 0.5 (Good)
                                  </SelectItem>
                                  <SelectItem value="1">
                                    🟢 1 (Excellent)
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <Button onClick={() => setEditingDecision(null)}>
                              Done
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
