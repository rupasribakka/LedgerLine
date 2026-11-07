-- Migration: 004_accounts_status_and_transactions.sql
-- Adds account status lifecycle, transactions ledger tracking, and immutable audit logs.

-- 1. Add status to accounts with valid lifecycle check constraint
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_account_status'
    ) THEN
        ALTER TABLE accounts ADD CONSTRAINT chk_account_status 
            CHECK (status IN ('ACTIVE', 'FROZEN', 'CLOSED'));
    END IF;
END $$;

-- 2. Transactions Table: Tracks logical financial operations
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY,
    type VARCHAR(32) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'transfer')),
    status VARCHAR(32) NOT NULL CHECK (status IN ('pending', 'completed', 'refused')),
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    from_account_id INTEGER REFERENCES accounts(id) ON DELETE RESTRICT,
    to_account_id INTEGER REFERENCES accounts(id) ON DELETE RESTRICT,
    initiated_by INTEGER REFERENCES users(id) ON DELETE RESTRICT,
    idempotency_key VARCHAR(255),
    description TEXT,
    error_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_from_acc ON transactions(from_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to_acc ON transactions(to_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_initiated_by ON transactions(initiated_by);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- 3. Audit Logs Table: Immutably records sensitive security, auth, and business events
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
    action VARCHAR(64) NOT NULL,
    resource VARCHAR(128) NOT NULL,
    correlation_id VARCHAR(255),
    outcome VARCHAR(32) NOT NULL CHECK (outcome IN ('SUCCESS', 'FAILURE', 'REFUSED')),
    metadata JSONB,
    ip_address VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- 4. Immutability Triggers on audit_logs Table (Append-Only Enforcement)
CREATE OR REPLACE FUNCTION prevent_audit_logs_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable. UPDATE and DELETE operations are strictly prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_prevent_update ON audit_logs;
CREATE TRIGGER trg_audit_logs_prevent_update
BEFORE UPDATE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_logs_mutation();

DROP TRIGGER IF EXISTS trg_audit_logs_prevent_delete ON audit_logs;
CREATE TRIGGER trg_audit_logs_prevent_delete
BEFORE DELETE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_logs_mutation();

DROP TRIGGER IF EXISTS trg_audit_logs_prevent_truncate ON audit_logs;
CREATE TRIGGER trg_audit_logs_prevent_truncate
BEFORE TRUNCATE ON audit_logs
FOR EACH STATEMENT
EXECUTE FUNCTION prevent_ledger_truncate();

-- 5. Grant Runtime Role Privileges for Newly Added Relations
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ledgerline_runtime') THEN
        GRANT SELECT, INSERT ON transactions TO ledgerline_runtime;
        GRANT UPDATE (status, error_reason, updated_at) ON transactions TO ledgerline_runtime;
        GRANT SELECT, INSERT ON audit_logs TO ledgerline_runtime;
        GRANT UPDATE (status) ON accounts TO ledgerline_runtime;
        GRANT USAGE, SELECT ON SEQUENCE audit_logs_id_seq TO ledgerline_runtime;
    END IF;
END $$;
