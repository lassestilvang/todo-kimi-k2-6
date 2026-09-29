'use client';

import { CareerCompass2 } from '@/components/task/career-compass-2';
import { Compass } from 'lucide-react';

export default function CareerCompass2Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Compass className="h-8 w-8" />
          Career Compass 2.0
        </h1>
        <p className="text-muted-foreground mt-1">
          AI-powered career planning with paths, skills, and learning roadmaps
        </p>
      </div>

      <CareerCompass2 />
    </div>
  );
}
