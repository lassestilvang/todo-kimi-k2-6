"use client";

import { useEffect, useState, useCallback } from "react";
import { Download, X, Bell, BellOff, RefreshCw, Database, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  promise: Promise<any>;
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface PwaInstallPromptProps {
  onInstalled?: () => void;
}

// Background sync manager
class BackgroundSyncManager {
  private queue: Array<{ id: string; url: string; options: RequestInit; timestamp: number }> = [];
  private isProcessing = false;

  enqueue(url: string, options: RequestInit) {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.queue.push({ id, url, options, timestamp: Date.now() });
    this.processQueue();
    return id;
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const batch = [...this.queue];
    this.queue = [];

    for (const item of batch) {
      try {
        await fetch(item.url, item.options);
        toast.success("Synced successfully");
      } catch (error) {
        // Re-add to queue on failure
        this.queue.unshift(item);
        console.error("Sync failed:", error);
      }
    }

    this.isProcessing = false;
  }

  getQueueLength() {
    return this.queue.length;
  }
}

export const backgroundSyncManager = new BackgroundSyncManager();

export function PwaEnhancements({ onInstalled }: PwaInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [isInstalled, setIsInstalled] = useState(false);
  const [syncQueueLength, setSyncQueueLength] = useState(0);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    const handleInstalled = () => {
      setIsVisible(false);
      setIsInstalled(true);
      onInstalled?.();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
    window.addEventListener("appinstalled", handleInstalled);

    // Check notification permission
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [onInstalled]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();

    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === "accepted") {
      setIsVisible(false);
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setDeferredPrompt(null);
    // Don't show again for 7 days
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  const handleNotificationRequest = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  // Check if we should show install prompt
  useEffect(() => {
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const daysSince = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) {
        setIsVisible(false);
      }
    }
  }, []);

  if (!isVisible || typeof window === "undefined" || isInstalled) {
    return null;
  }

  return (
    <>
      <Card className="fixed bottom-4 right-4 z-50 w-72 p-4 shadow-lg border-primary/20 bg-background">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-sm">Install TaskFlow</p>
              <p className="text-xs text-muted-foreground">
                Get the full app experience
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleDismiss}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" className="flex-1" onClick={handleInstall}>
            Install
          </Button>
          <Button size="sm" variant="outline" onClick={handleDismiss}>
            Later
          </Button>
        </div>
      </Card>

      {/* Notification prompt */}
      {notificationPermission === "default" && (
        <Card className="fixed bottom-20 right-4 z-50 w-64 p-4 shadow-lg border-blue-200 bg-background">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium text-sm">Enable Notifications</p>
                <p className="text-xs text-muted-foreground">
                  Get reminders for your tasks
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setNotificationPermission("denied")}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <Button size="sm" className="mt-3 w-full" onClick={handleNotificationRequest}>
            Enable Notifications
          </Button>
        </Card>
      )}
    </>
  );
}

// Hook to detect if the app is installed
export function usePwaInstalled() {
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const checkInstalled = () => {
      if (window.matchMedia("(display-mode: standalone)").matches) {
        setIsInstalled(true);
      }
    };

    checkInstalled();

    window.addEventListener("resize", checkInstalled);
    return () => window.removeEventListener("resize", checkInstalled);
  }, []);

  return isInstalled;
}

// Hook for background sync
export function useBackgroundSync() {
  const [queueLength, setQueueLength] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setQueueLength(backgroundSyncManager.getQueueLength());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return queueLength;
}

// Offline data manager
export class OfflineDataManager {
  private static readonly STORE_NAME = "taskflow-offline";
  private static readonly DB_VERSION = 1;

  static async init() {
    if (!("indexedDB" in window)) return null;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.STORE_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBEvent).result;
        db.createObjectStore("tasks", { keyPath: "id" });
        db.createObjectStore("sync-queue", { keyPath: "id", autoIncrement: true });
      };
    });
  }

  static async saveTask(task: any) {
    const db = await this.init();
    if (!db) return;

    const transaction = (db as IDBDatabase).transaction(["tasks"], "readwrite");
    const store = transaction.objectStore("tasks");
    store.put({ ...task, savedAt: Date.now() });
  }

  static async getPendingTasks() {
    const db = await this.init();
    if (!db) return [];

    const transaction = (db as IDBDatabase).transaction(["tasks"], "readonly");
    const store = transaction.objectStore("tasks");
    return store.getAll();
  }
}

// Service worker registration hook
export function useServiceWorker() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        setRegistration(reg);
      } catch (error) {
        console.error("Service worker registration failed:", error);
      }
    };

    register();
  }, []);

  return registration;
}