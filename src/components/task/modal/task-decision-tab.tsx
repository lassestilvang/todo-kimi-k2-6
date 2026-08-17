'use client';

import { useState } from 'react';
import { DecisionEntry } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Edit, Star, CheckCircle2, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';

interface TaskDecisionTabProps {
  task: { id: number; name: string };
  decisions?: DecisionEntry[];
  onDecisionsChange?: (decisions: DecisionEntry[]) => void;
}

const decisionTypes = [
  { value: 'priority', label: 'Priority Decision' },
  { value: 'approach', label: 'Approach Decision' },
  { value: 'tool', label: 'Tool Selection' },
  { value: 'timeline', label: 'Timeline Decision' },
  { value: 'allocation', label: 'Resource Allocation' },
  { value: 'cancellation', label: 'Cancellation Decision' },
];

export function TaskDecisionTab({
  task,
  decisions = [],
  onDecisionsChange,
}: TaskDecisionTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showOutcomeForm, setShowOutcomeForm] = useState<number | null>(null);
  const [newDecision, setNewDecision] = useState({
    decision_type: 'approach' as const,
    question: '',
    rationale: '',
    options: [{ option_text: '', pros: '', cons: '' }],
  });

  const handleAddDecision = async () => {
    if (!newDecision.question.trim()) return;

    try {
      const response = await fetch('/api/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: task.id,
          user_id: 1,
          decision_type: newDecision.decision_type,
          question: newDecision.question,
          rationale: newDecision.rationale,
          options: newDecision.options.filter(o => o.option_text.trim()),
        }),
      });

      if (response.ok) {
        const createdDecision = await response.json();
        onDecisionsChange?.([...decisions, createdDecision]);
        setNewDecision({
          decision_type: 'approach',
          question: '',
          rationale: '',
          options: [{ option_text: '', pros: '', cons: '' }],
        });
        setShowAddForm(false);
        toast.success('Decision recorded');
      } else {
        toast.error('Failed to record decision');
      }
    } catch (error) {
      toast.error('Failed to record decision');
    }
  };

  const handleAddOption = () => {
    setNewDecision({
      ...newDecision,
      options: [
        ...newDecision.options,
        { option_text: '', pros: '', cons: '' },
      ],
    });
  };

  const handleRemoveOption = (index: number) => {
    if (newDecision.options.length > 1) {
      setNewDecision({
        ...newDecision,
        options: newDecision.options.filter((_, i) => i !== index),
      });
    }
  };

  const handleUpdateOption = (index: number, field: string, value: string) => {
    const newOptions = [...newDecision.options];
    newOptions[index][field as keyof (typeof newOptions)[0]] = value;
    setNewDecision({ ...newDecision, options: newOptions });
  };

  const handleDeleteDecision = async (decisionId: number) => {
    try {
      await fetch(`/api/decisions/${decisionId}`, { method: 'DELETE' });
      onDecisionsChange?.(decisions.filter(d => d.id !== decisionId));
      toast.success('Decision removed');
    } catch (error) {
      toast.error('Failed to remove decision');
    }
  };

  const handleOutcomeSave = async (
    decisionId: number,
    rating: number,
    outcome: string,
    notes?: string
  ) => {
    try {
      const response = await fetch(`/api/decisions/${decisionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcome_rating: rating,
          outcome,
          outcome_notes: notes,
        }),
      });

      if (response.ok) {
        toast.success('Outcome recorded');
        onDecisionsChange?.([]);
        setShowOutcomeForm(null);
      }
    } catch (error) {
      toast.error('Failed to save outcome');
    }
  };

  const getOutcomeColor = (rating: number) => {
    if (rating > 0) return 'text-green-600';
    if (rating < 0) return 'text-red-600';
    return 'text-amber-500';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          Decision Journal
        </h3>
        <Button size="sm" onClick={() => setShowAddForm(true)}>
          Add Decision
        </Button>
      </div>

      {/* Add Decision Form */}
      {showAddForm && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-3">
              <Select
                value={newDecision.decision_type}
                onValueChange={value =>
                  setNewDecision({
                    ...newDecision,
                    decision_type: value as any,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {decisionTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div>
                <Label>Question</Label>
                <Input
                  placeholder="What decision are you making?"
                  value={newDecision.question}
                  onChange={e =>
                    setNewDecision({ ...newDecision, question: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>Rationale</Label>
                <Textarea
                  placeholder="Why are you making this decision?"
                  value={newDecision.rationale}
                  onChange={e =>
                    setNewDecision({
                      ...newDecision,
                      rationale: e.target.value,
                    })
                  }
                  rows={2}
                />
              </div>

              <div>
                <Label>Options</Label>
                <div className="space-y-2">
                  {newDecision.options.map((opt, i) => (
                    <div key={i} className="border rounded p-2 space-y-2">
                      <Input
                        placeholder={`Option ${i + 1}`}
                        value={opt.option_text}
                        onChange={e =>
                          handleUpdateOption(i, 'option_text', e.target.value)
                        }
                      />
                      <Input
                        placeholder="Pros (comma separated)"
                        value={opt.pros}
                        onChange={e =>
                          handleUpdateOption(i, 'pros', e.target.value)
                        }
                      />
                      <Input
                        placeholder="Cons (comma separated)"
                        value={opt.cons}
                        onChange={e =>
                          handleUpdateOption(i, 'cons', e.target.value)
                        }
                      />
                      {newDecision.options.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveOption(i)}
                        >
                          Remove Option
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={handleAddOption}>
                    + Add Option
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleAddDecision}>Save Decision</Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Decisions */}
      {decisions.length > 0 ? (
        <div className="space-y-3">
          {decisions.map(decision => (
            <Card key={decision.id}>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {decisionTypes.find(
                        t => t.value === decision.decision_type
                      )?.label || decision.decision_type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(decision.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="font-medium">{decision.question}</h4>
                  {decision.rationale && (
                    <p className="text-sm text-muted-foreground">
                      {decision.rationale}
                    </p>
                  )}

                  {/* Options */}
                  {decision.options && decision.options.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium">Options:</p>
                      <ul className="text-xs text-muted-foreground list-disc list-inside">
                        {decision.options.map((opt: any, i: number) => (
                          <li key={i}>{opt.option_text}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Outcome */}
                  {decision.outcome_rating !== null && (
                    <div
                      className={`mt-2 p-2 rounded text-xs ${
                        decision.outcome_rating > 0
                          ? 'bg-green-50'
                          : decision.outcome_rating < 0
                            ? 'bg-red-50'
                            : 'bg-amber-50'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <Star
                          className={`h-3 w-3 ${getOutcomeColor(decision.outcome_rating)}`}
                        />
                        <span>
                          Outcome:{' '}
                          {decision.outcome_rating > 0
                            ? 'Positive'
                            : decision.outcome_rating < 0
                              ? 'Negative'
                              : 'Neutral'}
                        </span>
                      </div>
                      {decision.outcome && (
                        <p className="mt-1">{decision.outcome}</p>
                      )}
                    </div>
                  )}

                  {/* Rating for pending outcomes */}
                  {decision.outcome_rating === null && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() => setShowOutcomeForm(decision.id)}
                    >
                      Add Outcome
                    </Button>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-1 mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      data-testid="edit-decision-button"
                      title="Edit decision"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      data-testid="delete-decision-button"
                      title="Delete decision"
                      onClick={() => handleDeleteDecision(decision.id)}
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          No decisions recorded yet. Click "Add Decision" to start tracking your
          decision-making process.
        </p>
      )}
    </div>
  );
}
