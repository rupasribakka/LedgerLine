# LedgerLine — Financial Transaction & Ledger Management System

> **High-Integrity Financial Transaction Engine and Double-Entry Ledger System**  
> Built with **React 19 + Vite 8**, **Node.js + Express ES Modules**, and **PostgreSQL 16 via `pg` with Raw SQL Migrations**.  
> **Live Deployment**: [https://ledgerline-backend-586s.onrender.com](https://ledgerline-backend-586s.onrender.com)

---

## 📌 Executive Summary

**LedgerLine** is engineered to guarantee mathematical correctness, concurrency safety, robust idempotency, and auditability:
1. **No Duplicate Payments**: Client-supplied idempotency keys (`Idempotency-Key` header with canonical SHA-256 payload hashing) ensure financial requests never execute twice. Identical replays return cached responses with `X-Cache: REPLAY`. Reusing an idempotency key with a mismatched request payload returns `HTTP 422 Unprocessable Entity` (`IDEMPOTENCY_KEY_REUSE_PAYLOAD_MISMATCH`).
2. **No Race Conditions / Double Spending**: Deterministic row-level locking (`SELECT id FROM accounts WHERE id IN (...) ORDER BY id ASC FOR UPDATE`) serializes concurrent transactions and completely eliminates reciprocal transfer deadlocks.
3. **No Negative Balances**: Strict database check constraints (`chk_no_overdraft` requiring `balance_paise >= 0`) and atomic pre-transfer balance validation prevent unauthorized overdrafts.
4. **No Rounding Leakage**: All monetary values are stored strictly as **integers in paise** (`₹1.00 = 100 paise`), entirely eliminating IEEE 754 floating-point inaccuracies.
5. **No Ledger Tampering**: Posted ledger and audit records are strictly append-only. PostgreSQL triggers block `UPDATE`, `DELETE`, and `TRUNCATE`. Every ledger entry is linked to its predecessor via SHA-256 cryptographic hashes.
6. **Least-Privilege Production Architecture**: Migrations execute as the database owner, while the running web service operates strictly as a restricted runtime role (`ledgerline_runtime`) with zero DDL or deletion privileges.

---

## 🚀 Live Demo & Seed Accounts

The full-stack web application is live at:  
👉 **[https://ledgerline-backend-586s.onrender.com](https://ledgerline-backend-586s.onrender.com)**

Opening the URL loads the React cyber console. You can sign in using manual credentials or click any of the one-click demo presets:

| Role | Username | Password | Initial State / Purpose |
|---|---|---|---|
| **Account Holder 1** | `holder1` | `holder123` | Seeded balance: **₹100.00** (10,000 paise). Account #2. |
| **Account Holder 2** | `holder2` | `holder234` | Seeded balance: **₹50.00** (5,000 paise). Account #3. |
| **System Administrator** | `admin` | `admin123` | Root clearance, full account creation, and system monitoring. |
| **Compliance Auditor** | `auditor` | `auditor123` | Read-only audit clearance, zero-sum verification (`/api/verify`). |

---

## 🛠️ Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | React 19 + Vite 8 + Tailwind CSS 4 | Interactive cybersecurity console, real-time balance tracking, and action modals |
| **Backend** | Node.js (v20+) + Express 4 (ESM) | Double-entry financial transaction engine, REST API, static asset serving |
| **Database** | PostgreSQL 16 + `pg` | Parameterized SQL, row-level locks, BigInt precision, immutability triggers |
| **Cloud Hosting** | Render | Automated Blueprint deployment with Dockerless Node web service |
| **Cloud Database**| Neon PostgreSQL | Serverless PostgreSQL with direct compute routing for dynamic SQL roles |
| **Security** | JWT + bcryptjs + crypto | Fresh database role re-reading per request, canonical request hashing, CSP |
| **Testing** | Vitest + Supertest | 133 automated unit, integration, invariant, and concurrency tests |

---

## 📂 Project Structure

```text
LedgerLine/
├── migrations/                 # PostgreSQL SQL migrations (001 - 004)
│   ├── 001_initial_schema.sql  # Accounts, ledger, idempotency_keys, triggers
│   ├── 002_user_name.sql       # User names
│   ├── 003_runtime_role_privileges.sql # Least-privilege runtime role grants
│   └── 004_accounts_status_and_transactions.sql # Account status checks & sequences
├── src/                        # Active Express ES-module backend
│   ├── app.js                  # API routes, middleware, static client serving, error handling
│   ├── auth.js                 # Authentication, bcrypt, registration, fresh RBAC re-read
│   ├── config.js               # Environment and production configuration guards
│   ├── db.js                   # pg connection pool, transaction helper, Neon pooler normalizer
│   ├── hash.js                 # Cryptographic SHA-256 canonical hashing
│   ├── ledger.js               # Core financial engine, row locking, double-entry journal
│   ├── audit.js                # Immutable audit logging and reconciliation
│   ├── migrate.js              # Database migration runner
│   ├── seed.js                 # Controlled demo seed data
│   └── server.js               # Server bootstrap and least-privilege checks
├── scripts/
│   ├── start-prod.js           # Production bootstrap: runtime role init, migrate, grant, seed, listen
│   ├── mutation-check.js       # Mutation testing harness (kills 6/6 mutations)
│   └── attack.js               # Adversarial attack suite (7/7 attack scenarios)
├── tests/                      # 133 automated test suites across 7 phases
│   ├── phase1.test.js          # Schema, triggers, and seed verification
│   ├── phase2.test.js          # Double-entry integrity and hash chains
│   ├── phase3.test.js          # Authentication, rate limiting, and RBAC
│   ├── phase4.test.js          # Concurrency, race conditions, reciprocal deadlock prevention
│   ├── phase5.security.test.js # Canonical request hash, strict integer validation, JWT security
│   ├── phase6.complete_backend.test.js # Full API contract, audit log capping, legacy endpoints
│   └── phase7.prod_boot.test.js # Production boot sequence, runtime role isolation, idempotent seed
├── client/                     # React 19 + Vite 8 frontend
│   ├── src/                    # Components, pages, and API service
│   ├── dist/                   # Compiled production distribution (served by Express)
│   └── package.json            # Frontend dependencies
├── render.yaml                 # Render Blueprint specification
└── package.json                # Project dependencies, test scripts, and build tasks
```

---

## 🧪 Verification & Test Suites

### 1. Full Automated Test Suite (`npm test`)
Executes all 133 automated unit, integration, invariant, and concurrency tests:
```bash
npm test
```
```text
Test Files  7 passed (7)
     Tests  133 passed (133)
  Duration  101.98s
```

### 2. Mutation Testing (`npm run mutation`)
Injects critical deliberate flaws into the core financial engine to prove the test suite catches them:
```bash
npm run mutation
```
| # | Mutation Description | Target File / Area | Verdict |
|---|---|---|---|
| 1 | Remove `FOR UPDATE` row lock | `src/ledger.js` | **KILLED** |
| 2 | Remove idempotency `ON CONFLICT` | `src/ledger.js` | **KILLED** |
| 3 | Remove balance sufficiency check | `src/ledger.js` | **KILLED** |
| 4 | Drop `chk_no_overdraft` constraint | Database schema | **KILLED** |
| 5 | Remove replay response branch | `src/ledger.js` | **KILLED** |
| 6 | Remove holder account ownership check | `src/ledger.js` | **KILLED** |

**Mutation Result**: 6 of 6 mutations **KILLED** (100% kill rate).

### 3. Adversarial Security Attack Suite (`npm run attack`)
Fires live concurrent attacks against a running server:
```bash
npm run attack
```
* **Attack 1**: Two 80% balance withdrawals simultaneously $\to$ Exactly one succeeds, one rejected (422), balance never goes negative.
* **Attack 2**: 20 concurrent 10% balance withdrawals $\to$ Exactly 10 succeed, balance reaches exactly 0 paise.
* **Attack 3**: 10 concurrent requests with identical `Idempotency-Key` $\to$ Money moves once, 9 return cached replay response (`X-Cache: REPLAY`).
* **Attack 4**: Replaying identical `Idempotency-Key` with altered payload $\to$ Rejected with `422 Unprocessable Entity`.
* **Attack 5**: Cross-account holder unauthorized transfer $\to$ Rejected with `403 Forbidden`, balances unchanged.
* **Attack 6**: Auditor role attempting deposit $\to$ Rejected with `403 Forbidden`.
* **Attack 7**: System zero-sum verification $\to$ Verified $\sum \text{balances} \equiv 0 \text{ paise}$ across all accounts.

---

## 🌐 Production Deployment Guide (Render + Neon)

### 1. Neon Database Setup
1. Create a project in [Neon Console](https://console.neon.tech) (PostgreSQL 16).
2. Copy your connection string from the Neon Console:
   ```text
   postgresql://neondb_owner:npg_SECRET_OWNER_KEY@ep-cool-fog-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
   This is your **`MIGRATION_DATABASE_URL`**.

### 2. Build the Restricted Runtime Role Connection String (`DATABASE_URL`)
1. Choose a strong random password for the runtime role (e.g. `npg_runtime_k82Hs92Jd83Nm71Q`).
2. Replace `neondb_owner` and its password with `ledgerline_runtime` and your chosen password.
3. Ensure the hostname is the direct compute host (not `-pooler`). The backend automatically normalizes `-pooler` hosts to direct endpoints.
   ```text
   postgresql://ledgerline_runtime:npg_runtime_k82Hs92Jd83Nm71Q@ep-cool-fog-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

### 3. Deploy to Render via Blueprint
1. In Render Dashboard, click **New +** -> **Blueprint**.
2. Select your `LedgerLine` repository.
3. Set the environment secrets:
   - `MIGRATION_DATABASE_URL`: Neon owner connection string.
   - `DATABASE_URL`: Constructed runtime connection string.
   - `LEDGERLINE_SEED_DEMO_USERS`: `"true"`.
4. Click **Apply**. Render installs dependencies, builds the Vite client, provisions the least-privilege role, executes migrations, seeds demo accounts, and boots the live server.

---

## 📡 API Reference Summary

| Method | Endpoint | Description | Auth / Role |
|---|---|---|---|
| `GET` | `/api/health` | Health probe returning `{"status":"ok"}` | Public |
| `POST`| `/api/auth/login` | Login with username/password, returns JWT | Public |
| `POST`| `/api/auth/register` | Register new account holder | Public |
| `GET` | `/api/accounts` | List accessible accounts and paise balances | Authenticated |
| `GET` | `/api/accounts/:id/statement` | Transaction journal and statement history | Account Owner, Admin, Auditor |
| `POST`| `/api/transfers` | Atomic transfer between accounts (`Idempotency-Key` required) | Account Owner, Admin |
| `POST`| `/api/deposits` | External deposit (`Idempotency-Key` required) | Admin |
| `POST`| `/api/withdrawals` | External withdrawal (`Idempotency-Key` required) | Account Owner, Admin |
| `GET` | `/api/verify` | Cryptographic verification ($\sum \text{balances} \equiv 0$) | Admin, Auditor |
| `GET` | `/api/audit/logs` | Query append-only audit trail | Admin, Auditor |
