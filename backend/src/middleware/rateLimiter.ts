import rateLimit from 'express-rate-limit';
import { config } from '../config';

export const generalApiLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests created from this IP, please try again after a few minutes.',
    error: {
      code: 'RATE_LIMIT_EXCEEDED'
    },
    timestamp: new Date().toISOString()
  }
});

export const sosRateLimiter = rateLimit({
  windowMs: config.SOS_RATE_LIMIT_WINDOW_MS,
  max: config.SOS_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'SOS trigger limit exceeded for this window. Please contact emergency services directly via phone.',
    error: {
      code: 'SOS_RATE_LIMIT_EXCEEDED'
    },
    timestamp: new Date().toISOString()
  }
});
