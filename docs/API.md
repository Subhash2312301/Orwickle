# Orwickle Core REST API Specification (The Dealroom Dossier)
**Document Version:** 1.0.0  
**Base URL:** `http://localhost:4000/api/v1` (Development) / `https://api.orwickle.com/api/v1` (Production)  
**Standard:** RESTful JSON, RFC 9106 Argon2id, HS256 JWT, Dealroom Dossier Notary Tone

---

## 1. Global Conventions & Standards

### 1.1 Success Response Envelope
All successful requests return a JSON object containing `success: true`:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional descriptive status message"
}
```

### 1.2 Error Response Envelope (ADR-022)
In accordance with WCAG 1.4.1 (non-colour cues) and the Dealroom Dossier design language, all error messages are prefixed with `ERROR —` and phrased in neutral, formal notary copywriting:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_IDENTIFIER",
    "message": "ERROR — Formal, objective explanation of failure.",
    "details": null
  }
}
```

### 1.3 HTTP Status Codes
| Code | Name | Description |
|---|---|---|
| `200` | OK | Request succeeded; response payload attached. |
| `400` | Bad Request | Validation failure, malformed payload, or invalid OTP/token. |
| `401` | Unauthorized | Missing, expired, revoked, or invalid authentication credentials. |
| `403` | Forbidden | Insufficient permissions for role, or account suspended. |
| `404` | Not Found | Target resource does not exist. |
| `423` | Locked | Account temporarily locked due to repeated authentication failures (ADR-008). |
| `429` | Too Many Requests | Rate limit threshold exceeded for IP or account identifier. |
| `500` | Internal Server Error | Unexpected system failure. |

### 1.4 Transport Separation (ADR-002, ADR-014)
- **Native Mobile Clients (Flutter)**: Access tokens are sent via standard header `Authorization: Bearer <token>`. Refresh tokens are transmitted in request bodies (`{ "refresh_token": "..." }`). Mobile requests send no cookies and no `Origin` header.
- **Web Admin Portal**: Refresh tokens are stored in `HttpOnly; SameSite=Lax; Secure` cookies with `Path=/api/v1/auth`. Cookie-authenticated requests to administrative routes require the header `X-Orwickle-Admin: 1`.

### 1.5 Password Complexity Policy (ADR-010)
- Length: Minimum 10 characters, maximum 128 characters.
- Evaluated against a common weak password blocklist (top 10,000 weak passwords, keyboard walks, trivial sequences).
- Character composition rules (uppercase, lowercase, numbers, symbols) are optional/recommended.

---

## 2. Infrastructure & Health Endpoints

### 2.1 Live Probe
- **Endpoint:** `GET /health/live`
- **Auth:** Public
- **Response:** `200 OK`
```json
{ "status": "alive" }
```

### 2.2 Ready Probe
- **Endpoint:** `GET /health/ready`
- **Auth:** Public
- **Response:** `200 OK` (when DB connected) or `503 Service Unavailable`
```json
{
  "status": "ready",
  "database": {
    "connected": true,
    "latency_ms": 4
  }
}
```

### 2.3 Detailed Health Check
- **Endpoint:** `GET /api/v1/health`
- **Auth:** Public
- **Response:** `200 OK`
```json
{
  "status": "healthy",
  "service": "orwickle-backend",
  "version": "1.0.0",
  "timestamp": "2026-10-18T22:00:00.000Z",
  "database": {
    "connected": true,
    "latency_ms": 3
  }
}
```

---

## 3. Core Authentication Endpoints (`/api/v1/auth`)

### 3.1 User Registration
- **Endpoint:** `POST /api/v1/auth/signup`
- **Auth:** Public
- **Description:** Registers a new user in `pending_verification` status or replaces a pending account's password and profile. Dispatches a 6-digit OTP code to the email.
- **Rate Limit:** 15 req/min per IP; 5 req/hr per email address.
- **Request Body:**
```json
{
  "email": "founder@szabist.pk",
  "password": "SecureFounderPassword2026!",
  "full_name": "Mustafa Muhammad",
  "role": "student"
}
```
*Note: `role` must be one of `'student'`, `'investor'`, or `'buyer'`. Administrative accounts cannot be registered via public signup.*
- **Response:** `200 OK` (Constant response across pending and existing accounts)
```json
{
  "success": true,
  "message": "Registration initiated. If this address is not already registered, an authorization code has been dispatched to your email."
}
```

---

### 3.2 Verify Email Address (Anti-Pre-Hijacking)
- **Endpoint:** `POST /api/v1/auth/verify-email`
- **Auth:** Public
- **Description:** Redeems the 6-digit signup verification OTP. Requires both OTP and account password to prevent pre-hijacking attacks (ADR-009). Activates user account (`status = 'active'`).
- **Request Body:**
```json
{
  "email": "founder@szabist.pk",
  "otp": "492018",
  "password": "SecureFounderPassword2026!"
}
```
- **Response:** `200 OK`
```json
{
  "success": true,
  "message": "Email successfully verified. Account is now active."
}
```

---

### 3.3 Resend Verification Code
- **Endpoint:** `POST /api/v1/auth/resend-verification`
- **Auth:** Public
- **Description:** Re-issues a 6-digit email verification code for pending accounts.
- **Rate Limit:** 60-second cooldown; maximum 5 sends per hour per email address.
- **Request Body:**
```json
{
  "email": "founder@szabist.pk"
}
```
- **Response:** `200 OK`
```json
{
  "success": true,
  "message": "If a pending registration exists, a fresh verification code has been dispatched."
}
```

---

### 3.4 Login Authentication
- **Endpoint:** `POST /api/v1/auth/login`
- **Auth:** Public
- **Description:** Password authentication with constant-time dummy verification and escalating lockout backoff (15m, 30m, 60m). Dispatches MFA code when `LOGIN_OTP_MODE = always`.
- **Request Body:**
```json
{
  "email": "founder@szabist.pk",
  "password": "SecureFounderPassword2026!",
  "device_label": "Founder's iPhone 16 Pro"
}
```
- **Response (`LOGIN_OTP_MODE = always`):** `200 OK`
```json
{
  "success": true,
  "step": "otp_required",
  "login_ticket": "c8b417e2-45e0-47bf-9382-77761001a4e1",
  "message": "Multi-factor login authorization code dispatched to your email."
}
```
- **Response (Account Locked - HTTP 423):**
```json
{
  "success": false,
  "error": {
    "code": "ACCOUNT_LOCKED",
    "message": "ERROR — Account is temporarily locked due to repeated authentication failures. Try again in 15 minute(s).",
    "details": {
      "locked_until": "2026-10-18T22:30:00.000Z"
    }
  }
}
```

---

### 3.5 Verify Login OTP
- **Endpoint:** `POST /api/v1/auth/login/verify-otp`
- **Auth:** Public
- **Description:** Redeems the login challenge ticket (`login_ticket` = `otps.id`) with the 6-digit MFA code. Establishes a session row and issues token pair.
- **Request Body:**
```json
{
  "login_ticket": "c8b417e2-45e0-47bf-9382-77761001a4e1",
  "otp": "830219",
  "device_label": "Founder's iPhone 16 Pro"
}
```
- **Response:** `200 OK`
```json
{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "7a8f9c1b02...",
  "session_id": "b182cb90-3942-4f01-9f93-018274bb8192",
  "user": {
    "id": "e9329482-0192-4912-9210-482910482019",
    "email": "founder@szabist.pk",
    "role": "student"
  }
}
```

---

### 3.6 Token Refresh Rotation
- **Endpoint:** `POST /api/v1/auth/refresh`
- **Auth:** Public (Requires valid Refresh Token in JSON body or `refreshToken` cookie)
- **Description:** Rotates the refresh token atomically (`UPDATE refresh_tokens SET consumed_at = NOW() ...`) and issues a fresh 15-minute access token bound to the same stable `sid`.
- **Grace Window (ADR-002):** Replaying an already-consumed token within 10 seconds issues a fresh child token without invalidating the session (network drop/retry protection). Replaying an already-consumed token after 10 seconds revokes the entire session immediately.
- **Request Body (Mobile):**
```json
{
  "refresh_token": "7a8f9c1b02..."
}
```
- **Response:** `200 OK`
```json
{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "9b1284fa90..."
}
```

---

### 3.7 Logout Current Session
- **Endpoint:** `POST /api/v1/auth/logout`
- **Auth:** Bearer Token
- **Description:** Revokes the current session (`sessions.revoked_at = NOW()`) and clears refresh cookie.
- **Response:** `200 OK`
```json
{
  "success": true,
  "message": "Session successfully terminated."
}
```

---

### 3.8 Logout All Sessions
- **Endpoint:** `POST /api/v1/auth/logout-all`
- **Auth:** Bearer Token
- **Description:** Revokes all active sessions for the authenticated user.
- **Response:** `200 OK`
```json
{
  "success": true,
  "message": "All active sessions have been terminated."
}
```

---

### 3.9 Forgot Password Request
- **Endpoint:** `POST /api/v1/auth/forgot-password`
- **Auth:** Public
- **Description:** Constant-time, equal-work endpoint. Does not hash passwords. Inserts single-use token in `password_reset_tokens` and dispatches recovery instructions asynchronously.
- **Request Body:**
```json
{
  "email": "founder@szabist.pk"
}
```
- **Response:** `200 OK` (Constant response regardless of email existence)
```json
{
  "success": true,
  "message": "If this address is registered, instructions have been dispatched to your email."
}
```

---

### 3.10 Reset Password
- **Endpoint:** `POST /api/v1/auth/reset-password`
- **Auth:** Public
- **Description:** Atomically consumes single-use reset token, validates new password policy, updates Argon2id password hash, clears lockout in `auth_attempts`, and revokes all active sessions.
- **Request Body:**
```json
{
  "token": "4a90f128bc90184...",
  "new_password": "NewSecurePassword2026!"
}
```
- **Response:** `200 OK`
```json
{
  "success": true,
  "message": "Password updated successfully. All active sessions have been revoked."
}
```

---

## 4. User & Session Lifecycle Endpoints (`/api/v1/me`)

### 4.1 Get Current User & Profile
- **Endpoint:** `GET /api/v1/me`
- **Auth:** Bearer Token
- **Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "e9329482-0192-4912-9210-482910482019",
    "email": "founder@szabist.pk",
    "role": "student",
    "status": "active",
    "email_verified_at": "2026-10-18T21:40:00.000Z",
    "created_at": "2026-10-18T21:35:00.000Z",
    "profile": {
      "display_name": "Mustafa Muhammad",
      "phone": "+923001234567",
      "bio": "AI Dealroom marketplace architect.",
      "avatar_url": null,
      "role_data": {}
    }
  }
}
```

---

### 4.2 Update User Profile
- **Endpoint:** `PATCH /api/v1/me/profile`
- **Auth:** Bearer Token
- **Request Body:**
```json
{
  "display_name": "Mustafa M.",
  "phone": "+923001234567",
  "bio": "Founder & Chief Architect",
  "avatar_url": "https://assets.orwickle.com/avatars/founder.png"
}
```
- **Response:** `200 OK`
```json
{
  "success": true,
  "message": "Profile updated successfully.",
  "data": { ... }
}
```

---

### 4.3 List Active Sessions
- **Endpoint:** `GET /api/v1/me/sessions`
- **Auth:** Bearer Token
- **Description:** Returns all non-revoked sessions for current user. Highlights `is_current: true` for the active session.
- **Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "b182cb90-3942-4f01-9f93-018274bb8192",
      "device_label": "Founder's iPhone 16 Pro",
      "ip": "127.0.0.1",
      "user_agent": "Mozilla/5.0 ...",
      "created_at": "2026-10-18T21:50:00.000Z",
      "last_used_at": "2026-10-18T22:05:00.000Z",
      "absolute_expires_at": "2027-01-16T21:50:00.000Z",
      "is_current": true
    }
  ]
}
```

---

### 4.4 Revoke Specific Session
- **Endpoint:** `DELETE /api/v1/me/sessions/:id`
- **Auth:** Bearer Token
- **Response:** `200 OK`
```json
{
  "success": true,
  "message": "Session revoked successfully."
}
```

---

## 5. Administrative Control Endpoints (`/api/v1/admin`)

*All administrative endpoints strictly require `role = 'admin'` and pass the selective `adminHeaderCheck`.*

### 5.1 System Statistics
- **Endpoint:** `GET /api/v1/admin/stats`
- **Auth:** Bearer Token (`role = 'admin'`)
- **Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "users_by_role": {
      "student": 12,
      "investor": 5,
      "buyer": 3,
      "admin": 2
    },
    "users_by_status": {
      "pending_verification": 2,
      "active": 19,
      "suspended": 1
    },
    "active_sessions": 24,
    "total_audit_events": 142,
    "timestamp": "2026-10-18T22:15:00.000Z"
  }
}
```

---

### 5.2 User Management Directory
- **Endpoint:** `GET /api/v1/admin/users`
- **Auth:** Bearer Token (`role = 'admin'`)
- **Query Parameters:** `page`, `limit`, `role`, `status`, `search`
- **Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "e9329482-0192-4912-9210-482910482019",
      "email": "founder@szabist.pk",
      "role": "student",
      "status": "active",
      "email_verified_at": "2026-10-18T21:40:00.000Z",
      "created_at": "2026-10-18T21:35:00.000Z",
      "display_name": "Mustafa Muhammad",
      "phone": "+923001234567",
      "avatar_url": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 22,
    "total_pages": 2
  }
}
```

---

### 5.3 Update User Status (Suspend/Activate)
- **Endpoint:** `PATCH /api/v1/admin/users/:id/status`
- **Auth:** Bearer Token (`role = 'admin'`)
- **Description:** Modifies user account status. If set to `'suspended'`, all active sessions for that user are immediately revoked. An administrator cannot suspend their own account.
- **Request Body:**
```json
{
  "status": "suspended"
}
```
- **Response:** `200 OK`
```json
{
  "success": true,
  "message": "Account status updated to 'suspended'.",
  "data": {
    "id": "e9329482-0192-4912-9210-482910482019",
    "email": "founder@szabist.pk",
    "role": "student",
    "status": "suspended"
  }
}
```

---

### 5.4 Global Session Monitoring
- **Endpoint:** `GET /api/v1/admin/sessions`
- **Auth:** Bearer Token (`role = 'admin'`)
- **Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "b182cb90-3942-4f01-9f93-018274bb8192",
      "user_id": "e9329482-0192-4912-9210-482910482019",
      "device_label": "Founder's iPhone 16 Pro",
      "ip": "127.0.0.1",
      "user_agent": "Mozilla/5.0 ...",
      "created_at": "2026-10-18T21:50:00.000Z",
      "last_used_at": "2026-10-18T22:05:00.000Z",
      "absolute_expires_at": "2027-01-16T21:50:00.000Z",
      "email": "founder@szabist.pk",
      "role": "student"
    }
  ]
}
```

---

### 5.5 Administrative Session Revocation
- **Endpoint:** `DELETE /api/v1/admin/sessions/:id`
- **Auth:** Bearer Token (`role = 'admin'`)
- **Response:** `200 OK`
```json
{
  "success": true,
  "message": "Session successfully revoked by administrator."
}
```

---

### 5.6 Audit Ledger Viewer
- **Endpoint:** `GET /api/v1/admin/audit`
- **Auth:** Bearer Token (`role = 'admin'`)
- **Query Parameters:** `page`, `limit`, `action`, `target_type`
- **Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "902184bb-4812-4f01-9a18-1824701bca90",
      "actor_id": "e9329482-0192-4912-9210-482910482019",
      "actor_email": "founder@szabist.pk",
      "target_type": "user",
      "target_id": "e9329482-0192-4912-9210-482910482019",
      "action": "auth.verify_email",
      "details": {},
      "ip": "127.0.0.1",
      "user_agent": "Mozilla/5.0 ...",
      "created_at": "2026-10-18T21:40:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 142,
    "total_pages": 3
  }
}
```

---

## 6. Standard Error Code Registry

| Error Code | HTTP Status | Context / Trigger |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Malformed JSON or Zod schema validation failure. |
| `WEAK_PASSWORD` | 400 | Password fails length, complexity, or weak blocklist rules. |
| `OTP_NOT_FOUND` | 400 | No active unconsumed OTP for given user and purpose. |
| `OTP_EXPIRED` | 400 | OTP code lifetime expired (5m for login, 10m for verification). |
| `OTP_INVALID` | 400 | Mismatch in candidate OTP HMAC computation. |
| `OTP_MAX_ATTEMPTS_EXCEEDED`| 400 | 5 failed verification attempts on an OTP; code invalidated. |
| `LOGIN_TICKET_INVALID` | 400 | Invalid or missing `login_ticket` challenge UUID. |
| `INVALID_RESET_TOKEN` | 400 | Single-use password reset token not found, expired, or consumed. |
| `ACCOUNT_NOT_PENDING` | 400 | Email verification submitted for non-pending account. |
| `UNAUTHORIZED` | 401 | Missing Bearer token or invalid JWT signature. |
| `INVALID_CREDENTIALS` | 401 | Incorrect password or unverified email during login. |
| `ACCOUNT_UNVERIFIED` | 401 | Login attempted before email verification completed. |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh token hash not recognized. |
| `SESSION_REVOKED` | 401 | Session has been explicitly revoked via logout or admin action. |
| `SESSION_EXPIRED` | 401 | Session passed 90-day absolute expiration date. |
| `TOKEN_REPLAY_REVOKED` | 401 | Refresh token replayed past 10s grace window (ADR-002). |
| `FORBIDDEN` | 403 | Role lack permission to access route (`requireRole`). |
| `ACCOUNT_SUSPENDED` | 403 | User account placed in suspended status by administrator. |
| `ADMIN_HEADER_REQUIRED` | 403 | Web cookie request to administrative endpoint missing `X-Orwickle-Admin: 1`. |
| `ORIGIN_FORBIDDEN` | 403 | Web request origin not permitted by administrative CORS policy. |
| `NOT_FOUND` | 404 | Unknown route endpoint or target database record missing. |
| `ACCOUNT_LOCKED` | 423 | 5 consecutive failed logins triggered escalating backoff. |
| `RATE_LIMIT_EXCEEDED` | 429 | Pre-crypto sliding window threshold reached for IP or email. |
| `DUPLICATE_ENTRY` | 409 | PostgreSQL unique constraint violation. |
| `INTERNAL_SERVER_ERROR` | 500 | Unhandled exception or unexpected system failure. |
