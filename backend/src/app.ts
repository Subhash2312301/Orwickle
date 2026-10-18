import express, { Express, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { helmetMiddleware, corsMiddleware, adminHeaderCheck } from './middleware/security.middleware';
import { requestLogger } from './middleware/logging.middleware';
import { errorHandler } from './middleware/error.middleware';
import { healthRouter } from './routes/health.routes';
import { NotFoundError } from './errors/app-error';

export function createApp(): Express {
  const app = express();

  // 1. Basic Security & Headers
  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(adminHeaderCheck);

  // 2. Request Parsing
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser());

  // 3. Request Logging
  app.use(requestLogger);

  // 4. API Endpoints
  app.use('/api', healthRouter);
  app.use('/', healthRouter); // Base health check aliases

  // 5. 404 Route Catch-all
  app.use((req: Request, res: Response, next: NextFunction) => {
    next(new NotFoundError(`Endpoint ${req.method} ${req.originalUrl} does not exist.`));
  });

  // 6. Global Uniform Error Handler
  app.use(errorHandler);

  return app;
}
