"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronUp, ChevronDown, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskVote {
  userId: number;
  userName: string;
  value: number; // -1 (downvote) or 1 (upvote)
}

interface TaskVotingProps {
  taskId: number;
  initialScore: number;
  initialVotes: TaskVote[];
  currentUserId?: number;
  onVote?: (taskId: number, value: number) => void;
}

export function TaskVoting({
  taskId,
  initialScore,
  initialVotes,
  currentUserId,
  onVote,
}: TaskVotingProps) {
  const [score, setScore] = useState(initialScore);
  const [votes, setVotes] = useState<TaskVote[]>(initialVotes);
  const [userVote, setUserVote] = useState<number>(0);

  const handleVote = (value: number) => {
    if (!currentUserId) return;

    const newScore = score + (value - userVote);
    const newVotes = [...votes.filter((v) => v.userId !== currentUserId)];

    if (value !== 0) {
      newVotes.push({
        userId: currentUserId,
        userName: "Current User",
        value,
      });
    }

    setScore(newScore);
    setVotes(newVotes);
    setUserVote(value);
    onVote?.(taskId, value);
  };

  const upvoteCount = votes.filter((v) => v.value > 0).length;
  const downvoteCount = votes.filter((v) => v.value < 0).length;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className={cn("h-6 w-6 p-0", userVote === 1 && "text-green-500")}
          onClick={() => handleVote(userVote === 1 ? 0 : 1)}
          disabled={!currentUserId}
        >
          <ChevronUp className="h-3 w-3" />
        </Button>
        <span className="text-sm font-medium min-w-[30px] text-center">{score}</span>
        <Button
          variant="ghost"
          size="sm"
          className={cn("h-6 w-6 p-0", userVote === -1 && "text-red-500")}
          onClick={() => handleVote(userVote === -1 ? 0 : -1)}
          disabled={!currentUserId}
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
      </div>
      {(upvoteCount > 0 || downvoteCount > 0) && (
        <Badge variant="secondary" className="text-xs">
          <Users className="h-3 w-3 mr-1" />
          {upvoteCount - downvoteCount}
        </Badge>
      )}
    </div>
  );
}

// Database schema for task votes (add to schema)
export const taskVotesSchema = `
CREATE TABLE IF NOT EXISTS task_votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value INTEGER NOT NULL CHECK(value IN (-1, 1)),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_votes_task ON task_votes(task_id);
CREATE INDEX IF NOT EXISTS idx_votes_user ON task_votes(user_id);
`;