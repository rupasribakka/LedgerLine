# LedgerLine — Application & Financial Security Architecture

## 1. Authentication & Authorization Security

### Password Security
- Passwords are salted and hashed using **bcryptjs** with a cost factor of 10.
- Raw passwords and hashes are never returned in API responses or logged in audit records.
- Input validation rejects passwords shorter than 8 characters.

### Cryptographic JWT Token Handling
- Tokens carry minimal claims (`id`, `role`).
- Server re-reads the user's role and account status fresh from the database on every authenticated request (`Hard Rule 9`). Modifying role claims in a token has zero effect on authorization.
- In production, `JWT_SECRET` must be a high-entropy cryptographically random string of at least 32 bytes; development placeholder values are rejected at startup.

### Brute-Force Rate Limiting
- Login attempts are throttled by an in-memory sliding-window rate limiter (5 failed attempts per IP + email pair per 60 seconds).
- Repeated violations trigger `HTTP 429 Too Many Requests`.

### Role-Based Access Control (RBAC) & IDOR Protection
- Roles are strictly enforced on the server:
  - **ADMIN**: Manages permitted accounts, freezes/closes accounts, initiates system deposits, views all statements, transactions, and audit records.
  - **ACCOUNT_HOLDER**: Operates strictly on accounts where `owner_id === req.user.id`. Any attempt to access, debit, or view statements of another user's account is rejected with `HTTP 403 Forbidden` prior to querying or locking records.
  - **AUDITOR**: Strictly read-only access across all accounts, ledger journals, audit logs, and reconciliation endpoints. Any mutating operation (deposit, withdraw, transfer, status change) is immediately rejected with `HTTP 403 Forbidden`.

---

## 2. Financial Security & Invariant Defenses

### Integer Paise Arithmetic
- Financial amounts are parsed and validated as positive `BigInt` paise values.
- Decimals, floats, negative numbers, zero, NaN, strings, and values exceeding the system cap (10,000,000 paise / ₹100,000.00) are rejected with `HTTP 400 Bad Request`.

### Concurrency Protection & Serialized Execution
- Balances are checked and updated inside an atomic PostgreSQL transaction.
- Row-level locks (`SELECT ... FOR UPDATE ORDER BY id ASC`) ensure that racing requests on the same account are executed sequentially.
- If two simultaneous ₹800 withdrawals target an account with ₹1,000, the first request acquires the lock and debits ₹800 (leaving ₹200). The second request waits, reads the updated balance of ₹200, and is rejected for insufficient funds with `HTTP 422 Unprocessable Entity`.
- The database check constraint `chk_no_overdraft` guarantees that an overdraft can never commit even in the event of an application logic bug.

### Double-Entry Accounting Invariant
- Money cannot be created or destroyed out of thin air.
- Every transaction creates matched debit and credit entries.
- The global sum of all accounts (including the external clearing account `ACC-EXTERNAL`) is continuously equal to 0 paise.

### Append-Only Ledger & SHA-256 Hash Chaining
- Table-level database triggers prohibit `UPDATE`, `DELETE`, and `TRUNCATE` operations on `ledger` and `audit_logs`.
- Each journal row records a SHA-256 hash computed deterministically from:
  $$\text{hash} = \text{SHA256}(\text{prev\_hash} \parallel \text{txn\_id} \parallel \text{account\_id} \parallel \text{kind} \parallel \text{amount\_paise} \parallel \text{balance\_after\_paise} \parallel \text{initiated\_by} \parallel \text{idempotency\_key} \parallel \text{reason})$$
- Any unauthorized direct database modification of a past row breaks the hash link with all subsequent rows and is immediately flagged by `GET /api/ledger/verify`.

---

## 3. Network & Application Defense

- **Security Headers (Set Manually)**: Configured manually in `src/app.js` with `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 0`, `Strict-Transport-Security: max-age=31536000; includeSubDomains`, and `Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'`.
- **CORS Restriction**: Safe origin handling and controlled allowed headers.
- **Request Size Limiting**: `express.json({ limit: '10kb' })` enforces a strict 10kb body limit to mitigate JSON body flooding attacks.
- **Idempotency Replay Header**: Duplicate requests matching an existing idempotency key and identical payload return the cached response with the `Idempotent-Replay: true` HTTP response header without re-executing or altering balances.
- **Error Sanitization**: Server-side error handlers strip internal database connection strings, table structures, and stack traces before responding to clients.
- **SQL Parameterization**: 100% of queries use `$1, $2, ...` parameterized bindings, preventing SQL injection vulnerabilities.
