'use client';

import { useState } from 'react';
import {
  Calendar,
  CalendarPlus,
  RefreshCw,
  Shield,
  Check,
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface CalendarSyncSettingsProps {
  accessToken?: string | null;
  provider?: string | null;
  lastSynced?: string | null;
  expiresAt?: string | null;
  error?: string;
  onAuth?: (provider: 'google' | 'outlook') => void;
  onSync?: () => void;
  onEnableChange?: (enabled: boolean) => void;
}

interface SyncStatus {
  enabled: boolean;
  lastSync: string | null;
  error: string | null;
}

export function CalendarSyncSettings({
  accessToken,
  provider,
  lastSynced,
  expiresAt,
  error: externalError,
  onAuth,
  onSync,
  onEnableChange,
}: CalendarSyncSettingsProps) {
  const [status, setStatus] = useState<
    Record<'google' | 'outlook', SyncStatus>
  >({
    google: {
      enabled: provider === 'google',
      lastSync: lastSynced && provider === 'google' ? lastSynced : null,
      error: externalError && provider === 'google' ? externalError : null,
    },
    outlook: {
      enabled: provider === 'outlook',
      lastSync: lastSynced && provider === 'outlook' ? lastSynced : null,
      error: externalError && provider === 'outlook' ? externalError : null,
    },
  });
  const [isSyncing, setIsSyncing] = useState<
    Record<'google' | 'outlook', boolean>
  >({
    google: false,
    outlook: false,
  });
  const [selectedProvider, setSelectedProvider] = useState<
    'google' | 'outlook'
  >('google');

  const handleConnect = (selectedProvider: 'google' | 'outlook') => {
    setSelectedProvider(selectedProvider);
    if (onAuth) {
      onAuth(selectedProvider);
    } else {
      // Open OAuth flow
      window.open(
        `/api/calendar/${selectedProvider}/auth`,
        '_blank',
        'width=600,height=700'
      );
    }
  };

  const handleSync = async (provider: 'google' | 'outlook') => {
    if (status[provider].enabled) return;

    setIsSyncing(prev => ({ ...prev, [provider]: true }));
    setStatus(prev => ({
      ...prev,
      [provider]: { ...prev[provider], error: null },
    }));

    try {
      const response = await fetch(`/api/calendar/${provider}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await response.json();
      setStatus(prev => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          lastSync: new Date().toISOString(),
          enabled: true,
        },
      }));
      onSync?.();
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          error: error instanceof Error ? error.message : 'Sync failed',
        },
      }));
    } finally {
      setIsSyncing(prev => ({ ...prev, [provider]: false }));
    }
  };

  const handleDisconnect = async (provider: 'google' | 'outlook') => {
    try {
      await fetch(`/api/calendar/${provider}/sync`, {
        method: 'DELETE',
      });
    } catch {
      // Ignore errors on disconnect
    }

    setStatus(prev => ({
      ...prev,
      [provider]: {
        enabled: false,
        lastSync: null,
        error: null,
      },
    }));
    onEnableChange?.(false);
  };

  const isAnyEnabled = Object.values(status).some(s => s.enabled);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendar Sync
        </CardTitle>
        <CardDescription>
          Sync your tasks with Google or Outlook Calendar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isAnyEnabled && (
          <div className="space-y-3">
            <Label className="text-base">Choose a calendar provider</Label>
            <RadioGroup
              value={selectedProvider}
              onValueChange={value =>
                handleConnect(value as 'google' | 'outlook')
              }
              className="flex flex-col space-y-2"
            >
              <div className="flex items-center space-x-3 border rounded-lg p-3 hover:bg-muted cursor-pointer">
                <RadioGroupItem value="google" />
                <div className="flex items-center gap-2">
                  <CalendarPlus className="h-4 w-4" />
                  <Label className="cursor-pointer">Google Calendar</Label>
                </div>
                <Badge variant="outline" className="ml-auto">
                  Popular
                </Badge>
              </div>
              <div className="flex items-center space-x-3 border rounded-lg p-3 hover:bg-muted cursor-pointer">
                <RadioGroupItem value="outlook" />
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <Label className="cursor-pointer">Outlook Calendar</Label>
                </div>
                <Badge variant="outline" className="ml-auto">
                  Microsoft
                </Badge>
              </div>
            </RadioGroup>
          </div>
        )}

        {(status.google.enabled || status.outlook.enabled) && (
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Connected Calendars</h4>
              <div className="flex flex-wrap gap-2">
                {status.google.enabled && (
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900">
                    Google Calendar
                  </Badge>
                )}
                {status.outlook.enabled && (
                  <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900">
                    Outlook Calendar
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {Object.entries(status).map(([p, s]) => {
          if (!s.enabled) return null;
          const pTyped = p as 'google' | 'outlook';
          return (
            <div key={p} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {(p === 'google' ? 'Google' : 'Microsoft') +
                      ' Calendar Sync'}
                  </Label>
                  {s.lastSync ? (
                    <p className="text-sm text-muted-foreground">
                      Last synced: {new Date(s.lastSync).toLocaleString()}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Not yet synced
                    </p>
                  )}
                  {s.error && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {s.error}
                    </p>
                  )}
                  {expiresAt &&
                    new Date(expiresAt).toISOString().split('T')[0] ===
                      new Date().toISOString().split('T')[0] && (
                      <p className="text-xs text-muted-foreground/70">
                        Token expires: {new Date(expiresAt).toLocaleString()}
                      </p>
                    )}
                </div>
                <Switch
                  checked={s.enabled}
                  onCheckedChange={checked => {
                    if (!checked) {
                      handleDisconnect(pTyped);
                    }
                  }}
                />
              </div>

              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSync(pTyped)}
                  disabled={isSyncing[pTyped]}
                >
                  {isSyncing[pTyped] ? (
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
                  onClick={() => handleDisconnect(pTyped)}
                >
                  Disconnect
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
