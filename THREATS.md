# LedgerLine — Financial Systems Threat Model (THREATS.md)

This document formalizes the security and architectural threat model for **LedgerLine**, aligned with the **STRIDE** methodology (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) tailored specifically for high-integrity financial ledger applications.

---

## 1. Core Threat Matrix

| Threat ID | Threat Category | Description | Real-World Attack Scenario | LedgerLine Architectural Mitigation |
|---|---|---|---|---|
| **T-01** | **Tampering / Arithmetic Error** | Floating-point rounding inaccuracies in balance computations. | Accumulation of fractional cents/paise over thousands of transactions causing balance leakage (`0.1 + 0.2 !== 0.3`). | **Integer Paise Math**: Store and calculate all balances and transfer amounts strictly as integers in paise (`₹1.00 = 100 paise`). Floats are strictly prohibited. |
| **T-02** | **Tampering / Race Condition** | Concurrent double spending across simultaneous requests. | An attacker fires two simultaneous ₹5,000 transfer requests with a balance of only ₹5,000. Both read the balance concurrently before either writes. | **Pessimistic Row Locking**: All balance checks and updates run inside a database transaction with `SELECT ... FOR UPDATE` row locks, forcing serialized execution. |
| **T-03** | **Repudiation / Replay** | Network timeout causes duplicate payment submissions. | A network glitch causes client timeout after server debits account. User clicks "Pay" again, incurring a double charge. | **Idempotency Keys**: Every mutating operation requires a unique client-generated UUID idempotency key cached with its transaction outcome. Duplicate requests return the original response without re-executing. |
| **T-04** | **Tampering / Accounting Invariant Violation** | Unbalanced financial movements creating or destroying money out of thin air. | A buggy or malicious deposit/transfer creates a debit entry without a matching credit entry, breaking accounting integrity. | **Double-Entry Bookkeeping**: Every transaction creates balanced credit and debit ledger entries. The sum of all debits must equal the sum of all credits ($\sum \text{Debits} = \sum \text{Credits}$). |
| **T-05** | **Tampering / Ledger Alteration** | Direct modification or deletion of past financial records. | An insider or attacker updates a past ledger row to alter the historical transaction amount or erase a payment. | **Append-Only Ledger**: Database table rules and application logic prohibit `UPDATE` or `DELETE` statements on posted ledger records. Adjustments require compensating reversing entries. |
| **T-06** | **Elevation of Privilege / Overdraft** | Negative balance generation. | An account holder issues a withdrawal larger than their settled available balance, causing an unauthorized credit line. | **Atomic Balance Guard**: Transactions enforce non-negative constraints `CHECK (balance_paise >= 0)` and abort immediately if `available_balance < transfer_amount`. |
| **T-07** | **Elevation of Privilege / Auth Bypass** | Unauthorized account access across tenant boundaries. | User A alters the `accountId` in a payload to debit User B's account (Insecure Direct Object Reference / IDOR). | **Server-Side Authorization**: Every account mutation verifies cryptographic JWT identity and account ownership on the server side prior to querying or locking records. |
| **T-08** | **Repudiation / Covert Attacks** | Unlogged rejected or suspicious transaction attempts. | An attacker probes the API with invalid credentials or bad balances, but leaves no trace for security teams. | **Comprehensive Audit Logging**: All rejected attempts (failed auth, insufficient funds, duplicate idempotency keys) are written to an immutable `AuditLog` table. |
| **T-09** | **Autonomous AI Escalation** | AI agents autonomously initiating or authorizing money movement. | An autonomous LLM agent connected to an API initiates fund transfers without direct human approval or cryptographic signature. | **Zero AI Autonomy Invariant**: LedgerLine enforces a strict security policy: AI assistants may summarize and analyze, but must **never** independently sign, initiate, or approve money transfers. |

---

## 2. Invariants Enforced in Each Phase

### Phase 1 (Setup — Current)
- [x] Strict security headers configured via `helmet`.
- [x] CORS origin restriction configured.
- [x] Clean separation of client and server boundaries.
- [x] Health diagnostic probe with architectural invariant metadata (`/api/health`).
- [x] Clear zero-mock policy (no fake balances, no simulated unverified transactions).

### Phase 2 (Data Models & Database Engine)
- [ ] PostgreSQL Prisma schema with integer paise fields (`BigInt` / `Int`).
- [ ] PostgreSQL CHECK constraints ensuring `balance_paise >= 0`.
- [ ] Pessimistic locking queries (`SELECT ... FOR UPDATE`).
- [ ] Atomic database transaction wrappers (`prisma.$transaction`).
- [ ] Double-entry ledger verification (`debits == credits`).
- [ ] Append-only database triggers/rules on `LedgerEntry`.
- [ ] Idempotency store with atomic claim-and-lock pattern.
- [ ] Comprehensive audit trail on rejected requests.

---

## 3. Role-Based Access Control (RBAC) Architecture

| Role | Permissions | Limitations |
|---|---|---|
| **Account Holder** | View own accounts, view own transaction history, initiate transfers with own funds. | Cannot view other users' accounts, cannot access audit logs, cannot execute admin adjustments. |
| **Administrator** | Manage user accounts, view system health, initiate system reconciliations. | Subject to double-entry rules; cannot arbitrarily overwrite ledger history without audit logs. |
| **Auditor** | Read-only inspection of all ledger accounts, journals, audit trails, and invariants. | Zero mutation permissions. Read-only access to all financial records. |
