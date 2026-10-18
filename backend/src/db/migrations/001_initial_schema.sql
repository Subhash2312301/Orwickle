-- ==============================================================================
-- Orwickle Initial Schema: Core Identity, Profiles, Sessions, Refresh Tokens, & Auditing
-- Migration: 001_initial_schema.sql (v1.4)
-- ==============================================================================

-- 1. Enable Cryptographic UUID Generator Extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Core Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('student', 'investor', 'buyer', 'admin')),
    status VARCHAR(32) NOT NULL DEFAULT 'pending_verification' CHECK (status IN ('pending_verification', 'active', 'suspended')),
    email_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Case-insensitive unique constraint on email
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users (status);

-- 3. Profiles Table (Public Identity & Role-Specific Metadata)
CREATE TABLE IF NOT EXISTS profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(150) NOT NULL,
    phone VARCHAR(50),
    bio TEXT,
    avatar_url TEXT,
    role_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    completed_deals_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Active Sessions Table (One row per login / device; sid is stable across rotations)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_agent TEXT,
    ip_address VARCHAR(45),
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions (id) WHERE revoked_at IS NULL;

-- 5. Refresh Tokens Table (Many rows per session; records token rotation and child lineage)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    consumed_at TIMESTAMPTZ,
    replaced_by_token_id UUID REFERENCES refresh_tokens(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_session_id ON refresh_tokens (session_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active ON refresh_tokens (token_hash) WHERE consumed_at IS NULL;

-- 6. HMAC OTP Verification Records Table (Bound to Purpose & Identifier)
CREATE TABLE IF NOT EXISTS otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier VARCHAR(255) NOT NULL, -- normalized email or user_id UUID string
    purpose VARCHAR(32) NOT NULL CHECK (purpose IN ('signup_verify', 'login_otp', 'password_reset')),
    code_hash VARCHAR(64) NOT NULL,   -- HMAC-SHA256(code + ":" + purpose + ":" + identifier, OTP_PEPPER)
    attempts_count INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otps_identifier_purpose ON otps (LOWER(identifier), purpose);
CREATE INDEX IF NOT EXISTS idx_otps_active ON otps (LOWER(identifier), purpose, consumed_at, expires_at);

-- 7. Authentication Attempts & Exponential Backoff / Escalating Lockout Table
CREATE TABLE IF NOT EXISTS auth_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    normalized_email VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    failed_count INT NOT NULL DEFAULT 0,
    lockout_count INT NOT NULL DEFAULT 0, -- tracks repeated lockouts for escalating backoff (15m, 30m, 60m)
    locked_until TIMESTAMPTZ,
    last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_attempts_email_ip ON auth_attempts (LOWER(normalized_email), ip_address);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_locked_until ON auth_attempts (locked_until);

-- 8. System Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
