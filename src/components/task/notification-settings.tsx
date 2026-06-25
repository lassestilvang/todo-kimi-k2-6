"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Clock, Calendar } from "lucide-react";
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
import { useTheme } from "next-themes";

interface NotificationSettingsProps {
  trigger?: React.ReactNode;
}

interface NotificationPrefs {
  enabled: boolean;
  dueReminders: boolean;
  reminderMinutes: number;
  soundEnabled: boolean;
  position: "top" | "bottom";
}

const STORAGE_KEY = "notification-settings";

export function NotificationSettings({ trigger }: NotificationSettingsProps) {
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    enabled: true,
    dueReminders: true,
    reminderMinutes: 15,
    soundEnabled: false,
    position: "top",
  });
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const { theme } = useTheme();

  useEffect(() => {
    // Load settings from storage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setPrefs(JSON.parse(stored));
    }
    // Check notification permission
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const savePrefs = (newPrefs: NotificationPrefs) => {
    setPrefs(newPrefs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));
  };

  const requestPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const granted = await Notification.requestPermission();
      setPermission(granted);
      if (granted !== "granted") {
        savePrefs({ ...prefs, enabled: false });
      }
    }
  };

  const resetPrefs = () => {
    setPrefs({
      enabled: true,
      dueReminders: true,
      reminderMinutes: 15,
      soundEnabled: false,
      position: "top",
    });
    localStorage.removeItem(STORAGE_KEY);
  };

  const content = (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Notification Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure how you receive task reminders and notifications.
        </p>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="notifications-enabled" className="text-base">
              Enable Notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              Receive browser notifications for task reminders
            </p>
          </div>
          <Switch
            id="notifications-enabled"
            checked={prefs.enabled && permission === "granted"}
            onCheckedChange={(checked) => {
              if (checked) {
                requestPermission();
              } else {
                savePrefs({ ...prefs, enabled: false });
              }
            }}
            disabled={permission !== "granted"}
          />
        </div>

        {permission !== "granted" && (
          <div className="rounded-lg bg-yellow-100 dark:bg-yellow-900/20 p-3 text-sm">
            <p className="font-medium">Notifications not enabled</p>
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

      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Reminder Settings
        </h4>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="due-reminders" className="text-base">
              Due Date Reminders
            </Label>
            <Switch
              id="due-reminders"
              checked={prefs.dueReminders}
              onCheckedChange={(checked) => savePrefs({ ...prefs, dueReminders: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base">
              Default reminder time: {prefs.reminderMinutes} minutes before
            </Label>
            <Slider
              value={[prefs.reminderMinutes]}
              onValueChange={([value]) => savePrefs({ ...prefs, reminderMinutes: value })}
              min={1}
              max={60}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 min</span>
              <span>60 min</span>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Display Options
        </h4>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="sound-enabled" className="text-base">
              Enable Sounds
            </Label>
            <Switch
              id="sound-enabled"
              checked={prefs.soundEnabled}
              onCheckedChange={(checked) => savePrefs({ ...prefs, soundEnabled: checked })}
              disabled
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base">Notification Position</Label>
            <Select
              value={prefs.position}
              onValueChange={(value) => savePrefs({ ...prefs, position: value as "top" | "bottom" })}
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
        <Button variant="outline" onClick={resetPrefs}>
          Reset to Defaults
        </Button>
        <Button onClick={() => {/* Settings saved automatically */}}>
          Save Settings
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

// Hook to get notification preferences
export function useNotificationSettings() {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setPrefs(JSON.parse(stored));
    } else {
      setPrefs({
        enabled: true,
        dueReminders: true,
        reminderMinutes: 15,
        soundEnabled: false,
        position: "top",
      });
    }
  }, []);

  return prefs;
}