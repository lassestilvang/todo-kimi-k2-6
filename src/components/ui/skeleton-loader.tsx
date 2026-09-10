'use client';

import { cn } from '@/lib/utils';

interface SkeletonLoaderProps {
  className?: string;
  variant?: 'text' | 'avatar' | 'card' | 'list' | 'compact';
  count?: number;
}

export function SkeletonLoader({
  className,
  variant = 'text',
  count = 1,
}: SkeletonLoaderProps) {
  const renderItem = () => {
    switch (variant) {
      case 'avatar':
        return (
          <div
            className={cn('h-10 w-10 rounded-full', className)}
            data-testid="skeleton-avatar"
          />
        );
      case 'card':
        return (
          <div className={cn('space-y-2', className)}>
            <div className="h-4 w-full rounded" />
            <div className="h-4 w-3/4 rounded" />
            <div className="h-4 w-1/2 rounded" />
          </div>
        );
      case 'compact':
        return (
          <div
            className={cn('h-4 w-24 rounded', className)}
            data-testid="skeleton-compact"
          />
        );
      case 'list':
        return (
          <div className={cn('flex items-center gap-3', className)}>
            <div className="h-10 w-10 rounded" />
            <div className="flex-1 space-y-1">
              <div className="h-4 w-3/4 rounded" />
              <div className="h-3 w-1/2 rounded" />
            </div>
          </div>
        );
      case 'text':
      default:
        return (
          <div
            className={cn('h-4 w-full rounded', className)}
            data-testid="skeleton-text"
          />
        );
    }
  };

  if (count === 1) {
    return renderItem();
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>{renderItem()}</div>
      ))}
    </div>
  );
}

export function TaskListItemSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-3 p-3 border rounded-lg"
        >
          <div className="h-5 w-5 rounded border border-muted" />
          <div className="flex-1 min-w-0">
            <div className="h-4 w-3/4 rounded mb-2" />
            <div className="h-3 w-1/3 rounded mb-2" />
            <div className="flex items-center gap-2">
              <div className="h-3 w-20 rounded" />
              <div className="h-3 w-3 rounded-full bg-muted-foreground/20" />
            </div>
          </div>
          <div className="h-4 w-4 rounded" />
        </div>
      ))}
    </div>
  );
}

export function TaskCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="border rounded-lg p-4 space-y-3 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <div className="h-5 w-3/4 rounded" />
            <div className="h-4 w-4 rounded" />
          </div>
          <div className="h-4 w-full rounded" />
          <div className="h-4 w-2/3 rounded" />
          <div className="flex items-center gap-2 pt-2">
            <div className="h-5 w-20 rounded-full" />
            <div className="h-4 w-16 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function KanbanColumnSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} className="flex-1 min-w-[200px] space-y-3">
          <div className="h-6 w-3/4 rounded mb-2" />
          {Array.from({ length: 2 }).map((_, j) => (
            <div
              key={j}
              className="h-20 w-full rounded border p-2 space-y-2"
            >
              <div className="h-4 w-full rounded" />
              <div className="h-3 w-2/3 rounded" />
              <div className="flex gap-1 mt-2">
                <div className="h-5 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}