/**
 * Dependency-free structured logger.
 *
 * Production emits exactly one JSON object per line — Render (and every other
 * log aggregator) splits records on newlines, so the serialized payload must
 * never contain a raw newline. Development emits readable text instead.
 */

type LogLevel = 'info' | 'warn' | 'error';

export type LogContext = Record<string, unknown>;

const CONSOLE_METHOD: Record<LogLevel, 'log' | 'warn' | 'error'> = {
  info: 'log',
  warn: 'warn',
  error: 'error',
};

// An Error serializes to `{}` under JSON.stringify, which silently loses every
// message we log. Unwrap it into plain fields instead.
function normalizeValue(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  return value;
}

function normalizeContext(context: LogContext): LogContext {
  const out: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    out[key] = normalizeValue(value);
  }
  return out;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '{"logError":"unserializable payload"}';
  }
}

function emit(level: LogLevel, message: string, context?: LogContext): void {
  const timestamp = new Date().toISOString();
  const method = CONSOLE_METHOD[level];
  const data = context && Object.keys(context).length > 0 ? normalizeContext(context) : undefined;

  // Read NODE_ENV per call, not at module load: server/index.ts runs
  // dotenv.config() after the ESM import graph has already been evaluated.
  if (process.env.NODE_ENV === 'production') {
    console[method](safeStringify({ timestamp, level, message, ...(data ? { context: data } : {}) }));
    return;
  }

  console[method](`${timestamp} [${level.toUpperCase()}] ${message}${data ? ` ${safeStringify(data)}` : ''}`);
}

export const logger = {
  info: (message: string, context?: LogContext) => emit('info', message, context),
  warn: (message: string, context?: LogContext) => emit('warn', message, context),
  error: (message: string, context?: LogContext) => emit('error', message, context),
};
