# LedgerLine — API Specification & Route Reference Guide

The LedgerLine backend exposes a RESTful financial API with JSON request and response payloads.

## Common Headers

- `Authorization: Bearer <JWT>`: Required for authenticated endpoints. User roles are re-read fresh from the database on every request (`Hard Rule 9`).
- `Idempotency-Key: <UUID>`: Required on all financial mutating endpoints (`/api/transactions/*`, `/deposits`, `/withdrawals`, `/transfers`). Replaying an identical request returns the cached response with `Idempotent-Replay: true` without moving money. Reusing a key with a mismatched payload returns `HTTP 422 Unprocessable Entity`.
- `Content-Type: application/json`: Required on endpoints accepting request bodies. Enforces a strict `10kb` limit.

---

## Complete Route Reference: Authorization & Monetary Impact Summary

| Method | Canonical Route & Aliases | Who May Call It | What It Does to the Money |
|---|---|---|---|
| `GET` | `/api/health`, `/health` | **Public** (Unauthenticated) | **Does not move money** (read-only liveness check). |
| `GET` | `/api/ready`, `/ready` | **Public** (Unauthenticated) | **Does not move money** (read-only readiness + database/cache probe). |
| `POST` | `/api/auth/register`, `/auth/register` | **Public** (for `holder`); **Admin only** with Bearer token (for `admin`, `auditor`) | **Does not move money** (creates user profile and hashes password). |
| `POST` | `/api/auth/login`, `/auth/login` | **Public** (Unauthenticated) | **Does not move money** (authenticates credentials and issues JWT). |
| `POST` | `/api/auth/logout`, `/auth/logout` | **Public** or **Authenticated** (`holder`, `admin`, `auditor`) | **Does not move money** (records logout in audit log). |
| `GET` | `/api/auth/me`, `/auth/me` | **Authenticated** (`holder`, `admin`, `auditor`) | **Does not move money** (reads fresh profile from database). |
| `GET` | `/api/accounts`, `/accounts` | `admin`, `auditor` (all accounts); `holder` (owned accounts only) | **Does not move money** (read-only query of account balances and metadata). |
| `POST` | `/api/accounts`, `/accounts` | `admin` only | **Moves money if `initial_balance_paise > 0`**: debits `ACC-EXTERNAL` and credits the new account by `initial_balance_paise` via balanced double-entry ledger entries. If `0`, does not move money. |
| `GET` | `/api/accounts/:id`, `/accounts/:id` | `admin`, `auditor` (any); `holder` (owned account only) | **Does not move money** (read-only account details query). |
| `GET` | `/api/accounts/:id/balance`, `/accounts/:id/balance` | `admin`, `auditor` (any); `holder` (owned account only) | **Does not move money** (read-only balance query). |
| `PATCH` | `/api/accounts/:id/status`, `/accounts/:id/status` | `admin` only | **Does not move money directly**. Mutates account status (`ACTIVE`, `FROZEN`, `CLOSED`). If `FROZEN` or `CLOSED`, blocks future debits, credits, and withdrawals on this account. |
| `GET` | `/api/accounts/:id/statement`, `/accounts/:id/statement` | `admin`, `auditor` (any); `holder` (owned account only) | **Does not move money** (read-only query of journal rows and running balance). |
| `POST` | `/api/transactions/deposit`, `/api/deposits`, `/deposits` | `admin` only | **Moves money**: debits `ACC-EXTERNAL` and credits target account by `amount` paise via balanced double-entry ledger entries. |
| `POST` | `/api/transactions/withdraw`, `/api/withdrawals`, `/withdrawals` | Account owner (`holder`) or `admin` | **Moves money**: debits source account and credits `ACC-EXTERNAL` by `amount` paise. If insufficient funds, moves zero money and writes a `kind='refused'` ledger entry. |
| `POST` | `/api/transactions/transfer`, `/api/transfers`, `/transfers` | Source account owner (`holder`) or `admin` | **Moves money**: debits source account and credits destination account by `amount` paise. If insufficient funds, moves zero money and writes a `kind='refused'` ledger entry on the source account. |
| `GET` | `/api/transactions`, `/transactions` | `admin`, `auditor` (all); `holder` (owned account transactions) | **Does not move money** (read-only transaction query). |
| `GET` | `/api/transactions/:id`, `/transactions/:id` | `admin`, `auditor` (any); `holder` (if party to transaction) | **Does not move money** (read-only transaction detail query). |
| `GET` | `/api/ledger`, `/ledger` | `admin`, `auditor` (all); `holder` (owned account entries) | **Does not move money** (read-only append-only ledger query). |
| `GET` | `/api/ledger/verify`, `/audit/verify` | `admin`, `auditor` only | **Does not move money** (read-only verification of hash chains and zero-sum balance conservation). |
| `GET` | `/api/ledger/:transactionId`, `/ledger/:transactionId` | `admin`, `auditor` (any); `holder` (if party to transaction) | **Does not move money** (read-only journal entries for a single transaction). |
| `GET` | `/api/audit`, `/audit`, `/api/audit/logs`, `/audit/logs` | `admin`, `auditor` only | **Does not move money** (read-only query of security audit events). |
| `GET` | `/api/audit/duplicates`, `/audit/duplicates` | `admin`, `auditor` only | **Does not move money** (read-only query of idempotency duplicate replays). |
| `GET` | `/api/audit/:id`, `/audit/:id`, `/api/audit/logs/:id`, `/audit/logs/:id` | `admin`, `auditor` only | **Does not move money** (read-only query of a specific audit log entry). |
| `GET` | `/api/admin/users`, `/admin/users` | `admin` only | **Does not move money** (read-only query of system users). |
| `GET` | `/api/admin/overview`, `/admin/overview` | `admin`, `auditor` only | **Does not move money** (read-only system overview metrics query). |

---

## Detailed Route Specifications

### 1. System Health

#### Health Check (Liveness Probe)
- **Route & Aliases**: `GET /api/health`, `GET /health`, `GET /api/health/details`, `GET /health/details`
- **Who may call it**: **Public** (Unauthenticated)
- **What it does to the money**: **Does not move money**. Checks database connectivity, role privileges, and Redis status.
- **Responses**:
  - `GET /api/health`:
    - `200 OK`: `{"status": "ok"}`
  - `GET /api/health?details=true` or `GET /api/health/details`:
    - `200 OK`:
      ```json
      {
        "status": "ok",
        "service": "BalanceVault",
        "version": "1.0.0",
        "timestamp": "2026-11-09T16:00:00.000Z",
        "uptime": 45.2,
        "checks": {
          "database": {
            "status": "healthy",
            "user": "balancevault_runtime",
            "database": "balancevault",
            "latencyMs": 2
          },
          "redis": {
            "status": "connected" | "fallback_in_memory",
            "configured": true,
            "message": "Redis rate limiting active."
          }
        }
      }
      ```

#### Readiness Probe
- **Route & Aliases**: `GET /api/ready`, `GET /ready`
- **Who may call it**: **Public** (Unauthenticated)
- **What it does to the money**: **Does not move money**. Probes live PostgreSQL database query capability and Redis cache connectivity before routing traffic.
- **Responses**:
  - `200 OK` (All critical services healthy):
    ```json
    {
      "status": "ready",
      "service": "BalanceVault",
      "checks": {
        "database": {
          "status": "connected",
          "latencyMs": 2
        },
        "redis": {
          "status": "connected",
          "mode": "redis"
        }
      },
      "timestamp": "2026-11-11T14:55:00.000Z"
    }
    ```
  - `503 Service Unavailable` (Database unreachable):
    ```json
    {
      "status": "unready",
      "service": "BalanceVault",
      "error": "Database connection unavailable",
      "checks": {
        "database": {
          "status": "disconnected",
          "error": "connection timeout"
        }
      },
      "timestamp": "2026-11-11T14:55:00.000Z"
    }
    ```

---

### 2. Authentication & User Management

#### Register User
- **Route & Aliases**: `POST /api/auth/register`, `POST /auth/register`
- **Who may call it**:
  - **Public**: Can self-register as an account holder (`role: "holder"`).
  - **Admin only** (via Bearer token): Can register users with `admin` or `auditor` roles. Unauthenticated or holder attempts to register `admin` or `auditor` are rejected with `HTTP 403 Forbidden`.
- **What it does to the money**: **Does not move money**. Inserts a new user record with a bcrypt-hashed password (cost factor 10).
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "name": "Jane Doe",
    "role": "holder"
  }
  ```
- **Responses**:
  - `201 Created`: User created with JWT token.
  - `400 Bad Request`: Password shorter than 8 characters or invalid email.
  - `403 Forbidden`: Unauthorized escalation attempt to `admin` or `auditor`.
  - `409 Conflict`: Email already registered.

#### Login
- **Route & Aliases**: `POST /api/auth/login`, `POST /auth/login`
- **Who may call it**: **Public** (Unauthenticated).
- **What it does to the money**: **Does not move money**. Validates credentials and generates an authenticated JWT token.
- **Rate Limit**: Enforces sliding-window rate limit (5 failed attempts per IP + email per 60s).
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Responses**:
  - `200 OK`: Returns JWT token and user profile (`id`, `email`, `role`, `name`).
  - `401 Unauthorized`: Invalid credentials.
  - `429 Too Many Requests`: Rate limit triggered.

#### Logout
- **Route & Aliases**: `POST /api/auth/logout`, `POST /auth/logout`
- **Who may call it**: **Public** or **Authenticated** users.
- **What it does to the money**: **Does not move money**. Logs logout event in `audit_logs`.
- **Responses**:
  - `200 OK`: `{"ok": true, "message": "Logged out successfully"}`

#### Current User Profile
- **Route & Aliases**: `GET /api/auth/me`, `GET /auth/me`
- **Who may call it**: **Authenticated** users (`holder`, `admin`, `auditor`).
- **What it does to the money**: **Does not move money**. Re-reads user role and profile fresh from the database.
- **Responses**:
  - `200 OK`: User details (`id`, `email`, `role`, `name`).
  - `401 Unauthorized`: Missing or invalid Bearer token.

---

### 3. Accounts Management

#### List Accounts
- **Route & Aliases**: `GET /api/accounts`, `GET /accounts`
- **Who may call it**:
  - `admin`, `auditor`: Returns all system accounts (including customer accounts and `ACC-EXTERNAL`).
  - `holder`: Returns only accounts where `owner_id === req.user.id`.
- **What it does to the money**: **Does not move money**. Read-only query of account balances, numbers, and statuses.
- **Responses**:
  - `200 OK`: Array of account objects.

#### Create Account
- **Route & Aliases**: `POST /api/accounts`, `POST /accounts`
- **Who may call it**: `admin` only (`holder` and `auditor` receive `HTTP 403 Forbidden`).
- **What it does to the money**:
  - If `initial_balance_paise > 0`: **Moves money**. Atomically debits `ACC-EXTERNAL` and credits the new account by `initial_balance_paise` via balanced double-entry ledger entries.
  - If `initial_balance_paise == 0` or omitted: **Does not move money**.
- **Body**:
  ```json
  {
    "name": "Holder 1 Savings",
    "owner_id": 2,
    "initial_balance_paise": 500000
  }
  ```
- **Responses**:
  - `201 Created`: Account details and initial funding transaction ID.
  - `400 Bad Request`: Invalid owner ID, invalid name, or invalid balance.
  - `403 Forbidden`: Non-admin caller.

#### Get Account Details
- **Route & Aliases**: `GET /api/accounts/:id`, `GET /accounts/:id`
- **Who may call it**:
  - `admin`, `auditor`: Any account.
  - `holder`: Only accounts owned by the user (`owner_id === req.user.id`). Other accounts receive `HTTP 403 Forbidden`. Non-existent accounts receive `HTTP 404 Not Found`.
- **What it does to the money**: **Does not move money**. Read-only account query.

#### Get Account Balance
- **Route & Aliases**: `GET /api/accounts/:id/balance`, `GET /accounts/:id/balance`
- **Who may call it**:
  - `admin`, `auditor`: Any account.
  - `holder`: Only accounts owned by the user (`owner_id === req.user.id`). Other accounts receive `HTTP 403 Forbidden`. Non-existent accounts receive `HTTP 404 Not Found`.
- **What it does to the money**: **Does not move money**. Read-only balance query.
- **Responses**:
  - `200 OK`: `{"account": {"id": 2, "account_no": "ACC-H1-01", "balance_paise": 500000, "status": "ACTIVE", "is_external": false}}`

#### Manage Account Status
- **Route & Aliases**: `PATCH /api/accounts/:id/status`, `PATCH /accounts/:id/status`
- **Who may call it**: `admin` only.
- **What it does to the money**: **Does not move money directly**. Changes status (`ACTIVE`, `FROZEN`, `CLOSED`). When set to `FROZEN` or `CLOSED`, freezes money by rejecting all subsequent financial debits, credits, transfers, and withdrawals involving this account.
- **Body**:
  ```json
  {
    "status": "FROZEN"
  }
  ```
- **Responses**:
  - `200 OK`: Updated account metadata.
  - `400 Bad Request`: Invalid status or attempt to change `ACC-EXTERNAL`.
  - `403 Forbidden`: Non-admin caller.

#### Account Statement
- **Route & Aliases**: `GET /api/accounts/:id/statement`, `GET /accounts/:id/statement`
- **Who may call it**:
  - `admin`, `auditor`: Any account.
  - `holder`: Only accounts owned by the user. Other accounts receive `HTTP 403 Forbidden`.
- **What it does to the money**: **Does not move money**. Read-only query of ledger entries, SHA-256 hashes, kinds (`credit`, `debit`, `refused`), and running balances.
- **Query Parameters**: `limit` (default 50, max 100), `offset` (default 0), `order` (`ASC` or `DESC`).

---

### 4. Financial Transactions Endpoints

#### Deposit Funds
- **Route & Aliases**: `POST /api/transactions/deposit`, `POST /api/deposits`, `POST /deposits`
- **Headers**: `Authorization: Bearer <token>`, `Idempotency-Key: <UUID>`
- **Who may call it**: `admin` only (`holder` and `auditor` receive `HTTP 403 Forbidden`).
- **What it does to the money**: **Moves money**. Debits `ACC-EXTERNAL` and credits the recipient account by `amount` paise via atomic double-entry ledger entries. Preserves $\sum \text{Balances} = 0$.
- **Body**:
  ```json
  {
    "account_id": 2,
    "amount": 100000
  }
  ```
- **Responses**:
  - `200 OK`: Successful deposit. Returns debit & credit journal entries. Duplicate requests with identical key and payload return cached response with `Idempotent-Replay: true`.
  - `400 Bad Request`: Missing idempotency key or non-integer paise amount.
  - `403 Forbidden`: Non-admin caller or account is `FROZEN`/`CLOSED`.
  - `422 Unprocessable Entity`: Idempotency key reused with mismatched request payload (`IDEMPOTENCY_KEY_REUSE_PAYLOAD_MISMATCH`).

#### Withdraw Funds
- **Route & Aliases**: `POST /api/transactions/withdraw`, `POST /api/withdrawals`, `POST /withdrawals`
- **Headers**: `Authorization: Bearer <token>`, `Idempotency-Key: <UUID>`
- **Who may call it**: Account owner (`holder` where `owner_id === req.user.id`) or `admin`.
- **What it does to the money**: **Moves money**:
  - If `balance_paise >= amount`: Debits the source customer account and credits `ACC-EXTERNAL` by `amount` paise via balanced double-entry ledger entries.
  - If `balance_paise < amount`: **Moves zero money**. Aborts balance mutation, records a `kind = 'refused'` ledger entry on the source account with `amount_paise = 0`, and returns `HTTP 422 Unprocessable Entity`.
- **Body**:
  ```json
  {
    "account_id": 2,
    "amount": 25000
  }
  ```
- **Responses**:
  - `200 OK`: Successful withdrawal. Duplicate requests return cached response with `Idempotent-Replay: true`.
  - `403 Forbidden`: Account `FROZEN`/`CLOSED`, or caller does not own the account.
  - `422 Unprocessable Entity`: Insufficient available funds (commits `kind='refused'` to ledger) or idempotency key reused with mismatched payload.

#### Transfer Funds
- **Route & Aliases**: `POST /api/transactions/transfer`, `POST /api/transfers`, `POST /transfers`
- **Headers**: `Authorization: Bearer <token>`, `Idempotency-Key: <UUID>`
- **Who may call it**: Source account owner (`holder` where `owner_id === req.user.id`) or `admin`.
- **What it does to the money**: **Moves money**:
  - If `source_balance >= amount`: Debits `from_account_id` and credits `to_account_id` by `amount` paise via balanced double-entry ledger entries. Deterministic ascending row locking (`ORDER BY id ASC`) prevents deadlocks.
  - If `source_balance < amount`: **Moves zero money**. Aborts transfer, records a `kind = 'refused'` ledger entry on the source account, and returns `HTTP 422 Unprocessable Entity`. Destination account statement is completely untouched.
- **Body**:
  ```json
  {
    "from_account_id": 2,
    "to_account_id": 3,
    "amount": 10000
  }
  ```
- **Responses**:
  - `200 OK`: Successful transfer. Duplicate requests return cached response with `Idempotent-Replay: true`.
  - `400 Bad Request`: Same source and destination, or non-integer paise amount.
  - `403 Forbidden`: Source or destination account is `FROZEN`/`CLOSED`, or caller does not own source account.
  - `422 Unprocessable Entity`: Insufficient funds or idempotency key reused with mismatched payload.

#### List Transactions
- **Route & Aliases**: `GET /api/transactions`, `GET /transactions`
- **Who may call it**:
  - `admin`, `auditor`: All system transactions.
  - `holder`: Only transactions involving accounts owned by the user.
- **What it does to the money**: **Does not move money**. Read-only query.
- **Query Parameters**: `limit`, `offset`, `account_id`, `type`, `status`.

#### Get Transaction Details
- **Route & Aliases**: `GET /api/transactions/:id`, `GET /transactions/:id`
- **Who may call it**:
  - `admin`, `auditor`: Any transaction.
  - `holder`: Only transactions where user owns either the source or destination account.
- **What it does to the money**: **Does not move money**. Read-only query of transaction metadata and paired debit/credit journal entries.

---

### 5. Ledger & Integrity Endpoints

#### Query Ledger Journal
- **Route & Aliases**: `GET /api/ledger`, `GET /ledger`
- **Who may call it**:
  - `admin`, `auditor`: Full immutable system ledger.
  - `holder`: Scoped strictly to ledger entries for accounts owned by the user.
- **What it does to the money**: **Does not move money**. Read-only query of append-only ledger entries with continuous SHA-256 hash chains.
- **Query Parameters**: `limit`, `offset`, `account_id`, `txn_id`.

#### Get Ledger by Transaction ID
- **Route & Aliases**: `GET /api/ledger/:transactionId`, `GET /ledger/:transactionId`
- **Who may call it**:
  - `admin`, `auditor`: Any transaction.
  - `holder`: Only transactions involving accounts owned by the user.
- **What it does to the money**: **Does not move money**. Read-only query of journal entries tied to the specified transaction ID.

#### Verify Ledger Mathematical Integrity
- **Route & Aliases**: `GET /api/ledger/verify`, `GET /audit/verify`
- **Who may call it**: `admin`, `auditor` only (`holder` receives `HTTP 403 Forbidden`).
- **What it does to the money**: **Does not move money**. Performs real-time mathematical audits:
  1. **Zero-Sum Conservation**: Verifies $\sum \text{Balances} = 0$ paise across all accounts.
  2. **Hash Chain Verification**: Computes SHA-256 hash chaining row-by-row across the entire ledger table.
  3. **Balance Reconciliation**: Verifies that each account's current balance matches the sum of its credit and debit ledger journal rows.
- **Responses**:
  - `200 OK`: Full integrity audit report.

---

### 6. Audit & Administrative Operations

#### List Audit Logs
- **Route & Aliases**: `GET /api/audit`, `GET /audit`, `GET /api/audit/logs`, `GET /audit/logs`
- **Who may call it**: `admin`, `auditor` only (`holder` receives `HTTP 403 Forbidden`).
- **What it does to the money**: **Does not move money**. Read-only query of structured security audit events.
- **Query Parameters**: `limit`, `offset`, `action`, `outcome`, `actor_id`.

#### List Duplicate Replays
- **Route & Aliases**: `GET /api/audit/duplicates`, `GET /audit/duplicates`
- **Who may call it**: `admin`, `auditor` only (`holder` receives `HTTP 403 Forbidden`).
- **What it does to the money**: **Does not move money**. Read-only query of duplicate idempotency key replay attempts.

#### Get Audit Log by ID
- **Route & Aliases**: `GET /api/audit/:id`, `GET /audit/:id`, `GET /api/audit/logs/:id`, `GET /audit/logs/:id`
- **Who may call it**: `admin`, `auditor` only (`holder` receives `HTTP 403 Forbidden`).
- **What it does to the money**: **Does not move money**. Read-only query of a specific audit log record.

#### List Registered Users
- **Route & Aliases**: `GET /api/admin/users`, `GET /admin/users`
- **Who may call it**: `admin` only (`holder` and `auditor` receive `HTTP 403 Forbidden`).
- **What it does to the money**: **Does not move money**. Read-only query of registered system users.

#### Administrative System Overview
- **Route & Aliases**: `GET /api/admin/overview`, `GET /admin/overview`
- **Who may call it**: `admin`, `auditor` only (`holder` receives `HTTP 403 Forbidden`).
- **What it does to the money**: **Does not move money**. Returns aggregated financial statistics: total customer deposits, clearing float reserve, active/frozen/closed account tallies, and integrity status.
