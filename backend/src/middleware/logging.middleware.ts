import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  if (env.NODE_ENV === 'test') {
    return next();
  }

  const start = Date.now();
  const { method, originalUrl, ip } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    console.log(
      `[HTTP] ${method} ${originalUrl} ${statusCode} - ${duration}ms (IP: ${ip})`
    );
  });

  next();
}
