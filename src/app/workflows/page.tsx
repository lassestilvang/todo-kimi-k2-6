import { WorkflowBuilder } from "@/components/task/workflow-builder";

export const metadata = {
  title: "Workflows - TaskFlow",
  description: "Build no-code automations for task management",
};

export default function WorkflowsPage() {
  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          ⚙️ Workflows
        </h1>
        <p className="text-muted-foreground mt-1">
          Create automations to streamline your task management
        </p>
      </div>

      <WorkflowBuilder />
    </div>
  );
}