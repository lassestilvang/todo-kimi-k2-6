// AI Conversation Memory Hook
// Stores and retrieves conversation context for natural language task management

import { useState, useEffect, useCallback } from "react";
import type { TaskWithRelations } from "@/types";

interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  taskId?: number;
  action?: string;
}

interface ConversationContext {
  messages: ConversationMessage[];
  recentTasks: Array<{ id: number; name: string; date?: string | null; priority?: string }>;
  userPreferences?: {
    workHours?: { start: number; end: number };
    preferredTimes?: string[];
    locations?: Array<{ name: string; keywords: string[] }>;
  };
}

const MAX_CONTEXT_MESSAGES = 10;
const CONTEXT_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

export function useAIConversationMemory(userId?: number) {
  const [context, setContext] = useState<ConversationContext>({ messages: [] });

  // Load context from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("ai-conversation-context");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ConversationContext;
        // Filter out expired messages
        const now = Date.now();
        const freshMessages = parsed.messages.filter(
          (m) => now - m.timestamp < CONTEXT_EXPIRY_MS
        );
        setContext({ ...parsed, messages: freshMessages });
      } catch {
        // Invalid storage, start fresh
        setContext({ messages: [] });
      }
    }
  }, [userId]);

  // Save context to localStorage
  const saveContext = useCallback((newContext: ConversationContext) => {
    setContext(newContext);
    localStorage.setItem("ai-conversation-context", JSON.stringify(newContext));
  }, []);

  // Add a message to context
  const addMessage = useCallback(
    (role: "user" | "assistant", content: string, taskId?: number, action?: string) => {
      const newContext = {
        ...context,
        messages: [
          ...context.messages,
          {
            id: Date.now().toString(),
            role,
            content,
            timestamp: Date.now(),
            taskId,
            action,
          },
        ].slice(-MAX_CONTEXT_MESSAGES),
      };
      saveContext(newContext);
    },
    [context, saveContext]
  );

  // Get relevant context for a query
  const getContextForQuery = useCallback(
    (currentQuery: string): string => {
      const relevantMessages = context.messages
        .slice(-5)
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");

      return relevantMessages;
    },
    [context]
  );

  // Resolve task references in natural language
  const resolveTaskReference = useCallback(
    (query: string, tasks: TaskWithRelations[]): TaskWithRelations | null => {
      const queryLower = query.toLowerCase();

      // Look for explicit task references
      if (context.messages.length > 0) {
        // Find most recently mentioned task
        for (let i = context.messages.length - 1; i >= 0; i--) {
          const msg = context.messages[i];

          // Check if this message mentioned a task
          const taskNameMatch = msg.content.match(/"([^"]+)"/g);
          if (taskNameMatch) {
            for (const match of taskNameMatch) {
              const taskName = match.replace(/"/g, "");
              const found = tasks.find(
                (t) => t.name.toLowerCase().includes(taskName.toLowerCase()) || taskName.toLowerCase().includes(t.name.toLowerCase())
              );
              if (found) return found;
            }
          }

          // Check for pronoun references
          if (query.includes("that task") || query.includes("this task")) {
            // Look for task in recent assistant messages
            for (let j = i; j >= 0; j--) {
              const prevMsg = context.messages[j];
              if (prevMsg.taskId) {
                const found = tasks.find((t) => t.id === prevMsg.taskId);
                if (found) return found;
              }
            }
          }
        }

        // Check for "the one we discussed" pattern
        if (query.includes("we discussed") || query.includes("talked about")) {
          for (let i = context.messages.length - 1; i >= 0; i--) {
            const msg = context.messages[i];
            if (msg.role === "assistant" && msg.taskId) {
              const found = tasks.find((t) => t.id === msg.taskId);
              if (found) return found;
            }
          }
        }

        // Check for recent task mentions
        const recentUserMessages = context.messages
          .filter((m) => m.role === "user")
          .slice(-3);

        for (const msg of recentUserMessages) {
          for (const task of tasks) {
            if (msg.content.toLowerCase().includes(task.name.toLowerCase())) {
              return task;
            }
          }
        }
      }

      return null;
    },
    [context.messages]
  );

  // Clear context
  const clearContext = useCallback(() => {
    setContext({ messages: [] });
    localStorage.removeItem("ai-conversation-context");
  }, []);

  // Update user preferences
  const updateUserPreferences = useCallback(
    (preferences: ConversationContext["userPreferences"]) => {
      const newContext = { ...context, userPreferences: preferences };
      saveContext(newContext);
    },
    [context, saveContext]
  );

  return {
    messages: context.messages,
    addMessage,
    getContextForQuery,
    resolveTaskReference,
    clearContext,
    updateUserPreferences,
    userPreferences: context.userPreferences,
  };
}