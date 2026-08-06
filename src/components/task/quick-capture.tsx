"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, X, Zap, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { List } from "@/types";

interface QuickCaptureProps {
  onTaskCreate: (text: string) => void;
  lists?: List[];
}

export function QuickCapture({ onTaskCreate, lists }: QuickCaptureProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition && isOpen) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = "en-US";
      recognitionRef.current.interimResults = false;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        if (isListening) {
          setIsListening(false);
        }
      };
    }

    return () => {
      recognitionRef.current?.stop();
    };
  }, [isOpen, isListening]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Pulse animation for attention
  useEffect(() => {
    if (isOpen) return;
    const interval = setInterval(() => {
      setIsPulsing((prev) => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    try {
      await onTaskCreate(input);
      setInput("");
      setIsOpen(false);
      toast.success("Task captured!");
    } catch {
      toast.error("Failed to capture task");
    }
  };

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      toast.error("Voice input not supported");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
    setIsListening(!isListening);
  };

  if (!isOpen) {
    return (
      <Button
        className={cn(
          "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40 transition-all",
          isPulsing && "animate-pulse"
        )}
        onClick={() => setIsOpen(true)}
        aria-label="Quick capture task"
      >
        <Plus className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 z-50 w-80 p-4 shadow-xl">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Quick Capture</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type or speak a task..."
              className="flex-1"
              aria-label="Quick task input"
            />
            <Button
              type="button"
              variant={isListening ? "destructive" : "ghost"}
              size="icon"
              className="h-9 w-9"
              onClick={toggleVoice}
              title={isListening ? "Stop listening" : "Start voice input"}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          </div>

          {lists && lists.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Tip: Include "#listname" to assign to a list
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={!input.trim()}>
              Add Task
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}

// Hook for Quick Capture shortcut (Ctrl/Cmd + Space)
export function useQuickCapture() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === " ") {
        e.preventDefault();
        const event = new CustomEvent("quick-capture-open");
        window.dispatchEvent(event);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}