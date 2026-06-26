type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = {
  requestId?: string;
  userId?: string;
  questId?: string;
  method?: string;
  path?: string;
  status?: number;
  duration?: number;
  [key: string]: unknown;
};

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ?? 'info';

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[currentLevel];
}

function toLog(
  level: LogLevel,
  message: string,
  context?: LogContext,
): string {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  });
}

function output(level: LogLevel, entry: string): void {
  switch (level) {
    case 'error':
      console.error(entry);
      break;
    case 'warn':
      console.warn(entry);
      break;
    default:
      console.log(entry);
      break;
  }
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    if (!shouldLog('debug')) return;
    output('debug', toLog('debug', message, context));
  },

  info(message: string, context?: LogContext): void {
    if (!shouldLog('info')) return;
    output('info', toLog('info', message, context));
  },

  warn(message: string, context?: LogContext): void {
    if (!shouldLog('warn')) return;
    output('warn', toLog('warn', message, context));
  },

  error(message: string, context?: LogContext): void {
    if (!shouldLog('error')) return;
    output('error', toLog('error', message, context));
  },

  request(ctx: {
    requestId: string;
    method: string;
    path: string;
    status: number;
    duration: number;
    userId?: string;
    questId?: string;
    error?: string;
  }): void {
    const level = ctx.status >= 500 ? 'error' : ctx.status >= 400 ? 'warn' : 'info';
    const message = ctx.error
      ? `${ctx.method} ${ctx.path} → ${ctx.status} (${ctx.duration}ms): ${ctx.error}`
      : `${ctx.method} ${ctx.path} → ${ctx.status} (${ctx.duration}ms)`;

    if (!shouldLog(level)) return;
    output(level, toLog(level, message, {
      requestId: ctx.requestId,
      method: ctx.method,
      path: ctx.path,
      status: ctx.status,
      duration: ctx.duration,
      userId: ctx.userId,
      questId: ctx.questId,
    }));
  },
};

export type { LogLevel, LogContext };
