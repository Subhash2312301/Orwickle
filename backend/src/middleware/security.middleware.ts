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
    // Mobile apps and curl/postman might have no origin
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin) || env.NODE_ENV !== 'production') {
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

export function adminHeaderCheck(req: Request, res: Response, next: NextFunction): void {
  // In production, when cross-origin cookies might be used, check defense-in-depth header
  if (req.path.startsWith('/admin') && env.NODE_ENV === 'production') {
    const adminHeader = req.headers['x-orwickle-admin'] || req.headers['x-requested-with'];
    if (!adminHeader) {
      res.status(403).json({
        success: false,
        error: {
          code: 'ADMIN_HEADER_REQUIRED',
          message: 'Administrative requests require verified client header credentials.',
        },
      });
      return;
    }
  }
  next();
}
