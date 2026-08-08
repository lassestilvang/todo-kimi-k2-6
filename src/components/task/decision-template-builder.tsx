"use client";

import { useState, useEffect } from "react";
import {
  Brain,
  Lightbulb,
  FileText,
  RefreshCw,
  Search,
  Filter,
  Trash2,
  Check,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

/**
 * Decision template structure for AI-powered decision making
 */
interface DecisionTemplate {
  id: number;
  user_id: number;
  name: string;
  prompt_template: string;
  option_template?: string;
  decision_type?: string;
  created_at: string;
}

/**
 * Props for the Decision Template Builder component
 */
interface DecisionTemplateBuilderProps {
  /** The name of the task being decided upon (optional, used for template substitution) */
  taskName?: string;
  /** Callback when a decision is applied */
  onDecision?: (decision: { question: string; template: DecisionTemplate }) => void;
}

const decisionTypes = [
  { value: "priority", label: "Priority Decision", icon: Brain },
  { value: "approach", label: "Approach Decision", icon: Lightbulb },
  { value: "tool", label: "Tool Selection", icon: FileText },
  { value: "timeline", label: "Timeline Decision", icon: RefreshCw },
  { value: "allocation", label: "Resource Allocation", icon: Badge },
  { value: "cancellation", label: "Cancellation Decision", icon: AlertCircle },
];

export function DecisionTemplateBuilder({ taskName, onDecision }: DecisionTemplateBuilderProps) {
  const [templates, setTemplates] = useState<DecisionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUseDialog, setShowUseDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DecisionTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    prompt_template: "",
    option_template: "",
    decision_type: "approach",
  });

  const loadTemplates = async () => {
    try {
      const response = await fetch("/api/decision-templates");
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("Failed to load templates", error);
    } finally {
      setLoading(false);
    }
  };

  // Load templates
  useEffect(() => {
    loadTemplates();
  }, []);

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.prompt_template.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || t.decision_type === filterType;
    return matchesSearch && matchesType;
  });

  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim() || !newTemplate.prompt_template.trim()) {
      toast.error("Name and prompt template are required");
      return;
    }

    try {
      const response = await fetch("/api/decision-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTemplate),
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(prev => [...prev, data.template]);
        setShowCreateDialog(false);
        setNewTemplate({
          name: "",
          prompt_template: "",
          option_template: "",
          decision_type: "approach",
        });
        toast.success("Template created");
      }
    } catch (error) {
      toast.error("Failed to create template");
    }
  };

  const handleGenerateTemplate = async () => {
    if (!taskName) return;

    try {
      const response = await fetch("/api/decision-templates/generate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: { taskName, decisionType: newTemplate.decision_type ?? "approach" } }),
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(prev => [...prev, data.template]);
        toast.success("AI-generated template saved");
      }
    } catch (error) {
      toast.error("Failed to generate template");
    }
  };

  const handleUseTemplate = (template: DecisionTemplate) => {
    setSelectedTemplate(template);
    setShowUseDialog(true);
  };

  const handleApplyTemplate = () => {
    if (selectedTemplate && onDecision) {
      // Replace placeholders with task name
      const question = selectedTemplate.prompt_template.replace(
        /\{task_name\}/gi,
        taskName || "this task"
      );
      onDecision({
        question,
        template: selectedTemplate,
      });
      setShowUseDialog(false);
      toast.success("Template applied to decision");
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    try {
      await fetch(`/api/decision-templates/${id}`, { method: "DELETE" });
      setTemplates(prev => prev.filter(t => t.id !== id));
      toast.success("Template deleted");
    } catch (error) {
      toast.error("Failed to delete template");
    }
  };

  const getTemplateColor = (type?: string) => {
    const colors: Record<string, string> = {
      priority: "bg-red-100 dark:bg-red-900/20",
      approach: "bg-blue-100 dark:bg-blue-900/20",
      tool: "bg-green-100 dark:bg-green-900/20",
      timeline: "bg-yellow-100 dark:bg-yellow-900/20",
      allocation: "bg-purple-100 dark:bg-purple-900/20",
      cancellation: "bg-gray-100 dark:bg-gray-900/20",
    };
    return colors[type || "approach"] || "bg-blue-100 dark:bg-blue-900/20";
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Decision Templates
          </h3>
          <p className="text-sm text-muted-foreground">
            Templates for structured decision-making
          </p>
        </div>
        <div className="flex gap-2">
          <Search className="h-4 w-4 text-muted-foreground mt-2" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-48"
          />
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger>
              <Button size="sm">
                <FileText className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Decision Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Template Name</Label>
                  <Input
                    placeholder="e.g., Priority Decision for Q3 Projects"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Decision Type</Label>
                  <Select
                    value={newTemplate.decision_type || "approach"}
                    onValueChange={(v) => {
                      if (v !== null) {
                        setNewTemplate({ ...newTemplate, decision_type: v });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {decisionTypes.map(t => (
                        <SelectItem key={t.value} value={t.value}>
                          <t.icon className="h-4 w-4 mr-2" />
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="block">
                    Prompt Template
                    <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    placeholder="Enter the prompt for the AI to use when making decisions..."
                    value={newTemplate.prompt_template}
                    onChange={(e) => setNewTemplate({ ...newTemplate, prompt_template: e.target.value })}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use {'{task_name}'} as a placeholder for the task name
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Option Template (optional)</Label>
                  <Textarea
                    placeholder="Template for formatting decision options..."
                    value={newTemplate.option_template}
                    onChange={(e) => setNewTemplate({ ...newTemplate, option_template: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={taskName ? handleGenerateTemplate : handleCreateTemplate}>
                    {taskName ? "Generate AI Template" : "Create Template"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterType} onValueChange={(v) => { if (v !== null) setFilterType(v); }}>
          <SelectTrigger className="h-8 w-40">
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

      {/* Templates List */}
      <div className="space-y-3">
        {filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h4 className="font-medium mb-2">No templates found</h4>
                <p className="text-sm mb-4">
                  Create your first decision template to get started with structured decision-making.
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filteredTemplates.map(template => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getTemplateColor(template.decision_type)}>
                          {decisionTypes.find(t => t.value === template.decision_type)?.label || "Decision"}
                        </Badge>
                        <h4 className="font-medium">{template.name}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {template.prompt_template}
                      </p>
                      {template.option_template && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                          Options: {template.option_template}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUseTemplate(template)}
                        title="Use this template"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                        title="Delete template"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Use Template Dialog */}
      <Dialog open={showUseDialog} onOpenChange={setShowUseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Template to Decision</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div>
                <Label className="block mb-2">Preview: Question</Label>
                <p className="text-sm p-3 bg-muted rounded">
                  {selectedTemplate.prompt_template.replace(
                    /\{task_name\}/gi,
                    taskName || "this task"
                  )}
                </p>
              </div>
              {selectedTemplate.option_template && (
                <div>
                  <Label className="block mb-2">Options Format</Label>
                  <p className="text-sm p-3 bg-muted rounded font-mono text-xs">
                    {selectedTemplate.option_template}
                  </p>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowUseDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleApplyTemplate}>
                  Apply to Decision
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}