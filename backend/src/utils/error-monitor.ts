import { logger } from "./logger.js";

export interface ErrorMonitorContext {
  requestId?: string;
  operation?: string;
  eventId?: string;
  code?: string;
  [key: string]: unknown;
}

export interface ErrorMonitor {
  captureException(error: unknown, context?: ErrorMonitorContext): void;
  captureMessage(message: string, context?: ErrorMonitorContext): void;
}

export const errorMonitor: ErrorMonitor = {
  captureException(error, context = {}) {
    logger.error("Unhandled production exception", {
      ...context,
      error,
    });
  },
  captureMessage(message, context = {}) {
    logger.warn(message, context);
  },
};
