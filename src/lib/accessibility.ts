/**
 * Accessibility utilities for React components
 */

import { useEffect } from "react";

/**
 * Sets focus on a DOM element after component mount
 */
export function useFocusOnMount<T extends HTMLElement>(): [React.RefObject<T>, (element: T | null) => void] {
  const ref = { current: null as T | null };

  const setRef = (element: T | null) => {
    ref.current = element;
    if (element) {
      element.focus();
    }
  };

  return [ref as React.RefObject<T>, setRef];
}

/**
 * Generates a unique ID for accessibility attributes
 */
export function generateId(prefix = "id"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Checks color contrast ratio (WCAG AA minimum: 4.5:1 for normal text)
 */
export function getContrastRatio(foreground: string, background: string): number {
  const getLuminance = (color: string): number => {
    // Handle hex colors
    const hex = color.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    const a = [r, g, b].map(v => {
      v = v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      return v;
    });

    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  };

  const l1 = getLuminance(foreground) + 0.05;
  const l2 = getLuminance(background) + 0.05;

  return Math.round(Math.max(l1, l2) / Math.min(l1, l2) * 100) / 100;
}

/**
 * Determines if a color is light or dark
 */
export function isLightColor(color: string): boolean {
  const hex = color.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

/**
 * Trap focus within a container (for modals, dialogs)
 */
export function trapFocus(container: HTMLElement): (() => void) {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  ) as NodeListOf<HTMLElement>;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Tab") {
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };

  container.addEventListener("keydown", handleKeyDown);

  // Cleanup function
  return () => container.removeEventListener("keydown", handleKeyDown);
}

/**
 * Announce a message to screen readers
 */
export function announce(message: string): void {
  const announcer = document.getElementById("aria-live-announcer");
  if (announcer) {
    announcer.textContent = message;
  }
}

/**
 * Hook to announce changes to screen readers
 */
export function useAnnounce(message: string, dependsOn?: unknown[]): void {
  useEffect(() => {
    if (message) {
      announce(message);
    }
  }, [message, ...(dependsOn || [])]);
}