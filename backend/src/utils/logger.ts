type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogPayload {
  [key: string]: any;
}

const sanitize = (data: any): any => {
  if (!data || typeof data !== 'object') return data;
  const sensitiveKeys = ['password', 'token', 'otp', 'authorization', 'apiKey', 'privateKey', 'secret'];
  const sanitized: any = Array.isArray(data) ? [] : {};
  for (const [key, value] of Object.entries(data)) {
    if (sensitiveKeys.some((k) => key.toLowerCase().includes(k))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitize(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

const formatMessage = (level: LogLevel, message: string, payload?: LogPayload): string => {
  const timestamp = new Date().toISOString();
  const entry = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...(payload ? { data: sanitize(payload) } : {})
  };
  return JSON.stringify(entry);
};

export const logger = {
  info: (message: string, payload?: LogPayload) => {
    console.log(formatMessage('info', message, payload));
  },
  warn: (message: string, payload?: LogPayload) => {
    console.warn(formatMessage('warn', message, payload));
  },
  error: (message: string, payload?: LogPayload) => {
    console.error(formatMessage('error', message, payload));
  },
  debug: (message: string, payload?: LogPayload) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatMessage('debug', message, payload));
    }
  }
};
