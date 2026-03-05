/**
 * Production-safe logger. Only outputs in development mode.
 * In production, all calls are no-ops to prevent leaking sensitive data.
 */
const isDev = import.meta.env.DEV;

export const logger = {
  info: (...args: unknown[]) => { if (isDev) console.info(...args); },
  warn: (...args: unknown[]) => { if (isDev) console.warn(...args); },
  error: (...args: unknown[]) => { if (isDev) console.error(...args); },
  log: (...args: unknown[]) => { if (isDev) console.log(...args); },
};
