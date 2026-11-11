# BalanceVault (formerly LedgerLine) — Complete Prompts & Architectural Record (PROMPTS.md)

This document contains the complete record of user specifications, engineering prompts, architectural decisions, and design choices established throughout the development of **BalanceVault** (powered by the LedgerLine Invariant Core).

---

## Table of Contents
1. [Phase 1: Project Setup & Core Foundations](#phase-1-project-setup--core-foundations)
2. [Phase 2: Double-Entry Ledger Engine & Cryptographic Hash Chaining](#phase-2-double-entry-ledger-engine--cryptographic-hash-chaining)
3. [Phase 3: Authentication, RBAC & Sliding-Window Rate Limiting](#phase-3-authentication-rbac--sliding-window-rate-limiting)
4. [Phase 4: Concurrency Control, Deadlock Prevention & Idempotency](#phase-4-concurrency-control-deadlock-prevention--idempotency)
5. [Phase 5: Database Hardening, Least Privilege & Zero-Sum Audits](#phase-5-database-hardening-least-privilege--zero-sum-audits)
6. [Phase 6: Full Backend Test Specification & Invariant Verification](#phase-6-full-backend-test-specification--invariant-verification)
7. [Phase 7: Cloud Production Deployment (Render + Neon + Vercel)](#phase-7-cloud-production-deployment-render--neon--vercel)
8. [Phase 8: BalanceVault Premium Cybersecurity Blue Redesign](#phase-8-balancevault-premium-cybersecurity-blue-redesign)

---

## Phase 1: Project Setup & Core Foundations

### Specification Prompt
```text
Act as a senior full-stack developer, financial systems architect, and UI/UX designer.
I am building LedgerLine, a secure financial transaction and ledger management system for handling deposits, withdrawals, and transfers without duplicate payments, unauthorized access, negative balances, or ledger tampering.

Technology stack:
- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- Database: PostgreSQL + Prisma ORM
- Authentication: JWT + bcrypt
- Testing: Vitest / Supertest
- Version control: Git + GitHub

Key Tasks:
1. Inspect the workspace and establish clean directory layout.
2. Set up React + Vite frontend and Express backend.
3. Establish integer paise precision rule (1 INR = 100 paise) to prevent floating-point representation drift.
4. Add basic health-check endpoints (/api/health).
5. Establish clean Git repository with proper .gitignore rules.
```

### Architectural Decisions
- **Integer Paise Representation**: All monetary values are strictly represented as integers in paise (`₹1.00 = 100 paise`). Standard floating-point IEEE 754 calculations are prohibited in balance modifications.
- **Pure JavaScript ESM**: Standard modern ES module JavaScript across frontend and backend for maximum compatibility, fast Vite HMR, and zero-transpilation test execution.
- **Zero Fake Balances Policy**: The platform never renders fabricated mock balances or synthetic numbers; all presented data derives directly from database ledger balances.

---

## Phase 2: Double-Entry Ledger Engine & Cryptographic Hash Chaining

### Specification Prompt
```text
Implement a true double-entry accounting engine:
1. Every transfer must atomically create balanced debit and credit entries.
2. The fundamental accounting equation must always hold: Total Debits == Total Credits.
3. Implement a cryptographic SHA-256 hash chain:
   - Each ledger block must link to its immediate predecessor: hash = SHA256(prev_hash + canonical_json(entry)).
   - Genesis blocks start with 64 zeros.
4. Add ledger immutability triggers in PostgreSQL:
   - UPDATE and DELETE operations on ledger records must be rejected by database triggers.
```

### Architectural Decisions
- **Deterministic Canonical Payload**: Block hashes use canonical sorted-key JSON serialization before SHA-256 hashing to guarantee reproducible hash verification regardless of property ordering.
- **Database Engine Triggers**: Immutability is enforced at the database level using PL/pgSQL triggers (`trg_ledger_protect`), making records immutable even against raw SQL updates.

---

## Phase 3: Authentication, RBAC & Sliding-Window Rate Limiting

### Specification Prompt
```text
Implement secure stateless authentication and role-based access control:
1. Password hashing with bcrypt (cost factor >= 10).
2. Stateless JWT bearer authentication with configurable expiry.
3. Three distinct clearance tiers:
   - holder: Personal account view, deposits, withdrawals, transfers.
   - auditor: Read-only ledger inspection, zero-sum verification, audit log access.
   - admin: Account provisioning, account freeze/unfreeze, system monitoring.
4. Sliding-window rate limiting on authentication attempts and transactional endpoints with Redis backing and automatic in-memory fallback.
5. Immediate 401 token invalidation and clearance checks against the active database row.
```

### Architectural Decisions
- **Fresh RBAC Re-read**: To prevent stale JWT privilege escalation, authorization middleware re-validates the user's role against the database on sensitive requests.
- **Dual-Mode Rate Limiter**: Implemented a sliding-window rate limiter utilizing Redis sorted sets (`ZADD`, `ZREMRANGEBYSCORE`) with transparent zero-crash in-memory fallback for offline or standalone environments.

---

## Phase 4: Concurrency Control, Deadlock Prevention & Idempotency

### Specification Prompt
```text
Solve high-concurrency race conditions and duplicate financial requests:
1. Pessimistic Row Locking:
   - Prevent lost updates and race condition overdrafts during parallel withdrawals.
   - Prevent circular deadlocks (User A -> User B while User B -> User A concurrently) by enforcing deterministic lock acquisition order (ORDER BY id ASC FOR UPDATE).
2. Database-level overdraft protection:
   - Enforce CHECK (balance_paise >= 0) at the PostgreSQL schema level.
3. Idempotency Key Specification:
   - Accept UUID v4 Idempotency-Key header.
   - Store canonical request hash and response payload.
   - Replays within TTL return the identical response with header X-Cache: REPLAY.
   - Key reuse with conflicting payload must return HTTP 422 Unprocessable Entity.
```

### Architectural Decisions
- **Deterministic Numerical Ordering**: All multi-account database locks order target account IDs ascending (`id1 < id2`) before executing `SELECT ... FOR UPDATE`, mathematically eliminating circular wait conditions.
- **Atomic Pre-Commit Verification**: Account balance checks occur both in application memory and via database constraints (`chk_no_overdraft`), ensuring dual-barrier defense against negative balances.

---

## Phase 5: Database Hardening, Least Privilege & Zero-Sum Audits

### Specification Prompt
```text
Implement enterprise security and mathematical ledger auditing:
1. Least-Privilege Database Roles:
   - Create restricted runtime database user (balancevault_runtime) with SELECT, INSERT, UPDATE on operational tables, and zero DELETE, TRUNCATE, or DDL privileges.
2. Audit Log Immutability:
   - Comprehensive audit logging for all authentication attempts, transfers, and administrative actions.
   - Attach trigger prevent_audit_logs_mutation() blocking UPDATE, DELETE, and TRUNCATE.
3. Global Zero-Sum Invariant Endpoint:
   - GET /api/audit/verify: Calculate SUM(balance_paise) across all accounts including external settlement pools.
   - Must strictly equal 0 paise (conservation of value proof).
```

### Architectural Decisions
- **External Pool Conservatism**: Deposits debit the external clearing pool (`ACC-EXTERNAL`) and credit the customer account. Withdrawals debit the customer and credit the external pool. Consequently, `SUM(all accounts) === 0` holds at all times.
- **Fail-Safe Mutation Protection**: PostgreSQL triggers throw uncatchable SQL exceptions upon any attempt to mutate historical audit or ledger records.

---

## Phase 6: Full Backend Test Specification & Invariant Verification

### Specification Prompt
```text
Create a comprehensive automated test suite (36 critical specifications) testing:
1. Environment and database configuration.
2. Schema integrity and check constraints.
3. High-concurrency race conditions (simultaneous multi-threaded parallel transfers).
4. Idempotency key replay caching and payload mismatch rejection.
5. JWT authentication, fresh RBAC clearance, and credential validation.
6. Database immutability of audit and ledger tables.
7. Zero-sum equilibrium proof and SHA-256 chain verification.
```

### Architectural Decisions
- **Automated Vitest Suite**: Implemented `tests/phase6.complete_backend.test.js` verifying 36 end-to-end specifications with embedded PostgreSQL 16 cluster support on Windows and Linux.

---

## Phase 7: Cloud Production Deployment (Render + Neon + Vercel)

### Specification Prompt
```text
Deploy the complete stack to production:
1. Backend deployed to Render as a Node web service.
2. Database hosted on Neon serverless PostgreSQL.
3. Frontend deployed to Vercel with clean API reverse proxy rewrite (/api/(.*) -> Render).
4. Verify cross-origin request handling, HTTPS cookie security, and zero-downtime health probes.
```

### Architectural Decisions
- **Vercel API Rewrite**: Configured `vercel.json` rewrite routing all client `/api/*` traffic to Render, eliminating CORS preflight overhead and allowing relative API calls.
- **Migration & Seed Automation**: Production boot sequence executes schema migrations and seeds demo personas idempotently without manual intervention.

---

## Phase 8: BalanceVault Premium Cybersecurity Blue Redesign

### Specification Prompt
```text
Redesign and upgrade the platform into BalanceVault:
1. Brand Identity:
   - Product Name: BALANCEVAULT
   - Tagline: "Your Money Moves. Your Ledger Proves It."
   - Theme: Cybersecurity Blue (#050B18, #0A1426, #101E33, #16BFFF, #387BFF, #8B7CFF, #F4F8FF, #9AAEC5).
2. Animated Canvas Backgrounds:
   - Isometric 3D blockchain nodes with laser links and traveling data packets.
   - Cyber radar sweep, sentinel mesh lattice, and corner HUD brackets.
3. Single-Scrolling Landing Page (/):
   - Sticky navbar with smooth section scrolling (Home, Features, How It Works, Security, About, Sign In, Get Started).
   - Hero section with demonstration journal block preview.
   - 6 Core Feature cards, 6-Step transaction lifecycle with zero-sum conservation workflow.
   - 8 Security cards and verified architectural model disclosure.
   - Role-based dashboard previews with dynamic clearance routing.
   - Problem vs. Solution architectural comparison matrix.
4. Separate Split-Screen Authentication Pages (/login, /signup):
   - Concentric orbital vault graphic with live status chips (SHA-256, ROW LOCK, Σ = 0 PAISE).
   - 1-Click demo reviewer accounts (Holder 1, Holder 2, Admin, Auditor).
5. Operational Consoles:
   - Upgraded Overview, Accounts, Statements, Transactions, Money Movement, Auditor, and Attack Lab to Cybersecurity Blue.
6. Preservation Guarantee:
   - Do not weaken financial transactions, database constraints, or live backend APIs.
```

### Architectural Decisions
- **Cybersecurity Blue Design Tokens**: Replaced terminal green with electric cyan (`#16BFFF`), midnight blue (`#101E33`), and deep navy (`#050B18`) across CSS variables and Tailwind utilities.
- **Non-Distractive Canvas Layering**: Background animations render on an isolated canvas behind all interactive elements, respecting reduced-motion accessibility and keeping GPU utilization minimal.
- **Normalized Credential Handlers**: Login and registration API services accept both object payloads and positional arguments for zero-friction client-server communication.

---

## Phase 9: AI Evaluation & Defect Catching Log (Mandatory Dated Entries)

As mandated by the LedgerLine / BalanceVault specification, this log records specific instances where generative AI proposed flawed, insecure, or mathematically incorrect code, the rigorous analysis of what was specifically wrong with the AI output, and the exact architectural fix implemented.

### Entry 1 — November 7, 2026: Concurrency Race Condition & Deadlock in Money Movement
- **What the tool was asked to do**:
  "Write an atomic fund transfer service in Node.js that checks whether an account has sufficient balance, debits the source account, and credits the destination account."
- **What the AI produced**:
  ```javascript
  // AI-generated flawed snippet
  async function transfer(fromId, toId, amount) {
    const fromAcc = await db.query('SELECT balance FROM accounts WHERE id = $1', [fromId]);
    if (fromAcc.rows[0].balance < amount) {
      throw new Error('Insufficient balance');
    }
    await db.query('BEGIN');
    await db.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, fromId]);
    await db.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toId]);
    await db.query('COMMIT');
  }
  ```
- **What was specifically wrong with it**:
  1. **TOCTOU Race Condition (Double Spend)**: The balance check occurred outside of a database transaction and without any row locks. Two concurrent withdrawal or transfer requests hitting this endpoint simultaneously would both read the initial balance, both pass the `balance >= amount` check, and both commit their debits, driving the account negative and creating money out of thin air.
  2. **Circular Deadlock**: When User 1 transfers to User 2 while User 2 simultaneously transfers to User 1, each transaction locks its source account first and then waits on the other's account, creating a cyclic wait condition that results in PostgreSQL `deadlock detected (40P01)` and dropped payments.
- **What was done instead (Architectural Fix)**:
  Implemented deterministic ascending primary-key locking (`ORDER BY id ASC FOR UPDATE`) inside an atomic database transaction wrapper (`withTransaction` in `src/ledger.js:210-218`). The balance check is performed **after** acquiring the pessimistic row locks, and the database check constraint `chk_no_overdraft` guarantees that negative balances can never commit at the storage layer.

---

### Entry 2 — November 8, 2026: Flawed In-Memory Idempotency & In-Flight Request Collision
- **What the tool was asked to do**:
  "Implement idempotency middleware in Express that prevents duplicate payment execution when a client retries with an Idempotency-Key header."
- **What the AI produced**:
  ```javascript
  // AI-generated flawed snippet
  const cache = new Map();
  function idempotency(req, res, next) {
    const key = req.headers['idempotency-key'];
    if (cache.has(key)) {
      return res.json(cache.get(key));
    }
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      cache.set(key, body);
      return originalJson(body);
    };
    next();
  }
  ```
- **What was specifically wrong with it**:
  1. **Transient Memory Storage**: Storing idempotency keys in an in-memory `Map` means that a server restart, process crash, or container redeploy completely erases all remembered keys, allowing replayed requests to execute a second time.
  2. **In-Flight Double-Execution Race**: If two identical requests arrive within milliseconds of each other (e.g. rapid double-clicking by a user), the second request arrives before the first request finishes and populates `cache.set()`. Both requests check `cache.has(key)`, see `false`, and both execute the payment twice!
  3. **No Payload Mismatch Protection**: If an attacker reuses an existing idempotency key with a completely different payload or destination account, the AI code blindly returns the cached response of the earlier payment without flagging the key collision.
- **What was done instead (Architectural Fix)**:
  Built a persistent, atomic database-backed idempotency state engine (`src/ledger.js:160-204`). The engine claims the key atomically via `INSERT INTO idempotency_keys ... VALUES ($1, $2, $3, 'in_flight') ON CONFLICT DO NOTHING`, followed by `SELECT ... FOR UPDATE`. Replays with matching payload return cached responses with the `Idempotent-Replay: true` header. Replaying a key with conflicting payload is strictly rejected with `HTTP 422 Unprocessable Entity (code: IDEMPOTENCY_KEY_REUSE_PAYLOAD_MISMATCH)`.

---

### Entry 3 — November 9, 2026: IEEE-754 Floating-Point Monetary Representation Drift
- **What the tool was asked to do**:
  "Write an input validation and balance calculation function for Indian Rupee deposits, withdrawals, and transfers."
- **What the AI produced**:
  ```javascript
  // AI-generated flawed snippet
  function parseAmount(amount) {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) throw new Error('Invalid amount');
    return val;
  }
  ```
- **What was specifically wrong with it**:
  Standard JavaScript `Number` types use IEEE 754 binary floating-point representation. Performing arithmetic on decimal currency values causes fractional rounding errors (e.g. `0.1 + 0.2 = 0.30000000000000004`). In a high-volume financial ledger moving thousands of transactions daily, these infinitesimal rounding discrepancies accumulate into substantial monetary loss, breaking the zero-sum ledger conservation invariant ($\sum \text{Balances} = 0$).
- **What was done instead (Architectural Fix)**:
  Established the strict **Integer Paise Precision Rule** (`src/ledger.js:14-47`). All monetary amounts across the database schema, SQL queries, and application logic are strictly represented as integers in paise (`₹1.00 = 100 paise`) using `BigInt` and PostgreSQL `BIGINT`. Floats, decimals, strings, negatives, and NaN are rejected with `HTTP 400 Invalid Input`.

---

### Entry 4 — November 10, 2026: Insecure JWT Claim Trust & IDOR Vulnerability
- **What the tool was asked to do**:
  "Implement authentication and authorization middleware to protect account viewing and fund transfer endpoints."
- **What the AI produced**:
  ```javascript
  // AI-generated flawed snippet
  function authorizeTransfer(req, res, next) {
    const token = req.headers.authorization.split(' ')[1];
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user;
    if (user.role === 'admin' || user.role === 'holder') {
      return next();
    }
    return res.status(403).json({ error: 'Forbidden' });
  }
  ```
- **What was specifically wrong with it**:
  1. **Insecure Direct Object Reference (IDOR)**: The AI only checked whether `user.role` was `'holder'`. It never validated whether the authenticated user actually owned the source account (`fromAccountId`) passed in the request body! Consequently, Holder 1 could transfer money out of Holder 2's account by simply supplying Holder 2's `fromAccountId`.
  2. **Stale JWT Role Drift**: The AI relied exclusively on claims encoded inside the JWT payload without verifying the user's active status in the database. If an administrator froze an account or revoked a user's privileges, the user could continue executing transfers until the token's 24-hour expiration window lapsed.
- **What was done instead (Architectural Fix)**:
  1. Implemented fresh database verification (`src/auth.js:52-62`) on every authenticated request, re-reading the user's active status and role from PostgreSQL.
  2. Built the server-side `canMoveFrom` authorization validator (`src/auth.js:157-196`, `src/ledger.js:284-294`) which strictly verifies that account holders can only move money from accounts where `account.owner_id === req.user.id`. Unauthorized attempts are rejected with `HTTP 403 Forbidden` and committed as immutable `kind='refused'` entries into the target account's audit chain.

---

### Entry 5 — November 11, 2026: Mutable Audit Logs & Exposed Demonstration Credentials
- **What the tool was asked to do**:
  "Create an audit logging schema and login UI with quick role switching for reviewers."
- **What the AI produced**:
  1. An `audit_logs` SQL table without immutability triggers, allowing standard `UPDATE` and `DELETE` queries.
  2. A login screen featuring prominent "1-Click Fill" buttons displaying plaintext credentials for Administrator, Holder, and Auditor accounts, coupled with a client-side command palette command (`cmd.persona`) that elevated user clearance without contacting the server.
- **What was specifically wrong with it**:
  1. **Compliance Violation (Tamperable Logs)**: Standard mutable tables allow rogue administrators or SQL injection exploits to silently alter or delete historical audit entries and refusal records, defeating the primary purpose of an audit log.
  2. **Security Anti-Pattern (Zero-Trust Violation)**: Exposing administrative and auditor credentials with single-click auto-fill on the public login page completely undermined the platform's role-based security posture. The instant persona switcher allowed unauthenticated visitors to elevate their session to Administrator without providing a password or obtaining a cryptographic token.
- **What was done instead (Architectural Fix)**:
  1. Hardened the database schema (`migrations/001_initial_schema.sql`) with PostgreSQL triggers (`prevent_audit_logs_mutation`, `prevent_ledger_mutation`) that block `UPDATE`, `DELETE`, and `TRUNCATE` operations at the database engine level.
  2. Completely removed the 1-click credential exposure and client-side persona elevation commands from the user interface (`client/src/pages/LoginPage.jsx`, `client/src/components/ui/CommandPalette.jsx`). Seed credentials were moved strictly to secure system documentation (`README.md`, `THREATS.md`), and the login flow enforces authentic zero-trust credential verification on every session.
