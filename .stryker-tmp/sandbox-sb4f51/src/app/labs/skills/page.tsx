// @ts-nocheck
"use client";

import { SkillsGrowthTracker } from "@/components/task/skills-growth-tracker";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function SkillsPage() {
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
          <CardTitle>Skills & Growth Tracker</CardTitle>
          <CardDescription>
            Track skill development through your completed tasks
          </CardDescription>
        </CardHeader>
      </Card>

      <SkillsGrowthTracker />
    </div>
  );
}