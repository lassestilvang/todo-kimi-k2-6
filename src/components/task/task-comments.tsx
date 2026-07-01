"use client";

import { useState, useRef } from "react";
import { MessageCircle, Send, MoreHorizontal, AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import type { TaskComment, User as UserType } from "@/types";

interface TaskCommentsProps {
  taskId: number;
  comments: TaskComment[];
  currentUserId?: number;
  currentUser?: UserType;
  users?: UserType[];
  onAddComment: (taskId: number, content: string, mentions?: number[]) => void;
  onDeleteComment: (commentId: number) => void;
}

// Parse @mentions from comment text
function parseMentions(text: string): { text: string; mentions: string[] } {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  const resultText = text.replace(mentionRegex, (match, username) => {
    mentions.push(username);
    return match;
  });
  return { text: resultText, mentions };
}

// Render comment content with mention highlighting
function renderCommentContent(content: string) {
  const mentionRegex = /@(\w+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    parts.push(
      <Badge key={match.index} variant="secondary" className="text-xs">
        @{match[1]}
      </Badge>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : content;
}

export function TaskComments({
  taskId,
  comments,
  currentUserId,
  currentUser,
  users = [],
  onAddComment,
  onDeleteComment,
}: TaskCommentsProps) {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    const { mentions: mentionUsernames } = parseMentions(newComment);
    const mentionIds = mentionUsernames
      .map((username) => users.find((u) => u.name?.toLowerCase() === username.toLowerCase())?.id)
      .filter((id): number | undefined => id !== undefined) as number[];

    setIsSubmitting(true);
    try {
      await onAddComment(taskId, newComment, mentionIds);
      setNewComment("");
      setShowMentions(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      setShowMentions(false);
    }
  };

  const insertMention = (user: { name?: string | null; email: string }) => {
    const cursorPos = textareaRef.current?.selectionStart || 0;
    const textBefore = newComment.slice(0, cursorPos);
    const textAfter = newComment.slice(cursorPos);
    const newText = `${textBefore}@${user.name || user.email}${textAfter}`;
    setNewComment(newText);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = cursorPos + (user.name || user.email).length + 2;
        textareaRef.current.selectionEnd = cursorPos + (user.name || user.email).length + 2;
      }
    }, 0);
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
                <AvatarImage src={currentUser?.avatar_url || undefined} />
                <AvatarFallback>
                  {(comment.task_id?.toString() || "1").substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium">User #{comment.task_id}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {renderCommentContent(comment.content)}
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
        <div className="flex gap-2 mb-2">
          <Popover open={showMentions} onOpenChange={setShowMentions}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => currentUser && setShowMentions(true)}
              >
                <AtSign className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="space-y-1">
                <Input
                  placeholder="Search users..."
                  className="h-6 text-xs"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <div className="max-h-40 overflow-y-auto">
                  {users.slice(0, 10).map((user) => (
                    <button
                      key={user.id}
                      className="w-full text-left text-xs p-1.5 hover:bg-accent rounded flex items-center gap-2"
                      onClick={() => insertMention(user)}
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarFallback>{user.name?.[0] || user.email[0]}</AvatarFallback>
                      </Avatar>
                      <span className="truncate">{user.name || user.email}</span>
                    </button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Textarea
            ref={textareaRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a comment... (use @ to mention)"
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
        <p className="text-xs text-muted-foreground">
          Press Enter to send, Shift+Enter for new line. Use <AtSign className="h-3 w-3 inline" /> to mention users.
        </p>
      </div>
    </div>
  );
}