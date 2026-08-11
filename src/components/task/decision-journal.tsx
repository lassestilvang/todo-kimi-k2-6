"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  Lightbulb,
  X,
  Heart,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Decision {
  id: number;
  decision_type: string;
  question: string;
  chosen_option_text: string;
  rationale: string;
  outcome?: string;
  outcome_rating?: number;
  created_at: string;
  updated_at?: string;
}

interface DecisionJournalProps {
  className?: string;
}

const DECISION_TYPES = [
  { value: "priority", label: "Priority" },
  { value: "approach", label: "Approach" },
  { value: "tool", label: "Tool" },
  { value: "timeline", label: "Timeline" },
  { value: "allocation", label: "Allocation" },
  { value: "cancellation", label: "Cancellation" },
  { value: "feature", label: "Feature" },
];

export function DecisionJournal({ className }: DecisionJournalProps) {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDecision, setShowNewDecision] = useState(false);
  const [selectedType, setSelectedType] = useState("priority");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["Option 1", "Option 2"]);
  const [chosenOption, setChosenOption] = useState(0);
  const [rationale, setRationale] = useState("");

  const loadDecisions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/enhanced-productivity/decisions?limit=50");
      const data = await response.json();
      // Data is an array of decisions
      setDecisions(data);
    } catch (error) {
      console.error("Failed to load decisions:", error);
      toast.error("Failed to load decisions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDecisions();
  }, [loadDecisions]);

  const createDecision = async () => {
    if (!question.trim()) {
      toast.error("Please enter a question");
      return;
    }

    if (options.length < 2) {
      toast.error("Please provide at least 2 options");
      return;
    }

    try {
      const response = await fetch("/api/enhanced-productivity/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision_type: selectedType,
          question,
          chosen_option_text: options[chosenOption],
          rationale,
          alternative_options: options.map((opt, i) => ({
            option_text: opt,
            was_chosen: i === chosenOption,
          })),
        }),
      });

      const result = await response.json();
      if (result.id) {
        setDecisions(prev => [{
          id: result.id,
          decision_type: selectedType,
          question,
          chosen_option_text: options[chosenOption],
          rationale,
          created_at: new Date().toISOString(),
        }, ...prev]);
        setShowNewDecision(false);
        setQuestion("");
        setOptions(["Option 1", "Option 2"]);
        setChosenOption(0);
        setRationale("");
        toast.success("Decision recorded");
      }
    } catch {
      console.error("Failed to create decision");
      toast.error("Failed to record decision");
    }
  };

  const recordOutcome = async (decisionId: number, rating: number, outcome: string) => {
    try {
      await fetch(`/api/enhanced-productivity/decisions/${decisionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outcome,
          outcome_rating: rating,
        }),
      });
      toast.success("Outcome recorded");
      loadDecisions();
    } catch {
      toast.error("Failed to record outcome");
    }
  };

  const addOption = () => {
    setOptions([...options, "New option"]);
  };

  const removeOption = (index: number) => {
    if (options.length > 1) {
      setOptions(options.filter((_, i) => i !== index));
      if (chosenOption >= options.length - 1) {
        setChosenOption(Math.max(0, options.length - 2));
      }
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 bg-gray-200 rounded" />
            <div className="h-24 bg-gray-200 rounded" />
            <div className="h-24 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Decision Journal
          </h3>
          <p className="text-sm text-muted-foreground">
            Track decisions and improve your decision-making over time
          </p>
        </div>
        <Button onClick={() => setShowNewDecision(true)}>
          <Lightbulb className="h-4 w-4 mr-2" />
          New Decision
        </Button>
      </div>

      {/* New Decision Form */}
      {showNewDecision && (
        <Card>
          <CardHeader>
            <CardTitle>New Decision</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Decision Type</Label>
              <Select value={selectedType} onValueChange={(v) => v && setSelectedType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DECISION_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Question</Label>
              <Textarea
                placeholder="What decision are you facing?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={2}
              />
            </div>

            <div>
              <Label>Options to Consider</Label>
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2 mb-2">
                  <Input
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                  />
                  {options.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addOption}>
                Add Option
              </Button>
            </div>

            <div>
              <Label>Chosen Option</Label>
              <Select value={String(chosenOption)} onValueChange={(v) => v !== null && setChosenOption(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option, index) => (
                    <SelectItem key={index} value={String(index)}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Rationale</Label>
              <Textarea
                placeholder="Why did you choose this option?"
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNewDecision(false)}>
                Cancel
              </Button>
              <Button onClick={createDecision}>Record Decision</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Decision List */}
      {decisions.length > 0 ? (
        <div className="grid gap-3">
          {decisions.map((decision) => (
            <motion.div
              key={decision.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {DECISION_TYPES.find(t => t.value === decision.decision_type)?.label || "Decision"}
                  </CardTitle>
                  <CardDescription>{new Date(decision.created_at).toLocaleDateString()}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium mb-1">Question:</p>
                      <p className="text-sm">{decision.question}</p>
                    </div>

                    <div>
                      <p className="font-medium text-sm mb-1">Chosen Option:</p>
                      <p className="text-sm p-2 bg-muted rounded">{decision.chosen_option_text}</p>
                    </div>

                    <div>
                      <p className="font-medium text-sm mb-1">Rationale:</p>
                      <p className="text-sm text-muted-foreground">{decision.rationale}</p>
                    </div>

                    {/* Outcome Tracking */}
                    {(decision.outcome_rating !== null && decision.outcome_rating !== undefined) && (
                      <div className="pt-3 border-t">
                        <div className="flex items-center gap-2 mb-2">
                          <Heart className="h-4 w-4 text-pink-500" />
                          <span className="text-sm font-medium">Outcome</span>
                          <Badge variant={decision.outcome_rating > 0 ? "default" : "destructive"}>
                            {decision.outcome_rating > 0 ? "Good" : "Needs Improvement"}
                          </Badge>
                        </div>
                        <p className="text-sm">{decision.outcome}</p>
                      </div>
                    )}

                    {decision.outcome_rating === null || decision.outcome_rating === undefined && (
                      <div className="pt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-2">
                          Rate the outcome of this decision
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => recordOutcome(decision.id, -1, "Not happy with this decision")}
                          >
                            <ThumbsDown className="h-4 w-4 mr-1" />
                            Not great
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => recordOutcome(decision.id, 1, "This was a good decision")}
                          >
                            <ThumbsUp className="h-4 w-4 mr-1" />
                            Good
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No decisions recorded yet</p>
              <p className="text-xs mt-1">Start tracking your decisions to get insights</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      {decisions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Decision Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{decisions.length}</p>
                <p className="text-xs text-muted-foreground">Decisions</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {decisions.filter(d => d.outcome_rating && d.outcome_rating > 0).length}
                </p>
                <p className="text-xs text-muted-foreground">Positive Outcomes</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {Object.entries(
                    decisions.reduce((acc, d) => {
                      acc[d.decision_type] = (acc[d.decision_type] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).sort((a, b) => b[1] - a[1])[0]?.[1] || 0}
                </p>
                <p className="text-xs text-muted-foreground">Most Common Type</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}