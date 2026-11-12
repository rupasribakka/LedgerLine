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
