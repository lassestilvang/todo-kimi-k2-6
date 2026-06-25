"use client";

import { cn } from "@/lib/utils";

interface ProgressProps {
  className?: string;
  value?: number;
}

export function Progress({ className, value = 0 }: ProgressProps) {
  return (
    <div
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-secondary", className)}
    >
      <div
        className="h-full w-full rounded-full bg-primary transition-width duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}