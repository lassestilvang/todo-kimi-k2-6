"use client";

import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown, Smile, Frown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TaskVoteProps {
  taskId: number;
  initialScore?: number;
  initialUserVote?: -1 | 1 | null;
  onVote?: (newVote: { score: number; userVote: -1 | 1 | null }) => void;
}

interface VoteStats {
  total: number;
  count: number;
  score: number;
}

export function TaskVote({
  taskId,
  initialScore = 0,
  initialUserVote = null,
  onVote,
}: TaskVoteProps) {
  const [userVote, setUserVote] = useState<-1 | 1 | null>(initialUserVote);
  const [stats, setStats] = useState<VoteStats>({ total: 0, count: 0, score: initialScore });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Fetch current vote stats
    fetch(`/api/task-votes?task_id=${taskId}`)
      .then((r) => r.json())
      .then((data) => {
        setStats({
          total: data.total || 0,
          count: data.count || 0,
          score: data.score || 0,
        });
        // In a real app, you'd also get the user's vote from the API
      })
      .catch(console.error);
  }, [taskId]);

  const handleVote = async (value: -1 | 1) => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      const response = await fetch("/api/task-votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, value }),
      });

      if (response.ok) {
        const data = await response.json();
        const newStats = {
          total: data.stats.total,
          count: data.stats.count,
          score: data.stats.score,
        };
        setStats(newStats);
        setUserVote(data.vote.value);
        onVote?.({ score: newStats.score, userVote: data.vote.value });
      }
    } catch (error) {
      console.error("Failed to vote:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveVote = async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      const response = await fetch(`/api/task-votes?task_id=${taskId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        const data = await response.json();
        setStats((prev) => ({ ...prev, total: data.stats?.total || 0 }));
        setUserVote(null);
        onVote?.({ score: data.stats?.score || 0, userVote: null });
      }
    } catch (error) {
      console.error("Failed to remove vote:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 5) return "text-green-600";
    if (score >= 2) return "text-blue-600";
    if (score >= 0) return "text-gray-600";
    return "text-red-600";
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 5) return <Smile className="h-4 w-4" />;
    if (score >= 2) return <Smile className="h-4 w-4" />;
    if (score >= 0) return <Smile className="h-4 w-4" />;
    return <Frown className="h-4 w-4" />;
  };

  return (
    <div className="flex items-center gap-2">
      {/* Upvote */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleVote(1)}
        disabled={isLoading}
        className={cn(
          "h-7 w-7 p-0",
          userVote === 1 && "text-blue-600 bg-blue-50 dark:bg-blue-950"
        )}
      >
        <ThumbsUp className={cn("h-4 w-4", userVote === 1 && "fill-current")} />
      </Button>

      {/* Score */}
      <div className="flex items-center gap-1">
        {stats.count > 0 ? (
          <>
            <span className={cn("text-sm font-medium", getScoreColor(stats.score))}>
              {Math.round(stats.score * 10) / 10}
            </span>
            <Badge variant="secondary" className="text-xs">
              {stats.count}
            </Badge>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">0</span>
        )}
      </div>

      {/* Downvote */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleVote(-1)}
        disabled={isLoading}
        className={cn(
          "h-7 w-7 p-0",
          userVote === -1 && "text-red-600 bg-red-50 dark:bg-red-950"
        )}
      >
        <ThumbsDown className={cn("h-4 w-4", userVote === -1 && "fill-current")} />
      </Button>

      {/* Remove vote if already voted */}
      {userVote !== null && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRemoveVote}
          disabled={isLoading}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-red-500"
        >
          Remove
        </Button>
      )}
    </div>
  );
}