// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Calendar, Clock, Mail, MessageCircle, TestTube } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface NotificationSettingsProps {
  trigger?: React.ReactNode;
  settings?: NotificationPrefs;
  onSave?: (settings: NotificationPrefs) => void;
}

interface NotificationPrefs {
  enabled: boolean;
  reminderMinutes: number;
  dueReminders: boolean;
  overdueReminders: boolean;
  dailySummary: boolean;
  pushEnabled: boolean;
  soundEnabled: boolean;
  position: "top" | "bottom";
}

const DEFAULT_PREFS: NotificationPrefs = {
  enabled: true,
  reminderMinutes: 15,
  dueReminders: true,
  overdueReminders: true,
  dailySummary: true,
  pushEnabled: false,
  soundEnabled: false,
  position: "top",
};

export function NotificationSettings({ trigger, settings, onSave }: NotificationSettingsProps) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(settings || DEFAULT_PREFS);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Check notification permission
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const updatePref = (key: keyof NotificationPrefs, value: any) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  };

  const saveToServer = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/user-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });

      if (!response.ok) {
        throw new Error("Failed to save");
      }

      onSave?.(prefs);
      toast.success("Notification settings saved!");
    } catch (error) {
      toast.error("Failed to save settings");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "test",
          title: "Test Notification",
          message: "This is a test notification from TaskFlow!",
        }),
      });
      toast.success("Test notification sent!");
    } catch {
      toast.warning("Test notification sent (demo mode)");
    }
  };

  const requestPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const granted = await Notification.requestPermission();
      setPermission(granted);
      if (granted !== "granted") {
        updatePref("enabled", false);
      }
    }
  };

  const content = (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Settings
        </h3>
        <p className="text-sm text-muted-foreground">
          Configure how you receive task reminders and notifications.
        </p>
      </div>

      <Separator />

      {/* Global Toggle */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-base">
              {prefs.enabled ? "Notifications On" : "Notifications Off"}
            </Label>
            <p className="text-sm text-muted-foreground">
              {prefs.enabled
                ? "Receive browser notifications for task reminders"
                : "Enable notifications to receive reminders"}
            </p>
          </div>
          <Switch
            checked={prefs.enabled && permission === "granted"}
            onCheckedChange={(checked) => {
              if (checked && permission !== "granted") {
                requestPermission();
              } else {
                updatePref("enabled", checked);
              }
            }}
            disabled={permission !== "granted" && !prefs.enabled}
          />
        </div>

        {permission !== "granted" && (
          <div className="rounded-lg bg-yellow-100 dark:bg-yellow-900/20 p-3 text-sm">
            <p className="font-medium flex items-center gap-2">
              <BellOff className="h-4 w-4" />
              Notifications not enabled
            </p>
            <p className="text-muted-foreground mt-1">
              Click the button in the top-right corner of your browser to enable notifications.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={requestPermission}
            >
              Request Permission
            </Button>
          </div>
        )}
      </div>

      <Separator />

      {/* Reminder Minutes */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-base">Reminder Time</Label>
          <span className="text-sm font-medium">
            {prefs.reminderMinutes} minute{prefs.reminderMinutes !== 1 ? "s" : ""} before
          </span>
        </div>
        <Slider
          value={[prefs.reminderMinutes]}
          min={1}
          max={120}
          step={5}
          onValueChange={(value) => updatePref("reminderMinutes", value[0])}
          disabled={!prefs.enabled}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1 min</span>
          <span>2 hours</span>
        </div>
      </div>

      <Separator />

      {/* Notification Types */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Notification Types
        </h4>

        <div className="space-y-3">
          {/* Due Date Reminders */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-blue-500" />
              <div>
                <Label className="text-sm font-medium">Due Date Reminders</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified when tasks are due
                </p>
              </div>
            </div>
            <Switch
              checked={prefs.dueReminders}
              onCheckedChange={(checked) => updatePref("dueReminders", checked)}
              disabled={!prefs.enabled}
            />
          </div>

          {/* Overdue Reminders */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-red-500" />
              <div>
                <Label className="text-sm font-medium">Overdue Reminders</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified when tasks are overdue
                </p>
              </div>
            </div>
            <Switch
              checked={prefs.overdueReminders}
              onCheckedChange={(checked) => updatePref("overdueReminders", checked)}
              disabled={!prefs.enabled}
            />
          </div>

          {/* Daily Summary */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-green-500" />
              <div>
                <Label className="text-sm font-medium">Daily Summary</Label>
                <p className="text-xs text-muted-foreground">
                  Receive a daily summary of your completed tasks
                </p>
              </div>
            </div>
            <Switch
              checked={prefs.dailySummary}
              onCheckedChange={(checked) => updatePref("dailySummary", checked)}
              disabled={!prefs.enabled}
            />
          </div>

          {/* Push Notifications */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-4 w-4 text-purple-500" />
              <div>
                <Label className="text-sm font-medium">Push Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Receive browser push notifications
                </p>
              </div>
            </div>
            <Switch
              checked={prefs.pushEnabled}
              onCheckedChange={(checked) => updatePref("pushEnabled", checked)}
              disabled={!prefs.enabled}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Display Options */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Display Options
        </h4>

        <div className="space-y-3">
          {/* Sound Enabled */}
          <div className="flex items-center justify-between">
            <Label className="text-base">Enable Sounds</Label>
            <Switch
              checked={prefs.soundEnabled}
              onCheckedChange={(checked) => updatePref("soundEnabled", checked)}
              disabled={!prefs.enabled}
            />
          </div>

          {/* Notification Position */}
          <div className="space-y-2">
            <Label className="text-base">Notification Position</Label>
            <Select
              value={prefs.position}
              onValueChange={(value) => updatePref("position", value as "top" | "bottom")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top">Top</SelectItem>
                <SelectItem value="bottom">Bottom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={handleTestNotification}>
          <TestTube className="h-4 w-4 mr-2" />
          Test Notification
        </Button>
        <Button onClick={saveToServer} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </DialogFooter>
    </div>
  );

  // If trigger is provided, render as a dialog with trigger
  if (trigger) {
    return (
      <Dialog>
        <DialogTrigger>{trigger}</DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Notification Settings</DialogTitle>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  // Otherwise, render as a standalone component
  return (
    <div className="rounded-lg border p-4">
      {content}
    </div>
  );
}

// Hook to get notification preferences from server
export function useNotificationSettings() {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user-settings")
      .then((r) => r.json())
      .then((data) => {
        const settings = data.settings || data;
        setPrefs({
          ...DEFAULT_PREFS,
          ...settings,
        });
      })
      .catch(() => {
        // Use defaults if API fails
        setPrefs(DEFAULT_PREFS);
      })
      .finally(() => setLoading(false));
  }, []);

  return { prefs, loading };
}