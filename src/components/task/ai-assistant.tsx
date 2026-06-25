"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Bot, Send, Sparkles, Lightbulb, Clock, Target, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TaskWithRelations } from "@/types";
import { parseTaskInput, generateTaskInsights } from "@/lib/ai";
import { toast } from "sonner";

interface AIAssistantProps {
  tasks: TaskWithRelations[];
  onAddTask: (task: Partial<TaskWithRelations>) => void;
}

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  parsedTask?: any;
}

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  prompt: string;
}

export function AIAssistant({ tasks, onAddTask }: AIAssistantProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [insights, setInsights] = useState<{ tips: string[]; suggestions: string[]; trends: string[]; provider: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load insights on mount
  useEffect(() => {
    loadInsights();
  }, [tasks]);

  const loadInsights = async () => {
    try {
      const result = await generateTaskInsights(tasks.map(t => ({
        name: t.name,
        completed: t.completed,
        priority: t.priority,
        date: t.date,
        deadline: t.deadline,
      })));
      setInsights({
        tips: result.productivity_tips || [],
        suggestions: result.suggestions || [],
        trends: result.trends || [],
        provider: result.provider || "keyword-parser",
      });
    } catch (error) {
      console.error("Failed to load insights:", error);
    }
  };

  const handleSubmit = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const result = await parseTaskInput({ text: input });

      const aiResponse: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content: result.description
          ? `I've parsed your request: "${result.name}"\n\n**Priority:** ${result.priority}\n**Estimated time:** ${result.estimated_duration ? `${result.estimated_duration}m` : 'Unknown'}\n\n${result.description}\n\nWould you like me to add this to your task list?`
          : `I've parsed: "${result.name}". Priority: ${result.priority}. Add this task?`,
        timestamp: new Date(),
        parsedTask: result,
      };
      setMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      const aiResponse: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content: `I've understood: "${input}". I've prepared this as a task with normal priority. Would you like me to add it to your task list?`,
        timestamp: new Date(),
        parsedTask: { name: input, priority: "none" },
      };
      setMessages((prev) => [...prev, aiResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptTask = (parsedTask: any) => {
    if (!parsedTask?.name) return;

    onAddTask({
      name: parsedTask.name,
      description: parsedTask.description,
      priority: parsedTask.priority || "none",
      date: parsedTask.suggested_date,
      deadline: parsedTask.deadline,
      recurring: parsedTask.recurring,
    });

    toast.success(`Task "${parsedTask.name}" added`);
    setMessages((prev) => prev.slice(0, -1)); // Remove the AI message
  };

  const handleCopyMessage = (content: string, id: number) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
  };

  const quickActions: QuickAction[] = [
    {
      title: "Meeting task",
      description: "Create a task for meeting follow-up",
      icon: <Clock className="h-3.5 w-3.5" />,
      prompt: "Create a task for the marketing report due next Friday",
    },
    {
      title: "Call task",
      description: "Schedule a call/meeting task",
      icon: <Bot className="h-3.5 w-3.5" />,
      prompt: "Add a meeting with the team tomorrow at 2pm",
    },
    {
      title: "Review task",
      description: "Create a review task",
      icon: <Target className="h-3.5 w-3.5" />,
      prompt: "Schedule a review of the quarterly goals",
    },
    {
      title: "Reminder",
      description: "Set up a reminder task",
      icon: <Sparkles className="h-3.5 w-3.5" />,
      prompt: "Set up a reminder for the client presentation next week",
    },
  ];

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          AI Assistant
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Use natural language to create and manage tasks. {insights?.provider && `Powered by ${insights.provider}`}
        </p>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <ScrollArea className="flex-1 mb-4 max-h-[300px]">
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">How can I help you with your tasks today?</p>
                {insights && (
                  <div className="mt-4 space-y-2">
                    <div className="text-xs font-medium">Quick insights:</div>
                    <div className="text-xs space-y-1">
                      <div>Completion rate: {Math.round((tasks.filter(t => t.completed).length / Math.max(tasks.length, 1)) * 100)}%</div>
                      <div>{tasks.filter(t => t.priority === "critical" && !t.completed).length} critical tasks pending</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-2 max-w-[85%] ${
                    message.role === "user" ? "ml-auto flex-row-reverse" : ""
                  }`}
                >
                  <div
                    className={`rounded-lg p-3 text-sm ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground ml-auto"
                        : "bg-muted"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 whitespace-pre-wrap">{message.content}</div>
                      {message.role === "assistant" && (
                        <button
                          onClick={() => handleCopyMessage(message.content, message.id)}
                          className="opacity-50 hover:opacity-100 transition-opacity"
                        >
                          {copiedId === message.id ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 opacity-70">
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex gap-2 max-w-[80%]">
                <div className="rounded-lg p-3 bg-muted">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a task or ask me something..."
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
              className="flex-1"
            />
            <Button onClick={handleSubmit} disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Quick actions:</p>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <button
                  key={action.title}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs border rounded hover:bg-muted transition-colors"
                  onClick={() => handleQuickAction(action.prompt)}
                >
                  {action.icon}
                  {action.title}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <Card className="p-3">
              <div className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" />
                <span className="font-medium">Completion Rate</span>
              </div>
              <p className="text-muted-foreground mt-1">
                {tasks.filter((t) => t.completed).length} / {tasks.length} tasks completed
              </p>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span className="font-medium">Due Today</span>
              </div>
              <p className="text-muted-foreground mt-1">
                {tasks.filter((t) => t.date === new Date().toISOString().split("T")[0]).length} tasks
              </p>
            </Card>
          </div>
        </div>
      </CardContent>
    </div>
  );
}