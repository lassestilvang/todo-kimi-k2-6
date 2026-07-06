/**
 * Structured Logging Utility
 * Replaces console.error with proper logging for production
 */

type LogLevel = "error" | "warn" | "info" | "debug";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
  };
}

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === "development";
  }

  private formatEntry(entry: LogEntry): string {
    let base = `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`;

    if (entry.context) {
      try {
        base += ` ${JSON.stringify(entry.context)}`;
      } catch {
        base += ` context=<circular>`;
      }
    }

    if (entry.error) {
      try {
        base += ` error=${JSON.stringify(entry.error)}`;
      } catch {
        base += ` error=<circular>`;
      }
    }

    return base;
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error: error ? {
        name: error.name || "Error",
        message: error.message || "Unknown error",
        stack: this.isDevelopment ? error.stack : undefined,
      } : undefined,
    };

    const formatted = this.formatEntry(entry);

    switch (level) {
      case "error":
        console.error(formatted);
        break;
      case "warn":
        console.warn(formatted);
        break;
      case "info":
        console.info(formatted);
        break;
      case "debug":
        if (this.isDevelopment) {
          console.debug(formatted);
        }
        break;
    }
  }

  error(message: string, context?: Record<string, unknown>, error?: Error) {
    this.log("error", message, context, error);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log("warn", message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log("info", message, context);
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log("debug", message, context);
  }
}

export const logger = new Logger();

// Convenience functions
export const logError = (message: string, context?: Record<string, unknown>, error?: Error) => logger.error(message, context, error);
export const logWarn = (message: string, context?: Record<string, unknown>) => logger.warn(message, context);
export const logInfo = (message: string, context?: Record<string, unknown>) => logger.info(message, context);
export const logDebug = (message: string, context?: Record<string, unknown>) => logger.debug(message, context);