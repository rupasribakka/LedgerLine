# LedgerLine — Financial Transaction & Ledger Management System

> **Snovasys Round 2 Hackathon Project**  
> A high-integrity financial transaction engine and double-entry ledger system built with **React + Vite**, **Node.js + Express**, **PostgreSQL**, and **Prisma**.

---

## 📌 Executive Summary

**LedgerLine** is engineered to prevent the most critical flaws in financial software:
1. **No Duplicate Payments**: Unique client-supplied idempotency keys prevent accidental double-billing.
2. **No Race Conditions / Double Spending**: PostgreSQL row-level locks (`SELECT FOR UPDATE`) serialize concurrent transactions.
3. **No Negative Balances**: Strict server-side balance validation guards against unauthorized overdrafts.
4. **No Rounding Leakage**: All financial values are stored and calculated strictly as **integers in paise** (₹1.00 = 100 paise), avoiding IEEE 754 floating-point inaccuracies.
5. **No Ledger Tampering**: All posted ledger records are append-only. Corrections require explicit offsetting reversal entries.
6. **No AI Autonomy**: AI assistants never independently initiate, sign, or approve monetary movements.

---

## 🛠️ Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | React 19 + Vite 8 | Fast, modern client SPA built with JavaScript |
| **Styling** | Tailwind CSS v4 | Dark navy/charcoal fintech design with blue/violet accents |
| **Icons** | Lucide React | Minimal, professional fintech iconography |
| **Backend** | Node.js + Express | Modular, secure REST API engine |
| **Security** | Helmet + CORS | Essential security headers and origin isolation |
| **Database** | PostgreSQL | Relational ACID database engine with row-locking capabilities |
| **ORM** | Prisma | Clean, type-safe schema definitions and migrations |
| **Testing** | Jest + Supertest | Automated API test suite and invariant validation |
| **Version Control** | Git + GitHub | Clean, atomic commit history |

---

## 📂 Project Directory Structure

```text
LedgerLine/
├── client/                     # Frontend React + Vite Application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── Sidebar.jsx     # Responsive navigation sidebar
│   │   │   ├── Navbar.jsx      # Top status bar and active role pill
│   │   │   ├── StatCard.jsx    # Metric cards with accent borders
│   │   │   ├── SecurityPillars.jsx # Visual invariants display
│   │   │   ├── SystemHealthCard.jsx# Live backend diagnostics card
│   │   │   └── LedgerTableShell.jsx# Clear transaction journal table shell
│   │   ├── pages/
│   │   │   └── DashboardPage.jsx # Main fintech dashboard page
│   │   ├── services/
│   │   │   └── api.js          # Backend API client service
│   │   ├── App.jsx             # Root layout and state management
│   │   ├── index.css           # Tailwind CSS imports and dark theme setup
│   │   └── main.jsx            # React DOM mounting
│   ├── vite.config.js          # Vite config with Tailwind plugin & API proxy
│   ├── .env.example            # Client environment template
│   └── package.json            # Client dependencies and build scripts
│
├── server/                     # Backend Node.js + Express API
│   ├── src/
│   │   ├── controllers/        # Request handling logic
│   │   │   └── health.controller.js # Health probe controller
│   │   ├── routes/             # API routing
│   │   │   ├── health.routes.js# Health check routes
│   │   │   └── index.js        # Central API route aggregator
│   │   ├── middleware/         # Custom Express middleware
│   │   │   ├── errorHandler.js # Centralized safe error handler
│   │   │   └── notFound.js     # 404 handler
│   │   ├── services/           # Business logic layer (reserved for Phase 2)
│   │   ├── utils/              # Helper utilities (reserved for Phase 2)
│   │   ├── app.js              # Express app setup, Helmet, CORS, routing
│   │   └── server.js           # Server bootstrap and port listening
│   ├── prisma/
│   │   └── schema.prisma       # Database schema and model definitions
│   ├── tests/
│   │   └── health.test.js      # Jest + Supertest test suite
│   ├── .env.example            # Server environment template
│   └── package.json            # Server dependencies and test scripts
│
├── .gitignore                  # Git exclusions for dependencies and secrets
├── README.md                   # Project documentation & run guide
├── THREATS.md                  # Comprehensive STRIDE threat model
├── PROMPTS.md                  # AI development log and architectural prompts
└── package.json                # Root convenience scripts
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have installed:
- **Node.js** (v18.0.0 or higher recommended, tested on Node v26)
- **npm** (v9.0.0 or higher)
- **Git**

---

### Step 1: Clone and Inspect

```bash
git clone <repository-url>
cd LedgerLine
```

---

### Step 2: Set Up the Backend Server

1. Open a terminal and navigate to the `server` directory:
   ```bash
   cd server
   ```

2. Copy the environment configuration:
   ```bash
   cp .env.example .env
   # On Windows PowerShell:
   # Copy-Item .env.example .env
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the backend development server:
   ```bash
   npm run dev
   ```

   The server will start on **`http://localhost:5000`**.  
   Verify it in your browser: `http://localhost:5000/api/health`

5. Run the test suite:
   ```bash
   npm test
   ```

---

### Step 3: Set Up the Frontend Client

1. Open a second terminal and navigate to the `client` directory:
   ```bash
   cd client
   ```

2. Copy the environment configuration:
   ```bash
   cp .env.example .env
   # On Windows PowerShell:
   # Copy-Item .env.example .env
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the Vite development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to:
   ```text
   http://localhost:5173
   ```

You will see the **LedgerLine** dashboard shell with the live backend status indicator, architectural pillars, and transaction table shell.

---

### Step 4: Root Convenience Commands

From the project root directory, you can also run:

| Command | Action |
|---|---|
| `npm run dev:server` | Starts the Express server with nodemon |
| `npm run dev:client` | Starts the React + Vite dev server |
| `npm run test:server` | Runs the backend Jest + Supertest test suite |
| `npm run build:client` | Compiles the production frontend bundle |

---

## 📡 API Endpoints (Phase 1)

### `GET /api/health`
Checks server uptime, health status, and active system invariants.

**Sample Response (`200 OK`):**
```json
{
  "status": "UP",
  "service": "LedgerLine Financial Core API",
  "phase": "Phase 1 - Project Setup",
  "timestamp": "2026-11-06T01:10:00.000Z",
  "uptime": 45.12,
  "environment": "development",
  "invariants": {
    "currencyPrecision": "integer_paise",
    "doubleEntryEnforced": true,
    "rowLockingStrategy": "pessimistic_select_for_update",
    "idempotencyEnforced": true,
    "aiAutonomousApproval": false
  }
}
```

---

## 🔒 Security Architecture Highlights

1. **Integer Arithmetic**: All values represented as integer paise (e.g. ₹500.25 is stored as `50025`).
2. **Double-Entry Enforcement**: Ledger entries are paired debits and credits that sum to zero.
3. **Pessimistic Locking**: `SELECT ... FOR UPDATE` prevents race conditions when reading account balances.
4. **Idempotency Keys**: Requests send a unique UUID to prevent double execution on network retries.
5. **No AI Autonomy**: Strict architectural rule prohibiting autonomous AI agents from initiating or approving transfers.

---

## 🗺️ Project Phases

- **Phase 1: Project Setup (Completed)** ✅
  - Dual workspace setup (`client/` and `server/`).
  - React 19 + Vite 8 + Tailwind CSS v4 dark fintech UI.
  - Express backend with Helmet, CORS, and `/api/health`.
  - Comprehensive STRIDE threat model (`THREATS.md`).
  - Unit and integration tests with Jest and Supertest.
- **Phase 2: Database Schema & Authentication (Upcoming)** ⏳
  - PostgreSQL schema with Prisma ORM.
  - User model with 3 roles: Administrator, Account Holder, Auditor.
  - JWT authentication and bcrypt password hashing.
  - Strict integer paise database constraints.
- **Phase 3: Double-Entry Ledger & Transaction Engine (Upcoming)** ⏳
  - Deposit, withdrawal, and transfer pipelines.
  - Pessimistic row locking and ACID transactions.
  - Idempotency key tracking.
- **Phase 4: Full Frontend Integration & Auditing (Upcoming)** ⏳
  - Role-based dashboard interfaces.
  - Real-time ledger view and audit log viewer.
