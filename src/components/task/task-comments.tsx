"use client";

import { useState, useRef } from "react";
import { MessageCircle, Send, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import type { TaskComment } from "@/types";

interface TaskCommentsProps {
  taskId: number;
  comments: TaskComment[];
  currentUserId?: number;
  onAddComment: (taskId: number, content: string) => void;
  onDeleteComment: (commentId: number) => void;
}

export function TaskComments({
  taskId,
  comments,
  currentUserId,
  onAddComment,
  onDeleteComment,
}: TaskCommentsProps) {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddComment(taskId, newComment);
      setNewComment("");
      textareaRef.current?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col max-h-96">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b">
        <MessageCircle className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-sm">Comments ({comments.length})</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {comments.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No comments yet. Be the first to add one!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback>
                  {comment.content.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium">User #{comment.task_id}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {comment.content}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                    {currentUserId === comment.task_id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => onDeleteComment(comment.id)}
                            className="text-destructive text-xs"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t pt-3">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a comment..."
            className="flex-1 min-h-[60px] text-xs"
            disabled={isSubmitting}
          />
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || !newComment.trim()}
            className="h-8 w-8 p-0"
          >
            <Send className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}