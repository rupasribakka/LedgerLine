# LedgerLine — Comprehensive STRIDE Threat Model, Invariant Protections & Risk Register

This document formalizes the threat model for **LedgerLine**, aligned with the **STRIDE** methodology (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) tailored specifically for mission-critical financial ledger applications.

Each threat is mapped directly to the automated test that enforces its defense, or explicitly classified as an **ACCEPTED RISK** with an honest technical justification.

---

## 1. Core Threat Matrix

| Threat ID | STRIDE Category | Description & Attack Scenario | LedgerLine Mitigation | Test Coverage or ACCEPTED RISK |
|---|---|---|---|---|
| **T-01** | **Tampering / Arithmetic Error** | Floating-point rounding inaccuracies in balance computations (`0.1 + 0.2 !== 0.3`). Accumulation of fractional paise causes slow balance drift over thousands of transactions. | Store and calculate all balances, deposits, withdrawals, and transfers strictly as positive integers in paise (`₹1.00 = 100 paise`) using `BigInt` and PostgreSQL `BIGINT`. Decimals, floats, strings, negative amounts, and NaN are rejected with `HTTP 400`. | `tests/phase3.test.js` > *HARD RULE 1: Amount and Input Validations* > `should reject non-integer / floating-point amounts` |
| **T-02** | **Tampering / Race Condition** | Concurrent double spending across simultaneous requests. An attacker fires two concurrent ₹800 withdrawal requests on a balance of ₹1,000, attempting to debit ₹1,600 before either transaction commits. | All balance checks and mutations execute inside atomic PostgreSQL transactions serialized by `SELECT ... FOR UPDATE ORDER BY id ASC` pessimistic row locks. Exactly one request succeeds; the second reads the updated balance and receives `HTTP 422 Unprocessable Entity`. | `tests/phase6.complete_backend.test.js` > *3. Concurrency Protection & Double Spending Prevention (Section 11)* > `simultaneous withdrawals: exactly ONE request succeeds, balance remains positive` |
| **T-03** | **Repudiation / Replay** | Network timeout causes duplicate payment submissions. A network glitch causes client timeout after server debits an account; user clicks "Pay" again, causing double debit. | Every mutating endpoint requires a unique client-generated UUID `Idempotency-Key` header. Requests are claimed atomically in `idempotency_keys`. Replaying the same key with identical payload returns the cached response with the `Idempotent-Replay: true` HTTP response header without re-executing. Reusing the key with a different body returns `HTTP 422`. | `tests/phase3.test.js` > *HARD RULE 5: Idempotency Protection, Replays & Payload Mismatch* > `should return identical response with Idempotent-Replay header when repeating same key + body` |
| **T-04** | **Tampering / Accounting Drift** | Unbalanced financial movements creating or destroying money out of thin air. A buggy deposit or transfer creates a debit entry without a matching credit entry. | Every movement strictly creates balanced credit and debit ledger entries within an atomic transaction. For every transaction: $\sum \text{Debits} = \sum \text{Credits}$. Initial opening balances are funded via real double-entry entries from `ACC-EXTERNAL`. Total system balance is continuously zero ($\sum \text{Balances} = 0$). | `tests/phase1.test.js` > *Seed Data Verification* > `should confirm global ledger balance conservation (sum of all balances === 0)` |
| **T-05** | **Tampering / Ledger Alteration** | Direct modification or deletion of past financial records. A rogue administrator or attacker updates past ledger rows to alter historical transaction amounts or erase debits. | Database triggers `prevent_ledger_mutation` and `prevent_ledger_truncate` block `UPDATE`, `DELETE`, and `TRUNCATE` operations on `ledger` and `audit_logs`. Each row includes a SHA-256 hash linked to the previous row. Tampering breaks the hash chain and is flagged by `GET /api/ledger/verify`. | `tests/phase1.test.js` > *HARD RULE 6: Immutability Triggers (Append-Only Enforcement)* > `should block UPDATE on ledger table via row trigger` |
| **T-06** | **Elevation of Privilege / Overdraft** | Negative balance generation. An account holder issues a withdrawal larger than their settled available balance, causing an unauthorized credit line. | Multiple layers of defense: `postMovement` performs balance validation after acquiring pessimistic row locks. The database check constraint `chk_no_overdraft` guarantees that an overdraft can never commit at the storage layer. Refused attempts write a `kind='refused'` ledger entry with 0 balance mutation. | `tests/phase1.test.js` > *HARD RULE 3: DB Overdraft Constraint Enforcement* > `should reject a negative balance on a non-external account at the DB level` |
| **T-07** | **Elevation of Privilege / Auth Bypass & IDOR** | Insecure Direct Object Reference (IDOR). User A alters `accountId` or `from_account_id` in a payload to debit User B's account. | Server-side authorization helper `canMoveFrom` validates cryptographic JWT identity and checks account ownership fresh from the database on every authenticated request prior to querying or locking records. Unauthorized attempts are rejected with `HTTP 403 Forbidden`. | `tests/phase2.test.js` > *Server-Side canMoveFrom Authorization Helper (Hard Rule 9 & 10)* > `holder1 should NOT be permitted to move from holder2 account ACC-H2-01` |
| **T-08** | **Repudiation / Covert Probing** | Unlogged rejected or suspicious transaction attempts. An attacker probes the API with invalid credentials or bad balances, but leaves no trace for security teams. | All sensitive actions (failed/successful logins, registrations, account creations, status changes, deposits, withdrawals, transfers, and refusals) are written to an append-only `audit_logs` table protected by immutability triggers. | `tests/phase6.complete_backend.test.js` > *6. Database Immutability of Audit Logs* > `should reject UPDATE on audit_logs table via database trigger` |
| **T-09** | **Autonomous AI Escalation** | AI agents autonomously initiating or authorizing money movement. An autonomous LLM agent connected to an API initiates fund transfers without direct human approval or cryptographic signature. | **Zero AI Autonomy Invariant**: Financial movements require explicit user or administrator initiation. AI assistants may summarize and analyze, but cannot independently sign, initiate, or approve money transfers. | **ACCEPTED RISK**: The API endpoints enforce cryptographic JWT authorization and RBAC, but cannot determine whether the calling human client is running an automated agent script. Defended operationally by bearer token scoping, short session lifespans, and requirement of human-in-the-loop confirmation before initiating calls. |
| **T-10** | **Denial of Service / Deadlock** | Concurrent circular transfers causing database deadlocks. User A transfers to User B while User B simultaneously transfers to User A, resulting in mutual lock waits and aborted transactions. | All multi-account locks are acquired in strictly deterministic ascending primary-key order (`ORDER BY id ASC`). Circular transfer requests acquire locks in identical sequence, eliminating cyclic wait conditions. | `tests/phase6.complete_backend.test.js` > *3. Concurrency Protection & Double Spending Prevention (Section 11)* > `simultaneous circular transfers: both complete without deadlocking` |
| **T-11** | **Elevation of Privilege / Account Lifecycle** | Transacting through frozen or closed accounts. An account is frozen due to fraud investigation, but continuing requests still move money. | `postMovement` validates that source and destination accounts are `ACTIVE`. Transfers involving `FROZEN` or `CLOSED` accounts are rejected with `HTTP 403 Forbidden`. Status transitions are restricted to administrators. | `tests/phase6.complete_backend.test.js` > *2. Account Management & Status Lifecycle (Section 7)* > `Financial operations reject transactions on FROZEN accounts` |
| **T-12** | **Denial of Service / JSON Flooding** | Volumetric JSON payload flooding targeting server memory. Attacker posts megabyte-sized JSON bodies to exhaust Node.js event loop memory. | Strict request body limit of `10kb` enforced by `express.json({ limit: '10kb' })` in `src/app.js`. Payloads exceeding 10kb are aborted immediately with `HTTP 413 Payload Too Large`. | `tests/phase5.security.test.js` > *Items 2.a - 2.k Specification Verification* > `2.g: security headers, 10kb body limit, CORS allow-list from env` |
| **T-13** | **Spoofing / JWT Alg None & Signature Tampering** | An attacker crafts a JWT with `alg: "none"` or modifies claims (e.g. escalating role from `holder` to `admin`). | JWT verification uses explicit HMAC-SHA256 (`HS256`) algorithms. Crucially, the server re-reads the user's role fresh from the database on every authenticated request (`Hard Rule 9`). Modifying claims in a token has zero effect on authorization. | `tests/phase5.security.test.js` > *Items 2.a - 2.k Specification Verification* > `2.e: JWT with alg none and tampered tokens are rejected` |

---

## 2. In-Depth Operational, Deployment & Edge-Case Threat Analysis

### 1. Refused-Row Spam into a Victim's Statement
- **Threat Mechanism**: An attacker repeatedly fires transfers targeting a victim's account with insufficient funds, hoping to fill the victim's account statement with spam `refused` entries.
- **LedgerLine Defense**:
  - `canMoveFrom` checks ownership of the *source* account before any funds or balance checks occur.
  - When a transfer fails due to insufficient funds, a `kind = 'refused'` entry is recorded **only on the sender's account** ledger journal.
  - The victim's account is never locked or modified, and no refused rows are injected into the victim's statement.
  - For the sender's own statement, pagination (`limit`, `offset`) prevents unbounded payload retrieval.
- **Covering Test**: `tests/phase4.test.js` > *Statement — refused rows* > `refused (overdraft) attempt appears in statement as kind=refused`
- **Covering IDOR Test**: `tests/phase3.test.js` > *HARD RULE 9 & 10: Authorization Restrictions on Money Movements* > `holder2 should receive 403 when attempting to transfer from holder1 account`

### 2. 404 vs 403 Account Enumeration
- **Threat Mechanism**: An attacker probes sequential account IDs (e.g. `/api/accounts/1`, `/api/accounts/2`, `/api/accounts/999`) to map out which account IDs exist versus which do not.
- **Current Behavior**:
  - If an account ID does not exist in the database, the server returns `HTTP 404 Not Found` (`code: 'NOT_FOUND'`).
  - If an account ID exists but belongs to another account holder, the server returns `HTTP 403 Forbidden` (`code: 'FORBIDDEN'`).
- **Covering Tests**:
  - `tests/phase2.test.js` > *Accounts API Endpoints* > `GET /accounts/:id: returns 404 for non-existent account`
  - `tests/phase2.test.js` > *Accounts API Endpoints* > `GET /accounts/:id: holder1 CANNOT view holder2 account ACC-H2-01 (403 Forbidden)`
- **ACCEPTED RISK**: Differentiating between 404 (non-existent) and 403 (unauthorized) technically allows an authenticated user to infer whether a specific integer account ID is registered. This is an accepted engineering trade-off for actionable API debugging. The security impact is negligible because:
  1. Knowing an account ID grants zero access to its balance, statements, or transactions.
  2. Account mutations require `canMoveFrom` ownership validation.
  3. External-facing identifiers use unpredictable alphanumeric codes (`ACC-H1-01`).

### 3. Admin Abuse
- **Threat Mechanism**: A malicious or compromised administrator uses privileged credentials to freeze legitimate customer accounts, siphon liquidity through unauthorized deposits from `ACC-EXTERNAL`, or create dummy auditor accounts.
- **LedgerLine Defense**:
  - **Zero Unilateral Alteration**: Admins cannot modify or delete historical ledger rows. Immutability triggers reject all `UPDATE`/`DELETE` calls regardless of user role.
  - **Zero-Sum Accounting Bound**: Admins cannot create money from thin air; every deposit must explicitly debit `ACC-EXTERNAL` and is bounded by strict integer limits.
  - **Full Audit Traceability**: Every admin action (status updates, deposits, user registrations) is recorded in the append-only `audit_logs` table with actor ID, IP address, timestamp, and metadata.
- **Covering Tests**:
  - `tests/phase1.test.js` > *HARD RULE 6: Immutability Triggers (Append-Only Enforcement)* > `should block UPDATE on ledger table via row trigger`
  - `tests/phase6.complete_backend.test.js` > *5. Audit Logging & Administrative Controls* > `GET /api/audit: lists structured immutable audit logs for auditor and admin`
- **ACCEPTED RISK**: Legitimate administrative powers (freezing accounts for AML/fraud compliance, provisioning opening balances) cannot be programmatically eliminated without paralyzing operations. Full mitigation against compromised super-admins requires organizational dual-control (four-eyes principle) and multi-signature authorization on admin endpoints (future architectural roadmap).

### 4. Brute-Force Login
- **Threat Mechanism**: An attacker launches automated dictionary or credential-stuffing attacks against `POST /api/auth/login`.
- **LedgerLine Defense**:
  - In-memory sliding-window rate limiter tracks failed attempts keyed by `IP + email` pair.
  - After 5 failed attempts within a 60-second window, subsequent login requests are blocked with `HTTP 429 Too Many Requests`.
  - Failed logins are recorded in `audit_logs` (capped per window to prevent audit log flooding).
- **Covering Tests**:
  - `tests/phase2.test.js` > *Login & Rate Limiting (POST /auth/login)* > `should rate limit after repeated failed login attempts`
  - `tests/phase5.security.test.js` > *Items 2.a - 2.k Specification Verification* > `2.i: failed-login audit logging is capped`

### 5. Idempotency Key Table Growth
- **Threat Mechanism**: High-volume financial transaction traffic creates millions of rows in `idempotency_keys` (storing request hash, response body, and status), leading to disk storage bloat.
- **Status**: **ACCEPTED RISK**
- **Honest Reason**: In the current implementation, idempotency records are never deleted to guarantee that historical replays can be detected indefinitely without time-based replay vulnerabilities. In high-throughput production, an automated archival policy (e.g. table partitioning with 90-day retention, after which duplicate checks fall back to immutable ledger transaction history) would be required to manage long-term PostgreSQL disk footprint.

### 6. Owner-Role Rewriting of the Hash Chain
- **Threat Mechanism**: A PostgreSQL superuser or database owner (`postgres` or table owner) accesses the database directly, disables triggers (`ALTER TABLE ledger DISABLE TRIGGER ALL`), rewrites historical ledger rows, recomputes SHA-256 hashes down the chain, and re-enables triggers.
- **LedgerLine Defense**:
  - Least-privilege runtime role: `assertProductionRuntimeRole` verifies that the application connects as a restricted role (`ledgerline_runtime`) that only possesses `SELECT` and `INSERT` privileges. The runtime role lacks `SUPERUSER`, `CREATEROLE`, or DDL privileges and cannot disable triggers.
- **Covering Test**: `tests/phase5.security.test.js` > *HARD RULE 7: Runtime Role Least-Privilege Verification* > `should reject startup if running as postgres superuser in production`
- **ACCEPTED RISK**: Cryptographic hash chains stored within the same relational database engine cannot defend against an attacker who possesses physical host root or PostgreSQL superuser credentials. Full cryptographic immutability requires external anchoring (e.g. periodic RFC 3161 timestamping authority publication or public blockchain anchoring of `GET /api/ledger/verify` root hashes).

### 7. Token Kept in Memory Only
- **Threat Mechanism**: The client web application stores JWT authentication tokens strictly in JavaScript memory (`let inMemoryToken = null` in `client/src/services/api.js`) and never writes them to `localStorage` or `sessionStorage`.
- **Security Benefit**: Completely prevents token theft via Cross-Site Scripting (XSS) persistent storage extraction.
- **Status**: **ACCEPTED RISK (UX Tradeoff)**
- **Honest Reason**: Because tokens are kept in memory only, refreshing the browser or opening a new browser tab clears the session, returning the user to the login screen. This is a deliberate, accepted security-first design trade-off prioritizing token safety over tab-persistence convenience.

### 8. Public Demo Credentials
- **Threat Mechanism**: Development environments use known pre-seeded accounts (`admin@example.com`, `holder1@example.com`, `auditor@example.com` with password `Password123!`). If deployed to production, attackers could immediately take over the system.
- **LedgerLine Defense**:
  - `src/seed.js` and `src/config.js` enforce that `ALLOW_DEV_SEED` is strictly rejected when `NODE_ENV === 'production'`.
  - Production boot fails fast if `JWT_SECRET` is missing, shorter than 32 characters, or uses known development placeholder strings.
- **Covering Tests**:
  - `tests/phase5.security.test.js` > *Phase 5 - Security configuration and production defaults* > `does not seed demo users in production, even when the flag is set`
  - `tests/phase5.security.test.js` > *Phase 5 - Security configuration and production defaults* > `rejects a missing JWT secret and weak production secrets`

### 9. CORS on a Same-Origin Deployment
- **Threat Mechanism**: In a production single-container deployment where Express serves both the API and the compiled React frontend, cross-origin requests do not occur during normal browsing. An attacker might attempt to exploit permissive CORS headers from malicious origins.
- **LedgerLine Defense**:
  - In same-origin deployments, browser security applies the Same-Origin Policy (SOP) natively.
  - For cross-origin environments, `CORS_ALLOWED_ORIGINS` strictly controls the `Access-Control-Allow-Origin` header; unlisted origins receive no allow header.
  - Manual security headers enforce `Content-Security-Policy: default-src 'self'; connect-src 'self'`, restricting all fetch and XHR calls exclusively to the same origin.
- **Covering Test**: `tests/phase5.security.test.js` > *Items 2.a - 2.k Specification Verification* > `2.g: security headers, 10kb body limit, CORS allow-list from env`

### 10. Free-Plan Sleep (Container Cold Starts & Dyno Cycling)
- **Threat Mechanism**: Hosting the application on free serverless or container platforms (e.g. Render, Railway, Fly.io free tiers) results in instance sleep after inactivity. When the container restarts:
  - In-memory rate limiting counters reset to zero.
  - In-flight requests during shutdown may encounter timeouts.
- **LedgerLine Defense**:
  - All financial state, ledger journals, and idempotency keys reside permanently in persistent PostgreSQL storage. Instance restarts cause zero balance drift or ledger corruption.
- **Status**: **ACCEPTED RISK**
- **Honest Reason**: In-memory sliding-window rate limiters restart from zero when free-tier container instances cycle. Additionally, cold-start delays increase response latency for the initial request. Production deployments require persistent Redis rate limiters and dedicated, always-on container instances.

### 11. Attack-Script Test Accounts Left in Live Database
- **Threat Mechanism**: Running live attack scenarios (e.g. via the Attack Lab page or automated concurrency test suites) against the database creates high-volume debits, concurrent collisions, and refused ledger rows.
- **LedgerLine Defense**:
  - Attack Lab scenarios execute strictly within double-entry transaction boundaries. Row locks and `chk_no_overdraft` constraints guarantee that even live concurrency stress testing cannot cause negative balances or invariant drift ($\sum \text{Balances} = 0$ is conserved at all times).
- **Covering Tests**:
  - `tests/phase6.complete_backend.test.js` > *3. Concurrency Protection & Double Spending Prevention (Section 11)* > `high-concurrency race condition: multiple parallel requests and repeated rounds strictly prevent double spending`
  - `tests/phase1.test.js` > *Seed Data Verification* > `should confirm global ledger balance conservation (sum of all balances === 0)`
- **ACCEPTED RISK**: Because the ledger is append-only, refused and completed transactions generated by attack tests remain permanently in the ledger journal and cannot be purged without breaking hash chain continuity. In production environments, attack simulations must be executed only on dedicated pre-production staging databases.

---

## 3. Invariants Enforced in the System

- [x] Strict security headers configured manually in `src/app.js` (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 0`, `Strict-Transport-Security`, and `Content-Security-Policy: default-src 'self'; connect-src 'self'`).
- [x] CORS origin restriction and strict 10kb request body limiting (`express.json({ limit: '10kb' })`).
- [x] PostgreSQL relational schema with exact integer paise fields (`BIGINT`).
- [x] PostgreSQL check constraints ensuring `balance_paise >= 0` on non-external accounts (`chk_no_overdraft`).
- [x] Deterministic ascending pessimistic row locking (`SELECT ... FOR UPDATE ORDER BY id ASC`).
- [x] Atomic database transaction wrappers (`withTransaction`).
- [x] Double-entry conservation across all money movements ($\sum \text{Debits} == \sum \text{Credits}$, $\sum \text{Balances} == 0$).
- [x] Append-only database triggers prohibiting `UPDATE`, `DELETE`, and `TRUNCATE` on `ledger` and `audit_logs`.
- [x] Scoped idempotency engine returning cached responses with the `Idempotent-Replay: true` HTTP response header.
- [x] Comprehensive immutable audit trail (`audit_logs`) recording sensitive and rejected transactions.
- [x] Account status lifecycle enforcement (`ACTIVE`, `FROZEN`, `CLOSED`).
- [x] In-memory JWT token handling on the client to eliminate persistent storage XSS token leakage.

---

## 4. Cryptographic Hash Chain Limitation & Mitigations

### Limitation
A cryptographic hash chain stored in the same database table detects unauthorized modification by attackers who alter individual rows. However, a privileged database administrator with full write access could theoretically rewrite the entire chain from the tampered row forward, recomputing valid SHA-256 hashes for all subsequent rows.

### Mitigations Implemented in LedgerLine
1. **Least-Privilege Database Roles**: The runtime application role (`ledgerline_runtime`) has only `SELECT` and `INSERT` privileges on `ledger`—it cannot update or delete rows under any circumstances.
2. **PL/pgSQL Immutability Triggers**: Row and statement triggers prevent `UPDATE`, `DELETE`, and `TRUNCATE` operations on `ledger` and `audit_logs`.
3. **Independent Audit Log Journal**: A separate immutable `audit_logs` table logs all actions independently of the ledger journal.
4. **External Anchoring Readiness**: The `GET /api/ledger/verify` endpoint computes the latest account state and chain hashes, suitable for periodic anchoring to an external tamper-proof store (such as a public blockchain, RFC 3161 timestamping authority, or write-once cloud storage).
