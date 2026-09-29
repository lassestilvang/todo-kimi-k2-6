'use client';

import { CommandCenter } from '@/components/task/command-center';
import { Sparkles } from 'lucide-react';

export default function CommandCenterPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          Command Center
        </h1>
        <p className="text-muted-foreground mt-1">
          Your AI-powered productivity hub with quick access to all features
        </p>
      </div>

      <CommandCenter />
    </div>
  );
}
