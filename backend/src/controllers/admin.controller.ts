import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { auditService } from '../services/audit.service';
import { BadRequestError, NotFoundError, ForbiddenError } from '../errors/app-error';

const updateUserStatusSchema = z.object({
  status: z.enum(['active', 'suspended'], {
    errorMap: () => ({ message: "Status must be 'active' or 'suspended'" }),
  }),
});

export class AdminController {
  /**
   * GET /api/v1/admin/stats
   * Aggregated system metrics for the Dealroom Dossier admin dashboard.
   */
  public async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const [roleCounts, statusCounts, sessionCount, auditCount] = await Promise.all([
        pool.query(`SELECT role, COUNT(*)::int as count FROM users GROUP BY role`),
        pool.query(`SELECT status, COUNT(*)::int as count FROM users GROUP BY status`),
        pool.query(
          `SELECT COUNT(*)::int as count FROM sessions WHERE revoked_at IS NULL AND absolute_expires_at > NOW()`
        ),
        pool.query(`SELECT COUNT(*)::int as count FROM audit_logs`),
      ]);

      const roles = { student: 0, investor: 0, buyer: 0, admin: 0 };
      for (const row of roleCounts.rows) {
        roles[row.role as keyof typeof roles] = row.count;
      }

      const statuses = { pending_verification: 0, active: 0, suspended: 0 };
      for (const row of statusCounts.rows) {
        statuses[row.status as keyof typeof statuses] = row.count;
      }

      res.status(200).json({
        success: true,
        data: {
          users_by_role: roles,
          users_by_status: statuses,
          active_sessions: sessionCount.rows[0]?.count || 0,
          total_audit_events: auditCount.rows[0]?.count || 0,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/admin/users
   * Paginated user directory with profile metadata and filtering.
   */
  public async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
      const offset = (page - 1) * limit;

      const roleFilter = req.query.role as string;
      const statusFilter = req.query.status as string;
      const search = (req.query.search as string)?.trim();

      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (roleFilter && ['student', 'investor', 'buyer', 'admin'].includes(roleFilter)) {
        conditions.push(`u.role = $${paramIndex++}`);
        params.push(roleFilter);
      }

      if (statusFilter && ['pending_verification', 'active', 'suspended'].includes(statusFilter)) {
        conditions.push(`u.status = $${paramIndex++}`);
        params.push(statusFilter);
      }

      if (search) {
        conditions.push(
          `(u.email ILIKE $${paramIndex} OR p.display_name ILIKE $${paramIndex})`
        );
        params.push(`%${search}%`);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const countQuery = `
        SELECT COUNT(*)::int as total
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
        ${whereClause}
      `;
      const countRes = await pool.query(countQuery, params);
      const total = countRes.rows[0]?.total || 0;

      const dataQuery = `
        SELECT u.id, u.email, u.role, u.status, u.email_verified_at, u.created_at,
               p.display_name, p.phone, p.avatar_url
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
        ${whereClause}
        ORDER BY u.created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      const dataRes = await pool.query(dataQuery, [...params, limit, offset]);

      res.status(200).json({
        success: true,
        data: dataRes.rows,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/admin/users/:id/status
   * Activate or suspend an account with audit logging and session invalidation.
   */
  public async updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetUserId = req.params.id;
      const parsed = updateUserStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.errors[0].message, 'VALIDATION_ERROR');
      }

      const { status } = parsed.data;

      // Invariant: Administrator cannot suspend their own account
      if (req.user && req.user.id === targetUserId && status === 'suspended') {
        throw new ForbiddenError('ERROR — Administrators cannot suspend their own credentials.');
      }

      const updateRes = await pool.query(
        `UPDATE users
         SET status = $1
         WHERE id = $2
         RETURNING id, email, role, status`,
        [status, targetUserId]
      );

      if (updateRes.rows.length === 0) {
        throw new NotFoundError('Target user account not found.');
      }

      // If suspended, revoke all active sessions immediately
      if (status === 'suspended') {
        await pool.query(
          `UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
          [targetUserId]
        );
      }

      await auditService.log({
        actor_id: req.user?.id || null,
        target_type: 'user',
        target_id: String(targetUserId),
        action: 'admin.update_user_status',
        details: { new_status: status },
        ip: (req.ip || req.socket.remoteAddress || 'unknown') as string,
        user_agent: (Array.isArray(req.headers['user-agent']) ? req.headers['user-agent'][0] : req.headers['user-agent']) || null,
      });

      res.status(200).json({
        success: true,
        message: `Account status updated to '${status}'.`,
        data: updateRes.rows[0],
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/admin/sessions
   * Real-time monitoring of all active sessions across the platform.
   */
  public async getSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionsRes = await pool.query(
        `SELECT s.id, s.user_id, s.device_label, s.ip, s.user_agent,
                s.created_at, s.last_used_at, s.absolute_expires_at,
                u.email, u.role
         FROM sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.revoked_at IS NULL AND s.absolute_expires_at > NOW()
         ORDER BY s.last_used_at DESC
         LIMIT 100`
      );

      res.status(200).json({
        success: true,
        data: sessionsRes.rows,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/admin/sessions/:id
   * Administrative termination of any active session.
   */
  public async revokeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.params.id;

      const sessionRes = await pool.query(
        `UPDATE sessions
         SET revoked_at = NOW()
         WHERE id = $1 AND revoked_at IS NULL
         RETURNING id, user_id`,
        [sessionId]
      );

      if (sessionRes.rows.length === 0) {
        throw new NotFoundError('Session record not found or already revoked.');
      }

      await auditService.log({
        actor_id: req.user?.id || null,
        target_type: 'session',
        target_id: String(sessionId),
        action: 'admin.revoke_session',
        details: { revoked_user_id: sessionRes.rows[0].user_id },
        ip: (req.ip || req.socket.remoteAddress || 'unknown') as string,
        user_agent: (Array.isArray(req.headers['user-agent']) ? req.headers['user-agent'][0] : req.headers['user-agent']) || null,
      });

      res.status(200).json({
        success: true,
        message: 'Session successfully revoked by administrator.',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/admin/audit
   * Immutable audit ledger viewer with pagination and filtering.
   */
  public async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
      const offset = (page - 1) * limit;

      const action = req.query.action as string;
      const targetType = req.query.target_type as string;

      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (action) {
        conditions.push(`a.action = $${paramIndex++}`);
        params.push(action);
      }

      if (targetType) {
        conditions.push(`a.target_type = $${paramIndex++}`);
        params.push(targetType);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const countQuery = `SELECT COUNT(*)::int as total FROM audit_logs a ${whereClause}`;
      const countRes = await pool.query(countQuery, params);
      const total = countRes.rows[0]?.total || 0;

      const dataQuery = `
        SELECT a.id, a.actor_id, a.target_type, a.target_id, a.action, a.details,
               a.ip, a.user_agent, a.created_at,
               u.email as actor_email
        FROM audit_logs a
        LEFT JOIN users u ON a.actor_id = u.id
        ${whereClause}
        ORDER BY a.created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      const dataRes = await pool.query(dataQuery, [...params, limit, offset]);

      res.status(200).json({
        success: true,
        data: dataRes.rows,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const adminController = new AdminController();
