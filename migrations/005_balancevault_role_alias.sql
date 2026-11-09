-- Migration: 005_balancevault_role_alias.sql
-- Establishes balancevault_runtime least-privilege role with identical security grants.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'balancevault_runtime') THEN
        CREATE ROLE balancevault_runtime NOLOGIN;
    END IF;
END
$$;

-- Grant schema access
GRANT USAGE ON SCHEMA public TO balancevault_runtime;

-- Table privileges for balancevault_runtime
GRANT SELECT, INSERT, UPDATE (password_hash, role, name) ON users TO balancevault_runtime;
GRANT SELECT, INSERT ON accounts TO balancevault_runtime;
GRANT UPDATE (balance_paise, status) ON accounts TO balancevault_runtime;
GRANT SELECT, INSERT ON ledger TO balancevault_runtime;
GRANT SELECT, INSERT ON idempotency_keys TO balancevault_runtime;
GRANT UPDATE (state, response_status, response_body, updated_at) ON idempotency_keys TO balancevault_runtime;
GRANT SELECT, INSERT ON idempotency_replays TO balancevault_runtime;
GRANT SELECT, INSERT, UPDATE (status, error_reason, updated_at) ON transactions TO balancevault_runtime;
GRANT SELECT, INSERT ON audit_logs TO balancevault_runtime;
GRANT SELECT, INSERT, UPDATE (decision, decided_by, decided_at) ON audit_flags TO balancevault_runtime;

-- Grant sequence usages
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO balancevault_runtime;

-- Ensure ledgerline_runtime also receives updates for transaction and audit tables
GRANT SELECT, INSERT, UPDATE (status, error_reason, updated_at) ON transactions TO ledgerline_runtime;
GRANT SELECT, INSERT ON audit_logs TO ledgerline_runtime;
GRANT SELECT, INSERT, UPDATE (decision, decided_by, decided_at) ON audit_flags TO ledgerline_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ledgerline_runtime;
