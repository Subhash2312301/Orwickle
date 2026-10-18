import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

export const adminRouter = Router();

// Guard all admin routes with authentication and role='admin'
adminRouter.use(requireAuth);
adminRouter.use(requireRole('admin'));

// Admin Dashboard Endpoints
adminRouter.get('/stats', (req, res, next) => adminController.getStats(req, res, next));
adminRouter.get('/users', (req, res, next) => adminController.getUsers(req, res, next));
adminRouter.patch('/users/:id/status', (req, res, next) => adminController.updateUserStatus(req, res, next));
adminRouter.get('/sessions', (req, res, next) => adminController.getSessions(req, res, next));
adminRouter.delete('/sessions/:id', (req, res, next) => adminController.revokeSession(req, res, next));
adminRouter.get('/audit', (req, res, next) => adminController.getAuditLogs(req, res, next));
