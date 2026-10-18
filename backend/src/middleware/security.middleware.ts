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
    // Native mobile apps and curl/postman clients send no Origin header
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
 * Selective Origin and Custom Header check for Cookie-Authenticated Web Requests (ADR-014)
 * Applied ONLY to cookie-authenticated web requests targeting administrative endpoints.
 * Native mobile requests (bearer token, no cookies, no Origin) are not blocked.
 */
export function adminHeaderCheck(req: Request, res: Response, next: NextFunction): void {
  const isWebCookieRequest =
    Boolean(req.cookies && Object.keys(req.cookies).length > 0) ||
    Boolean(req.headers['origin']);

  const isAdminRoute =
    req.path.startsWith('/admin') ||
    req.path.startsWith('/api/v1/admin') ||
    req.path.startsWith('/api/v1/auth/admin');

  if (isAdminRoute && isWebCookieRequest) {
    const adminHeader = req.headers['x-orwickle-admin'];
    if (adminHeader !== '1') {
      res.status(403).json({
        success: false,
        error: {
          code: 'ADMIN_HEADER_REQUIRED',
          message: 'ERROR — Web administrative requests require explicit X-Orwickle-Admin: 1 header verification.',
        },
      });
      return;
    }

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
