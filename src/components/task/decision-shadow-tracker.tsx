"use client";

import { useState } from "react";
import {
  Brain,
  Lightbulb,
  AlertCircle,
  Plus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useDecisionShadow } from "@/hooks/use-enhanced-productivity";

export function DecisionShadowTracker() {
  const { analysis, loading, createDecision } = useDecisionShadow();
  const [showForm, setShowForm] = useState(false);
  const [decisionData, setDecisionData] = useState({
    decision_type: "approach" as const,
    question: "",
    chosen_option_text: "",
    rationale: "",
    opportunity_cost: "",
    outcome: "",
    outcome_rating: 0
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">Loading decision analysis...</div>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = async () => {
    await createDecision(decisionData);
    setShowForm(false);
    setDecisionData({
      decision_type: "approach",
      question: "",
      chosen_option_text: "",
      rationale: "",
      opportunity_cost: "",
      outcome: "",
      outcome_rating: 0
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Decision Journal
          </CardTitle>
          <CardDescription>
            Track your decisions and learn from outcomes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{analysis?.totalDecisions ?? 0}</p>
              <p className="text-xs text-muted-foreground">Total Decisions</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">
                {analysis?.avgOutcomeRating?.toFixed(1) ?? "N/A"}
              </p>
              <p className="text-xs text-muted-foreground">Avg Rating</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">
                {Object.entries(analysis?.decisionTypes || [])
                  .filter(([, data]) => (data as any).avgRating >= 4)
                  .length}
              </p>
              <p className="text-xs text-muted-foreground">High-Quality Decisions</p>
            </div>
          </div>

          <Button
            onClick={() => setShowForm(true)}
            className="w-full md:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Decision Entry
          </Button>

          {/* Decision Patterns */}
          {analysis?.patternAnalysis && (
            <div className="mt-6">
              <h4 className="font-medium mb-3">Patterns & Insights</h4>
              {analysis.patternAnalysis.map((p: any, idx: number) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-muted rounded-lg mb-2">
                  {p.pattern.includes("High") || p.pattern.includes("Low") ? (
                    <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                  ) : (
                    <Lightbulb className="h-5 w-5 text-blue-500 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{p.pattern}</p>
                    <p className="text-sm text-muted-foreground">{p.recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Decision Form Modal */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Decision</CardTitle>
            <CardDescription>Record your decision and its context</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Decision Type</Label>
              <Select
                value={decisionData.decision_type}
                onValueChange={(v: any) => setDecisionData(d => ({ ...d, decision_type: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority">Priority Decision</SelectItem>
                  <SelectItem value="approach">Approach Decision</SelectItem>
                  <SelectItem value="tool">Tool Selection</SelectItem>
                  <SelectItem value="timeline">Timeline Decision</SelectItem>
                  <SelectItem value="allocation">Resource Allocation</SelectItem>
                  <SelectItem value="cancellation">Cancellation Decision</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Question</Label>
              <Input
                placeholder="What decision are you making?"
                value={decisionData.question}
                onChange={(e) => setDecisionData(d => ({ ...d, question: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Chosen Option</Label>
              <Textarea
                placeholder="What option did you choose and why?"
                value={decisionData.chosen_option_text}
                onChange={(e) => setDecisionData(d => ({ ...d, chosen_option_text: e.target.value }))}
                rows={3}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Rationale</Label>
              <Textarea
                placeholder="Why was this your final choice?"
                value={decisionData.rationale}
                onChange={(e) => setDecisionData(d => ({ ...d, rationale: e.target.value }))}
                rows={2}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Opportunity Cost</Label>
              <Textarea
                placeholder="What did you give up by choosing this option?"
                value={decisionData.opportunity_cost}
                onChange={(e) => setDecisionData(d => ({ ...d, opportunity_cost: e.target.value }))}
                rows={2}
                className="mt-1"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                Save Decision
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}