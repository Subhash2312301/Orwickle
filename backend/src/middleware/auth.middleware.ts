import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, AccessTokenPayload } from '../utils/tokens';
import { pool } from '../db/pool';
import { UnauthorizedError, ForbiddenError } from '../errors/app-error';

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  let token: string | undefined;

  // 1. Check Bearer token in Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.cookies && req.cookies.accessToken) {
    // 2. Fallback to web cookie
    token = req.cookies.accessToken;
  }

  if (!token) {
    next(new UnauthorizedError('ERROR — Authentication required. Please provide a valid Bearer token.'));
    return;
  }

  let payload: AccessTokenPayload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    next(err);
    return;
  }

  try {
    // 3. Database verification of session state and user active status (ADR-002, ADR-006)
    const result = await pool.query(
      `SELECT s.id as session_id, s.revoked_at, s.absolute_expires_at,
              u.id as user_id, u.role, u.status, u.email
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = $1`,
      [payload.sid]
    );

    if (result.rows.length === 0) {
      next(new UnauthorizedError('ERROR — Associated session record not found.'));
      return;
    }

    const row = result.rows[0];

    // Check revocation
    if (row.revoked_at !== null) {
      next(new UnauthorizedError('ERROR — Session has been revoked. Please re-authenticate.'));
      return;
    }

    // Check absolute expiration (default 90 days, fixed at session creation)
    if (new Date() >= new Date(row.absolute_expires_at)) {
      next(new UnauthorizedError('ERROR — Session lifetime expired. Mandatory re-authentication required.'));
      return;
    }

    // Check user account status
    if (row.status === 'suspended') {
      next(new ForbiddenError('ERROR — Account has been suspended by an administrator.'));
      return;
    }

    if (row.status !== 'active') {
      next(new UnauthorizedError('ERROR — Account email address is pending verification.'));
      return;
    }

    // Attach authenticated user to request context
    req.user = {
      id: row.user_id,
      role: row.role,
      email: row.email,
      sid: row.session_id,
    };

    // Asynchronously update session's last_used_at without delaying response
    pool
      .query(`UPDATE sessions SET last_used_at = NOW() WHERE id = $1`, [row.session_id])
      .catch((err) => console.error('[Session Update Error] Failed to update last_used_at:', err));

    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...allowedRoles: Array<'student' | 'investor' | 'buyer' | 'admin'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('ERROR — Authentication required.'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(
        new ForbiddenError(
          `ERROR — Access forbidden. Role '${req.user.role}' is not authorized for this resource.`
        )
      );
      return;
    }

    next();
  };
}
