"use client";

import { useState, useMemo } from "react";
import {
  Brain,
  Bot,
  TestTube,
  Check,
  Copy,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface AIComparisonResult {
  provider: string;
  name: string;
  description?: string | null;
  priority: string;
  estimated_duration?: number | null;
  suggested_date?: string | null;
  recurring?: string;
  timeout: boolean;
  duration_ms: number;
  confidence_score: number;
}

interface ModelPerformance {
  model: string;
  avgResponseTime: number;
  successRate: number;
  avgConfidence: number;
  totalTests: number;
}

const aiModels = [
  { id: "keyword-parser", name: "Keyword Parser", provider: "Built-in", description: "Fast, rules-based parser" },
  { id: "openai-gpt4", name: "GPT-4o", provider: "OpenAI", description: "Context-aware, natural language" },
  { id: "claude-sonnet", name: "Claude 3.5 Sonnet", provider: "Anthropic", description: "Thoughtful, detailed analysis" },
];

export function TaskFlowLabs() {
  const [testInput, setTestInput] = useState("");
  const [results, setResults] = useState<AIComparisonResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Calculate performance metrics (pure function, no side effects)
  const performanceMetrics = useMemo(() => {
    if (results.length === 0) return null;

    const stats: Record<string, ModelPerformance> = {};

    aiModels.forEach((model) => {
      const modelResults = results.filter(
        (r) => r.provider === model.name || r.provider === model.id
      );

      if (modelResults.length > 0) {
        const avgTime = modelResults.reduce((sum, r) => sum + r.duration_ms, 0) / modelResults.length;
        const successRate = modelResults.filter((r) => !r.timeout).length / modelResults.length;
        const avgConfidence = modelResults.reduce((sum, r) => sum + r.confidence_score, 0) / modelResults.length;

        stats[model.id] = {
          model: model.name,
          avgResponseTime: avgTime,
          successRate,
          avgConfidence,
          totalTests: modelResults.length,
        };
      }
    });

    return stats;
  }, [results]);

  const handleTestParsing = async () => {
    if (!testInput.trim()) {
      toast.error("Please enter a task description to test");
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      const response = await fetch("/api/ai/parse-comparison", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: { text: testInput } }),
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      }
    } catch {
      toast.error("Failed to test AI parsing");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyResult = (result: AIComparisonResult) => {
    const text = `Name: ${result.name}
Priority: ${result.priority}
Description: ${result.description || "N/A"}
Estimated Duration: ${result.estimated_duration ?? "N/A"} minutes
Suggested Date: ${result.suggested_date ?? "N/A"}
Recurring: ${result.recurring || "None"}`;
    navigator.clipboard.writeText(text);
    toast.success("Result copied to clipboard");
  };

  const priorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      critical: "border-red-500 text-red-500",
      high: "border-orange-500 text-orange-500",
      medium: "border-blue-500 text-blue-500",
      low: "border-green-500 text-green-500",
      none: "border-gray-500 text-gray-500",
    };
    return colors[priority] || "border-gray-500 text-gray-500";
  };

  return (
    <div className="space-y-4">
      {/* Input Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            AI Task Parsing
          </CardTitle>
          <CardDescription>
            Compare how different AI models parse natural language tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Task Input</Label>
              <Textarea
                placeholder="Enter a natural language task description..."
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                rows={3}
              />
            </div>

            <Button onClick={handleTestParsing} disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Bot className="h-4 w-4 mr-2" />
                  Test All Models
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          {/* Performance Overview */}
          {performanceMetrics && Object.keys(performanceMetrics).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {Object.values(performanceMetrics).map((stat) => (
                    <div key={stat.model} className="bg-muted/50 p-3 rounded">
                      <div className="text-sm font-medium mb-2">{stat.model}</div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>Avg Response:</span>
                          <span>{Math.round(stat.avgResponseTime)}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Success Rate:</span>
                          <Badge variant={stat.successRate > 0.9 ? "default" : "destructive"}>
                            {Math.round(stat.successRate * 100)}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results List */}
          <div className="space-y-3">
            {results.map((result, index) => (
              <Card key={index} className={result.timeout ? "border-red-200" : ""}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{result.provider}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {result.timeout ? "Timeout" : `${Math.round(result.duration_ms)}ms`}
                      </span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {result.timeout ? (
                    <div className="text-center py-4 text-red-600">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">Request timed out</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Task Name</Label>
                        <p className="font-medium">{result.name}</p>
                      </div>

                      {result.description && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Description</Label>
                          <p className="text-sm">{result.description}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                          <Label className="text-xs">Priority</Label>
                          <Badge className={priorityColor(result.priority)}>
                            {result.priority}
                          </Badge>
                        </div>

                        <div>
                          <Label className="text-xs">Duration</Label>
                          <p>{result.estimated_duration ? `${result.estimated_duration}m` : "Not set"}</p>
                        </div>

                        <div>
                          <Label className="text-xs">Date</Label>
                          <p>{result.suggested_date || "Not set"}</p>
                        </div>

                        <div>
                          <Label className="text-xs">Confidence</Label>
                          <div className="flex items-center gap-1">
                            <Progress value={result.confidence_score} className="h-2 w-12" />
                            <span>{Math.round(result.confidence_score * 100)}%</span>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyResult(result)}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy Result
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {results.length === 0 && !loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground">
              <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h4 className="font-medium mb-2">Test AI Models</h4>
              <p className="text-sm mb-4">
                Enter a task description above to compare how different AI models parse it
              </p>
              <div className="text-xs text-left inline-block bg-muted/50 p-3 rounded">
                <p className="font-medium mb-1">Available Models:</p>
                <ul className="list-disc list-inside text-muted-foreground text-xs">
                  {aiModels.map((model) => (
                    <li key={model.id}>
                      {model.name} ({model.provider}): {model.description}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}