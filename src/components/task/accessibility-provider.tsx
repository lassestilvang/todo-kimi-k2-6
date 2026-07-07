"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface AccessibilityContext {
  fontSize: "small" | "medium" | "large";
  reducedMotion: boolean;
  highContrast: boolean;
  setFontSize: (size: "small" | "medium" | "large") => void;
  setReducedMotion: (reduced: boolean) => void;
  setHighContrast: (highContrast: boolean) => void;
}

const AccessibilityContext = createContext<AccessibilityContext | null>(null);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">("medium");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedFontSize = localStorage.getItem("font-size") as "small" | "medium" | "large" | null;
    const savedReducedMotion = localStorage.getItem("reduced-motion") === "true";
    const savedHighContrast = localStorage.getItem("high-contrast") === "true";

    if (savedFontSize) setFontSize(savedFontSize);
    setReducedMotion(savedReducedMotion);
    setHighContrast(savedHighContrast);

    // Check system preference for reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReducedMotion(true);
    }
  }, []);

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem("font-size", fontSize);
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem("reduced-motion", reducedMotion.toString());
  }, [reducedMotion]);

  useEffect(() => {
    localStorage.setItem("high-contrast", highContrast.toString());
  }, [highContrast]);

  // Apply high contrast mode
  useEffect(() => {
    if (highContrast) {
      document.documentElement.classList.add("high-contrast");
    } else {
      document.documentElement.classList.remove("high-contrast");
    }
  }, [highContrast]);

  return (
    <AccessibilityContext.Provider
      value={{
        fontSize,
        reducedMotion,
        highContrast,
        setFontSize,
        setReducedMotion,
        setHighContrast,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error("useAccessibility must be used within AccessibilityProvider");
  }
  return context;
}