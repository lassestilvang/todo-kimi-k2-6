"use client";

import { ProductivityDashboard } from "@/components/task/productivity-dashboard";
import { useTasks } from "@/hooks/use-tasks";

export default function AnalyticsPage() {
  const { tasks } = useTasks({
    initialTasks: [],
    initialLists: [],
    initialLabels: [],
  });

  return <ProductivityDashboard tasks={tasks} />;
}