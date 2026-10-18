import crypto from 'crypto';
import { PoolClient } from 'pg';
import { pool } from '../db/pool';
import { env } from '../config/env';
import { BadRequestError } from '../errors/app-error';

export type OtpPurpose = 'signup_verify' | 'login_otp' | 'password_reset';

export interface OtpRecord {
  id: string;
  user_id: string;
  purpose: OtpPurpose;
  code_hash: string;
  attempts: number;
  expires_at: Date;
  consumed_at: Date | null;
  created_at: Date;
}

export class OtpService {
  /**
   * Generates HMAC-SHA256 hash strictly bound to code, purpose, and user_id (ADR-004)
   */
  public hashOtp(code: string, purpose: OtpPurpose, userId: string): string {
    const payload = `${code}:${purpose}:${userId}`;
    return crypto.createHmac('sha256', env.OTP_PEPPER).update(payload).digest('hex');
  }

  /**
   * Creates and persists a fresh 6-digit OTP code.
   * Invalidates any existing unconsumed OTP for the same (user_id, purpose) pair first.
   */
  public async createOtp(
    userId: string,
    purpose: OtpPurpose,
    client?: PoolClient
  ): Promise<{ id: string; code: string; expiresAt: Date }> {
    const db = client || pool;
    const code = crypto.randomInt(100000, 1000000).toString();
    const codeHash = this.hashOtp(code, purpose, userId);

    const ttlMinutes = purpose === 'login_otp' ? 5 : 10;
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    // 1. Invalidate any existing active OTP for this (userId, purpose)
    await db.query(
      `UPDATE otps
       SET consumed_at = NOW()
       WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL`,
      [userId, purpose]
    );

    // 2. Insert new OTP record
    const insertRes = await db.query(
      `INSERT INTO otps (user_id, purpose, code_hash, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, expires_at`,
      [userId, purpose, codeHash, expiresAt]
    );

    return {
      id: insertRes.rows[0].id,
      code,
      expiresAt: insertRes.rows[0].expires_at,
    };
  }

  /**
   * Verifies an OTP code for a given user and purpose.
   * Performs timing-safe comparison, tracks failed attempts, and atomically consumes the token on success.
   */
  public async verifyOtp(
    userId: string,
    purpose: OtpPurpose,
    candidateCode: string,
    client?: PoolClient
  ): Promise<boolean> {
    const db = client || pool;

    const res = await db.query(
      `SELECT id, code_hash, attempts_count, expires_at
       FROM otps
       WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, purpose]
    );

    if (res.rows.length === 0) {
      throw new BadRequestError(
        'ERROR — No active authorization code found for this user and purpose.',
        'OTP_NOT_FOUND'
      );
    }

    const otp = res.rows[0];

    // Check expiration
    if (new Date() > new Date(otp.expires_at)) {
      await db.query('UPDATE otps SET consumed_at = NOW() WHERE id = $1', [otp.id]);
      throw new BadRequestError(
        'ERROR — Authorization code has expired. Please request a new code.',
        'OTP_EXPIRED'
      );
    }

    // Check attempt exhaustion
    if (otp.attempts_count >= env.MAX_OTP_ATTEMPTS) {
      await db.query('UPDATE otps SET consumed_at = NOW() WHERE id = $1', [otp.id]);
      throw new BadRequestError(
        'ERROR — Maximum authorization attempts exceeded. Code has been invalidated.',
        'OTP_MAX_ATTEMPTS_EXCEEDED'
      );
    }

    // Timing-safe verification
    const expectedHash = otp.code_hash;
    const candidateHash = this.hashOtp(candidateCode, purpose, userId);

    const match =
      expectedHash.length === candidateHash.length &&
      crypto.timingSafeEqual(Buffer.from(expectedHash, 'hex'), Buffer.from(candidateHash, 'hex'));

    if (!match) {
      const newAttempts = otp.attempts_count + 1;
      if (newAttempts >= env.MAX_OTP_ATTEMPTS) {
        await db.query(
          `UPDATE otps SET attempts_count = $1, consumed_at = NOW() WHERE id = $2`,
          [newAttempts, otp.id]
        );
        throw new BadRequestError(
          'ERROR — Maximum authorization attempts exceeded. Code has been invalidated.',
          'OTP_MAX_ATTEMPTS_EXCEEDED'
        );
      } else {
        await db.query(`UPDATE otps SET attempts_count = $1 WHERE id = $2`, [newAttempts, otp.id]);
        throw new BadRequestError(
          `ERROR — Invalid authorization code. ${env.MAX_OTP_ATTEMPTS - newAttempts} attempts remaining.`,
          'OTP_INVALID'
        );
      }
    }

    // Success: mark consumed
    await db.query(`UPDATE otps SET consumed_at = NOW() WHERE id = $1`, [otp.id]);
    return true;
  }

  /**
   * Verifies a login ticket (which is the otps.id UUID for purpose='login_otp') (ADR-007)
   */
  public async verifyLoginTicket(
    loginTicketId: string,
    candidateCode: string,
    client?: PoolClient
  ): Promise<{ userId: string }> {
    const db = client || pool;

    const res = await db.query(
      `SELECT id, user_id, purpose, code_hash, attempts_count, expires_at
       FROM otps
       WHERE id = $1 AND purpose = 'login_otp' AND consumed_at IS NULL`,
      [loginTicketId]
    );

    if (res.rows.length === 0) {
      throw new BadRequestError(
        'ERROR — Invalid or expired login challenge ticket.',
        'LOGIN_TICKET_INVALID'
      );
    }

    const otp = res.rows[0];

    if (new Date() > new Date(otp.expires_at)) {
      await db.query('UPDATE otps SET consumed_at = NOW() WHERE id = $1', [otp.id]);
      throw new BadRequestError(
        'ERROR — Login challenge has expired. Please re-authenticate.',
        'LOGIN_TICKET_EXPIRED'
      );
    }

    if (otp.attempts_count >= env.MAX_OTP_ATTEMPTS) {
      await db.query('UPDATE otps SET consumed_at = NOW() WHERE id = $1', [otp.id]);
      throw new BadRequestError(
        'ERROR — Maximum authorization attempts exceeded. Login challenge invalidated.',
        'OTP_MAX_ATTEMPTS_EXCEEDED'
      );
    }

    const expectedHash = otp.code_hash;
    const candidateHash = this.hashOtp(candidateCode, 'login_otp', otp.user_id);

    const match =
      expectedHash.length === candidateHash.length &&
      crypto.timingSafeEqual(Buffer.from(expectedHash, 'hex'), Buffer.from(candidateHash, 'hex'));

    if (!match) {
      const newAttempts = otp.attempts_count + 1;
      if (newAttempts >= env.MAX_OTP_ATTEMPTS) {
        await db.query(
          `UPDATE otps SET attempts_count = $1, consumed_at = NOW() WHERE id = $2`,
          [newAttempts, otp.id]
        );
        throw new BadRequestError(
          'ERROR — Maximum authorization attempts exceeded. Login challenge invalidated.',
          'OTP_MAX_ATTEMPTS_EXCEEDED'
        );
      } else {
        await db.query(`UPDATE otps SET attempts_count = $1 WHERE id = $2`, [newAttempts, otp.id]);
        throw new BadRequestError(
          `ERROR — Invalid login authorization code. ${env.MAX_OTP_ATTEMPTS - newAttempts} attempts remaining.`,
          'OTP_INVALID'
        );
      }
    }

    // Success: mark consumed
    await db.query(`UPDATE otps SET consumed_at = NOW() WHERE id = $1`, [otp.id]);
    return { userId: otp.user_id };
  }
}

export const otpService = new OtpService();
