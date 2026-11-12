# LedgerLine — High-Integrity Financial Core & Double-Entry Ledger

[![Build Status](https://img.shields.io/badge/build-passing-397A68?style=flat-square)](https://github.com/rupasribakka/LedgerLine)
[![Tests Passing](https://img.shields.io/badge/tests-36%2F36%20passed-397A68?style=flat-square)](https://github.com/rupasribakka/LedgerLine)
[![Security Invariants](https://img.shields.io/badge/invariants-zero--drift%20integer%20math-514A70?style=flat-square)](https://github.com/rupasribakka/LedgerLine)
[![Frontend Deployed](https://img.shields.io/badge/frontend-Vercel%20Production-black?style=flat-square&logo=vercel)](https://ledger-line-rupasri3.vercel.app)
[![Backend Deployed](https://img.shields.io/badge/backend-Render%20Production-46E3B7?style=flat-square&logo=render)](https://ledgerline-backend-586s.onrender.com)
[![Status](https://img.shields.io/badge/status-active%20%26%20healthy-397A68?style=flat-square)](https://ledgerline-backend-586s.onrender.com/health)

> **Primary Identity:** LedgerLine  
> **Underlying Engine:** BalanceVault Financial Invariant Engine  
> **Design Personality:** Minimal Editorial Fintech × Soft Claymorphism × Purposeful Pastel Surfaces  
> **Theme Canvas:** Warm Editorial Ivory (`#F5F1E9`), Pure White (`#FFFFFF`), Mint (`#DCEFE5`), Lavender (`#E5EAF7`), Peach (`#F5E2D8`), Powder Blue (`#DCEAF3`), Butter (`#F2E8C9`), Forest Accent (`#397A68`), Deep Slate Forest Text (`#263B35`).

---

## 🌐 Live Deployments & Verification

The application is deployed across production environments with edge routing and dedicated database clusters:

| Component | Status | Provider | Live URL | Description & Access |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Application** | 🟢 **200 OK** | Vercel | [https://ledger-line-rupasri3.vercel.app](https://ledger-line-rupasri3.vercel.app) | Single-page React 19 application with edge API proxy rewrites. |
| **Operations Console** | 🟢 **200 OK** | Vercel | [https://ledger-line-rupasri3.vercel.app/app](https://ledger-line-rupasri3.vercel.app/app) | Direct link to the protected LedgerLine financial workspace. |
| **Login & Auth Portal** | 🟢 **200 OK** | Vercel | [https://ledger-line-rupasri3.vercel.app/login](https://ledger-line-rupasri3.vercel.app/login) | Authentication console featuring 1-click reviewer presets for all roles. |
| **Backend REST API** | 🟢 **200 OK** | Render | [https://ledgerline-backend-586s.onrender.com](https://ledgerline-backend-586s.onrender.com) | Node.js 20+ Express service running the financial invariant engine. |
| **Health & Integrity Endpoint** | 🟢 **200 OK** | Render | [https://ledgerline-backend-586s.onrender.com/health](https://ledgerline-backend-586s.onrender.com/health) | Live runtime node health, PostgreSQL pool status, and ledger metrics. |
| **Source Repository** | 🟢 **Active** | GitHub | [https://github.com/rupasribakka/LedgerLine](https://github.com/rupasribakka/LedgerLine) | Main branch with CI validation and production builds. |

> [!TIP]
> Both deployments are active and verified. The Vercel frontend automatically proxies all `/api/*` financial requests to the Render backend service via [`vercel.json`](file:///c:/Users/rupas/Desktop/LedgerLine/vercel.json). Additionally, Render hosts an independent full-stack fallback serving both the client SPA and REST endpoints.

---

## 🛡️ Core Financial Invariants & Mathematical Guarantees

LedgerLine enforces strict mathematical guarantees directly at the storage and transaction layers:

1. **Integer Paise Precision:**
   All monetary values are calculated and stored as 64-bit BigInt values in integer paise (`₹1.00 = 100 paise`). Standard IEEE 754 floating-point arithmetic is prohibited in balance mutations, eliminating precision loss and rounding drift.
2. **Double-Entry Bookkeeping:**
   Every financial event creates equal and offsetting debit and credit journal records. Money cannot be created or destroyed in transit ($\sum \text{Debits} \equiv \sum \text{Credits}$).
3. **Global Zero-Sum Conservation Proof ($\sum \text{Balances} \equiv 0\text{ paise}$):**
   Deposits debit the system external pool (`ACC-EXTERNAL`) and credit customer accounts. Withdrawals debit customer accounts and credit the external pool. The sum of all accounts across the entire platform mathematically equals zero.
4. **Deterministic Ascending Row-Level Locking:**
   Multi-account transfers acquire PostgreSQL row locks in strictly ascending numerical sequence (`SELECT ... FROM accounts WHERE id IN ($1, $2) ORDER BY id ASC FOR UPDATE`). This completely eliminates circular deadlocks under high-concurrency transfers.
5. **Database-Enforced No-Overdraft Invariant:**
   PostgreSQL enforces `CHECK (balance_paise >= 0)` (`chk_no_overdraft`) directly at the database engine level. Overdrafts are physically rejected by the storage engine, independent of application logic.
6. **UUID v4 Idempotency Safeguard:**
   Every balance mutation accepts a unique `Idempotency-Key` header. Payloads are canonicalized and hashed via SHA-256. Replayed requests return cached settlements with zero double-debits; parameter mismatches return `422 Unprocessable Entity`.
7. **Cryptographic SHA-256 Block Chaining:**
   Every ledger record cryptographically references its predecessor block:
   $$\text{hash} = \text{SHA-256}(\text{prev\_hash} + \text{canonical\_json}(\text{block\_data}))$$
   Genesis entries link to a 64-character zero string (`00000000...`).
8. **Trigger-Backed Immutability:**
   PostgreSQL triggers (`trg_ledger_protect`, `prevent_audit_logs_mutation`) physically reject SQL `UPDATE`, `DELETE`, or `TRUNCATE` operations on historical ledger rows.
9. **Dynamic Role-Based Access Control (RBAC):**
   Role validation (`holder`, `auditor`, `admin`) performs real-time queries against the active database state, eliminating stale JWT privilege escalation vulnerabilities.
10. **Zero Synthetic Data Policy:**
    Every balance, transaction, and statement entry rendered in the user interface originates directly from verified database ledger records.

---

## 📐 Visual Architecture & Integration Flow

### 1. End-to-End System & Integration Architecture
The following visual flow documents the end-to-end integration between the client interface, edge proxy gateway, financial server, caching layer, and database constraints:

```mermaid
flowchart TD
    subgraph ClientExperience["Frontend Client Layer (Vercel)"]
        UI["React 19 + Tailwind CSS 4 UI"]
        DesignSystem["Design System 2.0: Warm Ivory (#F5F1E9) + Pastel Surfaces"]
        TactileEngine["Soft Claymorphism & Ledger Trace Motif"]
        AuthContext["Auth Context & Token State"]
    end

    subgraph EdgeRouting["Edge Gateway & Reverse Proxy"]
        VercelGateway["Vercel Edge Proxy (/api/* Rewrite)"]
    end

    subgraph ServerLayer["Backend Application Service (Render)"]
        ExpressApp["Express.js Server (ES Modules)"]
        RBACGuard["Dynamic RBAC Guard (Real-Time DB Role Lookup)"]
        RateLimiter["Sliding-Window Rate Limiter (100 req / 15 min)"]
        IdempInterceptor["Idempotency Interceptor (Canonical SHA-256 Hash)"]
        LedgerCore["LedgerLine Settlement Engine (BigInt Math)"]
    end

    subgraph CacheCluster["Distributed Rate-Limiting Cache"]
        RedisNode[("Redis Cloud (ioredis)")]
        MemFallback[("In-Memory Sliding Window Fallback")]
    end

    subgraph StorageLayer["PostgreSQL 16 Database Cluster (Neon)"]
        AccTable[("accounts (chk_no_overdraft >= 0)")]
        LedgerTable[("ledger (SHA-256 Chained & Trigger-Protected)")]
        TxnsTable[("transactions (Debits == Credits Balanced)")]
        AuditTable[("audit_logs (Append-Only Immutable Trigger)")]
        IdempTable[("idempotency_keys (Payload Hash & Response Cache)")]
    end

    UI --> VercelGateway
    VercelGateway --> ExpressApp
    ExpressApp --> RBACGuard
    RBACGuard --> RateLimiter
    RateLimiter --> RedisNode
    RedisNode -.->|Automatic Fallback| MemFallback
    RateLimiter --> IdempInterceptor
    IdempInterceptor --> LedgerCore
    LedgerCore --> StorageLayer
```

---

### 2. Double-Entry Money Movement & Ledger Trace Lifecycle
The sequence below illustrates how an atomic transfer moves through idempotency validation, deterministic ascending row locking, zero-sum journal generation, and cryptographic commitment:

```mermaid
sequenceDiagram
    autonumber
    actor User as User Interface (Client)
    participant Edge as Edge Proxy / API Gateway
    participant Idemp as Idempotency Engine
    participant Engine as LedgerLine Settlement Core
    participant DB as PostgreSQL 16 (ACID)

    User->>Edge: POST /api/transactions/transfer (JWT, Idempotency-Key, Payload)
    Edge->>Idemp: Check Idempotency Key & Canonical SHA-256 Hash
    alt Cached Replay Detected
        Idemp-->>User: 200 OK (Cached Settlement Response, X-Cache: REPLAY)
    else Payload Mismatch Detected
        Idemp-->>User: 422 Unprocessable Entity (IDEMPOTENCY_PAYLOAD_MISMATCH)
    else Fresh Valid Mutation
        Idemp->>Engine: Authorize Settlement Pipeline
        Engine->>DB: BEGIN Transaction
        Engine->>DB: SELECT * FROM accounts WHERE id IN (src, dest) ORDER BY id ASC FOR UPDATE
        Note over DB: Deterministic ascending row locks prevent reciprocal deadlocks
        Engine->>DB: Verify Source balance >= amount & status == 'ACTIVE'
        Engine->>DB: Read previous block hash (prev_hash)
        Engine->>Engine: Compute block hash = SHA256(prev_hash + canonical_json(entry))
        Engine->>DB: INSERT INTO ledger (Debit Source, prev_hash, hash)
        Engine->>DB: INSERT INTO ledger (Credit Dest, prev_hash, hash)
        Engine->>DB: INSERT INTO transactions (amount, status, balanced_entries)
        Engine->>DB: UPDATE accounts SET balance_paise = balance_paise - amount WHERE id = src
        Engine->>DB: UPDATE accounts SET balance_paise = balance_paise + amount WHERE id = dest
        Note over DB: chk_no_overdraft validates balance_paise >= 0
        Engine->>DB: INSERT INTO idempotency_keys (key, payload_hash, response)
        Engine->>DB: COMMIT Transaction
        DB-->>Engine: Transaction Committed Atomically
        Engine-->>User: 200 OK (Settlement Confirmed, SHA-256 Hashes Returned)
    end
```

---

### 3. Global Zero-Sum Conservation Proof ($\sum \text{Balances} \equiv 0$)
Money cannot be created or destroyed within LedgerLine. The closed system conserves every single integer paise through matched movements with the external clearing pool:

```mermaid
flowchart LR
    subgraph SystemPool["System Liquidity Clearing Pool"]
        External["ACC-EXTERNAL (#0001)"]
    end

    subgraph CustomerAccounts["Customer Verified Accounts"]
        HolderA["Holder 1 (#0002)"]
        HolderB["Holder 2 (#0003)"]
    end

    External -->|"Deposit: Debit External (-₹100) / Credit Holder 1 (+₹100)"| HolderA
    HolderA -->|"Transfer: Debit Holder 1 (-₹40) / Credit Holder 2 (+₹40)"| HolderB
    HolderB -->|"Withdrawal: Debit Holder 2 (-₹20) / Credit External (+₹20)"| External

    subgraph ConservationLaw["Conservation Proof Invariant"]
        ZeroSum["Σ Balances ≡ 0 Paise (Conservation Equation Validated)"]
    end
```

---

### 4. Cryptographic SHA-256 Hash Chain Structure
Every block is immutably linked to its predecessor. Historical modifications invalidate subsequent block hashes and are physically prevented by database triggers:

```mermaid
flowchart LR
    subgraph Genesis["Genesis Block #0001"]
        G_Prev["PREV_HASH: 0000000000000000..."]
        G_Data["DATA: ACC-EXTERNAL Initialization"]
        G_Hash["HASH: SHA256(prev + data)"]
    end

    subgraph Block2["Journal Block #0002"]
        B2_Prev["PREV_HASH: Hash of Block #0001"]
        B2_Data["DATA: Debit Pool / Credit User (10,000p)"]
        B2_Hash["HASH: SHA256(prev + data)"]
    end

    subgraph Block3["Journal Block #0003"]
        B3_Prev["PREV_HASH: Hash of Block #0002"]
        B3_Data["DATA: Peer Transfer (4,000p)"]
        B3_Hash["HASH: SHA256(prev + data)"]
    end

    subgraph ImmutabilityTrigger["PostgreSQL Engine Security"]
        TriggerGuard["trg_ledger_protect: Physically rejects UPDATE, DELETE, TRUNCATE"]
    end

    G_Hash -->|"Cryptographic parent link"| B2_Prev
    B2_Hash -->|"Cryptographic parent link"| B3_Prev
    TriggerGuard -.->|"Guards block chain"| Genesis
    TriggerGuard -.->|"Guards block chain"| Block2
    TriggerGuard -.->|"Guards block chain"| Block3
```

---

### 5. Deterministic Ascending Row-Locking Concurrency Safety
When two concurrent threads execute opposite transfers at the same millisecond, deterministic ascending sorting eliminates deadlocks:

```mermaid
sequenceDiagram
    autonumber
    actor Alice as Thread A (Transfer #2 -> #3)
    actor Bob as Thread B (Transfer #3 -> #2)
    participant LockMgr as PostgreSQL Lock Manager (ORDER BY id ASC)
    participant Storage as Accounts Storage

    Note over Alice,Bob: Both threads arrive at the exact same millisecond
    Alice->>LockMgr: Request locks on #2 and #3 (Ascending: #2 first, then #3)
    Bob->>LockMgr: Request locks on #3 and #2 (Ascending: #2 first, then #3)

    LockMgr->>Alice: Grants exclusive lock on #2
    LockMgr-->>Bob: Waits for #2 (Thread B safely queued behind Thread A)
    LockMgr->>Alice: Grants exclusive lock on #3
    Note over Alice: Thread A verifies balance, writes journal, updates balances
    Alice->>LockMgr: Commit Transaction & Release Locks on #2 and #3

    LockMgr->>Bob: Grants exclusive lock on #2
    LockMgr->>Bob: Grants exclusive lock on #3
    Note over Bob: Thread B now executes with fresh, authoritative state
    Bob->>LockMgr: Commit Transaction & Release Locks
    Note over Alice,Bob: Result: 0 Deadlocks, 0 Lost Updates, 0 Race Conditions
```

---

### 6. Design System 2.0: Surface Contrast & Pastel Distribution

The user interface uses intentional surface separation, preventing components from blending into the canvas:

```mermaid
flowchart TD
    subgraph Level1["Level 1 — Canvas Base"]
        BaseCanvas["Warm Editorial Ivory Canvas (#F5F1E9 / #191D22)"]
    end

    subgraph Level2["Level 2 — Raised Editorial Surfaces"]
        WhiteSurface["Primary Content: White (#FFFFFF / #242A31)"]
        MintSurface["Balance & Verification: Mint (#DCEFE5 / #293E36)"]
        LavenderSurface["Account Summaries: Lavender (#E5EAF7 / #343247)"]
        PeachSurface["Transaction Summaries: Peach (#F5E2D8 / #49372F)"]
        PowderSurface["Technical Indicators: Powder Blue (#DCEAF3 / #253443)"]
        ButterSurface["Idempotency & Replays: Butter (#F2E8C9 / #3D3825)"]
    end

    subgraph Level3["Level 3 — Recessed Inputs & Projections"]
        Recessed["Form Inputs, Search Toolbars, Calculated Balance Insets"]
    end

    BaseCanvas --> WhiteSurface
    BaseCanvas --> MintSurface
    BaseCanvas --> LavenderSurface
    BaseCanvas --> PeachSurface
    BaseCanvas --> PowderSurface
    BaseCanvas --> ButterSurface
    WhiteSurface --> Recessed
    MintSurface --> Recessed
```

---

## 🔑 Demo Reviewer Credentials (1-Click Fill)

The login console ([https://ledger-line-rupasri3.vercel.app/login](https://ledger-line-rupasri3.vercel.app/login)) features 1-click credential auto-fill for testing all operational roles:

| Role | Email | Password | Seeded Balance & Clearance Scope |
| :--- | :--- | :--- | :--- |
| **Holder 1** | `holder1@ledgerline.local` | `Holder1Password123!` | Primary customer account. Seeded balance: **₹100.00** (10,000 paise). Has transfer, deposit, and statement permissions. |
| **Holder 2** | `holder2@ledgerline.local` | `Holder2Password123!` | Counterparty account. Seeded balance: **₹50.00** (5,000 paise). Has peer-to-peer transfer and statement permissions. |
| **Admin** | `admin@ledgerline.local` | `AdminPassword123!` | Root Administrative clearance. Can provision accounts, freeze/unfreeze accounts, dispatch system deposits, and inspect node health. |
| **Auditor** | `auditor@ledgerline.local` | `AuditorPassword123!` | Compliance & Regulatory clearance. Read-only global access. Runs cryptographic hash chain scans and inspects idempotency replay records. |

---

## 💻 Tech Stack

- **Frontend:** React 19, Vite 8, Tailwind CSS 4, Lucide Icons, Framer Motion, HTML5 Canvas
- **Backend:** Node.js (v20+), Express 4 (ES Modules), `pg` connection pool, Prisma ORM
- **Database:** PostgreSQL 16 (Neon Serverless PostgreSQL in production, `@embedded-postgres` for local testing)
- **Security:** JWT, bcryptjs, SHA-256 HMAC, Sliding-Window Rate Limiting (Redis with in-memory fallback)
- **Deployment:** Vercel (Frontend SPA + API proxy rewrite), Render (Node.js API web service)
- **Testing:** Vitest, Supertest, Mocha, Puppeteer Core

---

## 🗺️ Application Routes

### Public Pages
- `/`: Minimal editorial landing page featuring Sticky Header, Double-Entry Live Journal Block Preview, 3 Core Principles, 4-Stage Transaction Pipeline, and Traditional DB vs LedgerLine Invariant Comparison.
- `/login`: Clean split-screen authentication console with 1-click reviewer presets.
- `/signup`: User registration with client and server-side validation.

### Protected Application Console (`/app`)
- `/app`: Financial Operations Overview — Mint Consolidated Balance Widget, Lavender Accounts Portfolio Cards, Peach Recent Transactions stream, and Quick Actions.
- `/app/accounts`: Accounts Portfolio — Lavender, Mint, and Powder Blue KPI metric summary cards, search toolbar, and accounts table with direct statement links.
- `/app/accounts/:id`: Cryptographic Account Statement — Settled balance card, Powder Blue integrity card, and expandable cryptographic block proof drawer with parent-to-child SHA-256 continuity visualization.
- `/app/move`: Money Movement Terminal — Double-entry transfer, deposit, and withdrawal forms with embedded `LedgerTrace` timeline, Mint projected balance calculation, and Butter idempotency disclosure.
- `/app/transactions`: Searchable Transaction Ledger — Peach, Lavender, and Mint movement volume summary cards, type filter pills, and interactive detail modals.
- `/app/audit`: Auditor & Compliance Console — Mint cryptographic status hero card, Zero-Sum Conservation Proof table ($\sum \equiv 0\text{ paise}$), Butter Idempotency Replay inspector, and append-only audit trail.
- `/app/admin`: Administrative Console — Lavender, Peach, Mint, and Powder Blue system health cards, user provisioning modals, and account status management.
- `/app/attack-lab`: Security & Concurrency Test Lab — Interactive race condition simulators, double-spend stress tests, and replay defense verifiers.

---

## ⚡ Quick Start & Local Setup

### Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0
- PostgreSQL 16 (optional; the test suite automatically provisions an embedded PostgreSQL instance if `DATABASE_URL` is omitted)

### Installation
```bash
# Clone the repository
git clone https://github.com/rupasribakka/LedgerLine.git
cd LedgerLine

# Install root dependencies
npm install

# Install client dependencies
npm --prefix client install
```

### Environment Configuration
Create a `.env` file in the root directory (refer to `.env.example`):
```env
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/balancevault
JWT_SECRET=super_secret_ledgerline_jwt_key_min_32_chars
ENABLE_DEV_SEED=true
```

### Running Locally
```bash
# Terminal 1: Start Backend API (http://localhost:5000)
npm run dev

# Terminal 2: Start Frontend Application (http://localhost:5173)
npm --prefix client run dev
```

---

## 🧪 Testing & Verification

Run the automated test suite verifying all 36 critical security and financial specifications:
```bash
# Run backend invariant test suite
npm test

# Build client for production verification
npm --prefix client run build
```

---

## 📜 License & Compliance

Engineered for high-integrity financial ledger auditing and enterprise banking infrastructure. All financial records, hash chains, and audit logs are governed by database immutability triggers and mathematical zero-sum equilibrium.
