'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  CheckCircle2,
  XCircle,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { parseVoiceCommand, executeVoiceIntent, logVoiceCommand, getVoiceCommandHistory } from '@/lib/actions/voice-control';
import type { VoiceCommand, ParsedVoiceIntent } from '@/lib/actions/voice-control';

export function VoiceControl() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [intent, setIntent] = useState<ParsedVoiceIntent | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [history, setHistory] = useState<VoiceCommand[]>([]);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    loadHistory();

    // Check if browser supports SpeechRecognition
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          const current = event.resultIndex;
          const transcriptText = event.results[current][0].transcript;
          setTranscript(transcriptText);
        };

        recognitionRef.current.onend = () => {
          setListening(false);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setListening(false);
          toast.error('Voice recognition failed. Try again.');
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const loadHistory = async () => {
    try {
      const commands = await getVoiceCommandHistory(20);
      setHistory(commands);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const startListening = () => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition not supported in this browser');
      return;
    }

    setTranscript('');
    setIntent(null);
    setResult(null);
    setListening(true);

    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error('Failed to start:', error);
      setListening(false);
      toast.error('Failed to start voice recognition');
    }
  };

  const stopListening = async () => {
    if (!recognitionRef.current) return;

    setListening(false);
    recognitionRef.current.stop();

    if (transcript.trim()) {
      await processCommand(transcript);
    }
  };

  const processCommand = async (text: string) => {
    try {
      // Parse the intent
      const parsed = await parseVoiceCommand(text);
      setIntent(parsed);

      // Execute the intent
      const result = await executeVoiceIntent(parsed);
      setResult(result);

      // Log the command
      await logVoiceCommand({
        command: text,
        transcribed_text: text,
        action_taken: parsed.action,
        success: result.success,
      });

      // Show toast
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }

      // Reload history
      await loadHistory();
    } catch (error) {
      console.error('Failed to process command:', error);
      toast.error('Failed to process voice command');
    }
  };

  // Test with text input (for browsers without speech recognition)
  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transcript.trim()) return;
    await processCommand(transcript);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create_task':
        return 'bg-green-500';
      case 'complete_task':
        return 'bg-blue-500';
      case 'delete_task':
        return 'bg-red-500';
      case 'set_priority':
        return 'bg-orange-500';
      case 'set_date':
        return 'bg-purple-500';
      case 'search':
        return 'bg-cyan-500';
      case 'navigate':
        return 'bg-indigo-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Voice Control
          </CardTitle>
          <CardDescription>
            Use voice commands to manage your tasks hands-free
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Voice button */}
          <div className="flex flex-col items-center justify-center py-8">
            <Button
              size="lg"
              variant={listening ? 'destructive' : 'default'}
              className="h-24 w-24 rounded-full"
              onClick={listening ? stopListening : startListening}
            >
              {listening ? (
                <MicOff className="h-10 w-10" />
              ) : (
                <Mic className="h-10 w-10" />
              )}
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              {listening ? 'Listening...' : 'Click to speak'}
            </p>
          </div>

          {/* Manual input fallback */}
          <form onSubmit={handleTextSubmit} className="flex gap-2">
            <input
              type="text"
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              placeholder="Or type a command..."
              className="flex-1 px-3 py-2 border rounded-md text-sm"
            />
            <Button type="submit" size="sm" variant="outline">
              <Sparkles className="h-4 w-4 mr-1" />
              Try
            </Button>
          </form>

          {/* Intent detection */}
          {intent && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className={getActionColor(intent.action)}>
                  {intent.action}
                </Badge>
                <Badge variant="outline">
                  Confidence: {Math.round(intent.confidence * 100)}%
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Detected: {intent.rawText}
              </p>
              {typeof intent.parameters.description === 'string' && intent.parameters.description && (
                <p className="text-sm">
                  Description: {intent.parameters.description}
                </p>
              )}
            </div>
          )}

          {/* Result */}
          {result && (
            <Alert variant={result.success ? 'default' : 'destructive'}>
              {result.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Examples */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Voice Command Examples</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="p-2 bg-muted rounded">
              <code className="text-xs">"Create task: Review quarterly report tomorrow"</code>
            </div>
            <div className="p-2 bg-muted rounded">
              <code className="text-xs">"Mark urgent task as critical"</code>
            </div>
            <div className="p-2 bg-muted rounded">
              <code className="text-xs">"Complete task: Send weekly update"</code>
            </div>
            <div className="p-2 bg-muted rounded">
              <code className="text-xs">"Go to analytics"</code>
            </div>
            <div className="p-2 bg-muted rounded">
              <code className="text-xs">"Search for: client meeting"</code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" />
              Recent Commands
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.slice(0, 5).map(cmd => (
                <div
                  key={cmd.id}
                  className="flex items-center justify-between p-2 border rounded text-sm"
                >
                  <span className="truncate">{cmd.command}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {cmd.action_taken}
                    </Badge>
                    {cmd.success === 1 ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}