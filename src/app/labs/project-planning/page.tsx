"use client";

import { ProjectPlanningDashboard } from "@/components/task/project-planning-dashboard";
import { RefreshCw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function ProjectPlanningPage() {
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
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Project Planning Dashboard
          </CardTitle>
          <CardDescription>
            Generate and manage project plans with AI assistance
          </CardDescription>
        </CardHeader>
      </Card>

      <ProjectPlanningDashboard />
    </div>
  );
}