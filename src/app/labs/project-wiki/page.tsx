'use client';

import { ProjectWiki } from '@/components/task/project-wiki';
import { FileText } from 'lucide-react';

export default function ProjectWikiPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-8 w-8" />
          Project Wiki
        </h1>
        <p className="text-muted-foreground mt-1">
          Collaborative knowledge base with revision history and comments
        </p>
      </div>

      <ProjectWiki />
    </div>
  );
}
