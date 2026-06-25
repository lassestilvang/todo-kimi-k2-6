"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface BeforeInstallPromptEvent extends Event {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  promise: Promise<any>;
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface PwaInstallPromptProps {
  onInstalled?: () => void;
}

export function PwaInstallPrompt({ onInstalled }: PwaInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    const handleInstalled = () => {
      setIsVisible(false);
      onInstalled?.();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
    window.addEventListener("appinstalled", handleInstalled);

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
  };

  if (!isVisible || typeof window === "undefined") {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-72 p-4 shadow-lg border-primary/20 bg-background">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Download className="h-5 w-5 text-primary" />
          <div>
            <p className="font-medium text-sm">Install TaskFlow</p>
            <p className="text-xs text-muted-foreground">
              Install the app for a better experience
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