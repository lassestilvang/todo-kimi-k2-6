'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw, Bug, Copy, ShieldAlert, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

interface Props {
  /** Child components to render */
  children: ReactNode;
  /** Custom fallback UI when an error occurs */
  fallback?: ReactNode;
  /** Callback fired when the error boundary resets */
  onReset?: () => void;
  /** Show detailed error info for developers (dev mode only) */
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo?: ErrorInfo;
}

/**
 * React Error Boundary component for catching JavaScript errors anywhere in the child component tree.
 * Logs errors to the logger and provides a user-friendly error UI with recovery options.
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
    logger.error('Error caught by boundary', {
      errorName: error.name,
      errorMessage: error.message,
      componentStack: errorInfo.componentStack,
    });

    this.setState({ hasError: true, error, errorInfo });

    // In production, send to error tracking service
    if (process.env['NEXT_PUBLIC_SENTRY_DSN']) {
      // Sentry.captureException(error, { contexts: { react: errorInfo } });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: undefined });
    this.props.onReset?.();
    // Clear error boundary state on reset
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handleCopyError = () => {
    if (this.state.error) {
      const errorStr = `Error: ${this.state.error.name}\n${this.state.error.message}\n\nStack: ${this.state.error.stack}`;
      navigator.clipboard.writeText(errorStr);
    }
  };

  detectNetworkError = () => {
    const message = this.state.error?.message?.toLowerCase() || '';
    return message.includes('fetch') || message.includes('network') || message.includes('offline') || message.includes('connection');
  };

  render() {
    if (this.state.hasError) {
      const isNetworkError = this.detectNetworkError();
      const isDev = process.env.NODE_ENV === 'development';

      return (
        this.props.fallback || (
          <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
            <div className="text-center p-6 max-w-md w-full bg-background rounded-lg shadow-lg border">
              <div className="flex justify-center mb-4">
                {isNetworkError ? (
                  <WifiOff className="h-12 w-12 text-amber-500" />
                ) : (
                  <Bug className="h-12 w-12 text-red-500" />
                )}
              </div>

              <h2 className="text-lg font-semibold mb-2">
                {isNetworkError ? 'Network Connection Issue' : 'Something went wrong'}
              </h2>

              <p className="text-sm text-muted-foreground mb-4">
                {this.state.error?.message || 'An unexpected error occurred'}
                {isNetworkError && ' Check your internet connection and try again.'}
              </p>

              {/* Developer Details (Dev Mode Only) */}
              {isDev && this.props.showDetails && this.state.error && (
                <details className="text-left mb-4 p-3 bg-muted/30 rounded-md text-xs">
                  <summary className="cursor-pointer font-medium mb-2">Error Details</summary>
                  <pre className="break-all text-muted-foreground">
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}

              <div className="flex gap-2 justify-center flex-wrap">
                <Button onClick={this.handleReset} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => (window.location.href = '/')}
                  className="gap-2"
                >
                  <ShieldAlert className="h-4 w-4" />
                  Go Home
                </Button>
                {this.props.showDetails && this.state.error && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={this.handleCopyError}
                    className="gap-1.5"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </Button>
                )}
              </div>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
