'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Gift,
  Settings,
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
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { generateDailyDigest, getUserNotificationPreferences, updateUserNotificationPreferences } from '@/lib/actions/notification-digest';

interface DailyDigestData {
  overdue: Array<{ id: number; name: string; days_overdue: number; priority: string }>;
  due_today: Array<{ id: number; name: string; priority: string }>;
  upcoming: Array<{ id: number; name: string; due_date: string | null; days_until: number }>;
  completed_today: number;
  streak: number;
  risk_alerts_count: number;
}

interface NotificationDigestProps {
  userId?: number;
  _refreshInterval?: number;
}

export function NotificationDigest({ userId, _refreshInterval = 300000 }: NotificationDigestProps) {
  const [digest, setDigest] = useState<DailyDigestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState({
    daily_digest: true,
    weekly_digest: false,
    push_enabled: true,
    email_enabled: true,
    risk_alerts: true,
  });

  const getUserId = async (): Promise<number | null> => {
    // Will be implemented via auth hook
    return null;
  };

  const loadDigest = useCallback(async () => {
    const id = userId || (await getUserId());
    if (!id) return;

    setLoading(true);
    const data = await generateDailyDigest(id);
    setDigest(data);
    setLoading(false);
  }, [userId]);

  const loadPreferences = useCallback(async () => {
    const id = userId || (await getUserId());
    if (!id) return;

    const prefs = await getUserNotificationPreferences(id);
    setPreferences(prefs);
  }, [userId]);

  useEffect(() => {
    loadDigest();
    loadPreferences();
  }, [loadDigest, loadPreferences]);

  const togglePreference = async (key: keyof typeof preferences) => {
    if (!userId) return;
    const newValue = !preferences[key];
    setPreferences(prev => ({ ...prev, [key]: newValue }));
    await updateUserNotificationPreferences(userId, { [key]: newValue });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return <Skeleton className="h-80 w-full" />;
  }

  if (!digest) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notification Digest</CardTitle>
          <CardDescription>Unable to load digest data</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const hasItems =
    digest.overdue.length > 0 ||
    digest.due_today.length > 0 ||
    digest.risk_alerts_count > 0;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Today&apos;s Digest
          </CardTitle>
          <CardDescription>
            {hasItems
              ? `You have ${digest.overdue.length + digest.due_today.length + digest.risk_alerts_count} items to handle`
              : 'All caught up! No urgent items'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Streak */}
            {digest.streak > 0 && (
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="font-medium">Current Streak</p>
                    <p className="text-sm text-muted-foreground">
                      {digest.streak} {digest.streak === 1 ? 'day' : 'days'} completed
                    </p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-purple-600">{digest.streak}🔥</div>
              </div>
            )}

            {/* Completed Today */}
            {digest.completed_today > 0 && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {digest.completed_today} task{digest.completed_today > 1 ? 's' : ''} completed today
                </span>
              </div>
            )}

            {/* Overdue Tasks */}
            {digest.overdue.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Overdue Tasks ({digest.overdue.length})
                </h4>
                <div className="space-y-2">
                  {digest.overdue.map(task => (
                    <div key={task.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="text-sm font-medium">{task.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {task.days_overdue} {task.days_overdue === 1 ? 'day' : 'days'} overdue
                        </p>
                      </div>
                      <Badge className={getPriorityColor(task.priority)} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Due Today */}
            {digest.due_today.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  Due Today ({digest.due_today.length})
                </h4>
                <div className="space-y-2">
                  {digest.due_today.map(task => (
                    <div key={task.id} className="flex items-center justify-between p-2 border rounded">
                      <p className="text-sm">{task.name}</p>
                      <Badge className={getPriorityColor(task.priority)} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risk Alerts */}
            {digest.risk_alerts_count > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{digest.risk_alerts_count} risk alert{digest.risk_alerts_count > 1 ? 's' : ''} detected</strong>.{' '}
                  Review in the Risk Assessment section.
                </AlertDescription>
              </Alert>
            )}

            {/* Upcoming */}
            {digest.upcoming.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Upcoming ({digest.upcoming.length})</h4>
                <div className="space-y-2">
                  {digest.upcoming.slice(0, 3).map(task => (
                    <div key={task.id} className="flex items-center justify-between p-2 border rounded">
                      <p className="text-sm">{task.name}</p>
                      <Badge variant="outline">{task.days_until} days</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preferences Dialog */}
      <Dialog>
        <DialogTrigger>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notification Preferences</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="daily-digest" className="flex flex-col gap-1">
                Daily Digest
              </Label>
              <Switch
                id="daily-digest"
                checked={preferences.daily_digest}
                onCheckedChange={_checked => togglePreference('daily_digest')}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="weekly-digest" className="flex flex-col gap-1">
                Weekly Summary
              </Label>
              <Switch
                id="weekly-digest"
                checked={preferences.weekly_digest}
                onCheckedChange={_checked => togglePreference('weekly_digest')}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="push-enabled" className="flex flex-col gap-1">
                Push Notifications
              </Label>
              <Switch
                id="push-enabled"
                checked={preferences.push_enabled}
                onCheckedChange={_checked => togglePreference('push_enabled')}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="email-enabled" className="flex flex-col gap-1">
                Email Notifications
              </Label>
              <Switch
                id="email-enabled"
                checked={preferences.email_enabled}
                onCheckedChange={_checked => togglePreference('email_enabled')}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}