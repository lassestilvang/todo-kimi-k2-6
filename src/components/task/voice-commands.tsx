"use client";

import { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Send,
  Check,
  X,
  Volume2,
  VolumeX,
  Settings,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface VoiceCommand {
  intent: string;
  action: string;
  entities: Record<string, string>;
  confidence: number;
}

interface VoiceCommandHistory {
  id: number;
  command: string;
  result: VoiceCommand;
  timestamp: string;
}

interface VoiceCommandsProps {
  className?: string;
  onTaskCreate?: (task: { title: string; description?: string }) => void;
}

const COMMANDS: Record<string, { pattern: RegExp; intent: string; action: string }> = {
  "create_task": {
    pattern: /create (?:a |new |)?task (?:called |named |)"|add (?:a |new |)"|make (?:a |new |)"/i,
    intent: "create_task",
    action: "create",
  },
  "complete_task": {
    pattern: /complete (?:the |my |)"|mark (?:as )?(?:complete |done )"|" completed/i,
    intent: "complete_task",
    action: "complete",
  },
  "search_tasks": {
    pattern: /find (?:tasks |my )?"|search for (?:tasks |my )?"|show (?:me )?tasks( that)?/i,
    intent: "search_tasks",
    action: "search",
  },
  "list_tasks": {
    pattern: /list (?:all |my |tasks?)"|show (?:all |my |tasks?)"/i,
    intent: "list_tasks",
    action: "list",
  },
  "today_tasks": {
    pattern: /what (?:are )?my (?:today |tasks for today)"|tasks (?:due )?today/i,
    intent: "today_tasks",
    action: "today",
  },
  "help": {
    pattern: /help|what (?:can )?i (?:do |)"|commands/i,
    intent: "help",
    action: "help",
  },
};

export function VoiceCommands({ className, onTaskCreate }: VoiceCommandsProps) {
  const [recording, setRecording] = useState(false);
  const [listening, setListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<VoiceCommand | null>(null);
  const [history, setHistory] = useState<VoiceCommandHistory[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [muted, setMuted] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    // Check if SpeechRecognition is available
    const SpeechRecognitionAPI = window.SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      console.warn("Speech Recognition not supported in this browser");
      return;
    }

    const recognitionInstance = new SpeechRecognitionAPI();
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = "en-US";

    recognitionInstance.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join("");

      if (event.results[0].isFinal) {
        handleVoiceCommand(transcript);
      }
    };

    recognitionInstance.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      toast.error(`Speech recognition error: ${event.error}`);
    };

    setRecognition(recognitionInstance);

    return () => {
      recognitionInstance.stop();
    };
  }, []);

  const handleVoiceCommand = (command: string) => {
    const parsed = parseCommand(command.toLowerCase().trim());

    if (parsed) {
      setLastCommand(command);
      setLastResult(parsed);

      // Add to history
      const newEntry: VoiceCommandHistory = {
        id: Date.now(),
        command,
        result: parsed,
        timestamp: new Date().toISOString(),
      };
      setHistory(prev => [newEntry, ...prev.slice(0, 9)]);

      // Execute the action
      executeAction(parsed);

      // Provide feedback via speech
      if (!muted) {
        speak(`Executed: ${parsed.intent}`);
      }
    } else {
      setLastCommand(command);
      setLastResult(null);

      if (!muted) {
        speak("Sorry, I didn't understand that command");
      }
    }
  };

  const parseCommand = (command: string): VoiceCommand | null => {
    for (const [key, handler] of Object.entries(COMMANDS)) {
      if (handler.pattern.test(command)) {
        // Extract entities from command
        const entities: Record<string, string> = {};

        // Extract task name if present
        const taskNameMatch = command.match(/(?:task |called |named |'"([^"]+)'")/i);
        if (taskNameMatch) {
          entities.taskName = taskNameMatch[1] || "New Task";
        }

        // Extract date references
        if (/today|tomorrow/i.test(command)) {
          entities.date = command.includes("tomorrow") ? "tomorrow" : "today";
        }

        return {
          intent: handler.intent,
          action: handler.action,
          entities,
          confidence: 0.9,
        };
      }
    }

    return null;
  };

  const executeAction = async (parsed: VoiceCommand) => {
    switch (parsed.intent) {
      case "create_task":
        const taskName = parsed.entities.taskName || "Voice Created Task";
        if (onTaskCreate) {
          onTaskCreate({
            title: taskName,
            description: `Created via voice command`,
          });
        }
        toast.success(`Created task: ${taskName}`);
        break;

      case "complete_task":
        toast.info("Mark task as complete");
        break;

      case "today_tasks":
        toast.info("Showing today's tasks");
        break;

      case "list_tasks":
        toast.info("Listing all tasks");
        break;

      case "help":
        showHelp();
        break;

      default:
        toast.info(`Executed: ${parsed.intent}`);
    }
  };

  const showHelp = () => {
    const helpText = `
Available voice commands:
• "Create a task called [name]" - Create a new task
• "Complete [task name]" - Mark task as complete
• "Show my tasks for today" - View today's tasks
• "List all my tasks" - Show all tasks
• "Find tasks with [keyword]" - Search for tasks
• "Help" - Show this help
`;
    if (!muted) {
      speak(helpText);
    }
    toast.info(helpText, {
      duration: 10000,
    });
  };

  const speak = (text: string) => {
    if (!window.speechSynthesis) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    if (!recognition) {
      toast.error("Speech recognition not available");
      return;
    }

    try {
      recognition.start();
      setListening(true);
    } catch (error) {
      toast.error("Failed to start speech recognition");
    }
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
    }
    setListening(false);
  };

  const toggleListening = () => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleToggleMuting = () => {
    setMuted(prev => !prev);
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
  };

  const clearHistory = () => {
    setHistory([]);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Voice Commands
          </CardTitle>
          <CardDescription>
            Control TaskFlow with voice commands
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Controls */}
            <div className="flex items-center gap-3">
              <Button
                onClick={toggleListening}
                className={cn(
                  "flex-1",
                  listening && "bg-red-500/10 text-red-600 hover:bg-red-500/20"
                )}
                variant={listening ? "destructive" : "default"}
              >
                {listening ? (
                  <>
                    <MicOff className="h-4 w-4 mr-2 animate-pulse" />
                    Listening...
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-2" />
                    Start Listening
                  </>
                )}
              </Button>

              <Button
                onClick={handleToggleMuting}
                variant="ghost"
                size="icon"
                title={muted ? "Unmute" : "Mute"}
              >
                {muted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Last Command Feedback */}
            {lastCommand && (
              <div className="p-3 border rounded-lg bg-muted/30">
                <div className="text-xs text-muted-foreground mb-1">
                  Last Command
                </div>
                <div className="font-medium text-sm mb-2">{lastCommand}</div>
                {lastResult && (
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="text-xs">
                      {lastResult.intent}
                    </Badge>
                    <span className="text-muted-foreground">
                      Confidence: {Math.round(lastResult.confidence * 100)}%
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* History */}
            {history.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Recent Commands
                  </h4>
                  <Button variant="ghost" size="sm" onClick={clearHistory}>
                    Clear
                  </Button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {history.map((entry, idx) => (
                    <div
                      key={entry.id}
                      className="text-xs p-2 border rounded bg-muted/20"
                    >
                      <div className="font-medium">{entry.command}</div>
                      <div className="text-muted-foreground">
                        {entry.result.intent} • {new Date(entry.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status */}
            <div className="text-center text-xs text-muted-foreground">
              {listening
                ? "Listening... Speak clearly into your microphone"
                : "Tap to start voice control"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Commands */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Quick Commands</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleVoiceCommand("create a task called review documentation")}
            >
              Create Task
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleVoiceCommand("show my tasks for today")}
            >
              Today's Tasks
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleVoiceCommand("list all my tasks")}
            >
              List All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleVoiceCommand("find tasks with meeting")}
            >
              Search Tasks
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleVoiceCommand("help")}
            >
              Help
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}