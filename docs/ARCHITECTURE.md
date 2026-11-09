# LedgerLine — System Architecture & Technical Specifications

## 1. Architectural Philosophy & Core Invariants

LedgerLine is engineered from the ground up as a high-integrity, double-entry financial core. It guarantees that money can never be silently created, destroyed, or modified.

### Financial Core Invariants

1. **Integer-Based Monetary Storage (Paise Standard)**:
   - All financial amounts are stored as integers in **paise** (`₹1.00 = 100 paise`) using PostgreSQL `BIGINT` and JavaScript `BigInt`.
   - Floating-point representations (IEEE 754) are strictly rejected by input sanitization to eliminate compounding rounding errors ($0.1 + 0.2 \neq 0.3$).
2. **Double-Entry Bookkeeping Conservation**:
   - Every financial movement creates balanced debit and credit entries.
   - For every transaction: $\sum \text{Debits} = \sum \text{Credits}$.
   - System-wide balance invariant: $\sum_{\text{all accounts}} \text{balance\_paise} = 0$.
   - Deposits debit `ACC-EXTERNAL` and credit the recipient account.
   - Withdrawals debit the source account and credit `ACC-EXTERNAL`.
   - Transfers debit the source account and credit the destination account.
3. **Pessimistic Serialization & Deadlock Prevention**:
   - Row-level locking via `SELECT ... FOR UPDATE` serializes concurrent transactions.
   - All multi-account locks are acquired in strictly deterministic ascending primary-key order (`ORDER BY id ASC`).
   - Circular transfer requests ($A \to B$ and $B \to A$) acquire locks in identical sequence, eliminating deadlock risk.
4. **Strict Non-Negative Balance Guard**:
   - User accounts cannot overdraft: `CHECK (is_external OR balance_paise >= 0)`.
   - `postMovement` performs balance validation inside the database transaction *after* acquiring row locks.
5. **Robust Scoped Idempotency**:
   - Mutating operations require an `Idempotency-Key` header scoped to the authenticated user.
   - Fingerprints of the request payload (SHA-256) and final HTTP responses are atomically stored.
   - In-flight requests are serialized using PostgreSQL row locks.
   - Replaying the same key with identical payload yields an `Idempotent-Replay: true` header without moving funds.
   - Reusing a key with a mismatched payload returns `HTTP 422 Unprocessable Entity`.
6. **Append-Only Cryptographic Ledger**:
   - Table-level triggers prohibit `UPDATE`, `DELETE`, and `TRUNCATE` operations on `ledger` and `audit_logs`.
   - Each ledger entry incorporates a SHA-256 hash chaining to the account's previous ledger entry.
7. **Zero Autonomous AI Intervention**:
   - Financial movements require explicit user or administrator initiation. AI agents cannot initiate, sign, or approve transactions.

---

## 2. High-Level Component Architecture

```
                    ┌───────────────────────────────────────────────┐
                    │               Client Applications             │
                    │        (Web SPA / REST API Consumers)         │
                    └───────────────────────┬───────────────────────┘
                                            │ HTTP / HTTPS
                                            ▼
                    ┌───────────────────────────────────────────────┐
                    │          Express Security & Middleware        │
                    │  • Helmet Security Headers                    │
                    │  • Safe CORS Policies                         │
                    │  • Rate Limiting (Sliding Window)             │
                    │  • Request Size Limit (50 KB)                 │
                    │  • Centralized Error Sanitizer                │
                    └───────────────────────┬───────────────────────┘
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    │                                               │
                    ▼                                               ▼
         ┌─────────────────────┐                         ┌─────────────────────┐
         │  Authentication &   │                         │  Financial Engine   │
         │   Authorization     │                         │   (src/ledger.js)   │
         │  • JWT Verification │                         │  • Integer Validate │
         │  • Fresh DB Roles   │                         │  • Pessimistic Lock │
         │  • canMoveFrom IDOR │                         │  • Balance Guard    │
         │  • bcrypt Hashing   │                         │  • Atomic Journal   │
         └──────────┬──────────┘                         └──────────┬──────────┘
                    │                                               │
                    │              ┌─────────────────┐              │
                    └─────────────►│ Immutable Audit │◄─────────────┘
                                   │ Logging Engine  │
                                   │ (src/audit.js)  │
                                   └────────┬────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 PostgreSQL 16 Engine                                   │
│  ┌────────────────────┐   ┌────────────────────┐   ┌────────────────────────────────┐  │
│  │    users Table     │   │   accounts Table   │   │   transactions Table           │  │
│  │  (Role Check)      │   │ (chk_no_overdraft) │   │   (Status Tracking)            │  │
│  └────────────────────┘   └────────────────────┘   └────────────────────────────────┘  │
│  ┌────────────────────┐   ┌────────────────────┐   ┌────────────────────────────────┐  │
│  │    ledger Table    │   │ idempotency_keys   │   │   audit_logs Table             │  │
│  │ (Triggers & SHA256)│   │ (Row Locks)        │   │ (Immutability Triggers)        │  │
│  └────────────────────┘   └────────────────────┘   └────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Module Responsibilities

- **`src/app.js`**: Express server, route orchestration, security middleware, input validation, and centralized error handling without stack trace leakage.
- **`src/auth.js`**: JWT generation/verification, bcrypt hashing, dynamic server-side role re-reading from DB, authorization enforcement (`requireRole`), IDOR prevention (`canMoveFrom`), and brute-force rate limiting.
- **`src/ledger.js`**: Financial transaction core, integer paise validation, deterministic row-level locking (`ORDER BY id ASC FOR UPDATE`), balance checking, atomic double-entry balance updates, append-only journal insertions, and transaction status queries.
- **`src/audit.js`**: Immutable audit event recorder (`recordAuditLog`), sanitization of sensitive metadata, account statement generation with replay counts, system reconciliation service (`verifySystemIntegrity`), and duplicate replay tracking.
- **`src/hash.js`**: Canonical sorted-key JSON serialization, SHA-256 hash generation, and mathematical cryptographic hash chain verification.
- **`src/db.js`**: PostgreSQL connection pooling, embedded PostgreSQL management for tests, transaction wrappers (`withTransaction`), and runtime least-privilege verification (`assertProductionRuntimeRole`).
- **`src/config.js`**: Environment variable validation, JWT secret strength enforcement, and production separation of runtime and migration roles.
- **`src/migrate.js`**: Versioned SQL migration runner tracking applied migrations in `schema_migrations`.
- **`src/seed.js`**: Controlled development fixtures with double-entry opening balances. Disabled in production.
