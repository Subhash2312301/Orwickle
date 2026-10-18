import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),

  // Database Connection
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_MIGRATION_URL: z.string().optional(),
  DATABASE_TEST_URL: z.string().optional(),
  DATABASE_SSL: z
    .string()
    .transform((val) => val === 'true' || val === '1')
    .default('false'),
  DATABASE_CA_CERT: z.string().optional(),

  // Secrets & Salt Keys
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  PASSWORD_RESET_SECRET: z.string().min(32, 'PASSWORD_RESET_SECRET must be at least 32 characters'),
  OTP_PEPPER: z.string().min(32, 'OTP_PEPPER must be at least 32 characters'),

  // Mail Delivery
  MAIL_MODE: z.enum(['console', 'smtp']).default('console'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z
    .string()
    .transform((val) => val === 'true' || val === '1')
    .default('false'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('"Orwickle Dealroom" <no-reply@orwickle.com>'),

  // CORS & Security
  ADMIN_CORS_ORIGIN: z.string().default('http://localhost:5173'),
  MOBILE_ALLOWED_ORIGINS: z.string().default('http://localhost,capacitor://localhost'),

  // Authentication Security Policies
  LOGIN_OTP_MODE: z.enum(['always', 'new_device', 'off']).default('always'),
  MAX_OTP_ATTEMPTS: z.coerce.number().default(5),
  ACCOUNT_LOCKOUT_THRESHOLD: z.coerce.number().default(5),
  REFRESH_TOKEN_GRACE_SECONDS: z.coerce.number().default(10),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[Orwickle Boot Error] Invalid environment configuration:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  throw new Error('Environment validation failed.');
}

export const env = parsed.data;

// Critical Invariant: In production, MAIL_MODE cannot be 'console'
if (env.NODE_ENV === 'production' && env.MAIL_MODE === 'console') {
  throw new Error(
    '[FATAL CONFIG] MAIL_MODE=console is strictly forbidden in production. Valid SMTP configuration required.'
  );
}

// In production, ensure SMTP parameters are fully provided when MAIL_MODE is smtp
if (env.MAIL_MODE === 'smtp') {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    throw new Error(
      '[FATAL CONFIG] SMTP_HOST, SMTP_USER, and SMTP_PASS must be provided when MAIL_MODE=smtp.'
    );
  }
}
