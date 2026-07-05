import { ProductivityDashboard } from "@/components/task/productivity-dashboard";

export default async function AnalyticsPage() {
  // Fetch tasks data
  const tasksResponse = await fetch("/api/tasks");
  const tasks: unknown[] = await tasksResponse.json();

  return <ProductivityDashboard tasks={tasks as any} />;
}