'use client';

import { SocialFeed } from '@/components/task/social-feed';
import { Users } from 'lucide-react';

export default function SocialFeedPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="h-8 w-8" />
          Team Productivity Feed
        </h1>
        <p className="text-muted-foreground mt-1">
          Share accomplishments and celebrate wins with your team
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        <SocialFeed />
      </div>
    </div>
  );
}