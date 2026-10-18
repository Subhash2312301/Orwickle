import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

export const authRouter = Router();

// Public Authentication Endpoints
authRouter.post('/signup', (req, res, next) => authController.signup(req, res, next));
authRouter.post('/verify-email', (req, res, next) => authController.verifyEmail(req, res, next));
authRouter.post('/resend-verification', (req, res, next) => authController.resendVerification(req, res, next));
authRouter.post('/login', (req, res, next) => authController.login(req, res, next));
authRouter.post('/login/verify-otp', (req, res, next) => authController.verifyLoginOtp(req, res, next));
authRouter.post('/refresh', (req, res, next) => authController.refresh(req, res, next));
authRouter.post('/forgot-password', (req, res, next) => authController.forgotPassword(req, res, next));
authRouter.post('/reset-password', (req, res, next) => authController.resetPassword(req, res, next));

// Authenticated Session Endpoints
authRouter.post('/logout', requireAuth, (req, res, next) => authController.logout(req, res, next));
authRouter.post('/logout-all', requireAuth, (req, res, next) => authController.logoutAll(req, res, next));
