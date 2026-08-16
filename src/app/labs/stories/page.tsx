'use client';

import { TaskSuccessStories } from '@/components/task/task-success-stories';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Link from 'next/link';

export default function StoriesPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/labs">
          <Button variant="ghost" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            Back to Labs
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task Success Stories</CardTitle>
          <CardDescription>
            Reflect on completed tasks and capture key learnings
          </CardDescription>
        </CardHeader>
      </Card>

      <TaskSuccessStories
        task={{
          id: 1,
          name: 'Sample Task',
          completed: true,
          completed_at: new Date().toISOString(),
        }}
      />
    </div>
  );
}
