'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  AlertTriangle,
  TrendingDown,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getRiskDashboard, getRiskAlerts, markRiskAlertRead } from '@/lib/actions/risk-assessment';

interface RiskAlert {
  id: number;
  user_id: number;
  risk_assessment_id: number;
  message: string;
  is_read: number;
  triggered_at: string;
}

interface RiskAnalysis {
  risk_id: number;
  task_id: number;
  task_name: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number;
  probability: number;
  impact: number;
  factors: string[];
  mitigation: string;
  recommendation: string;
}

interface TaskBasic {
  id: number;
  name: string;
  completed?: boolean;
  archived?: boolean;
  date?: string | null;
  priority?: string;
  recurring?: string;
  description?: string | null;
  estimate?: number | null;
  deadline?: string | null;
}

interface RiskDashboardData {
  total_risks: number;
  critical_risks: number;
  high_risks: number;
  medium_risks: number;
  low_risks: number;
  alerts_unread: number;
  risk_by_type: Array<{ type: string; count: number }>;
  top_risks: RiskAnalysis[];
}

interface RiskDashboardProps {
  tasks?: TaskBasic[];
  loading?: boolean;
}

export function RiskAssessmentDashboard({ tasks = [], loading = false }: RiskDashboardProps) {
  const [dashboard, setDashboard] = useState<RiskDashboardData | null>(null);
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);

  const isLoading = loading || !dashboard;

  const loadDashboardData = useCallback(async () => {
    const [dashData, alertData] = await Promise.all([
      getRiskDashboard(),
      getRiskAlerts({ read: false, limit: 20 }),
    ]);
    setDashboard(dashData);
    setAlerts(alertData);
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData, tasks]);

  const handleMarkAllRead = async () => {
    await markRiskAlertRead(0); // Mark all read
    loadDashboardData();
  };

  const getRiskLevelColor = (level: 'low' | 'medium' | 'high' | 'critical') => {
    switch (level) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Risk Assessment
          </h2>
          <p className="text-muted-foreground">
            Proactive risk management for your tasks
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Critical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{dashboard?.critical_risks || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              High
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{dashboard?.high_risks || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <TrendingDown className="h-4 w-4 text-yellow-500" />
              Medium
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{dashboard?.medium_risks || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <Shield className="h-4 w-4 text-green-500" />
              Low
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{dashboard?.low_risks || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Alerts */}
      {alerts.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{alerts.length} unread risk alert{alerts.length > 1 ? 's' : ''}</strong>{' '}
            require your attention
          </AlertDescription>
          <Button variant="link" size="sm" onClick={handleMarkAllRead}>
            Mark all as read
          </Button>
        </Alert>
      )}

      {/* Main Content */}
      <div className="space-y-4">
        {dashboard?.top_risks?.map((risk: RiskAnalysis) => (
          <Card key={risk.risk_id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`${getRiskLevelColor(risk.risk_level)} text-white text-xs`}
                    >
                      {risk.risk_level.toUpperCase()}
                    </Badge>
                    {risk.task_name}
                  </CardTitle>
                  <CardDescription>
                    {risk.risk_score > 70 ? 'High risk of delay or failure' : 'Medium risk - monitor closely'}
                  </CardDescription>
                </div>
                <Badge variant="outline">{risk.risk_score}%</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Factors */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Risk Factors</p>
                  <div className="flex flex-wrap gap-1">
                    {risk.factors.map((factor: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">{factor}</Badge>
                    ))}
                  </div>
                </div>

                {/* Mitigation */}
                {risk.mitigation && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Recommendation</p>
                    <p className="text-sm">{risk.mitigation}</p>
                  </div>
                )}

                {/* Progress */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Risk Score</span>
                    <span>{risk.risk_score}</span>
                  </div>
                  <Progress value={risk.risk_score} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}