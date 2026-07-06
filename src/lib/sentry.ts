/**
 * Sentry Error Tracking Integration
 * Provides error capture and performance monitoring for production
 */

// This file provides safe wrappers around Sentry that work even when
// the @sentry/nextjs package is not installed

export function initSentry() {
  if (typeof window === "undefined") return;
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require("@sentry/nextjs");
    if (Sentry) {
      Sentry.init({
        dsn,
        integrations: [Sentry.integrations.http({ tracing: true })],
        tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
        debug: process.env.NODE_ENV === "development",
        environment: process.env.NODE_ENV,
        release: process.env.NEXT_PUBLIC_APP_VERSION ?? undefined,
      });
    }
  } catch {
    // Sentry not available, skip initialization
  }
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    console.error("Error captured:", error, context);
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require("@sentry/nextjs");
    if (Sentry) {
      Sentry.captureException(error, { contexts: { custom: context } });
    } else {
      console.error("Error captured:", error, context);
    }
  } catch {
    console.error("Error captured:", error, context);
  }
}

export function captureMessage(
  message: string,
  level = "info",
  context?: Record<string, unknown>
) {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    console.log(`[${level}] ${message}`, context);
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require("@sentry/nextjs");
    if (Sentry) {
      Sentry.captureMessage(message, { level, contexts: { custom: context } });
    } else {
      console.log(`[${level}] ${message}`, context);
    }
  } catch {
    console.log(`[${level}] ${message}`, context);
  }
}

export function setUserContext(
  userId: number | string,
  email?: string,
  name?: string
) {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require("@sentry/nextjs");
    if (Sentry) {
      Sentry.setUser({ id: String(userId), email, username: name });
    }
  } catch {
    // Sentry not available
  }
}

export function clearUserContext() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require("@sentry/nextjs");
    if (Sentry) {
      Sentry.setUser(null);
    }
  } catch {
    // Sentry not available
  }
}