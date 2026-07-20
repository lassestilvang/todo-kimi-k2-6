"use client";

import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown, Star, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

interface TaskVotingProps {
  taskId: number;
  initialScore?: number;
  initialVote?: -1 | 1 | null;
  disabled?: boolean;
}

interface VoteStats {
  total: number;
  count: number;
  score: number;
}

export function TaskVoting({
  taskId,
  initialScore = 0,
  initialVote = null,
  disabled = false,
}: TaskVotingProps) {
  const [vote, setVote] = useState<-1 | 1 | null>(initialVote);
  const [stats, setStats] = useState<VoteStats>({ total: 0, count: 0, score: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadVoteData();
  }, [taskId]);

  const loadVoteData = async () => {
    try {
      const response = await fetch(`/api/task-votes?task_id=${taskId}`);
      if (response.ok) {
        const data = await response.json();
        setStats({
          total: data.total || 0,
          count: data.count || 0,
          score: data.score || 0,
        });

        const votes = data.votes || [];
        // Get first user's vote (in real app would use session)
        if (votes.length > 0) {
          setVote(votes[0].value);
        }
      }
    } catch (error) {
      console.error("Failed to load vote data:", error);
    }
  };

  const handleVote = async (value: -1 | 1) => {
    if (disabled || loading) return;

    setLoading(true);

    try {
      const response = await fetch("/api/task-votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, value }),
      });

      if (response.ok) {
        const data = await response.json();
        setVote(value);
        setStats(data.stats);
        toast.success(`Task ${value === 1 ? "prioritized" : "marked as reviewed"}!`);
      } else {
        throw new Error("Failed to vote");
      }
    } catch (error) {
      toast.error("Failed to vote on task");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveVote = async () => {
    if (disabled || loading) return;

    setLoading(true);

    try {
      const response = await fetch(`/api/task-votes?task_id=${taskId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setVote(null);
        await loadVoteData();
        toast.success("Vote removed");
      }
    } catch (error) {
      toast.error("Failed to remove vote");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score > 0.5) return "text-green-500";
    if (score < -0.5) return "text-red-500";
    return "text-amber-500";
  };

  if (stats.count === 0) {
    return null; // Don't show voting UI if no votes yet
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 text-xs">
        <Button
          size="sm"
          variant={vote === 1 ? "default" : "outline"}
          disabled={disabled || loading}
          onClick={() => vote === 1 ? handleRemoveVote() : handleVote(1)}
          className="h-6 px-2"
        >
          <ThumbsUp className="h-3 w-3" />
          {vote === 1 && <ChevronUp className="h-2 w-2 ml-0.5" />}
        </Button>

        <span className={getScoreColor(stats.score)}>
          <Star className="h-3 w-3 inline fill-current" /> {stats.score.toFixed(2)}
        </span>

        <Button
          size="sm"
          variant={vote === -1 ? "default" : "outline"}
          disabled={disabled || loading}
          onClick={() => vote === -1 ? handleRemoveVote() : handleVote(-1)}
          className="h-6 px-2"
        >
          <ThumbsDown className="h-3 w-3" />
          {vote === -1 && <ChevronDown className="h-2 w-2 ml-0.5" />}
        </Button>

        <Badge variant="outline" className="text-xs">
          {stats.count} {stats.count === 1 ? "vote" : "votes"}
        </Badge>
      </div>
    </TooltipProvider>
  );
}
