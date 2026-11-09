# LedgerLine — API Specification & Integration Guide

The LedgerLine backend exposes a RESTful API with JSON request and response payloads.

## Common Headers

- `Authorization: Bearer <JWT>`: Required for authenticated endpoints.
- `Idempotency-Key: <UUID>`: Required on all financial mutating endpoints (`/api/transactions/*`, `/deposits`, `/withdrawals`, `/transfers`).
- `Content-Type: application/json`: Required on endpoints accepting request bodies.

---

## 1. Authentication Endpoints

### Register User
- **`POST /api/auth/register`** (or `/auth/register`)
- **Headers**: Optional `Authorization: Bearer <token>` (required when creating users with `admin` or `auditor` roles)
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
  - `400 Bad Request`: Weak password or invalid email.
  - `403 Forbidden`: Unauthorized role escalation attempt (e.g. creating `admin` or `auditor` without admin credentials).
  - `409 Conflict`: Email already exists.

### Login
- **`POST /api/auth/login`** (or `/auth/login`)
- **Headers**: None
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Responses**:
  - `200 OK`: Returns JWT token and user profile (`id`, `email`, `role`).
  - `401 Unauthorized`: Invalid credentials.
  - `429 Too Many Requests`: Rate limit triggered (5 attempts per window).

### Logout
- **`POST /api/auth/logout`** (or `/auth/logout`)
- **Headers**: `Authorization: Bearer <token>` (optional)
- **Responses**:
  - `200 OK`: Acknowledges logout and writes an audit log event.

### Current User Profile
- **`GET /api/auth/me`** (or `/auth/me`)
- **Headers**: `Authorization: Bearer <token>`
- **Responses**:
  - `200 OK`: Returns fresh user profile fetched from DB.

---

## 2. Accounts Endpoints

### List Accounts
- **`GET /api/accounts`** (or `/accounts`)
- **Headers**: `Authorization: Bearer <token>`
- **Permissions**:
  - `admin` / `auditor`: Returns all accounts.
  - `holder`: Returns only accounts owned by the authenticated user.
- **Responses**:
  - `200 OK`: Array of accounts.

### Create Account
- **`POST /api/accounts`** (or `/accounts`)
- **Headers**: `Authorization: Bearer <token>`
- **Permissions**: `admin` only.
- **Body**:
  ```json
  {
    "name": "Holder 1 Savings Account",
    "owner_id": 2,
    "initial_balance_paise": 50000
  }
  ```
- **Responses**:
  - `201 Created`: Returns created account details. Initial balances are funded via a recorded double-entry deposit from `ACC-EXTERNAL`.

### Get Account Details
- **`GET /api/accounts/:id`** (or `/accounts/:id`)
- **Headers**: `Authorization: Bearer <token>`
- **Responses**:
  - `200 OK`: Account metadata and balance.
  - `403 Forbidden`: If account holder does not own this account.
  - `404 Not Found`: Account does not exist.

### Get Account Balance
- **`GET /api/accounts/:id/balance`**
- **Headers**: `Authorization: Bearer <token>`
- **Responses**:
  - `200 OK`: `{ "account": { "id": 1, "account_no": "ACC-H1-01", "balance_paise": 500000, "status": "ACTIVE", "is_external": false } }`.

### Manage Account Status
- **`PATCH /api/accounts/:id/status`**
- **Headers**: `Authorization: Bearer <token>`
- **Permissions**: `admin` only.
- **Body**:
  ```json
  {
    "status": "FROZEN"
  }
  ```
  Allowed values: `ACTIVE`, `FROZEN`, `CLOSED`.
- **Responses**:
  - `200 OK`: Updated account.
  - `400 Bad Request`: Invalid status or attempt to change external clearing account.

### Account Statement
- **`GET /api/accounts/:id/statement`**
- **Query Parameters**:
  - `limit`: Number of rows (default 50, max 100).
  - `offset`: Pagination offset (default 0).
  - `order`: `ASC` or `DESC` (default `DESC`).
- **Responses**:
  - `200 OK`: Statement entries including `kind` (`debit`, `credit`, `refused`), `amount_paise`, `balance_after_paise`, `hash`, `prev_hash`, `is_replayed`, and pagination metadata.

---

## 3. Financial Transactions Endpoints

### Deposit Funds
- **`POST /api/transactions/deposit`** (or `/deposits`)
- **Headers**: `Authorization: Bearer <token>`, `Idempotency-Key: <UUID>`
- **Permissions**: `admin` only.
- **Body**:
  ```json
  {
    "account_id": 2,
    "amount": 100000
  }
  ```
- **Responses**:
  - `200 OK`: Successful deposit. Returns debit & credit journal entries and updated balances.
  - `400 Bad Request`: Missing idempotency key or invalid amount.
  - `403 Forbidden`: Account holder attempted direct deposit or account is frozen/closed.
  - `422 Unprocessable Entity`: Idempotency key reused with mismatched request payload (`IDEMPOTENCY_KEY_REUSE_PAYLOAD_MISMATCH`).

### Withdraw Funds
- **`POST /api/transactions/withdraw`** (or `/withdrawals`)
- **Headers**: `Authorization: Bearer <token>`, `Idempotency-Key: <UUID>`
- **Permissions**: Account owner or admin.
- **Body**:
  ```json
  {
    "account_id": 2,
    "amount": 25000
  }
  ```
- **Responses**:
  - `200 OK`: Successful withdrawal.
  - `403 Forbidden`: Account frozen/closed or holder does not own account.
  - `422 Unprocessable Entity`: Insufficient available funds (commits kind=`refused` to ledger) or idempotency key reused with mismatched request payload (`IDEMPOTENCY_KEY_REUSE_PAYLOAD_MISMATCH`).

### Transfer Funds
- **`POST /api/transactions/transfer`** (or `/transfers`)
- **Headers**: `Authorization: Bearer <token>`, `Idempotency-Key: <UUID>`
- **Permissions**: Account owner or admin.
- **Body**:
  ```json
  {
    "from_account_id": 2,
    "to_account_id": 3,
    "amount": 10000
  }
  ```
- **Responses**:
  - `200 OK`: Successful transfer.
  - `400 Bad Request`: Same source and destination.
  - `403 Forbidden`: Account frozen/closed or unauthorized source.
  - `422 Unprocessable Entity`: Insufficient funds or idempotency key reused with mismatched request payload (`IDEMPOTENCY_KEY_REUSE_PAYLOAD_MISMATCH`).

### List Transactions
- **`GET /api/transactions`** (or `/transactions`)
- **Query Parameters**: `limit`, `offset`, `account_id`, `type`, `status`.
- **Permissions**: Holders view own transactions; Admin & Auditor view all.

### Get Transaction Details
- **`GET /api/transactions/:id`** (or `/transactions/:id`)
- **Responses**: Full transaction metadata, status, from/to accounts, and paired ledger journal entries.

---

## 4. Ledger Endpoints

### Query Ledger
- **`GET /api/ledger`** (or `/ledger`)
- **Query Parameters**: `limit`, `offset`, `account_id`, `txn_id`.
- **Responses**: Raw immutable ledger entries with SHA-256 hashes and sequence links.

### Get Ledger by Transaction ID
- **`GET /api/ledger/:transactionId`**
- **Responses**: All journal entries tied to the transaction.

### Verify Ledger Integrity
- **`GET /api/ledger/verify`** (or `/audit/verify`)
- **Permissions**: `admin`, `auditor`.
- **Responses**:
  - `200 OK`: Full verification report including `global_conservation`, `hash_chain`, and `balance_reconciliation` statuses.

---

## 5. Audit & Admin Endpoints

### List Audit Logs
- **`GET /api/audit`** (or `/audit`)
- **Permissions**: `admin`, `auditor`.
- **Query Parameters**: `limit`, `offset`, `action`, `outcome`, `actor_id`.
- **Responses**: Paginated security audit events.

### Get Audit Log by ID
- **`GET /api/audit/:id`**
- **Permissions**: `admin`, `auditor`.

### List Duplicate Replays
- **`GET /api/audit/duplicates`** (or `/audit/duplicates`)
- **Permissions**: `admin`, `auditor`.

### List Users (Admin)
- **`GET /api/admin/users`**
- **Permissions**: `admin` only.

### System Overview (Admin & Auditor)
- **`GET /api/admin/overview`**
- **Permissions**: `admin`, `auditor`.
- **Responses**: Aggregated system metrics (user count, active/frozen/closed accounts, customer deposits, reserve balance, transaction volume, verification health).
