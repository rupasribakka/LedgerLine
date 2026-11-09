# LedgerLine — Comprehensive STRIDE Threat Model & Invariant Protections

This document formalizes the security and architectural threat model for **LedgerLine**, aligned with the **STRIDE** methodology (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) tailored specifically for mission-critical financial ledger applications.

---

## 1. Core Threat Matrix

| Threat ID | Threat Category | Description | Real-World Attack Scenario | LedgerLine Architectural Mitigation |
|---|---|---|---|---|
| **T-01** | **Tampering / Arithmetic Error** | Floating-point rounding inaccuracies in balance computations. | Accumulation of fractional cents/paise over thousands of transactions causing balance leakage (`0.1 + 0.2 !== 0.3`). | **Integer Paise Math**: Store and calculate all balances and transfer amounts strictly as integers in paise (`₹1.00 = 100 paise`). Floats, strings, decimals, and NaN are rejected by input validation. |
| **T-02** | **Tampering / Race Condition** | Concurrent double spending across simultaneous requests. | An attacker fires two simultaneous ₹800 withdrawal requests with a balance of only ₹1,000. Both read the balance concurrently before either writes. | **Pessimistic Row Locking**: All balance checks and updates run inside a database transaction with `SELECT ... FOR UPDATE ORDER BY id ASC` row locks, serializing execution. Exactly one succeeds; the second receives 422 `INSUFFICIENT_FUNDS`. Balance remains ₹200. |
| **T-03** | **Repudiation / Replay** | Network timeout causes duplicate payment submissions. | A network glitch causes client timeout after server debits account. User clicks "Pay" again, incurring a double charge. | **Idempotency Keys**: Every mutating operation requires a unique client-generated UUID idempotency key cached with its transaction outcome. Duplicate requests return the original response with `Idempotent-Replay: true` without re-executing. Reusing the same key with a different payload returns `HTTP 422`. |
| **T-04** | **Tampering / Accounting Invariant Violation** | Unbalanced financial movements creating or destroying money out of thin air. | A buggy or malicious deposit/transfer creates a debit entry without a matching credit entry, breaking accounting integrity. | **Double-Entry Bookkeeping**: Every transaction creates balanced credit and debit ledger entries. The sum of all debits must equal the sum of all credits ($\sum \text{Debits} = \sum \text{Credits}$). Initial opening balances are funded via real double-entry entries from `ACC-EXTERNAL`. |
| **T-05** | **Tampering / Ledger Alteration** | Direct modification or deletion of past financial records. | An insider or attacker updates a past ledger row to alter the historical transaction amount or erase a payment. | **Append-Only Triggers & SHA-256 Hash Chain**: Database triggers prohibit `UPDATE`, `DELETE`, and `TRUNCATE` operations on `ledger` and `audit_logs`. Each row includes a SHA-256 hash linked to the previous row. Tampering is flagged by `GET /api/ledger/verify`. |
| **T-06** | **Elevation of Privilege / Overdraft** | Negative balance generation. | An account holder issues a withdrawal larger than their settled available balance, causing an unauthorized credit line. | **Atomic Balance Guard**: Transactions enforce non-negative constraints `CHECK (is_external OR balance_paise >= 0)` and abort immediately if `available_balance < transfer_amount`. |
| **T-07** | **Elevation of Privilege / Auth Bypass & IDOR** | Unauthorized account access across tenant boundaries. | User A alters the `accountId` in a payload to debit User B's account (Insecure Direct Object Reference / IDOR). | **Server-Side Authorization**: Every account mutation verifies cryptographic JWT identity and account ownership on the server side (`canMoveFrom`) prior to querying or locking records. |
| **T-08** | **Repudiation / Covert Attacks** | Unlogged rejected or suspicious transaction attempts. | An attacker probes the API with invalid credentials or bad balances, but leaves no trace for security teams. | **Immutable Audit Logging**: All sensitive actions (failed/successful logins, registrations, account creations, status changes, deposits, withdrawals, transfers, and refusals) are written to an append-only `audit_logs` table. |
| **T-09** | **Autonomous AI Escalation** | AI agents autonomously initiating or authorizing money movement. | An autonomous LLM agent connected to an API initiates fund transfers without direct human approval or cryptographic signature. | **Zero AI Autonomy Invariant**: LedgerLine enforces a strict security policy: AI assistants may summarize and analyze, but must **never** independently sign, initiate, or approve money transfers. |
| **T-10** | **Denial of Service / Deadlock** | Concurrent circular transfers causing database deadlocks. | User A transfers to User B while User B simultaneously transfers to User A, resulting in mutual lock waits and aborted transactions. | **Deterministic Lock Acquisition**: Accounts are locked in strict ascending primary key order (`ORDER BY id ASC`), eliminating cyclic wait conditions. |
| **T-11** | **Elevation of Privilege / Account Lifecycle** | Transacting through frozen or closed accounts. | An account is frozen due to fraud investigation, but continuing requests still move money. | **Account Status Lifecycle**: `postMovement` validates that source and destination accounts are `ACTIVE`. Transfers involving `FROZEN` or `CLOSED` accounts are rejected with `HTTP 403`. |

---

## 2. Invariants Enforced in the System

- [x] Strict security headers configured manually in src/app.js (nosniff, DENY, HSTS, CSP connect-src 'self').
- [x] CORS origin restriction and size limiting (10 KB).
- [x] PostgreSQL relational schema with integer paise fields (`BIGINT`).
- [x] PostgreSQL CHECK constraints ensuring `balance_paise >= 0` (`chk_no_overdraft`).
- [x] Pessimistic locking queries (`SELECT ... FOR UPDATE ORDER BY id ASC`).
- [x] Atomic database transaction wrappers (`withTransaction`).
- [x] Double-entry ledger verification ($\sum \text{debits} == \sum \text{credits}$).
- [x] Append-only database triggers prohibiting `UPDATE`, `DELETE`, and `TRUNCATE` on `ledger` and `audit_logs`.
- [x] Idempotency store with atomic claim-and-lock pattern and duplicate replay tracking returning header `Idempotent-Replay: true`.
- [x] Comprehensive immutable audit trail (`audit_logs`) on sensitive and rejected requests.
- [x] Account status lifecycle (`ACTIVE`, `FROZEN`, `CLOSED`).

---

## 3. Cryptographic Hash Chain Limitation & Mitigations

### Limitation
A cryptographic hash chain stored in the same database table detects unauthorized modification by attackers who alter individual rows. However, a privileged database administrator with full write access could theoretically rewrite the entire chain from the tampered row forward, recomputing valid SHA-256 hashes for all subsequent rows.

### Mitigations Implemented in LedgerLine
1. **Least-Privilege Database Roles**: The runtime application role (`ledgerline_runtime`) has only `SELECT` and `INSERT` privileges on `ledger`—it cannot update or delete rows under any circumstances.
2. **PL/pgSQL Immutability Triggers**: Row and statement triggers prevent `UPDATE`, `DELETE`, and `TRUNCATE` operations on `ledger` and `audit_logs`.
3. **Independent Audit Log Journal**: A separate immutable `audit_logs` table logs all actions independently of the ledger journal.
4. **External Anchoring Readiness**: The `GET /api/ledger/verify` endpoint computes the latest account state and chain hashes, suitable for periodic anchoring to an external tamper-proof store (such as a public blockchain, RFC 3161 timestamping authority, or write-once cloud storage).
