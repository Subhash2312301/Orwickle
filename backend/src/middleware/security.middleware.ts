import cors from 'cors';
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
});

const allowedOrigins = [
  ...env.ADMIN_CORS_ORIGIN.split(',').map((o) => o.trim()),
  ...env.MOBILE_ALLOWED_ORIGINS.split(',').map((o) => o.trim()),
];

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Mobile apps and CLI/curl test clients may not send an Origin header
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} not permitted by Orwickle CORS policy.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Orwickle-Admin',
    'Accept',
  ],
});

/**
 * Universal Origin and Custom Header check for Administrative endpoints (ADR-014)
 * Enforced in EVERY environment (development, staging, production).
 */
export function adminHeaderCheck(req: Request, res: Response, next: NextFunction): void {
  const isAdminRoute =
    req.path.startsWith('/admin') ||
    req.path.startsWith('/api/v1/admin') ||
    req.path.startsWith('/api/v1/auth/admin');

  if (isAdminRoute) {
    const adminHeader = req.headers['x-orwickle-admin'];
    if (adminHeader !== '1') {
      res.status(403).json({
        success: false,
        error: {
          code: 'ADMIN_HEADER_REQUIRED',
          message: 'ERROR — Administrative requests require explicit X-Orwickle-Admin: 1 header verification.',
        },
      });
      return;
    }

    // Origin verification when Origin is present
    const origin = req.headers['origin'];
    if (origin && !allowedOrigins.includes(origin)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'ORIGIN_FORBIDDEN',
          message: 'ERROR — Origin not permitted for administrative access.',
        },
      });
      return;
    }
  }

  next();
}
