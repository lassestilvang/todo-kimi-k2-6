"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { TaskWithRelations, TaskComment } from "@/types";
import { addTaskComment as addTaskCommentAction } from "@/lib/actions";

interface TaskCommentsTabProps {
  task: TaskWithRelations;
  comments: TaskComment[];
  onCommentsChange: () => void;
}

export function TaskCommentsTab({ task, comments, onCommentsChange }: TaskCommentsTabProps) {
  const [newComment, setNewComment] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddComment = async () => {
    if (!newComment.trim() || !task) return;
    setIsAdding(true);
    try {
      await addTaskCommentAction(task.id, { content: newComment });
      onCommentsChange();
      setNewComment("");
      toast.success("Comment added");
    } catch {
      toast.error("Failed to add comment");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-4 pt-4">
      <h3 className="font-medium">Comments</h3>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {comments && comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.id} className="text-sm">
              <div className="flex items-start gap-2">
                <div className="bg-muted rounded-full h-8 w-8 flex items-center justify-center text-xs font-medium">
                  👤
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Comment</span>
                    <span>•</span>
                    <span>{format(parseISO(comment.created_at), "MMM d, HH:mm")}</span>
                  </div>
                  <p className="mt-1">{comment.content}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No comments yet. Be the first to comment!
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
          disabled={isAdding}
        />
        <Button size="sm" onClick={handleAddComment} disabled={isAdding || !newComment.trim()}>
          {isAdding ? "Sending..." : "Send"}
        </Button>
      </div>
    </div>
  );
}