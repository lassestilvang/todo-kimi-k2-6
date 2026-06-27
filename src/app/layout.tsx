import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NotificationProvider } from "@/components/task/notification-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import { KeyboardShortcutsHandler } from "@/components/task/keyboard-shortcuts-handler";
import { QueryProvider } from "@/components/query-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TaskFlow - Daily Planner",
  description: "A modern daily task planner with drag-and-drop, dependencies, and templates",
};

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
            <QueryProvider>
              <NotificationProvider>
                <TooltipProvider delay={0}>
                  {children}
                </TooltipProvider>
              </NotificationProvider>
            </QueryProvider>
          </ErrorBoundary>
        </ThemeProvider>
        <KeyboardShortcutsHandler />
      </body>
    </html>
  );
}