// @ts-nocheck
"use client";

import { useState, useEffect } from "react";

interface VoteStats {
  total: number;
  count: number;
  score: number;
}

interface VoteCache {
  [taskId: number]: VoteStats;
}

export function useTaskVotes(taskIds: number[]) {
  const [voteCache, setVoteCache] = useState<VoteCache>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (taskIds.length === 0) return;

    const fetchVotes = async () => {
      setIsLoading(true);
      try {
        const newCache: VoteCache = { ...voteCache };

        for (const taskId of taskIds) {
          if (!newCache[taskId]) {
            const response = await fetch(`/api/task-votes?task_id=${taskId}`);
            if (response.ok) {
              const data = await response.json();
              newCache[taskId] = {
                total: data.total || 0,
                count: data.count || 0,
                score: data.score || 0,
              };
            }
          }
        }

        setVoteCache(newCache);
      } catch (error) {
        console.error("Failed to fetch votes:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVotes();
  }, [taskIds]);

  const vote = async (taskId: number, value: -1 | 1) => {
    try {
      const response = await fetch("/api/task-votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, value }),
      });

      if (response.ok) {
        const data = await response.json();
        setVoteCache((prev) => ({
          ...prev,
          [taskId]: {
            total: data.stats.total,
            count: data.stats.count,
            score: data.stats.score,
          },
        }));
        return data;
      }
    } catch (error) {
      console.error("Failed to vote:", error);
    }
    return null;
  };

  const getVoteStats = (taskId: number): VoteStats => {
    return voteCache[taskId] || { total: 0, count: 0, score: 0 };
  };

  return { vote, getVoteStats, isLoading };
}