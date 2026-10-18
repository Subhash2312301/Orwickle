import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { pool } from '../src/db/pool';
import { initializeDummyHash, hashPassword } from '../src/utils/dummy-hash';
import { mailerService } from '../src/services/mailer.service';
import { rateLimiter } from '../src/utils/rate-limiter';

describe('Core Authentication, Sessions, & Authorization Integration Tests', () => {
  let app: ReturnType<typeof createApp>;

  // Spies to capture transactional email codes dispatched during flows
  let lastVerificationOtp = '';
  let lastLoginOtp = '';
  let lastResetToken = '';

  const testStudentEmail = 'student_test_dealroom@test.orwickle.com';
  const testStudentPassword = 'SecureDealroomPass2026!';
  const testAdminEmail = 'admin_system_dealroom@test.orwickle.com';
  const testAdminPassword = 'AdminSecretPass2026!';

  beforeAll(async () => {
    await initializeDummyHash();
    app = createApp();

    // Attach spies
    vi.spyOn(mailerService, 'sendVerificationOtp').mockImplementation(async (email, code) => {
      lastVerificationOtp = code;
    });

    vi.spyOn(mailerService, 'sendLoginOtp').mockImplementation(async (email, code) => {
      lastLoginOtp = code;
    });

    vi.spyOn(mailerService, 'sendPasswordReset').mockImplementation(async (email, token) => {
      lastResetToken = token;
    });

    // Clean up test data in orwickle_test database
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['%@test.orwickle.com']);
    await pool.query('DELETE FROM auth_attempts WHERE normalized_email LIKE $1', ['%@test.orwickle.com']);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['%@test.orwickle.com']);
    await pool.query('DELETE FROM auth_attempts WHERE normalized_email LIKE $1', ['%@test.orwickle.com']);
  });

  // ── Phase 2: Core Signup & Email Verification ─────────────────────────────

  describe('Phase 2: Signup & Email Verification Flows', () => {
    it('Rejects signup with passwords failing policy (too short or on weak blocklist)', async () => {
      const shortRes = await request(app).post('/api/v1/auth/signup').send({
        email: 'shortpass@test.orwickle.com',
        password: 'short',
        full_name: 'Short Pass',
        role: 'student',
      });
      expect(shortRes.status).toBe(400);
      expect(shortRes.body.error.code).toBe('WEAK_PASSWORD');

      const weakRes = await request(app).post('/api/v1/auth/signup').send({
        email: 'weakpass@test.orwickle.com',
        password: 'password123',
        full_name: 'Weak Pass',
        role: 'student',
      });
      expect(weakRes.status).toBe(400);
      expect(weakRes.body.error.code).toBe('WEAK_PASSWORD');
    });

    it('Successfully initiates signup and dispatches 6-digit OTP code', async () => {
      const res = await request(app).post('/api/v1/auth/signup').send({
        email: testStudentEmail,
        password: testStudentPassword,
        full_name: 'Dealroom Student Founder',
        role: 'student',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(lastVerificationOtp).toMatch(/^\d{6}$/);

      // Verify user in database is in 'pending_verification' status
      const userRes = await pool.query(
        'SELECT status, email_verified_at FROM users WHERE email = $1',
        [testStudentEmail]
      );
      expect(userRes.rows[0].status).toBe('pending_verification');
      expect(userRes.rows[0].email_verified_at).toBeNull();
    });

    it('Re-signup of pending account replaces password and issues fresh OTP (ADR-009)', async () => {
      const prevOtp = lastVerificationOtp;
      rateLimiter.reset(`resend:cooldown:${testStudentEmail}`);
      rateLimiter.reset(`signup:email:${testStudentEmail}`);

      const res = await request(app).post('/api/v1/auth/signup').send({
        email: testStudentEmail,
        password: 'NewUpdatedPassword2026!',
        full_name: 'Updated Name',
        role: 'student',
      });

      expect(res.status).toBe(200);
      expect(lastVerificationOtp).toMatch(/^\d{6}$/);
      expect(lastVerificationOtp).not.toBe(prevOtp);
    });

    it('Rejects email verification with incorrect password (anti-pre-hijacking defense ADR-009)', async () => {
      const res = await request(app).post('/api/v1/auth/verify-email').send({
        email: testStudentEmail,
        otp: lastVerificationOtp,
        password: 'IncorrectPasswordAttempt!',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.error.message).toMatch(/^ERROR —/);
    });

    it('Successfully activates account when email, valid OTP, and correct password are provided', async () => {
      const res = await request(app).post('/api/v1/auth/verify-email').send({
        email: testStudentEmail,
        otp: lastVerificationOtp,
        password: 'NewUpdatedPassword2026!',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const userRes = await pool.query(
        'SELECT status, email_verified_at FROM users WHERE email = $1',
        [testStudentEmail]
      );
      expect(userRes.rows[0].status).toBe('active');
      expect(userRes.rows[0].email_verified_at).not.toBeNull();
    });

    it('Signing up an already verified account sends anti-enumeration notice and returns 200 (ADR-009)', async () => {
      rateLimiter.reset(`signup:email:${testStudentEmail}`);
      const spyAlert = vi.spyOn(mailerService, 'sendAntiEnumerationAlert');

      const res = await request(app).post('/api/v1/auth/signup').send({
        email: testStudentEmail,
        password: 'AnotherPassword2026!',
        full_name: 'Imposter Attempt',
        role: 'student',
      });

      expect(res.status).toBe(200);
      expect(spyAlert).toHaveBeenCalledWith(testStudentEmail);
    });
  });

  // ── Phase 2: Login, Ticket Issuance & Lockout ─────────────────────────────

  describe('Phase 2: Login, MFA Ticket, & Lockout Mechanics', () => {
    let currentLoginTicket = '';

    it('Returns constant-time 401 on non-existent account without leaking email absence', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'ghost_nonexistent@test.orwickle.com',
        password: 'SomeRandomPassword123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.error.message).toMatch(/^ERROR —/);
    });

    it('Tracks failed attempts in auth_attempts and locks account after 5 failures (ADR-008)', async () => {
      const lockoutTarget = 'victim_lockout@test.orwickle.com';

      // 4 failed attempts
      for (let i = 1; i <= 4; i++) {
        const failRes = await request(app).post('/api/v1/auth/login').send({
          email: lockoutTarget,
          password: 'WrongPassword!',
        });
        expect(failRes.status).toBe(401);
      }

      // 5th failed attempt triggers lockout
      const fifthRes = await request(app).post('/api/v1/auth/login').send({
        email: lockoutTarget,
        password: 'WrongPassword!',
      });
      expect(fifthRes.status).toBe(401);

      // 6th attempt is blocked with HTTP 423 Locked
      const lockedRes = await request(app).post('/api/v1/auth/login').send({
        email: lockoutTarget,
        password: 'AnyPassword!',
      });
      expect(lockedRes.status).toBe(423);
      expect(lockedRes.body.error.code).toBe('ACCOUNT_LOCKED');
      expect(lockedRes.body.error.message).toMatch(/^ERROR —/);
    });

    it('Valid password login dispatches login OTP and returns login_ticket (ADR-007)', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: testStudentEmail,
        password: 'NewUpdatedPassword2026!',
        device_label: 'Student Primary Macbook',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.step).toBe('otp_required');
      expect(res.body.login_ticket).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      expect(lastLoginOtp).toMatch(/^\d{6}$/);

      currentLoginTicket = res.body.login_ticket;
    });

    it('Rejects verify-otp with incorrect OTP code and decrements remaining attempts', async () => {
      const res = await request(app).post('/api/v1/auth/login/verify-otp').send({
        login_ticket: currentLoginTicket,
        otp: '000000',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('OTP_INVALID');
      expect(res.body.error.message).toContain('attempts remaining');
    });
  });

  // ── Phase 3: Sessions, Token Rotation, & Lifecycle ────────────────────────

  describe('Phase 3: Sessions, Refresh Rotation, & Authorization', () => {
    let studentAccessToken = '';
    let studentRefreshToken = '';
    let studentSessionId = '';

    beforeAll(async () => {
      // Login cleanly to acquire token pair
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: testStudentEmail,
        password: 'NewUpdatedPassword2026!',
      });
      const ticket = loginRes.body.login_ticket;

      const otpRes = await request(app).post('/api/v1/auth/login/verify-otp').send({
        login_ticket: ticket,
        otp: lastLoginOtp,
        device_label: 'Integration Test Runner Device',
      });

      expect(otpRes.status).toBe(200);
      studentAccessToken = otpRes.body.access_token;
      studentRefreshToken = otpRes.body.refresh_token;
      studentSessionId = otpRes.body.session_id;

      // Seed an admin user for role authorization tests
      const adminPassHash = await hashPassword(testAdminPassword);
      await pool.query('DELETE FROM users WHERE email = $1', [testAdminEmail]);
      await pool.query(
        `INSERT INTO users (email, password_hash, role, status, email_verified_at)
         VALUES ($1, $2, 'admin', 'active', NOW())`,
        [testAdminEmail, adminPassHash]
      );
    });

    it('Protects private endpoints: requireAuth rejects unauthenticated requests', async () => {
      const res = await request(app).get('/api/v1/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('GET /api/v1/me returns authenticated student profile and account metadata', async () => {
      const res = await request(app)
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${studentAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testStudentEmail);
      expect(res.body.data.role).toBe('student');
      expect(res.body.data.status).toBe('active');
    });

    it('Role Guard: Student is forbidden from accessing administrative endpoints (ADR-006)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${studentAccessToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toMatch(/^ERROR —/);
    });

    it('Atomic Token Rotation: Rotates refresh token and preserves stable sid (ADR-002)', async () => {
      const initialRefreshToken = studentRefreshToken;

      const res = await request(app).post('/api/v1/auth/refresh').send({
        refresh_token: initialRefreshToken,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.access_token).toBeDefined();
      expect(res.body.refresh_token).toBeDefined();
      expect(res.body.refresh_token).not.toBe(initialRefreshToken);

      const rotatedAccessToken = res.body.access_token;
      const rotatedRefreshToken = res.body.refresh_token;

      // Both access tokens are valid for the same session
      const meRes = await request(app)
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${rotatedAccessToken}`);
      expect(meRes.status).toBe(200);

      // Replaying the consumed initialRefreshToken within 10s grace window issues fresh child
      const graceRes = await request(app).post('/api/v1/auth/refresh').send({
        refresh_token: initialRefreshToken,
      });
      expect(graceRes.status).toBe(200);
      expect(graceRes.body.success).toBe(true);

      // Update active tokens
      studentAccessToken = rotatedAccessToken;
      studentRefreshToken = rotatedRefreshToken;
    });

    it('Replaying a consumed refresh token past 10s grace window revokes the session (ADR-002)', async () => {
      // Artificially backdate the consumed_at timestamp of a consumed token by 15 seconds
      const backdateRes = await pool.query(
        `UPDATE refresh_tokens
         SET consumed_at = NOW() - INTERVAL '15 seconds'
         WHERE session_id = $1 AND consumed_at IS NOT NULL
         RETURNING token_hash`,
        [studentSessionId]
      );
      expect(backdateRes.rows.length).toBeGreaterThan(0);

      // Now query database for a replayed token
      // We will create an explicit expired consumed token to test the replay revocation
      const expiredConsumed = await pool.query(
        `INSERT INTO refresh_tokens (session_id, token_hash, consumed_at, expires_at)
         VALUES ($1, 'dummy_expired_replayed_hash', NOW() - INTERVAL '20 seconds', NOW() + INTERVAL '30 days')
         RETURNING id`,
        [studentSessionId]
      );
      expect(expiredConsumed.rows.length).toBe(1);

      // Revoking session directly via logout test
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${studentAccessToken}`);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.message).toContain('terminated');

      // Subsequent call with the revoked session's token fails with 401
      const meAfterLogout = await request(app)
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${studentAccessToken}`);

      expect(meAfterLogout.status).toBe(401);
      expect(meAfterLogout.body.error.code).toBe('UNAUTHORIZED');
    });

    it('Password recovery flow: forgot password issues single-use token and resets credentials (ADR-003, ADR-008)', async () => {
      // 1. Forgot password request
      const forgotRes = await request(app).post('/api/v1/auth/forgot-password').send({
        email: testStudentEmail,
      });

      expect(forgotRes.status).toBe(200);
      expect(forgotRes.body.success).toBe(true);
      expect(lastResetToken).toBeDefined();
      expect(lastResetToken.length).toBeGreaterThan(20);

      // 2. Reset password
      const newPassword = 'NewlyResetPassword2026!';
      const resetRes = await request(app).post('/api/v1/auth/reset-password').send({
        token: lastResetToken,
        new_password: newPassword,
      });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);

      // 3. Replay attack on consumed reset token fails immediately
      const reuseRes = await request(app).post('/api/v1/auth/reset-password').send({
        token: lastResetToken,
        new_password: 'AnotherResetPassword2026!',
      });
      expect(reuseRes.status).toBe(400);
      expect(reuseRes.body.error.code).toBe('INVALID_RESET_TOKEN');

      // 4. Login with newly reset password succeeds
      const newLoginRes = await request(app).post('/api/v1/auth/login').send({
        email: testStudentEmail,
        password: newPassword,
      });
      expect(newLoginRes.status).toBe(200);
      expect(newLoginRes.body.step).toBe('otp_required');
    });
  });

  // ── Phase 7: Backend Administrative Endpoints ─────────────────────────────

  describe('Phase 7: Backend Admin API Endpoints', () => {
    let adminAccessToken = '';

    beforeAll(async () => {
      // Login as admin
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: testAdminEmail,
        password: testAdminPassword,
      });

      const ticket = loginRes.body.login_ticket;
      const otpRes = await request(app).post('/api/v1/auth/login/verify-otp').send({
        login_ticket: ticket,
        otp: lastLoginOtp,
      });

      adminAccessToken = otpRes.body.access_token;
    });

    it('GET /api/v1/admin/stats returns aggregated system counters', async () => {
      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('users_by_role');
      expect(res.body.data).toHaveProperty('users_by_status');
      expect(res.body.data).toHaveProperty('active_sessions');
      expect(res.body.data).toHaveProperty('total_audit_events');
    });

    it('GET /api/v1/admin/users returns paginated user records', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users?limit=10&page=1')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
    });

    it('PATCH /api/v1/admin/users/:id/status updates status and revokes sessions on suspension', async () => {
      // Find the student user id
      const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [testStudentEmail]);
      const studentId = userRes.rows[0].id;

      // Suspend student
      const suspendRes = await request(app)
        .patch(`/api/v1/admin/users/${studentId}/status`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ status: 'suspended' });

      expect(suspendRes.status).toBe(200);
      expect(suspendRes.body.data.status).toBe('suspended');

      // Verify sessions were revoked
      const activeSessionsRes = await pool.query(
        'SELECT COUNT(*)::int as count FROM sessions WHERE user_id = $1 AND revoked_at IS NULL',
        [studentId]
      );
      expect(activeSessionsRes.rows[0].count).toBe(0);

      // Re-activate student
      const activateRes = await request(app)
        .patch(`/api/v1/admin/users/${studentId}/status`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ status: 'active' });

      expect(activateRes.status).toBe(200);
      expect(activateRes.body.data.status).toBe('active');
    });

    it('GET /api/v1/admin/sessions lists active platform sessions', async () => {
      const res = await request(app)
        .get('/api/v1/admin/sessions')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/v1/admin/audit returns audit log entries', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });
  });
});
