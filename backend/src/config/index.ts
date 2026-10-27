import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform((v) => parseInt(v, 10)).default('5000'),
  HOST: z.string().default('0.0.0.0'),
  API_PREFIX: z.string().default('/api/v1'),
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_WINDOW_MS: z.string().transform((v) => parseInt(v, 10)).default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform((v) => parseInt(v, 10)).default('200'),
  SOS_RATE_LIMIT_MAX: z.string().transform((v) => parseInt(v, 10)).default('10'),
  SOS_RATE_LIMIT_WINDOW_MS: z.string().transform((v) => parseInt(v, 10)).default('60000'),

  DATABASE_URL: z.string().default('postgresql://aegis_user:aegis_secure_password@localhost:5432/aegis_db'),
  DEV_MOCK_AUTH: z.string().transform((v) => v === 'true').default('true'),

  FIREBASE_PROJECT_ID: z.string().optional().default('aegis-dev'),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_API_KEY: z.string().optional(),
  FIREBASE_AUTH_DOMAIN: z.string().optional(),
  FIREBASE_STORAGE_BUCKET: z.string().optional(),
  FIREBASE_MESSAGING_SENDER_ID: z.string().optional(),
  FIREBASE_APP_ID: z.string().optional(),

  SMS_PROVIDER: z.enum(['fast2sms', 'twilio', 'mock']).default('mock'),
  SMS_API_KEY: z.string().optional().default(''),
  FAST2SMS_API_KEY: z.string().optional().transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
  FAST2SMS_OTP_ID: z.string().optional().transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
  SMS_SENDER_ID: z.string().default('AEGISS'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),

  PUSH_PROVIDER: z.enum(['fcm', 'mock']).default('mock'),
  FCM_SERVER_KEY: z.string().optional(),

  MAPS_PROVIDER: z.enum(['osm', 'google', 'mock']).default('osm'),
  GOOGLE_MAPS_API_KEY: z.string().optional(),

  ROUTING_PROVIDER: z.enum(['osrm', 'google', 'fallback']).default('osrm'),
  OSRM_BASE_URL: z.string().default('https://router.project-osrm.org'),

  LOCATION_SESSION_DEFAULT_DURATION_MINUTES: z.string().transform((v) => parseInt(v, 10)).default('60'),
  LOCATION_PUBLIC_BASE_URL: z.string().default('http://localhost:5000/live'),

  DEFAULT_CITY: z.string().default('Chennai'),
  DEFAULT_LATITUDE: z.string().transform((v) => parseFloat(v)).default('13.0827'),
  DEFAULT_LONGITUDE: z.string().transform((v) => parseFloat(v)).default('80.2707')
});

export const config = envSchema.parse(process.env);
