"use client";

import { EnergyScheduler } from "@/components/task/energy-scheduler";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function EnergyPage() {
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
          <CardTitle>Energy-Based Scheduling Assistant</CardTitle>
          <CardDescription>
            Optimize your task timing based on your energy patterns
          </CardDescription>
        </CardHeader>
      </Card>

      <EnergyScheduler />
    </div>
  );
}