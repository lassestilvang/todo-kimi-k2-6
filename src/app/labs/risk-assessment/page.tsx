'use client';

import { RiskAssessmentDashboard } from '@/components/task/risk-assessment-dashboard';
import { NotificationDigest } from '@/components/task/notification-digest';
import { Shield, Bell } from 'lucide-react';

export default function RiskAssessmentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Risk Assessment & Notifications
        </h1>
        <p className="text-muted-foreground mt-1">
          Proactive risk management and intelligent notification digest
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RiskAssessmentDashboard />
        </div>
        <div>
          <NotificationDigest />
        </div>
      </div>
    </div>
  );
}