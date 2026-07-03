"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { RefreshCw, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

interface Props {
  /** Child components to render */
  children: ReactNode;
  /** Custom fallback UI when an error occurs */
  fallback?: ReactNode;
  /** Callback fired when the error boundary resets */
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary component for catching JavaScript errors anywhere in the child component tree.
 * Logs errors to the logger and provides a user-friendly error UI.
 *
 * @example
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 *
 * @example
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <App />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to structured logger
    logger.error("Error caught by boundary", {
      errorName: error.name,
      errorMessage: error.message,
      componentStack: errorInfo.componentStack,
    });

    // In production, send to error tracking service
    if (process.env["NEXT_PUBLIC_SENTRY_DSN"]) {
      // Sentry.captureException(error, { contexts: { react: errorInfo } });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
    // Clear error boundary state on reset
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
            <div className="text-center p-6 max-w-md bg-background rounded-lg shadow-lg">
              <Bug className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
              <p className="text-sm text-muted-foreground mb-4">
                {this.state.error?.message || "An unexpected error occurred"}
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={this.handleReset} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try again
                </Button>
                <Button variant="outline" onClick={() => window.location.href = "/"}>
                  Go Home
                </Button>
              </div>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}