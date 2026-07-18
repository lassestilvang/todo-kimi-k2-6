"use client";

import { useState } from "react";
import { DecisionEntry, DecisionOption } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Trash2, Edit, Check, X } from "lucide-react";
import { toast } from "sonner";

interface TaskDecisionTabProps {
  task: { id: number; name: string };
  decisions?: DecisionEntry[];
  onDecisionsChange?: (decisions: DecisionEntry[]) => void;
}

const decisionTypes = [
  { value: "priority", label: "Priority Decision" },
  { value: "approach", label: "Approach Decision" },
  { value: "tool", label: "Tool Selection" },
  { value: "timeline", label: "Timeline Decision" },
  { value: "allocation", label: "Resource Allocation" },
  { value: "cancellation", label: "Cancellation Decision" },
];

export function TaskDecisionTab({ task, decisions = [], onDecisionsChange }: TaskDecisionTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDecision, setNewDecision] = useState({
    decision_type: "approach" as const,
    question: "",
    rationale: "",
  });

  const handleAddDecision = async () => {
    if (!newDecision.question.trim()) return;

    try {
      const response = await fetch("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: task.id,
          user_id: 1,
          decision_type: newDecision.decision_type,
          question: newDecision.question,
          rationale: newDecision.rationale,
        }),
      });

      if (response.ok) {
        const createdDecision = await response.json();
        onDecisionsChange?.([...decisions, createdDecision]);
        setNewDecision({ decision_type: "approach", question: "", rationale: "" });
        setShowAddForm(false);
        toast.success("Decision recorded");
      }
    } catch (error) {
      toast.error("Failed to record decision");
    }
  };

  const handleDeleteDecision = async (decisionId: number) => {
    try {
      await fetch(`/api/decisions/${decisionId}`, { method: "DELETE" });
      onDecisionsChange?.(decisions.filter(d => d.id !== decisionId));
      toast.success("Decision removed");
    } catch (error) {
      toast.error("Failed to remove decision");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          Decision Journal
        </h3>
        <Button
          size="sm"
          onClick={() => setShowAddForm(true)}
        >
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
                onValueChange={(value) => setNewDecision({ ...newDecision, decision_type: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {decisionTypes.map((type) => (
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
                  onChange={(e) => setNewDecision({ ...newDecision, question: e.target.value })}
                />
              </div>

              <div>
                <Label>Rationale</Label>
                <Textarea
                  placeholder="Why are you making this decision?"
                  value={newDecision.rationale}
                  onChange={(e) => setNewDecision({ ...newDecision, rationale: e.target.value })}
                  rows={3}
                />
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
          {decisions.map((decision) => (
            <Card key={decision.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <Badge variant="outline" className="text-xs">
                      {decisionTypes.find(t => t.value === decision.decision_type)?.label || decision.decision_type}
                    </Badge>
                    <h4 className="font-medium">{decision.question}</h4>
                    {decision.rationale && (
                      <p className="text-sm text-muted-foreground">
                        {decision.rationale}
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Created: {new Date(decision.created_at).toLocaleDateString()}
                      {decision.outcome && decision.outcome_rating !== null && (
                        <span className="ml-2">• Rating: {decision.outcome_rating}/10</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteDecision(decision.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          No decisions recorded yet. Click "Add Decision" to start tracking your decision-making process.
        </p>
      )}
    </div>
  );
}