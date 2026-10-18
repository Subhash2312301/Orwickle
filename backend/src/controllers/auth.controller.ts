import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { env } from '../config/env';
import {
  hashPassword,
  verifyPassword,
  verifyDummyHash,
  checkAndRehashPassword,
} from '../utils/dummy-hash';
import { validatePassword } from '../utils/passwords';
import { rateLimiter } from '../utils/rate-limiter';
import { otpService } from '../services/otp.service';
import { mailerService } from '../services/mailer.service';
import { auditService } from '../services/audit.service';
import {
  signAccessToken,
  generateOpaqueToken,
  hashOpaqueToken,
} from '../utils/tokens';
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  LockedError,
  TooManyRequestsError,
} from '../errors/app-error';

// ── Validation Schemas ────────────────────────────────────────────────────────

const signupSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required'),
  full_name: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  role: z.enum(['student', 'investor', 'buyer'], {
    errorMap: () => ({ message: "Role must be 'student', 'investor', or 'buyer'" }),
  }),
});

const verifyEmailSchema = z.object({
  email: z.string().email(),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be a 6-digit number'),
  password: z.string().min(1, 'Password is required for anti-pre-hijacking verification'),
});

const resendVerificationSchema = z.object({
  email: z.string().email(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  device_label: z.string().max(100).optional(),
});

const verifyLoginOtpSchema = z.object({
  login_ticket: z.string().uuid('Invalid login ticket format'),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be a 6-digit number'),
  device_label: z.string().max(100).optional(),
});

const refreshSchema = z.object({
  refresh_token: z.string().optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  new_password: z.string().min(1, 'New password is required'),
});

const updateProfileSchema = z.object({
  display_name: z.string().min(2).max(100).optional(),
  phone: z.string().max(32).optional(),
  bio: z.string().max(1000).optional(),
  avatar_url: z.string().url().max(500).optional(),
  role_data: z.record(z.any()).optional(),
});

// ── Cookie Helpers ────────────────────────────────────────────────────────────

function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
}

function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/v1/auth',
  });
}

function getUserAgent(req: Request): string | null {
  const ua = req.headers['user-agent'];
  if (Array.isArray(ua)) return ua[0] || null;
  return ua || null;
}

// ── Auth Controller ───────────────────────────────────────────────────────────

export class AuthController {
  /**
   * POST /api/v1/auth/signup
   * Handles user registration with pending account replacement and anti-enumeration.
   */
  public async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = signupSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.errors[0].message, 'VALIDATION_ERROR');
      }

      const { email, password, full_name, role } = parsed.data;
      const normalizedEmail = email.toLowerCase().trim();
      const ip = (req.ip || req.socket.remoteAddress || 'unknown') as string;

      // 1. Pre-Argon2 Rate Limiting (ADR-003)
      if (!rateLimiter.check(`signup:ip:${ip}`, 15, 60 * 1000)) {
        throw new TooManyRequestsError('ERROR — Rate limit exceeded for IP. Please try again shortly.');
      }
      if (!rateLimiter.check(`signup:email:${normalizedEmail}`, 5, 3600 * 1000)) {
        throw new TooManyRequestsError('ERROR — Registration attempts exceeded for this email address.');
      }

      // 2. Password Complexity Check (ADR-010)
      validatePassword(password);

      // 3. Hash password via Semaphore (ADR-003)
      const passwordHash = await hashPassword(password);

      // 4. Query user state
      const existingRes = await pool.query(
        `SELECT id, status FROM users WHERE email = $1`,
        [normalizedEmail]
      );

      if (existingRes.rows.length > 0) {
        const existing = existingRes.rows[0];

        if (existing.status === 'pending_verification') {
          // Replace password hash & profile, issue fresh OTP (ADR-009)
          await pool.query(
            `UPDATE users SET password_hash = $1, role = $2 WHERE id = $3`,
            [passwordHash, role, existing.id]
          );
          await pool.query(
            `UPDATE profiles SET display_name = $1 WHERE user_id = $2`,
            [full_name, existing.id]
          );

          const { code } = await otpService.createOtp(existing.id, 'signup_verify');
          await mailerService.sendVerificationOtp(normalizedEmail, code);
        } else {
          // Verified or suspended: dispatch anti-enumeration alert (ADR-009)
          mailerService.sendAntiEnumerationAlert(normalizedEmail).catch((err) => {
            console.error('[Mailer Error] Failed to send anti-enumeration notice:', err);
          });
        }
      } else {
        // New user registration in pending_verification state
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          const userInsert = await client.query(
            `INSERT INTO users (email, password_hash, role, status)
             VALUES ($1, $2, $3, 'pending_verification')
             RETURNING id`,
            [normalizedEmail, passwordHash, role]
          );
          const userId = userInsert.rows[0].id;

          await client.query(
            `INSERT INTO profiles (user_id, display_name)
             VALUES ($1, $2)`,
            [userId, full_name]
          );

          const { code } = await otpService.createOtp(userId, 'signup_verify', client);

          await client.query('COMMIT');

          await mailerService.sendVerificationOtp(normalizedEmail, code);
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      }

      // Fixed HTTP 200 OK constant response (ADR-009)
      res.status(200).json({
        success: true,
        message: 'Registration initiated. If this address is not already registered, an authorization code has been dispatched to your email.',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/auth/verify-email
   * Requires both OTP code and account password to prevent pre-hijacking (ADR-009).
   */
  public async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = verifyEmailSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.errors[0].message, 'VALIDATION_ERROR');
      }

      const { email, otp, password } = parsed.data;
      const normalizedEmail = email.toLowerCase().trim();
      const ip = (req.ip || req.socket.remoteAddress || 'unknown') as string;

      if (!rateLimiter.check(`verify:ip:${ip}`, 20, 60 * 1000)) {
        throw new TooManyRequestsError('ERROR — Rate limit exceeded for verification attempts.');
      }

      const userRes = await pool.query(
        `SELECT id, password_hash, status FROM users WHERE email = $1`,
        [normalizedEmail]
      );

      if (userRes.rows.length === 0 || userRes.rows[0].status !== 'pending_verification') {
        throw new BadRequestError(
          'ERROR — No pending registration found for this email address.',
          'ACCOUNT_NOT_PENDING'
        );
      }

      const user = userRes.rows[0];

      // Anti-pre-hijacking password verification (ADR-009)
      const isPasswordValid = await verifyPassword(user.password_hash, password);
      if (!isPasswordValid) {
        throw new BadRequestError(
          'ERROR — Invalid password credentials for email verification.',
          'INVALID_CREDENTIALS'
        );
      }

      // Verify OTP code
      await otpService.verifyOtp(user.id, 'signup_verify', otp);

      // Activate user account
      await pool.query(
        `UPDATE users
         SET status = 'active', email_verified_at = NOW()
         WHERE id = $1`,
        [user.id]
      );

      await auditService.log({
        actor_id: user.id,
        target_type: 'user',
        target_id: user.id,
        action: 'auth.verify_email',
        ip,
        user_agent: getUserAgent(req),
      });

      res.status(200).json({
        success: true,
        message: 'Email successfully verified. Account is now active.',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/auth/resend-verification
   */
  public async resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = resendVerificationSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.errors[0].message, 'VALIDATION_ERROR');
      }

      const normalizedEmail = parsed.data.email.toLowerCase().trim();
      const ip = (req.ip || req.socket.remoteAddress || 'unknown') as string;

      // 60-second cooldown, max 5 sends per hour per email (ADR-004)
      if (!rateLimiter.check(`resend:cooldown:${normalizedEmail}`, 1, 60 * 1000)) {
        throw new TooManyRequestsError('ERROR — Please wait 60 seconds before requesting another verification code.');
      }
      if (!rateLimiter.check(`resend:hourly:${normalizedEmail}`, 5, 3600 * 1000)) {
        throw new TooManyRequestsError('ERROR — Verification code request limit exceeded for this hour.');
      }

      const userRes = await pool.query(
        `SELECT id, status FROM users WHERE email = $1`,
        [normalizedEmail]
      );

      if (userRes.rows.length > 0 && userRes.rows[0].status === 'pending_verification') {
        const { code } = await otpService.createOtp(userRes.rows[0].id, 'signup_verify');
        await mailerService.sendVerificationOtp(normalizedEmail, code);
      }

      res.status(200).json({
        success: true,
        message: 'If a pending registration exists, a fresh verification code has been dispatched.',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/auth/login
   * Password verification with escalating lockout backoff and OTP dispatch (ADR-007, ADR-008).
   */
  public async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.errors[0].message, 'VALIDATION_ERROR');
      }

      const { email, password, device_label } = parsed.data;
      const normalizedEmail = email.toLowerCase().trim();
      const ip = (req.ip || req.socket.remoteAddress || 'unknown') as string;
      const userAgent = getUserAgent(req);

      // 1. Pre-Argon2 IP Rate Limiting (ADR-003)
      if (!rateLimiter.check(`login:ip:${ip}`, 30, 60 * 1000)) {
        throw new TooManyRequestsError('ERROR — Rate limit exceeded for IP. Please try again later.');
      }

      // 2. Lockout State Check in auth_attempts (ADR-008)
      const attemptRes = await pool.query(
        `SELECT failed_count, lockout_count, locked_until
         FROM auth_attempts
         WHERE normalized_email = $1`,
        [normalizedEmail]
      );

      const attemptRow = attemptRes.rows[0];
      if (attemptRow && attemptRow.locked_until && new Date() < new Date(attemptRow.locked_until)) {
        const remainingMinutes = Math.ceil(
          (new Date(attemptRow.locked_until).getTime() - Date.now()) / (60 * 1000)
        );
        throw new LockedError(
          `ERROR — Account is temporarily locked due to repeated authentication failures. Try again in ${remainingMinutes} minute(s).`,
          'ACCOUNT_LOCKED',
          { locked_until: attemptRow.locked_until }
        );
      }

      // 3. User lookup
      const userRes = await pool.query(
        `SELECT id, email, password_hash, role, status FROM users WHERE email = $1`,
        [normalizedEmail]
      );

      if (userRes.rows.length === 0) {
        // Equal work dummy verification to prevent timing attack enumeration (ADR-012)
        await verifyDummyHash(password);
        await this.handleFailedAttempt(normalizedEmail);
        throw new UnauthorizedError('ERROR — Invalid email or password credentials.', 'INVALID_CREDENTIALS');
      }

      const user = userRes.rows[0];

      // 4. Password Verification via Argon2 Semaphore (ADR-003, ADR-012)
      const isPasswordValid = await verifyPassword(user.password_hash, password);
      if (!isPasswordValid) {
        await this.handleFailedAttempt(normalizedEmail);
        await auditService.log({
          actor_id: user.id,
          target_type: 'user',
          target_id: user.id,
          action: 'auth.login_failed',
          details: { reason: 'invalid_password' },
          ip,
          user_agent: userAgent,
        });
        throw new UnauthorizedError('ERROR — Invalid email or password credentials.', 'INVALID_CREDENTIALS');
      }

      // 5. Account Status Invariants
      if (user.status === 'suspended') {
        throw new ForbiddenError('ERROR — Account has been suspended by an administrator.', 'ACCOUNT_SUSPENDED');
      }
      if (user.status !== 'active') {
        throw new UnauthorizedError('ERROR — Account email address is pending verification.', 'ACCOUNT_UNVERIFIED');
      }

      // 6. Reset Lockout State on Successful Password Authentication (ADR-008)
      await pool.query(`DELETE FROM auth_attempts WHERE normalized_email = $1`, [normalizedEmail]);

      // 7. Transparent Rehash on Login (ADR-012)
      checkAndRehashPassword(user.password_hash, password)
        .then((newHash) => {
          if (newHash) {
            pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [newHash, user.id]);
          }
        })
        .catch((err) => console.error('[Argon2 Rehash Error]', err));

      // 8. Handle LOGIN_OTP_MODE (ADR-007)
      if (env.LOGIN_OTP_MODE === 'always') {
        const { id: loginTicket, code } = await otpService.createOtp(user.id, 'login_otp');
        await mailerService.sendLoginOtp(user.email, code);

        res.status(200).json({
          success: true,
          step: 'otp_required',
          login_ticket: loginTicket,
          message: 'Multi-factor login authorization code dispatched to your email.',
        });
        return;
      }

      // If LOGIN_OTP_MODE is 'off', establish session directly
      const sessionResult = await this.createSessionAndIssueTokens(
        user,
        device_label || 'Default Session',
        ip,
        userAgent,
        res
      );

      res.status(200).json({
        success: true,
        ...sessionResult,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/auth/login/verify-otp
   * Redeems the login_ticket (otps.id) to issue sessions and tokens (ADR-007).
   */
  public async verifyLoginOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = verifyLoginOtpSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.errors[0].message, 'VALIDATION_ERROR');
      }

      const { login_ticket, otp, device_label } = parsed.data;
      const ip = (req.ip || req.socket.remoteAddress || 'unknown') as string;
      const userAgent = getUserAgent(req);

      // 1. Verify Login Ticket
      const { userId } = await otpService.verifyLoginTicket(login_ticket, otp);

      // 2. Fetch User
      const userRes = await pool.query(
        `SELECT id, email, role, status FROM users WHERE id = $1`,
        [userId]
      );
      if (userRes.rows.length === 0 || userRes.rows[0].status !== 'active') {
        throw new UnauthorizedError('ERROR — Account inactive or not found.');
      }

      const user = userRes.rows[0];

      // 3. Create Session and Issue Tokens
      const sessionResult = await this.createSessionAndIssueTokens(
        user,
        device_label || 'Authorized Session',
        ip,
        userAgent,
        res
      );

      await auditService.log({
        actor_id: user.id,
        target_type: 'session',
        target_id: sessionResult.session_id,
        action: 'auth.login_success',
        ip,
        user_agent: userAgent,
      });

      res.status(200).json({
        success: true,
        ...sessionResult,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/auth/refresh
   * Token rotation with atomic SQL query and 10s grace window (ADR-002).
   */
  public async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = refreshSchema.safeParse(req.body);
      const rawToken =
        (parsed.success && parsed.data.refresh_token) ||
        (req.cookies && req.cookies.refreshToken);

      if (!rawToken) {
        throw new UnauthorizedError('ERROR — Refresh token required.', 'REFRESH_TOKEN_REQUIRED');
      }

      const tokenHash = hashOpaqueToken(rawToken);

      // 1. Query token record along with session & user status
      const resToken = await pool.query(
        `SELECT rt.id as token_id, rt.session_id, rt.consumed_at, rt.expires_at, rt.replaced_by_token_id,
                s.revoked_at as session_revoked_at, s.absolute_expires_at,
                u.id as user_id, u.role, u.status as user_status, u.email
         FROM refresh_tokens rt
         JOIN sessions s ON rt.session_id = s.id
         JOIN users u ON s.user_id = u.id
         WHERE rt.token_hash = $1`,
        [tokenHash]
      );

      if (resToken.rows.length === 0) {
        throw new UnauthorizedError('ERROR — Invalid refresh token credentials.', 'INVALID_REFRESH_TOKEN');
      }

      const tokenRow = resToken.rows[0];

      // 2. Validate Session & User Status
      if (tokenRow.session_revoked_at !== null) {
        throw new UnauthorizedError('ERROR — Session has been revoked.', 'SESSION_REVOKED');
      }
      if (new Date() >= new Date(tokenRow.absolute_expires_at)) {
        throw new UnauthorizedError('ERROR — Session has reached absolute expiration. Please re-authenticate.', 'SESSION_EXPIRED');
      }
      if (tokenRow.user_status !== 'active') {
        throw new ForbiddenError('ERROR — Account is inactive or suspended.', 'ACCOUNT_INACTIVE');
      }

      // 3. Handle Already-Consumed Token (Grace Window vs Replay Revocation) (ADR-002)
      if (tokenRow.consumed_at !== null) {
        const elapsedSeconds = (Date.now() - new Date(tokenRow.consumed_at).getTime()) / 1000;

        if (elapsedSeconds <= env.REFRESH_TOKEN_GRACE_SECONDS) {
          // Inside 10s grace window: network retry / client race.
          // Issue a fresh child token and keep the session alive.
          const newRawRefresh = generateOpaqueToken(48);
          const newRefreshHash = hashOpaqueToken(newRawRefresh);
          const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

          const childRes = await pool.query(
            `INSERT INTO refresh_tokens (session_id, token_hash, expires_at)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [tokenRow.session_id, newRefreshHash, refreshExpiresAt]
          );

          await pool.query(
            `UPDATE refresh_tokens SET replaced_by_token_id = $1 WHERE id = $2`,
            [childRes.rows[0].id, tokenRow.token_id]
          );

          const accessToken = signAccessToken({
            sub: tokenRow.user_id,
            role: tokenRow.role,
            email: tokenRow.email,
            sid: tokenRow.session_id,
          });

          setRefreshTokenCookie(res, newRawRefresh);

          res.status(200).json({
            success: true,
            access_token: accessToken,
            refresh_token: newRawRefresh,
          });
          return;
        } else {
          // Past 10s grace window: potential token theft / replay attack!
          // Revoke entire session immediately (ADR-002)
          await pool.query(`UPDATE sessions SET revoked_at = NOW() WHERE id = $1`, [tokenRow.session_id]);

          await auditService.log({
            actor_id: tokenRow.user_id,
            target_type: 'session',
            target_id: tokenRow.session_id,
            action: 'security.refresh_reuse_detected',
            details: {
              replayed_token_id: tokenRow.token_id,
              elapsed_seconds: elapsedSeconds,
            },
            ip: (req.ip || req.socket.remoteAddress || 'unknown') as string,
            user_agent: getUserAgent(req),
          });

          clearRefreshTokenCookie(res);
          throw new UnauthorizedError(
            'ERROR — Refresh token replayed past grace window. Session revoked for security.',
            'TOKEN_REPLAY_REVOKED'
          );
        }
      }

      // 4. Token Expiration Check
      if (new Date() >= new Date(tokenRow.expires_at)) {
        throw new UnauthorizedError('ERROR — Refresh token has expired. Please re-authenticate.', 'REFRESH_TOKEN_EXPIRED');
      }

      // 5. Atomic Consumption (ADR-002)
      const consumeRes = await pool.query(
        `UPDATE refresh_tokens
         SET consumed_at = NOW()
         WHERE id = $1 AND consumed_at IS NULL
         RETURNING id`,
        [tokenRow.token_id]
      );

      if (consumeRes.rows.length === 0) {
        // Concurrency race: handle through grace retry on next call
        throw new UnauthorizedError('ERROR — Refresh conflict occurred. Please retry.', 'REFRESH_RACE');
      }

      // 6. Issue Child Refresh Token
      const newRawRefresh = generateOpaqueToken(48);
      const newRefreshHash = hashOpaqueToken(newRawRefresh);
      const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const childRes = await pool.query(
        `INSERT INTO refresh_tokens (session_id, token_hash, expires_at)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [tokenRow.session_id, newRefreshHash, refreshExpiresAt]
      );

      await pool.query(
        `UPDATE refresh_tokens SET replaced_by_token_id = $1 WHERE id = $2`,
        [childRes.rows[0].id, tokenRow.token_id]
      );

      // 7. Issue Fresh Access JWT (stable sid!)
      const accessToken = signAccessToken({
        sub: tokenRow.user_id,
        role: tokenRow.role,
        email: tokenRow.email,
        sid: tokenRow.session_id,
      });

      setRefreshTokenCookie(res, newRawRefresh);

      res.status(200).json({
        success: true,
        access_token: accessToken,
        refresh_token: newRawRefresh,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/auth/logout
   * Revokes current session (ADR-002).
   */
  public async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user) {
        await pool.query(`UPDATE sessions SET revoked_at = NOW() WHERE id = $1`, [req.user.sid]);
        await auditService.log({
          actor_id: req.user.id,
          target_type: 'session',
          target_id: req.user.sid,
          action: 'auth.logout',
          ip: (req.ip || req.socket.remoteAddress || 'unknown') as string,
          user_agent: getUserAgent(req),
        });
      }

      clearRefreshTokenCookie(res);
      res.status(200).json({
        success: true,
        message: 'Session successfully terminated.',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/auth/logout-all
   * Revokes all active sessions for current user (ADR-002).
   */
  public async logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user) {
        await pool.query(
          `UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
          [req.user.id]
        );
        await auditService.log({
          actor_id: req.user.id,
          target_type: 'user',
          target_id: req.user.id,
          action: 'auth.logout_all',
          ip: (req.ip || req.socket.remoteAddress || 'unknown') as string,
          user_agent: getUserAgent(req),
        });
      }

      clearRefreshTokenCookie(res);
      res.status(200).json({
        success: true,
        message: 'All active sessions have been terminated.',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/auth/forgot-password
   * Constant response, NO Argon2, single-use token in password_reset_tokens (ADR-003).
   */
  public async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = forgotPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.errors[0].message, 'VALIDATION_ERROR');
      }

      const normalizedEmail = parsed.data.email.toLowerCase().trim();
      const ip = (req.ip || req.socket.remoteAddress || 'unknown') as string;

      // Rate limit
      if (!rateLimiter.check(`forgot:ip:${ip}`, 10, 60 * 1000)) {
        throw new TooManyRequestsError('ERROR — Rate limit exceeded for password recovery.');
      }
      if (!rateLimiter.check(`forgot:email:${normalizedEmail}`, 5, 3600 * 1000)) {
        throw new TooManyRequestsError('ERROR — Password recovery limit exceeded for this email address.');
      }

      const userRes = await pool.query(
        `SELECT id, email, status FROM users WHERE email = $1`,
        [normalizedEmail]
      );

      if (userRes.rows.length > 0 && userRes.rows[0].status !== 'suspended') {
        const user = userRes.rows[0];

        // 1. Consume any existing active reset tokens
        await pool.query(
          `UPDATE password_reset_tokens
           SET consumed_at = NOW()
           WHERE user_id = $1 AND consumed_at IS NULL`,
          [user.id]
        );

        // 2. Generate and store fresh single-use reset token
        const rawToken = generateOpaqueToken(32);
        const tokenHash = hashOpaqueToken(rawToken);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await pool.query(
          `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
           VALUES ($1, $2, $3)`,
          [user.id, tokenHash, expiresAt]
        );

        // 3. Dispatch email asynchronously (ADR-003)
        mailerService.sendPasswordReset(user.email, rawToken).catch((err) => {
          console.error('[Mailer Error] Failed to send password reset:', err);
        });
      }

      // Constant response regardless of account existence (ADR-003)
      res.status(200).json({
        success: true,
        message: 'If this address is registered, instructions have been dispatched to your email.',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/auth/reset-password
   * Single-use atomic consumption, updates password, clears lockout, revokes all sessions (ADR-003, ADR-008).
   */
  public async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = resetPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.errors[0].message, 'VALIDATION_ERROR');
      }

      const { token, new_password } = parsed.data;

      // 1. Validate password policy
      validatePassword(new_password);

      // 2. Atomic single-use token consumption
      const tokenHash = hashOpaqueToken(token);
      const tokenRes = await pool.query(
        `UPDATE password_reset_tokens
         SET consumed_at = NOW()
         WHERE token_hash = $1 AND consumed_at IS NULL AND expires_at > NOW()
         RETURNING user_id`,
        [tokenHash]
      );

      if (tokenRes.rows.length === 0) {
        throw new BadRequestError(
          'ERROR — Invalid or expired password reset authorization token.',
          'INVALID_RESET_TOKEN'
        );
      }

      const userId = tokenRes.rows[0].user_id;

      // 3. Hash new password via semaphore
      const newHash = await hashPassword(new_password);

      // 4. Update user password
      const userUpdateRes = await pool.query(
        `UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING email`,
        [newHash, userId]
      );
      const userEmail = userUpdateRes.rows[0]?.email;

      // 5. Clear active lockout for email (ADR-008)
      if (userEmail) {
        await pool.query(`DELETE FROM auth_attempts WHERE normalized_email = $1`, [userEmail.toLowerCase()]);
      }

      // 6. Revoke all active sessions for the user
      await pool.query(`UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1`, [userId]);

      // 7. Audit log
      await auditService.log({
        actor_id: userId,
        target_type: 'user',
        target_id: userId,
        action: 'auth.password_reset',
        ip: (req.ip || req.socket.remoteAddress || 'unknown') as string,
        user_agent: getUserAgent(req),
      });

      res.status(200).json({
        success: true,
        message: 'Password updated successfully. All active sessions have been revoked.',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/me
   */
  public async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();

      const userRes = await pool.query(
        `SELECT u.id, u.email, u.role, u.status, u.email_verified_at, u.created_at,
                p.display_name, p.phone, p.bio, p.avatar_url, p.role_data
         FROM users u
         LEFT JOIN profiles p ON u.id = p.user_id
         WHERE u.id = $1`,
        [req.user.id]
      );

      if (userRes.rows.length === 0) throw new NotFoundError('User profile not found.');

      const row = userRes.rows[0];

      res.status(200).json({
        success: true,
        data: {
          id: row.id,
          email: row.email,
          role: row.role,
          status: row.status,
          email_verified_at: row.email_verified_at,
          created_at: row.created_at,
          profile: {
            display_name: row.display_name,
            phone: row.phone,
            bio: row.bio,
            avatar_url: row.avatar_url,
            role_data: row.role_data,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/me/profile
   */
  public async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();

      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.errors[0].message, 'VALIDATION_ERROR');
      }

      const { display_name, phone, bio, avatar_url, role_data } = parsed.data;

      const updateRes = await pool.query(
        `UPDATE profiles
         SET display_name = COALESCE($1, display_name),
             phone = COALESCE($2, phone),
             bio = COALESCE($3, bio),
             avatar_url = COALESCE($4, avatar_url),
             role_data = COALESCE($5, role_data)
         WHERE user_id = $6
         RETURNING display_name, phone, bio, avatar_url, role_data, updated_at`,
        [
          display_name || null,
          phone || null,
          bio || null,
          avatar_url || null,
          role_data ? JSON.stringify(role_data) : null,
          req.user.id,
        ]
      );

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully.',
        data: updateRes.rows[0],
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/me/sessions
   */
  public async getSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();

      const sessionRes = await pool.query(
        `SELECT id, device_label, ip, user_agent, created_at, last_used_at, absolute_expires_at
         FROM sessions
         WHERE user_id = $1 AND revoked_at IS NULL AND absolute_expires_at > NOW()
         ORDER BY last_used_at DESC`,
        [req.user.id]
      );

      const sessions = sessionRes.rows.map((s) => ({
        ...s,
        is_current: s.id === req.user?.sid,
      }));

      res.status(200).json({
        success: true,
        data: sessions,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/me/sessions/:id
   */
  public async revokeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const sessionId = req.params.id;

      const updateRes = await pool.query(
        `UPDATE sessions
         SET revoked_at = NOW()
         WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL
         RETURNING id`,
        [sessionId, req.user.id]
      );

      if (updateRes.rows.length === 0) {
        throw new NotFoundError('Session record not found or already revoked.');
      }

      res.status(200).json({
        success: true,
        message: 'Session revoked successfully.',
      });
    } catch (err) {
      next(err);
    }
  }

  // ── Internal Helpers ────────────────────────────────────────────────────────

  private async createSessionAndIssueTokens(
    user: { id: string; email: string; role: string },
    deviceLabel: string,
    ip: string,
    userAgent: string | null,
    res: Response
  ): Promise<{
    access_token: string;
    refresh_token: string;
    session_id: string;
    user: { id: string; email: string; role: string };
  }> {
    // 1. Create Session
    const sessionRes = await pool.query(
      `INSERT INTO sessions (user_id, device_label, ip, user_agent, absolute_expires_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '90 days')
       RETURNING id`,
      [user.id, deviceLabel, ip, userAgent]
    );
    const sessionId = sessionRes.rows[0].id;

    // 2. Issue Refresh Token
    const rawRefresh = generateOpaqueToken(48);
    const refreshHash = hashOpaqueToken(rawRefresh);
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO refresh_tokens (session_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [sessionId, refreshHash, refreshExpiresAt]
    );

    // 3. Issue Access JWT (stable sid)
    const accessToken = signAccessToken({
      sub: user.id,
      role: user.role,
      email: user.email,
      sid: sessionId,
    });

    setRefreshTokenCookie(res, rawRefresh);

    return {
      access_token: accessToken,
      refresh_token: rawRefresh,
      session_id: sessionId,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  private async handleFailedAttempt(normalizedEmail: string): Promise<void> {
    const threshold = env.ACCOUNT_LOCKOUT_THRESHOLD; // 5

    const res = await pool.query(
      `SELECT failed_count, lockout_count
       FROM auth_attempts
       WHERE normalized_email = $1`,
      [normalizedEmail]
    );

    if (res.rows.length === 0) {
      await pool.query(
        `INSERT INTO auth_attempts (normalized_email, failed_count, last_attempt_at)
         VALUES ($1, 1, NOW())`,
        [normalizedEmail]
      );
      return;
    }

    const currentAttempts = res.rows[0].failed_count + 1;
    let lockoutCount = res.rows[0].lockout_count;
    let lockedUntil: Date | null = null;

    if (currentAttempts >= threshold) {
      lockoutCount += 1;
      // Escalating backoff: 1st=15m, 2nd=30m, 3rd+=60m (ADR-008)
      let backoffMinutes = 15;
      if (lockoutCount === 2) backoffMinutes = 30;
      else if (lockoutCount >= 3) backoffMinutes = 60;

      lockedUntil = new Date(Date.now() + backoffMinutes * 60 * 1000);

      await pool.query(
        `UPDATE auth_attempts
         SET failed_count = $1,
             lockout_count = $2,
             locked_until = $3,
             last_attempt_at = NOW()
         WHERE normalized_email = $4`,
        [currentAttempts, lockoutCount, lockedUntil, normalizedEmail]
      );
    } else {
      await pool.query(
        `UPDATE auth_attempts
         SET failed_count = $1,
             last_attempt_at = NOW()
         WHERE normalized_email = $2`,
        [currentAttempts, normalizedEmail]
      );
    }
  }
}

export const authController = new AuthController();
