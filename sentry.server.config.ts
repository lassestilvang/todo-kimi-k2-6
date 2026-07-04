/**
 * Sentry Server Configuration
 * This file configures Sentry for server-side error tracking
 */

import * as SentryServer from "@sentry/nextjs";

const sentryDsn = process.env['NEXT_PUBLIC_SENTRY_DSN'];

if (sentryDsn) {
  SentryServer.init({
    dsn: sentryDsn,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
    debug: process.env.NODE_ENV === "development",
    environment: process.env.NODE_ENV,
    release: process.env['NEXT_PUBLIC_APP_VERSION'] ?? '',
    attachStacktrace: true,
  });
}