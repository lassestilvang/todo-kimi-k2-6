import { ProductivityDashboard } from "@/components/task/productivity-dashboard";

import type { TaskWithRelations } from "@/types";

export default async function AnalyticsPage() {
  // Fetch tasks data
  const tasksResponse = await fetch("/api/tasks");
  const tasks = (await tasksResponse.json()) as TaskWithRelations[];

  return <ProductivityDashboard tasks={tasks} />;
}