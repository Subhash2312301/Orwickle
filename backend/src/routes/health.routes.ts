import { Router, Request, Response } from 'express';
import { checkDatabaseConnection } from '../db/pool';

const router = Router();

router.get('/health', async (req: Request, res: Response) => {
  const dbStatus = await checkDatabaseConnection();

  res.status(dbStatus.ok ? 200 : 503).json({
    status: dbStatus.ok ? 'healthy' : 'degraded',
    version: '1.0.0',
    service: 'orwickle-backend',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      connected: dbStatus.ok,
      latencyMs: dbStatus.latencyMs,
      error: dbStatus.error,
    },
  });
});

router.get('/health/live', (req: Request, res: Response) => {
  res.status(200).json({ status: 'alive' });
});

router.get('/health/ready', async (req: Request, res: Response) => {
  const dbStatus = await checkDatabaseConnection();
  if (!dbStatus.ok) {
    res.status(503).json({ status: 'not_ready', database: dbStatus });
    return;
  }
  res.status(200).json({ status: 'ready', database: dbStatus });
});

export const healthRouter = router;
