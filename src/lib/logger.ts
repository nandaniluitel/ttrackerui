// src/lib/logger.ts
const isDev = import.meta.env.DEV;

export const logger = {
  info: (message: string, ...args: unknown[]) => {
    if (isDev) console.info(message, ...args);
  },
  warn: (message: string, ...args: unknown[]) => {
    if (isDev) console.warn(message, ...args);
  },
  error: (message: string, error?: unknown) => {
    console.error(message, error);
  },
};
