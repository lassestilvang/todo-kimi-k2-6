// @ts-nocheck
"use client";

import { useState } from "react";
import {
  Smile,
  Lightbulb,
  CheckCircle2,
  Star,
  ThumbsUp,
  Share2,
  Bookmark,
  Trophy,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Task {
  id: number;
  name: string;
  completed: boolean;
  completed_at: string | null;
  description?: string | null;
}

interface SuccessStory {
  id: number;
  task_id: number;
  what_went_well: string;
  key_insight: string;
  improvement_suggestion: string;
  difficulty_level: "easy" | "medium" | "hard";
  tags: string[];
  created_at: string;
  shared: boolean;
}

interface TaskSuccessStoriesProps {
  task?: Task;
  onComplete?: (story: Omit<SuccessStory, "id" | "created_at" | "shared">) => void;
}

const difficultyLabels = {
  easy: { label: "Easy", color: "bg-green-500/10 text-green-600" },
  medium: { label: "Medium", color: "bg-amber-500/10 text-amber-600" },
  hard: { label: "Hard", color: "bg-red-500/10 text-red-600" },
};

export function TaskSuccessStories({ task, onComplete }: TaskSuccessStoriesProps) {
  const [showStoryForm, setShowStoryForm] = useState(false);
  const [story, setStory] = useState({
    what_went_well: "",
    key_insight: "",
    improvement_suggestion: "",
    difficulty_level: "medium" as const,
    tags: "" as string,
  });

  const [savedStories, setSavedStories] = useState<SuccessStory[]>([]);

  // Load saved stories from localStorage
  const loadSavedStories = () => {
    const saved = localStorage.getItem("task_success_stories");
    if (saved) {
      setSavedStories(JSON.parse(saved));
    }
  };

  // Save stories to localStorage
  const saveStories = (stories: SuccessStory[]) => {
    localStorage.setItem("task_success_stories", JSON.stringify(stories));
  };

  const handleSubmit = () => {
    if (!story.what_went_well.trim()) {
      toast.error("Please share what went well");
      return;
    }

    const newStory: Omit<SuccessStory, "id" | "created_at" | "shared"> = {
      task_id: task?.id || 0,
      what_went_well: story.what_went_well,
      key_insight: story.key_insight,
      improvement_suggestion: story.improvement_suggestion,
      difficulty_level: story.difficulty_level,
      tags: story.tags.split(",").map(t => t.trim()).filter(t => t),
    };

    setSavedStories(prev => [
      ...prev,
      { ...newStory, id: Date.now(), created_at: new Date().toISOString(), shared: false }
    ]);

    saveStories(savedStories);

    setShowStoryForm(false);
    setStory({
      what_went_well: "",
      key_insight: "",
      improvement_suggestion: "",
      difficulty_level: "medium",
      tags: "",
    });

    toast.success("Success story saved!");
    onComplete?.(newStory);
  };

  const handleShareStory = (storyId: number) => {
    const story = savedStories.find(s => s.id === storyId);
    if (story) {
      setSavedStories(prev =>
        prev.map(s => s.id === storyId ? { ...s, shared: !s.shared } : s)
      );
      saveStories(savedStories.map(s => s.id === storyId ? { ...s, shared: !s.shared } : s));
    }
  };

  const getSuggestedTags = () => {
    const tags = new Set<string>();
    if (story.key_insight.toLowerCase().includes("time")) tags.add("efficiency");
    if (story.key_insight.toLowerCase().includes("team")) tags.add("collaboration");
    if (story.key_insight.toLowerCase().includes("problem")) tags.add("troubleshooting");
    if (story.key_insight.toLowerCase().includes("improv")) tags.add("improvement");
    return Array.from(tags);
  };

  return (
    <div className="space-y-4">
      {!showStoryForm && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowStoryForm(true)}
        >
          <Smile className="h-4 w-4 mr-2" />
          Share Success Story
        </Button>
      )}

      {/* Story Form */}
      {showStoryForm && task && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Celebrate Your Win
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>What went well?</Label>
              <Textarea
                placeholder="Share what went well with this task..."
                value={story.what_went_well}
                onChange={(e) => setStory({ ...story, what_went_well: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label>Key Insight</Label>
              <Textarea
                placeholder="What did you learn from this task?"
                value={story.key_insight}
                onChange={(e) => setStory({ ...story, key_insight: e.target.value })}
                rows={2}
              />
              <p className="text-xs text-muted-foreground mt-1">
                This will appear in your learning summary
              </p>
            </div>

            <div>
              <Label>Improvement Suggestion</Label>
              <Textarea
                placeholder="How could you do this better next time?"
                value={story.improvement_suggestion}
                onChange={(e) => setStory({ ...story, improvement_suggestion: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Difficulty</Label>
                <Select
                  value={story.difficulty_level}
                  onValueChange={(v) => setStory({ ...story, difficulty_level: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(difficultyLabels).map(([key, val]) => (
                      <SelectItem key={key} value={key}>
                        <span className={val.color}>{val.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tags (comma separated)</Label>
                <Input
                  placeholder="e.g., workflow, innovation, client-meeting"
                  value={story.tags}
                  onChange={(e) => setStory({ ...story, tags: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tags: {getSuggestedTags().size > 0 ? getSuggestedTags().join(", ") : "Add your own"}
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowStoryForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                Save Story
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saved Stories List */}
      {savedStories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Your Success Stories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {savedStories.map((story, index) => (
                <div key={story.id} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={difficultyLabels[story.difficulty_level].color}>
                          {difficultyLabels[story.difficulty_level].label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(story.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium">What went well: </span>
                          <span className="text-sm">{story.what_went_well}</span>
                        </div>
                        {story.key_insight && (
                          <div>
                            <span className="text-sm font-medium">Key insight: </span>
                            <span className="text-sm text-muted-foreground">{story.key_insight}</span>
                          </div>
                        )}
                        {story.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {story.tags.map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleShareStory(story.id)}
                    >
                      {story.shared ? (
                        <Share2 className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Share2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Learning Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Learning Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-purple-600">{savedStories.length}</p>
              <p className="text-xs text-muted-foreground">Stories Logged</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {Math.round(savedStories.filter(s => s.key_insight).length / Math.max(savedStories.length, 1) * 100)}%
              </p>
              <p className="text-xs text-muted-foreground">With Insights</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {Math.round(savedStories.filter(s => s.improvement_suggestion).length / Math.max(savedStories.length, 1) * 100)}%
              </p>
              <p className="text-xs text-muted-foreground">With Improvements</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}