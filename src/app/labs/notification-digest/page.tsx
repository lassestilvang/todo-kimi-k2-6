'use client';

import { NotificationDigest } from '@/components/task/notification-digest';
import { Bell } from 'lucide-react';

export default function NotificationDigestPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Bell className="h-8 w-8" />
          Notification Digest
        </h1>
        <p className="text-muted-foreground mt-1">
          Daily summaries and notification preferences
        </p>
      </div>

      <NotificationDigest />
    </div>
  );
}
