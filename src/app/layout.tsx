import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NotificationProvider } from "@/components/task/notification-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import { KeyboardShortcutsHandler } from "@/components/task/keyboard-shortcuts-handler";
import { QueryProvider } from "@/components/query-provider";
import { SessionProvider } from "next-auth/react";
import { WebVitalsTracker } from "@/components/web-vitals";
import { initSentry } from "@/lib/sentry";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TaskFlow - Daily Planner",
  description: "A modern daily task planner with drag-and-drop, dependencies, and templates",
};

// Initialize Sentry in production
if (process.env.NODE_ENV === "production") {
  initSentry();
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6366f1" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <ErrorBoundary>
            <SessionProvider>
              <QueryProvider>
                <NotificationProvider>
                  <TooltipProvider delay={0}>
                    {children}
                  </TooltipProvider>
                </NotificationProvider>
              </QueryProvider>
            </SessionProvider>
          </ErrorBoundary>
        </ThemeProvider>
        <KeyboardShortcutsHandler />
        <WebVitalsTracker />
        {/* Screen reader announcer for accessibility */}
        <div
          id="aria-live-announcer"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        />
      </body>
    </html>
  );
}