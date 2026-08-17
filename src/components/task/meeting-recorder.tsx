'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, StopCircle, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface MeetingRecorderProps {
  onTranscription: (transcript: string) => void;
}

export function MeetingRecorder({ onTranscription }: MeetingRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (mediaRecorderRef.current && recording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [recording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = event => {
        chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        // In a real implementation, this would upload to a transcription service
        // For demo purposes, we'll generate mock transcription
        const mockTranscript = generateMockTranscript(duration);
        onTranscription(mockTranscript);

        stream.getTracks().forEach(track => track.stop());
        setDuration(0);
      };

      mediaRecorder.start();
      setRecording(true);
      setDuration(0);

      intervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      toast.success('Recording started');
    } catch (error) {
      toast.error(
        'Failed to start recording. Please check microphone permissions.'
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  };

  const handleTranscribe = async () => {
    if (duration === 0) return;

    setTranscribing(true);

    try {
      // In a real implementation, this would upload the audio to a service like:
      // - Google Speech-to-Text
      // - Whisper API
      // - AssemblyAI
      // - Otter.ai

      // For demo, we use mock transcription
      const transcript = generateMockTranscript(duration);
      onTranscription(transcript);
      toast.success(`Transcribed ${duration} seconds of audio`);
    } catch (error) {
      toast.error('Failed to transcribe');
    } finally {
      setTranscribing(false);
    }
  };

  const generateMockTranscript = (seconds: number): string => {
    const topics = [
      'Project updates',
      'Next quarter planning',
      'Team capacity review',
      'Client feedback analysis',
      'Technical debt discussion',
      'Marketing strategy session',
      'Product roadmap review',
      'Budget allocation meeting',
    ];

    const participants = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey'];
    const selectedTopic = topics[Math.floor(Math.random() * topics.length)];
    const speaker =
      participants[Math.floor(Math.random() * participants.length)];

    const transcript: string[] = [];

    // Generate a simulated transcript
    const minutes = Math.ceil(seconds / 60);

    for (let i = 0; i < minutes * 2; i++) {
      const minute = i / 2;
      const timespan = minute.toFixed(1);

      if (i % 3 === 0) {
        transcript.push(
          `${timespan}:00 ${speaker}: We need to review the ${selectedTopic.toLowerCase()}.`
        );
      } else if (i % 3 === 1) {
        transcript.push(
          `${timespan}:30 ${participants[Math.floor(Math.random() * participants.length)]}: I agree with that approach. Should we also consider...?`
        );
      } else {
        transcript.push(
          `${timespan}:45 ${speaker}: Let's assign action items to the team. Alex, can you handle the client feedback? Morgan, please prepare the budget allocation.`
        );
      }
    }

    return transcript.join('\n');
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meeting Recorder</CardTitle>
        <CardDescription>
          Record and transcribe meetings automatically
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recording && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Recording in progress</span>
              <span className="text-lg font-mono">{formatTime(duration)}</span>
            </div>
            <Progress
              value={Math.min(100, (duration / 300) * 100)}
              className="h-2"
            />
          </div>
        )}

        <div className="flex gap-2">
          {!recording ? (
            <Button
              onClick={startRecording}
              className="flex-1"
              variant={recording ? 'destructive' : 'default'}
            >
              <Mic className="h-4 w-4 mr-2" />
              {recording ? 'Stop Recording' : 'Start Recording'}
            </Button>
          ) : (
            <Button
              onClick={stopRecording}
              className="flex-1"
              variant="destructive"
            >
              <StopCircle className="h-4 w-4 mr-2" />
              Stop Recording
            </Button>
          )}

          {recording && (
            <Button
              onClick={handleTranscribe}
              disabled={transcribing || duration === 0}
              variant="secondary"
            >
              {transcribing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Transcribe
            </Button>
          )}
        </div>

        {!recording && duration > 0 && !transcribing && (
          <Button
            onClick={handleTranscribe}
            className="w-full"
            disabled={transcribing}
          >
            {transcribing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Transcribing...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Transcribe Recording
              </>
            )}
          </Button>
        )}

        <p className="text-xs text-muted-foreground text-center">
          {!recording
            ? 'Click to start recording audio from your microphone'
            : "Recording is active. Click 'Stop' when the meeting is complete."}
        </p>
      </CardContent>
    </Card>
  );
}
