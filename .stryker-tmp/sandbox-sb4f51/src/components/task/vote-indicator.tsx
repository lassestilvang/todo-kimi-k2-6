// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

interface VoteIndicatorProps {
  taskId: number;
  initialScore?: number;
  initialCount?: number;
  initialUserVote?: -1 | 1 | 0;
  className?: string;
  onVote?: (newScore: number, newCount: number, newUserVote: -1 | 1 | 0) => void;
}

interface VoteResponse {
  success: boolean;
  vote: { task_id: number; user_id: number; value: -1 | 1 };
  stats: {
    total: number;
    count: number;
    score: number;
  };
}

export function VoteIndicator({
  taskId,
  initialScore = 0,
  initialCount = 0,
  initialUserVote = 0,
  className,
  onVote,
}: VoteIndicatorProps) {
  const [score, setScore] = useState(initialScore);
  const [count, setCount] = useState(initialCount);
  const [userVote, setUserVote] = useState<-1 | 1 | 0>(initialUserVote);
  const [isVoting, setIsVoting] = useState(false);

  useEffect(() => {
    setScore(initialScore);
    setCount(initialCount);
    setUserVote(initialUserVote);
  }, [initialScore, initialCount, initialUserVote]);

  const handleVote = async (value: -1 | 1) => {
    if (isVoting) return;

    setIsVoting(true);
    try {
      const response = await fetch("/api/task-votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, value }),
      });

      if (response.ok) {
        const result: VoteResponse = await response.json();
        const newUserVote = result.vote.value;

        setScore(result.stats.score);
        setCount(result.stats.count);
        setUserVote(newUserVote);

        onVote?.(result.stats.score, result.stats.count, newUserVote);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to vote");
      }
    } catch (error) {
      toast.error("Network error while voting");
      console.error("Vote error:", error);
    } finally {
      setIsVoting(false);
    }
  };

  const handleRemoveVote = async () => {
    if (isVoting) return;

    setIsVoting(true);
    try {
      // DELETE request to remove vote
      const response = await fetch(`/api/task-votes?task_id=${taskId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        const result: VoteResponse = await response.json();
        const newUserVote = 0;

        setScore(result.stats.score);
        setCount(result.stats.count);
        setUserVote(newUserVote);

        onVote?.(result.stats.score, result.stats.count, newUserVote);
      }
    } catch (error) {
      toast.error("Failed to remove vote");
      console.error("Vote removal error:", error);
    } finally {
      setIsVoting(false);
    }
  };

  const handleVoteClick = (value: -1 | 1) => {
    if (userVote === value) {
      handleRemoveVote();
    } else {
      handleVote(value);
    }
  };

  const getDisplayScore = () => {
    return Math.round(score * 10) / 10; // Round to 1 decimal
  };

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-1", className)}>
        {/* Upvote button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-6 w-6 p-0",
                userVote === 1 && "text-green-600",
                isVoting && "opacity-50"
              )}
              onClick={() => handleVoteClick(1)}
              disabled={isVoting}
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <span>Upvote</span>
          </TooltipContent>
        </Tooltip>

        {/* Score display */}
        <span className={cn(
          "text-xs font-medium",
          score > 0 && "text-green-600",
          score < 0 && "text-red-600",
          score === 0 && "text-muted-foreground"
        )}>
          {getDisplayScore()}
        </span>

        {/* Count display */}
        <span className="text-xs text-muted-foreground">
          ({count})
        </span>

        {/* Downvote button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-6 w-6 p-0",
                userVote === -1 && "text-red-600",
                isVoting && "opacity-50"
              )}
              onClick={() => handleVoteClick(-1)}
              disabled={isVoting}
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <span>Downvote</span>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

/**
 * Vote button variant for compact display
 */
export function VoteButton({
  taskId,
  score = 0,
  userVote = 0,
  onVote,
}: {
  taskId: number;
  score?: number;
  userVote?: -1 | 1 | 0;
  onVote?: (newScore: number, newVote: -1 | 1 | 0) => void;
}) {
  const handleVote = async (value: -1 | 1) => {
    try {
      const response = await fetch("/api/task-votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, value }),
      });

      if (response.ok) {
        const result: VoteResponse = await response.json();
      }
    } catch (error) {
      console.error("Vote error:", error);
    }
  };

  return (
    <div className="flex items-center gap-1 text-xs">
      <button
        onClick={() => handleVote(1)}
        className={cn(
          "hover:text-green-600",
          userVote === 1 ? "text-green-600" : "text-muted-foreground"
        )}
      >
        ▲
      </button>
      <span>{score > 0 ? score : "-"}</span>
      <button
        onClick={() => handleVote(-1)}
        className={cn(
          "hover:text-red-600",
          userVote === -1 ? "text-red-600" : "text-muted-foreground"
        )}
      >
        ▼
      </button>
    </div>
  );
}