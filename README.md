# BalanceVault — High-Integrity Financial Transaction Engine & Cryptographic Double-Entry Ledger

[![Build Status](https://img.shields.io/badge/build-passing-16BFFF?style=flat-square)](https://github.com/rupasribakka/LedgerLine)
[![Tests Passing](https://img.shields.io/badge/tests-36%2F36%20passed-387BFF?style=flat-square)](https://github.com/rupasribakka/LedgerLine)
[![Security Model](https://img.shields.io/badge/security-zero--trust%20ledger-8B7CFF?style=flat-square)](https://github.com/rupasribakka/LedgerLine)
[![Frontend](https://img.shields.io/badge/deployed-Vercel-black?style=flat-square&logo=vercel)](https://ledgerline-rupasri3.vercel.app)
[![Backend](https://img.shields.io/badge/deployed-Render-46E3B7?style=flat-square&logo=render)](https://ledgerline-backend-586s.onrender.com)

> **Public Brand:** BalanceVault  
> **Core Engine:** LedgerLine Financial Invariant Core  
> **Tagline:** *"Your Money Moves. Your Ledger Proves It."*  
> **Theme:** Cybersecurity Blue (`#050B18`, `#0A1426`, `#101E33`, `#16BFFF`, `#387BFF`, `#8B7CFF`, `#F4F8FF`, `#9AAEC5`)  

---

## 🌐 Live Deployments

| Component | Provider | Live URL |
| :--- | :--- | :--- |
| **Frontend Application** | Vercel | [https://ledgerline-rupasri3.vercel.app](https://ledgerline-rupasri3.vercel.app) |
| **Backend REST API** | Render | [https://ledgerline-backend-586s.onrender.com](https://ledgerline-backend-586s.onrender.com) |
| **Source Repository** | GitHub | [https://github.com/rupasribakka/LedgerLine](https://github.com/rupasribakka/LedgerLine) |

---

## 🛡️ Core Financial Invariants & Architectural Guarantees

BalanceVault guarantees strict mathematical correctness, concurrency safety, robust duplicate request protection, and verifiable auditability:

1. **Integer Paise Precision:**
   All monetary amounts are strictly calculated and stored as 64-bit integers in paise (`₹1.00 = 100 paise`). Standard IEEE 754 floating-point numbers are prohibited in balance mutations, eliminating precision drift.
2. **Double-Entry Bookkeeping:**
   Every balance modification is recorded through atomic balanced journal entries. Money cannot be created or destroyed in transit ($\sum \text{Debits} = \sum \text{Credits}$).
3. **Global Zero-Sum Conservation Proof ($\sum \text{Balances} = 0$):**
   Deposits debit the system clearing pool (`ACC-EXTERNAL`) and credit customer accounts. Withdrawals debit customer accounts and credit the external pool. The sum of all accounts across the entire platform always equals zero.
4. **Pessimistic Row Locking in Deterministic Order:**
   Multi-account transfers acquire row-level database locks in strictly ascending numerical order (`SELECT ... FROM accounts WHERE id IN ($1, $2) ORDER BY id ASC FOR UPDATE`). This completely eliminates reciprocal transfer deadlocks during concurrent exchanges.
5. **Database-Level No-Overdraft Constraint:**
   PostgreSQL enforces `CHECK (balance_paise >= 0)` (`chk_no_overdraft`) directly at the database engine level. Overdrafts are physically rejected by the storage engine.
6. **UUID v4 Idempotency Key Caching:**
   All financial mutations accept an `Idempotency-Key` HTTP header. Request payloads are canonically sorted and hashed with SHA-256. Replays return the cached settlement response with zero duplicate debits; reusing a key with modified parameters returns `422 Unprocessable Entity`.
7. **Cryptographic SHA-256 Hash Chaining:**
   Every ledger entry cryptographically links to its predecessor block:
   $$\text{hash} = \text{SHA-256}(\text{prev\_hash} + \text{canonical\_json}(\text{block}))$$
   Genesis entries link to a 64-character zero string.
8. **PostgreSQL Trigger-Enforced Immutability:**
   Database triggers (`trg_ledger_protect`, `prevent_audit_logs_mutation`) intercept and reject any SQL `UPDATE`, `DELETE`, or `TRUNCATE` operations on historical ledger and audit records.
9. **Role-Based Access Control (RBAC):**
   Three distinct clearance levels (`holder`, `auditor`, `admin`). Sensitive operations perform real-time clearance checks against the active database user record, mitigating stale JWT privilege escalation.
10. **Zero Fake Data Policy:**
    Every balance, transaction, and statement entry displayed in the interface represents real database ledger records.

---

## 🔑 Demo Reviewer Credentials (1-Click Fill)

The login screen features 1-click credential auto-fill for testing all operational roles:

| Role | Email | Password | Clearance & Permissions |
| :--- | :--- | :--- | :--- |
| **Holder 1** | `holder1@ledgerline.local` | `Holder1Password123!` | Primary customer account. Seeded balance: **₹100.00**. Has transfer, deposit, withdrawal permissions. |
| **Holder 2** | `holder2@ledgerline.local` | `Holder2Password123!` | Counterparty customer account. Seeded balance: **₹50.00**. Has transfer, deposit, withdrawal permissions. |
| **Admin** | `admin@ledgerline.local` | `AdminPassword123!` | L3 Root Clearance. Can create/freeze accounts, execute system deposits, inspect Attack Lab. |
| **Auditor** | `auditor@ledgerline.local` | `AuditorPassword123!` | L2 Compliance Clearance. Read-only global access. Can run hash chain verification, inspect audit logs and replay attempts. |

---

## 💻 Tech Stack

- **Frontend:** React 19, Vite 8, Tailwind CSS 4, Lucide Icons, Framer Motion, HTML5 Canvas
- **Backend:** Node.js (v20+), Express 4 (ES Modules), `pg` connection pool, Prisma ORM
- **Database:** PostgreSQL 16 (Neon Serverless PostgreSQL in production, `@embedded-postgres` for local testing)
- **Security:** JWT, bcryptjs, SHA-256 HMAC, Sliding-Window Rate Limiting (Redis with in-memory fallback)
- **Deployment:** Vercel (Frontend + API reverse proxy), Render (Node.js API service)
- **Testing:** Vitest, Supertest, Mocha, Puppeteer Core

---

## 🗺️ Application Routes

### Public Routes
- `/`: Single-scrolling landing page featuring sticky navigation, hero with demonstration block preview, 6 core feature cards, 6-step transaction lifecycle with zero-sum conservation workflow, 8 security specification cards, role-based dashboard previews, and About matrix.
- `/login`: Split-screen authentication console with rotating concentric orbital vault and 1-click reviewer presets.
- `/signup`: Public account registration with client and server-side validation.

### Protected Application Console (`/app`)
- `/app`: Financial Operations Overview — KPI summary cards, live blockchain consensus stream, active accounts catalog, and quick-action shortcuts.
- `/app/accounts`: Comprehensive accounts catalog displaying settled integer paise balances.
- `/app/accounts/:id`: Cryptographic Account Statement — individual ledger block explorer with real-time SHA-256 chain integrity verification.
- `/app/move`: Money Movement Terminal — atomic transfers, deposits, and withdrawals with real-time balance previews and automatic Idempotency-Key generation.
- `/app/transactions`: Searchable global transaction ledger with debit/credit indicators and block hashes.
- `/app/audit`: Auditor & Compliance Console — global zero-sum equilibrium scale proof, duplicate payment replay inspector, and append-only audit trail.
- `/app/attack-lab`: Security & Concurrency Test Lab — interactive race condition simulators and replay test suites.
- `/app/admin`: Administrative Management Console — account provisioning, status freezing/unfreezing, and system pool deposit dispatch.

---

## ⚡ Quick Start & Local Setup

### Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0
- PostgreSQL 16 (optional; the test suite automatically launches an embedded PostgreSQL instance if `DATABASE_URL` is omitted)

### Installation
```bash
# Clone the repository
git clone https://github.com/rupasribakka/LedgerLine.git
cd LedgerLine

# Install root backend dependencies
npm install

# Install frontend dependencies
npm --prefix client install
```

### Environment Configuration
Create a `.env` file in the root directory (refer to `.env.example`):
```env
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/balancevault
JWT_SECRET=super_secret_balancevault_jwt_key_min_32_chars
ENABLE_DEV_SEED=true
```

### Running the Application
```bash
# Terminal 1: Start Backend API (runs on http://localhost:5000)
npm run dev:server

# Terminal 2: Start Frontend Application (runs on http://localhost:5173)
npm --prefix client run dev
```

---

## 🧪 Testing & Verification

Run the automated test suite verifying all 36 critical security and financial specifications:
```bash
# Run complete Phase 6 backend specification suite
npm test -- tests/phase6.complete_backend.test.js --run

# Run full Vitest test suite
npm test

# Build client for production
npm --prefix client run build
```

---

## 📜 License & Compliance

Developed for high-integrity financial ledger auditing and secure banking infrastructure. All financial records, hash chains, and audit logs are governed by strict database immutability triggers.
