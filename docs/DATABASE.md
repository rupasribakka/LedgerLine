# LedgerLine — PostgreSQL Database Architecture & Schema Specification

## 1. Relational Schema & Entities

```
                          ┌───────────────┐
                          │     users     │
                          └───────┬───────┘
                                  │ 1:N
                                  ▼
                          ┌───────────────┐
                          │   accounts    │
                          └───────┬───────┘
                                  │
                   ┌──────────────┴──────────────┐
                   │ 1:N                         │ 1:N
                   ▼                             ▼
        ┌─────────────────────┐       ┌─────────────────────┐
        │       ledger        │       │    transactions     │
        │    (Append-Only)    │       │  (Status Tracking)  │
        └─────────────────────┘       └─────────────────────┘
                   │
                   ▼
        ┌─────────────────────┐       ┌─────────────────────┐
        │  idempotency_keys   │       │     audit_logs      │
        │ idempotency_replays │       │    (Append-Only)    │
        └─────────────────────┘       └─────────────────────┘
```

---

## 2. Table Specifications

### 1. `users`
Tracks authorized system users and their roles.
- `id`: `SERIAL PRIMARY KEY`
- `email`: `VARCHAR(255) UNIQUE NOT NULL`
- `password_hash`: `VARCHAR(255) NOT NULL` (bcrypt, 10 rounds)
- `role`: `VARCHAR(32) NOT NULL CHECK (role IN ('admin', 'holder', 'auditor'))`
- `name`: `VARCHAR(255)`
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- **Indexes**: `idx_users_email` on `(email)`

### 2. `accounts`
Stores individual accounts and settled balances in integer paise.
- `id`: `SERIAL PRIMARY KEY`
- `account_no`: `VARCHAR(64) UNIQUE NOT NULL`
- `owner_id`: `INTEGER REFERENCES users(id) ON DELETE RESTRICT`
- `name`: `VARCHAR(255) NOT NULL`
- `balance_paise`: `BIGINT NOT NULL DEFAULT 0`
- `status`: `VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'FROZEN', 'CLOSED'))`
- `is_external`: `BOOLEAN NOT NULL DEFAULT FALSE`
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- **Constraints**:
  - `chk_account_owner_or_external`: `(is_external = TRUE AND owner_id IS NULL) OR (is_external = FALSE AND owner_id IS NOT NULL)`
  - `chk_no_overdraft`: `is_external OR balance_paise >= 0`
  - `chk_account_status`: `status IN ('ACTIVE', 'FROZEN', 'CLOSED')`
- **Indexes**: `idx_accounts_owner` on `(owner_id)`, `idx_accounts_no` on `(account_no)`

### 3. `transactions`
Represents logical financial operations and their lifecycle status.
- `id`: `UUID PRIMARY KEY`
- `type`: `VARCHAR(32) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'transfer'))`
- `status`: `VARCHAR(32) NOT NULL CHECK (status IN ('pending', 'completed', 'refused'))`
- `amount_paise`: `BIGINT NOT NULL CHECK (amount_paise > 0)`
- `from_account_id`: `INTEGER REFERENCES accounts(id) ON DELETE RESTRICT`
- `to_account_id`: `INTEGER REFERENCES accounts(id) ON DELETE RESTRICT`
- `initiated_by`: `INTEGER REFERENCES users(id) ON DELETE RESTRICT`
- `idempotency_key`: `VARCHAR(255)`
- `description`: `TEXT`
- `error_reason`: `TEXT`
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- **Indexes**: `idx_transactions_from_acc`, `idx_transactions_to_acc`, `idx_transactions_initiated_by`, `idx_transactions_type`, `idx_transactions_status`, `idx_transactions_created_at`

### 4. `ledger`
The immutable, double-entry, append-only journal.
- `id`: `BIGSERIAL PRIMARY KEY`
- `txn_id`: `UUID NOT NULL`
- `account_id`: `INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT`
- `kind`: `VARCHAR(16) NOT NULL CHECK (kind IN ('debit', 'credit', 'refused'))`
- `amount_paise`: `BIGINT NOT NULL CHECK (amount_paise >= 0)`
- `balance_after_paise`: `BIGINT NOT NULL`
- `initiated_by`: `INTEGER REFERENCES users(id) ON DELETE RESTRICT`
- `idempotency_key`: `VARCHAR(255)`
- `reason`: `TEXT`
- `prev_hash`: `VARCHAR(64) NOT NULL`
- `hash`: `VARCHAR(64) NOT NULL` (SHA-256)
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- **Indexes**: `idx_ledger_account_id`, `idx_ledger_txn_id`, `idx_ledger_created_at`

### 5. `idempotency_keys`
Atomically records request fingerprints and prevents duplicate executions.
- `user_id`: `INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT`
- `key`: `VARCHAR(255) NOT NULL`
- `request_hash`: `VARCHAR(64) NOT NULL`
- `state`: `VARCHAR(32) NOT NULL CHECK (state IN ('in_flight', 'completed', 'refused'))`
- `response_status`: `INTEGER`
- `response_body`: `JSONB`
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `PRIMARY KEY (user_id, key)`

### 6. `idempotency_replays`
Audit log of duplicate requests intercepted and answered from cache.
- `id`: `BIGSERIAL PRIMARY KEY`
- `user_id`: `INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT`
- `idempotency_key`: `VARCHAR(255) NOT NULL`
- `request_hash`: `VARCHAR(64) NOT NULL`
- `replayed_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- **Indexes**: `idx_idempotency_replays_key`

### 7. `audit_logs`
Immutable record of security and administrative activities.
- `id`: `BIGSERIAL PRIMARY KEY`
- `actor_id`: `INTEGER REFERENCES users(id) ON DELETE RESTRICT`
- `action`: `VARCHAR(64) NOT NULL`
- `resource`: `VARCHAR(128) NOT NULL`
- `correlation_id`: `VARCHAR(255)`
- `outcome`: `VARCHAR(32) NOT NULL CHECK (outcome IN ('SUCCESS', 'FAILURE', 'REFUSED'))`
- `metadata`: `JSONB` (stripped of passwords, secrets, and auth tokens)
- `ip_address`: `VARCHAR(64)`
- `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- **Indexes**: `idx_audit_logs_actor`, `idx_audit_logs_action`, `idx_audit_logs_resource`, `idx_audit_logs_created_at`

---

## 3. Database Triggers for Immutability

Both `ledger` and `audit_logs` are protected by PL/pgSQL triggers:
1. `BEFORE UPDATE`: Raises exception `Ledger entries are immutable. UPDATE and DELETE operations are strictly prohibited.`
2. `BEFORE DELETE`: Raises exception `Ledger entries are immutable. UPDATE and DELETE operations are strictly prohibited.`
3. `BEFORE TRUNCATE`: Raises exception `Ledger is append-only. TRUNCATE is strictly prohibited.`

---

## 4. Least-Privilege Role Separation

In production, LedgerLine requires two distinct PostgreSQL roles:
1. **Migration Owner Role (`MIGRATION_DATABASE_URL`)**:
   - Owns schemas, tables, triggers, and migrations.
   - Run only during deployment.
2. **Runtime Application Role (`DATABASE_URL`)**:
   - Member of `ledgerline_runtime`.
   - `SELECT` on `users`, `accounts`, `ledger`, `transactions`, `idempotency_keys`, `idempotency_replays`, `audit_logs`.
   - `INSERT` on `accounts`, `ledger`, `transactions`, `idempotency_keys`, `idempotency_replays`, `audit_logs`.
   - Column-level `UPDATE` permitted strictly on:
     - `accounts (balance_paise, status)`
     - `idempotency_keys (state, response_status, response_body, updated_at)`
     - `transactions (status, error_reason, updated_at)`
   - Strictly denied `UPDATE` or `DELETE` on `ledger` and `audit_logs`.
   - Strictly denied `DELETE` on all operational tables.
