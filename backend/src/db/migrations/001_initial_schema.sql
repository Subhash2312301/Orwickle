-- ==============================================================================
-- Orwickle Initial Schema: Core Identity, Profiles, Sessions, & Auditing
-- Migration: 001_initial_schema.sql (v1.2)
-- ==============================================================================

-- 1. Enable Cryptographic UUID Generator Extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Core Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('owner', 'investor', 'buyer', 'admin')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Case-insensitive unique constraint on email
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- 3. Profiles Table (Public Preview & Role-Specific Metadata)
CREATE TABLE IF NOT EXISTS profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(150) NOT NULL,
    phone VARCHAR(50),
    bio TEXT,
    avatar_url TEXT,
    role_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    review_status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected', 'action_required')),
    reviewer_notes TEXT,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    completed_deals_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_review_status ON profiles (review_status);

-- 4. Active Sessions Table (Dual Token & Refresh Rotation with 10s Grace Window)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    family_id UUID NOT NULL,
    refresh_token_hash VARCHAR(64) NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT false,
    replaced_by_sid UUID REFERENCES sessions(id) ON DELETE SET NULL,
    rotated_at TIMESTAMPTZ,
    user_agent TEXT,
    ip_address VARCHAR(45),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_family_id ON sessions (family_id);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_hash ON sessions (refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_active_lookup ON sessions (id, is_revoked);

-- 5. HMAC OTP Verification Records Table (Bound to Purpose & Identifier)
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

-- 6. Authentication Attempts & Exponential Backoff / Escalating Lockout Table
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

-- 7. System Audit Logs Table
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
