-- Separate the restricted runtime role from the schema owner used for migrations.
-- Runtime login credentials must be provisioned outside migrations.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ledgerline_runtime') THEN
        CREATE ROLE ledgerline_runtime NOLOGIN;
    END IF;

    -- Disable the legacy login created by the original schema migration.
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ledgerline_app') THEN
        ALTER ROLE ledgerline_app NOLOGIN;
    END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO ledgerline_runtime;

GRANT SELECT ON users TO ledgerline_runtime;
GRANT SELECT, INSERT ON accounts TO ledgerline_runtime;
GRANT UPDATE (balance_paise) ON accounts TO ledgerline_runtime;
GRANT SELECT, INSERT ON ledger TO ledgerline_runtime;
GRANT SELECT, INSERT ON idempotency_keys TO ledgerline_runtime;
GRANT UPDATE (state, response_status, response_body, updated_at)
ON idempotency_keys TO ledgerline_runtime;
GRANT SELECT, INSERT ON idempotency_replays TO ledgerline_runtime;

GRANT USAGE, SELECT ON SEQUENCE accounts_id_seq, ledger_id_seq, idempotency_replays_id_seq
TO ledgerline_runtime;
