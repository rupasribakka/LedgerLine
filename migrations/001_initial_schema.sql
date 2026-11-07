-- LedgerLine Initial Schema Migration: 001_initial_schema.sql
-- High-integrity double-entry ledger database schema

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('admin', 'holder', 'auditor')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    account_no VARCHAR(64) UNIQUE NOT NULL,
    owner_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    balance_paise BIGINT NOT NULL DEFAULT 0,
    is_external BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_account_owner_or_external CHECK (
        (is_external = TRUE AND owner_id IS NULL) OR
        (is_external = FALSE AND owner_id IS NOT NULL)
    ),
    CONSTRAINT chk_no_overdraft CHECK (is_external OR balance_paise >= 0)
);

CREATE INDEX IF NOT EXISTS idx_accounts_owner ON accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_accounts_no ON accounts(account_no);

-- 3. Immutable Append-Only Ledger Table
CREATE TABLE IF NOT EXISTS ledger (
    id BIGSERIAL PRIMARY KEY,
    txn_id UUID NOT NULL,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    kind VARCHAR(16) NOT NULL CHECK (kind IN ('debit', 'credit', 'refused')),
    amount_paise BIGINT NOT NULL CHECK (amount_paise >= 0),
    balance_after_paise BIGINT NOT NULL,
    initiated_by INTEGER REFERENCES users(id) ON DELETE RESTRICT,
    idempotency_key VARCHAR(255),
    reason TEXT,
    prev_hash VARCHAR(64) NOT NULL,
    hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_account_id ON ledger(account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_txn_id ON ledger(txn_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created_at ON ledger(created_at);

-- 4. Idempotency Keys Table
CREATE TABLE IF NOT EXISTS idempotency_keys (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    key VARCHAR(255) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    state VARCHAR(32) NOT NULL CHECK (state IN ('in_flight', 'completed', 'refused')),
    response_status INTEGER,
    response_body JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, key)
);

-- 5. Idempotency Replays Audit Table
CREATE TABLE IF NOT EXISTS idempotency_replays (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    idempotency_key VARCHAR(255) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    replayed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_idempotency_replays_key ON idempotency_replays(idempotency_key);

-- 6. Audit Flags Table
CREATE TABLE IF NOT EXISTS audit_flags (
    id SERIAL PRIMARY KEY,
    txn_id UUID NOT NULL,
    reason TEXT NOT NULL,
    score NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
    suggested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    decided_by INTEGER REFERENCES users(id) ON DELETE RESTRICT,
    decision VARCHAR(32) CHECK (decision IN ('approved', 'dismissed')),
    decided_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_audit_flags_txn ON audit_flags(txn_id);

-- 7. Immutability Triggers on Ledger Table (Append-Only Enforcement)
CREATE OR REPLACE FUNCTION prevent_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Ledger entries are immutable. UPDATE and DELETE operations are strictly prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ledger_prevent_update ON ledger;
CREATE TRIGGER trg_ledger_prevent_update
BEFORE UPDATE ON ledger
FOR EACH ROW
EXECUTE FUNCTION prevent_ledger_mutation();

DROP TRIGGER IF EXISTS trg_ledger_prevent_delete ON ledger;
CREATE TRIGGER trg_ledger_prevent_delete
BEFORE DELETE ON ledger
FOR EACH ROW
EXECUTE FUNCTION prevent_ledger_mutation();

CREATE OR REPLACE FUNCTION prevent_ledger_truncate()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Ledger is append-only. TRUNCATE is strictly prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ledger_prevent_truncate ON ledger;
CREATE TRIGGER trg_ledger_prevent_truncate
BEFORE TRUNCATE ON ledger
FOR EACH STATEMENT
EXECUTE FUNCTION prevent_ledger_truncate();

-- Runtime privileges are provisioned by migration 003 without embedded credentials.
