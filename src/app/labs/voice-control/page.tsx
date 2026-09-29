'use client';

import { VoiceControl } from '@/components/task/voice-control';
import { Mic } from 'lucide-react';

export default function VoiceControlPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Mic className="h-8 w-8" />
          Voice Control
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your tasks with natural language voice commands
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        <VoiceControl />
      </div>
    </div>
  );
}