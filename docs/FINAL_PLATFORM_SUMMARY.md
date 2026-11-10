# BalanceVault — High-Integrity Financial Ledger Platform
> **Powered by the LedgerLine Invariant & Double-Entry Accounting Core**

---

## 1. System Architecture & Live URLs

- **Frontend Application (Vercel)**: `https://ledger-line.vercel.app` (or your connected Vercel domain)
- **Backend Core API (Render)**: `https://ledgerline-backend-586s.onrender.com`
- **Health Diagnostics Probe**: `https://ledgerline-backend-586s.onrender.com/api/health?details=true`

---

## 2. Demo Persona Access Credentials

All seed accounts are pre-loaded in the live production database with settled double-entry balances:

| Role | Clearance Level | Email Address | Password | Primary Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Root Admin** | `L3 // ROOT CLEARANCE` | `admin@ledgerline.local` | `AdminPassword123!` | Create accounts, external deposits, manage user roles, system overview |
| **Account Holder 1** | `L1 // STANDARD HOLDER` | `holder1@ledgerline.local` | `Holder1Password123!` | Primary checking, transfers, withdrawals, cryptographic statement |
| **Account Holder 2** | `L1 // STANDARD HOLDER` | `holder2@ledgerline.local` | `Holder2Password123!` | Counterparty receiver, transfer verification |
| **Independent Auditor** | `L2 // AUDIT VERIFIER` | `auditor@ledgerline.local` | `AuditorPassword123!` | Zero-sum equilibrium audit, duplicate replay inspector, immutable log review |
| **Public User** | `L1 // NEW HOLDER` | *Self-registered* (e.g. `alice@ledgerline.local`) | *Custom Password* | Public onboarding, auto-provisioned primary checking account |

---

## 3. Key Frontend & UI Innovations

1. **Title & Brand Cohesion**:
   - Primary Brand: **BalanceVault**
   - Technology Engine: **LedgerLine Financial Core**
   - Consistent typography across all viewports using Google Fonts **Manrope** and **JetBrains Mono**.

2. **Smooth Animation & Navigation (`Framer Motion`)**:
   - **Page Transitions**: Smooth fluid slide-and-fade (`will-change: transform, opacity`) on every route change.
   - **Command Palette (`Ctrl + K` / `⌘K`)**: Instant search-to-navigate across all pages, accounts, and quick actions.
   - **Real-Time Counters**: `SmoothPaiseCounter` renders animated rolling digits during balance changes.
   - **Interactive Visualizations**:
     - `RingOrb`: Ambient SVG orbital ring on Auth pages.
     - `EquilibriumScale`: Dynamic zero-sum balance scale comparing debits and credits.
     - `CustomCursor`: Emerald particle trailing cursor on non-touch desktop viewports.

3. **Core Application Views**:
   - **Landing Page (`/`)**: Hero beam perspective tilt, interactive balance card, live invariant badges.
   - **Financial Overview (`/app`)**: Total balance cards, live server latency indicator, active account grid.
   - **Accounts Portfolio (`/app/accounts`)**: Real-time balance inspection and statement links.
   - **Cryptographic Statement (`/app/accounts/:id`)**: Entry-by-entry SHA-256 hash chains (`PREV_HASH` &rarr; `BLOCK_HASH`) with genesis proof.
   - **Transactions Stream (`/app/transactions`)**: Live dual-entry debit/credit ledger breakdown and transaction search.
   - **Money Movement (`/app/move`)**: Transfers, withdrawals, and deposits with automatic UUID v4 Idempotency-Key generator and 1-click replay test.
   - **Auditor & Duplicates (`/app/audit`)**: System-wide zero-sum balance verification and duplicate replay monitoring.
   - **Attack Lab (`/app/attack-lab`)**: Interactive demonstration of concurrency race condition protection, overdraft prevention, and hash tamper detection.
   - **Admin Console (`/app/admin`)**: User creation with role selection, account creation with initial double-entry deposit, and account freezing.

---

## 4. Backend Verification Proofs

- **Zero-Sum Equilibrium**: Sum of balances is strictly 0 paise across all accounts and external clearing pools.
- **Ordered Locking**: Deadlock-free concurrency protected via `SELECT ... FOR UPDATE ORDER BY id ASC`.
- **Database Trigger Immutability**: `prevent_ledger_mutation()` and `prevent_audit_logs_mutation()` database triggers strictly prohibit `UPDATE` and `DELETE` queries.
- **Least-Privilege Security**: Production runtime role (`ledgerline_runtime`) runs with zero DDL or user mutation permissions; user provisioning is securely isolated to the migration client.
- **Test Coverage**: All 54 backend and security unit/integration tests passing 100%.
