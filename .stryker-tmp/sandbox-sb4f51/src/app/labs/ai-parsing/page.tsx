// @ts-nocheck
"use client";

import { TaskFlowLabs } from "@/components/task/taskflow-labs";
import { Bot, Brain, TestTube, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function AIParsingPage() {
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
            <Brain className="h-5 w-5" />
            AI Task Parsing Playground
          </CardTitle>
          <CardDescription>
            Compare how different AI models parse natural language task descriptions
          </CardDescription>
        </CardHeader>
      </Card>

      <TaskFlowLabs />
    </div>
  );
}