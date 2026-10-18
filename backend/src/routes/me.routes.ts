import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

export const meRouter = Router();

meRouter.use(requireAuth);

meRouter.get('/', (req, res, next) => authController.getProfile(req, res, next));
meRouter.patch('/profile', (req, res, next) => authController.updateProfile(req, res, next));
meRouter.get('/sessions', (req, res, next) => authController.getSessions(req, res, next));
meRouter.delete('/sessions/:id', (req, res, next) => authController.revokeSession(req, res, next));
