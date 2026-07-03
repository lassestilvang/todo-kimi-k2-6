"use client";

import { useState } from "react";
import { Calendar, CalendarPlus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface CalendarSyncSettingsProps {
  accessToken?: string | null;
  onAuth?: () => void;
  onSync?: () => void;
  lastSynced?: string | null;
  onEnableChange?: (enabled: boolean) => void;
}

interface SyncStatus {
  enabled: boolean;
  lastSync: string | null;
  error: string | null;
}

export function CalendarSyncSettings({
  accessToken,
  onAuth,
  onSync,
  lastSynced,
  onEnableChange,
}: CalendarSyncSettingsProps) {
  const [status, setStatus] = useState<SyncStatus>({
    enabled: !!accessToken,
    lastSync: lastSynced || null,
    error: null,
  });
  const [isSyncing, setIsSyncing] = useState(false);

  const handleConnect = () => {
    if (onAuth) {
      onAuth();
    } else {
      // Default to Google OAuth
      window.location.href = "/api/calendar/sync?action=auth";
    }
  };

  const handleSync = async () => {
    if (!accessToken) return;

    setIsSyncing(true);
    setStatus((prev) => ({ ...prev, error: null }));

    try {
      const response = await fetch("/api/calendar/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accessToken }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await response.json();
      setStatus((prev) => ({
        ...prev,
        lastSync: new Date().toISOString(),
        enabled: true,
      }));
      onSync?.();
    } catch (error) {
      setStatus((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Sync failed",
      }));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = () => {
    setStatus({
      enabled: false,
      lastSync: null,
      error: null,
    });
    onEnableChange?.(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendar Sync
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Sync your tasks with Google Calendar
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status.enabled ? (
          <div className="text-center py-6">
            <CalendarPlus className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-sm text-muted-foreground mb-4">
              Connect your calendar to sync tasks automatically
            </p>
            <Button onClick={handleConnect}>
              Connect Google Calendar
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base">Calendar Sync</Label>
                <p className="text-sm text-muted-foreground">
                  {status.lastSync
                    ? `Last synced: ${new Date(status.lastSync).toLocaleString()}`
                    : "Not yet synced"}
                </p>
                {status.error && (
                  <p className="text-sm text-red-500">{status.error}</p>
                )}
              </div>
              <Switch
                checked={status.enabled}
                onCheckedChange={(checked) => {
                  if (!checked) {
                    handleDisconnect();
                  }
                }}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={isSyncing || !accessToken}
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync Now
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
              >
                Disconnect
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}