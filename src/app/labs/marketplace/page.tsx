'use client';

import { TaskMarketplace } from '@/components/task/task-marketplace';
import { ShoppingBag } from 'lucide-react';

export default function MarketplacePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ShoppingBag className="h-8 w-8" />
          Task Marketplace
        </h1>
        <p className="text-muted-foreground mt-1">
          Trade tasks with your team using XP currency
        </p>
      </div>

      <TaskMarketplace />
    </div>
  );
}