"use client";

import { useEffect, useState, useCallback } from "react";
import { useTheme } from "next-themes";

type Theme = "light" | "dark" | "system";

interface ThemeScheduledProviderProps {
  children: React.ReactNode;
}

/**
 * Auto-schedules dark mode based on sunrise/sunset times.
 * Gets user's location and calculates optimal theme switch times.
 */
export function ThemeScheduledProvider({ children }: ThemeScheduledProviderProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const calculateSunriseSunset = useCallback((lat: number, lng: number): { sunrise: number; sunset: number } => {
    // Simplified sunrise/sunset calculation (approximate)
    const now = new Date();
    const dayOfYear = now.getDate();
    const latRad = lat * Math.PI / 180;

    // Approximate sunrise/sunset calculation
    // This is a simplified model - real apps would use a library like suncalc
    const decl = 23.45 * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));
    const declRad = decl * Math.PI / 180;

    // Hour angle for sunrise/sunset (in radians)
    const cosH = (Math.sin(-0.833 * Math.PI / 180) - Math.sin(latRad) * Math.sin(declRad)) /
      (Math.cos(latRad) * Math.cos(declRad));

    const cosHClamped = Math.max(-1, Math.min(1, cosH));
    const hourAngle = Math.acos(cosHClamped);

    // Convert to hours from midnight
    const sunrise = 12 - hourAngle * 180 / Math.PI / 15;
    const sunset = 12 + hourAngle * 180 / Math.PI / 15;

    return { sunrise, sunset };
  }, []);

  useEffect(() => {
    if (!mounted || theme !== "system") return;

    const checkAndApplyTheme = async () => {
      try {
        // Try to get user's location
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { sunrise, sunset } = calculateSunriseSunset(
                position.coords.latitude,
                position.coords.longitude
              );

              const currentHour = new Date().getHours() + new Date().getMinutes() / 60;

              // Apply theme based on time
              if (currentHour < sunrise || currentHour > sunset) {
                setTheme("dark");
              } else {
                setTheme("light");
              }
            },
            () => {
              // Fallback: use simple dawn/dusk based on timezone
              const currentHour = new Date().getHours();
              if (currentHour < 6 || currentHour >= 18) {
                setTheme("dark");
              } else {
                setTheme("light");
              }
            },
            { timeout: 5000 }
          );
        }
      } catch {
        // Location not available, use simple schedule
        const currentHour = new Date().getHours();
        if (currentHour < 6 || currentHour >= 18) {
          setTheme("dark");
        } else {
          setTheme("light");
        }
      }
    };

    // Check on mount and every hour
    checkAndApplyTheme();
    const interval = setInterval(checkAndApplyTheme, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [mounted, theme, setTheme, calculateSunriseSunset]);

  return <>{children}</>;
}

// Hook to get scheduled theme info
export function useScheduledTheme() {
  const { theme } = useTheme();

  return {
    isScheduled: theme === "system",
    theme,
  };
}