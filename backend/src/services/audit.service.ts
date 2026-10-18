import { PoolClient } from 'pg';
import { pool } from '../db/pool';

export interface AuditLogEntry {
  actor_id?: string | null;
  target_type: string;
  target_id?: string | null;
  action: string;
  details?: Record<string, any>;
  ip?: string | null;
  user_agent?: string | null;
}

export class AuditService {
  /**
   * Records an immutable entry in the audit_logs ledger (ADR-006, ADR-021)
   */
  public async log(entry: AuditLogEntry, client?: PoolClient): Promise<void> {
    const db = client || pool;
    try {
      await db.query(
        `INSERT INTO audit_logs (actor_id, target_type, target_id, action, details, ip, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          entry.actor_id || null,
          entry.target_type,
          entry.target_id || null,
          entry.action,
          JSON.stringify(entry.details || {}),
          entry.ip || null,
          entry.user_agent || null,
        ]
      );
    } catch (err) {
      console.error('[AuditService Error] Failed to persist audit log entry:', err);
      // Non-blocking in non-critical paths
    }
  }
}

export const auditService = new AuditService();
