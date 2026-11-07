# LedgerLine — Financial Transaction & Ledger Management System

> **Snovasys Round 2 Hackathon Project**  
> A high-integrity financial transaction engine and double-entry ledger system built with **React + Vite**, **Node.js + Express ES modules**, and **PostgreSQL 16 using `pg` and raw SQL migrations**.

---

## 📌 Executive Summary

**LedgerLine** is engineered to guarantee financial correctness, concurrency safety, robust idempotency, and auditability:
1. **No Duplicate Payments**: Client-supplied idempotency keys ensure the same financial request never pays twice.
2. **No Race Conditions / Double Spending**: Deterministic row-level locking (`SELECT ... FOR UPDATE ORDER BY id ASC`) serializes concurrent transactions and avoids deadlocks.
3. **No Negative Balances**: Strict database check constraints (`chk_no_overdraft`) and atomic balance guards prevent unauthorized overdrafts.
4. **No Rounding Leakage**: All monetary values are stored strictly as **integers in paise** (`₹1.00 = 100 paise`), avoiding IEEE 754 floating-point inaccuracies.
5. **No Ledger Tampering**: Posted ledger and audit records are append-only. Database triggers block `UPDATE`, `DELETE`, and `TRUNCATE`. Every ledger entry is linked to its predecessor via SHA-256 cryptographic hashes.
6. **No AI Autonomy**: AI assistants never independently initiate, sign, or approve monetary movements.

---

## 🛠️ Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Backend** | Node.js + Express ES modules | Root `src/` REST API and financial transaction engine |
| **Database** | PostgreSQL 16 + `pg` | Parameterized SQL, ACID transactions, and row-level locking |
| **Security** | JWT + bcryptjs | Token authentication and fresh database role re-reading |
| **Migrations** | Raw PostgreSQL SQL | Versioned schema migrations in `migrations/` |
| **Testing** | Vitest + Supertest | 118 automated integration, invariant, and concurrency tests |
| **Frontend** | React 19 + Vite 8 | Modern dashboard client in `client/` |

---

## 📂 Project Structure

```text
LedgerLine/
├── migrations/                 # PostgreSQL SQL migrations (001 - 004)
├── src/                        # Active Express ES-module backend
│   ├── app.js                  # API routes, middleware, and error handling
│   ├── auth.js                 # Authentication, bcrypt, registration, and RBAC
│   ├── config.js               # Environment and production configuration guards
│   ├── db.js                   # pg connection pool and transaction helper
│   ├── hash.js                 # Cryptographic SHA-256 canonical hashing
│   ├── ledger.js               # Core financial engine and double-entry journal
│   ├── audit.js                # Immutable audit logging and reconciliation
│   ├── migrate.js              # Database migration runner
│   ├── seed.js                 # Controlled demo seed data
│   └── server.js               # Server bootstrap and least-privilege checks
├── tests/                      # 118 automated test suites across 6 phases
│   ├── phase1.test.js          # Schema, triggers, and seed verification
│   ├── phase2.test.js          # Authentication, rate limiting, and RBAC
│   ├── phase3.test.js          # Financial operations and idempotency
│   ├── phase4.test.js          # Statements, audit, and tamper detection
│   ├── phase5.security.test.js # Production defaults and role security
│   └── phase6.complete_backend.test.js # Registration, lifecycle, concurrency, and audit
├── docs/                       # Comprehensive architectural documentation
│   ├── ARCHITECTURE.md         # System architecture and invariant design
│   ├── API.md                  # Complete REST API specifications
│   ├── DATABASE.md             # PostgreSQL schema, indexes, and triggers
│   ├── SECURITY.md             # Security policies, IDOR, and threat defenses
│   ├── TESTING.md              # Test execution instructions and concurrency suite
│   └── THREATS.md              # STRIDE threat model
├── client/                     # React + Vite frontend
├── BACKEND_COMPLETION_REPORT.md # Verification report and requirement matrix
└── package.json                # Project dependencies and test scripts
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher)
- **PostgreSQL 16** (or use local embedded PostgreSQL for development)

### 2. Backend Setup & Run

1. Clone repository and install dependencies:
   ```bash
   git clone <repository-url>
   cd LedgerLine
   npm install
   ```
2. Configure `.env`:
   ```powershell
   Copy-Item .env.example .env
   ```
   Set `JWT_SECRET` in `.env`. For local embedded database development, leave `DATABASE_URL` blank and configure `LEDGERLINE_EMBEDDED_DB_PASSWORD`.
3. Run migrations and seed data:
   ```bash
   npm run migrate
   npm run seed
   ```
4. Start development server:
   ```bash
   npm run dev
   ```
   The API will listen at `http://localhost:5000`. Probe health at `http://localhost:5000/api/health`.

### 3. Run Automated Tests

Execute all 131 unit, integration, invariant, and concurrency tests:
```bash
npm test
```

---

## 🌐 Production Deployment Guide (Render + Neon PostgreSQL)

This guide walks a first-time user through deploying LedgerLine on [Render](https://render.com) using a cloud-hosted [Neon PostgreSQL](https://neon.tech) database.

---

### Step 1: Create a Neon PostgreSQL Database

1. Sign up or log in at [Neon Console](https://console.neon.tech).
2. Click **Create Project**:
   - **Project name**: `ledgerline-db`
   - **Postgres version**: `16`
3. Once created, Neon displays your connection string under **Connection Details**:
   ```text
   postgresql://neondb_owner:npg_SECRET_OWNER_KEY@ep-cool-fog-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
   Save this string. It is your **`MIGRATION_DATABASE_URL`**.

---

### Step 2: Build the Restricted Runtime Role Connection String (`DATABASE_URL`)

LedgerLine enforces database least-privilege architecture. In production:
- Schema migrations run as the owner role (`neondb_owner`).
- The running API server connects **strictly** as a restricted runtime role (`ledgerline_runtime`), which cannot delete ledger records or drop tables.

#### How to construct `DATABASE_URL`:
1. Choose a strong, secret random password for the runtime role (at least 24 characters), e.g. `npg_runtime_k82Hs92Jd83Nm71Q`.
2. Take your Neon connection string from Step 1:
   ```text
   postgresql://neondb_owner:npg_SECRET_OWNER_KEY@ep-cool-fog-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. Replace the username (`neondb_owner`) and password (`npg_SECRET_OWNER_KEY`) with:
   - Username: `ledgerline_runtime`
   - Password: `<YOUR_CHOSEN_RUNTIME_PASSWORD>`
4. The resulting `DATABASE_URL` looks like:
   ```text
   postgresql://ledgerline_runtime:npg_runtime_k82Hs92Jd83Nm71Q@ep-cool-fog-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
> [!NOTE]
> On first startup, `npm run start:prod` automatically connects as `MIGRATION_DATABASE_URL` (the owner), creates the `ledgerline_runtime` role with your specified password, grants all least-privilege permissions, runs migrations, and then boots the API connected as `DATABASE_URL`.

---

### Step 3: Deploy to Render

#### Option A: 1-Click Blueprint Deploy (Recommended)
1. Fork or push your clean LedgerLine repository to GitHub.
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** -> **Blueprint**.
4. Select your `LedgerLine` repository.
5. Render detects [`render.yaml`](render.yaml) automatically.
6. Provide the environment values when prompted:
   - `MIGRATION_DATABASE_URL`: Your Neon owner connection string from Step 1.
   - `DATABASE_URL`: Your constructed runtime connection string from Step 2.
7. Click **Apply**. Render will build and deploy the service.

#### Option B: Manual Web Service Deploy
1. Click **New +** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure the following fields:
   - **Name**: `ledgerline-backend`
   - **Region**: Same region as your Neon database (e.g. `Ohio (US East)` or `Oregon (US West)`)
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run start:prod`
   - **Health Check Path**: `/api/health`
4. Add the Environment Variables (see table below).
5. Click **Create Web Service**.

---

### Step 4: Environment Variables Reference

| Variable Name | Type | Value / Description |
|---|---|---|
| `NODE_ENV` | Plain | `production` |
| `PORT` | Plain | `10000` (Render defaults to 10000) |
| `JWT_SECRET` | **Secret** | Cryptographic secret for signing tokens. Must be at least 32 characters. |
| `MIGRATION_DATABASE_URL` | **Secret** | Neon connection string with owner role (`neondb_owner`). |
| `DATABASE_URL` | **Secret** | Neon connection string with restricted role (`ledgerline_runtime`). |
| `LEDGERLINE_SEED_DEMO_USERS` | Plain | Set to `true` to seed the demo users and double-entry ledger transactions on first boot. |
| `CORS_ALLOWED_ORIGINS` | Plain | `*` or comma-separated list of allowed frontend origins (e.g. `https://my-frontend.onrender.com`). |

---

### Step 5: Verify Your Deployment

Once Render displays **Service is live**:

1. **Verify Health Endpoint**:
   ```bash
   curl https://<your-render-subdomain>.onrender.com/api/health
   # Response:
   # {"status":"ok"}
   ```

2. **Verify Demo Login (if `LEDGERLINE_SEED_DEMO_USERS=true`)**:
   ```bash
   curl -X POST https://<your-render-subdomain>.onrender.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@ledgerline.local","password":"AdminPassword123!"}'
   ```

3. **Verify Ledger Invariant & Cryptographic Audit**:
   ```bash
   curl https://<your-render-subdomain>.onrender.com/api/audit/verify \
     -H "Authorization: Bearer <TOKEN_FROM_STEP_2>"
   # Response:
   # {"verified":true,"checks":{"global_conservation":{"status":"PASSED"},"hash_chain":{"status":"PASSED"},"balance_reconciliation":{"status":"PASSED"}}}
   ```

---

## 📡 API Endpoint Overview

| Group | Method & Route | Description | Permissions |
|---|---|---|---|
| **Health** | `GET /api/health` | Health probe and system invariant declaration | Public |
| **Auth** | `POST /api/auth/register` | Register new account holder | Public |
| | `POST /api/auth/login` | Login with rate limiting and bcrypt | Public |
| | `POST /api/auth/logout` | Session logout with audit event | Authenticated |
| | `GET /api/auth/me` | Current user profile | Authenticated |
| **Accounts** | `GET /api/accounts` | List permitted accounts | Scoped by role |
| | `POST /api/accounts` | Create account (with double-entry opening balance) | `admin` |
| | `GET /api/accounts/:id` | Get account details | Owner, `admin`, `auditor` |
| | `GET /api/accounts/:id/balance` | Get account balance and status | Owner, `admin`, `auditor` |
| | `PATCH /api/accounts/:id/status` | Manage account status (`ACTIVE`, `FROZEN`, `CLOSED`) | `admin` |
| | `GET /api/accounts/:id/statement` | Account transaction journal with replay markers | Owner, `admin`, `auditor` |
| **Transactions** | `POST /api/transactions/deposit` | Deposit from external clearing account | `admin` |
| | `POST /api/transactions/withdraw` | Withdraw to external clearing account | Owner, `admin` |
| | `POST /api/transactions/transfer` | Transfer between two accounts | Owner, `admin` |
| | `GET /api/transactions` | Query transactions with filters | Scoped by role |
| | `GET /api/transactions/:id` | Get transaction details and paired journal entries | Scoped by role |
| **Ledger** | `GET /api/ledger` | Raw ledger entries with cryptographic hashes | Scoped by role |
| | `GET /api/ledger/:transactionId` | Journal entries for transaction | Scoped by role |
| | `GET /api/ledger/verify` | Cryptographic hash & zero-sum reconciliation | `admin`, `auditor` |
| **Audit** | `GET /api/audit` | Query immutable audit log records | `admin`, `auditor` |
| | `GET /api/audit/:id` | Get single audit log record | `admin`, `auditor` |
| | `GET /api/audit/duplicates` | Query recorded duplicate request replays | `admin`, `auditor` |
| **Admin** | `GET /api/admin/users` | List permitted registered users | `admin` |
| | `GET /api/admin/overview` | Aggregated system metrics & reserve status | `admin`, `auditor` |

---

## 🔒 Financial Correctness & Verification

- **Pessimistic Concurrency**: Tested with simultaneous ₹800 withdrawals against a ₹1,000 balance. Exactly one succeeds; the second receives `422 INSUFFICIENT_FUNDS`. The final balance is ₹200 and never negative.
- **Deadlock Avoidance**: Simultaneous circular transfers ($A \to B$ and $B \to A$) serialize without deadlocks via deterministic `ORDER BY id ASC FOR UPDATE` locking.
- **Append-Only Immutability**: Database triggers block `UPDATE`, `DELETE`, and `TRUNCATE` on both `ledger` and `audit_logs`.
- **System Reconciliation**: `GET /api/ledger/verify` validates global balance conservation ($\sum \text{balances} = 0$), recomputes all SHA-256 chains, and reconciles account balances against the journal.
