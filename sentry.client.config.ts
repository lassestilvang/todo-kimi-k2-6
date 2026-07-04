/**
 * Sentry Client Configuration
 * This file configures Sentry for client-side error tracking
 */

import * as SentryClient from "@sentry/nextjs";

const sentryDsn = process.env['NEXT_PUBLIC_SENTRY_DSN'];

if (sentryDsn) {
  SentryClient.init({
    dsn: sentryDsn,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
    debug: process.env.NODE_ENV === "development",
    environment: process.env.NODE_ENV,
    release: process.env['NEXT_PUBLIC_APP_VERSION'] ?? '',
  });
}