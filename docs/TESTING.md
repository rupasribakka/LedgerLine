# LedgerLine — Automated Testing Guide & Test Matrix

LedgerLine features an exhaustive automated test suite written with **Vitest** and **Supertest**, executing against local PostgreSQL 16.

## 1. Running the Test Suite

```bash
# Run all automated tests
npm test

# Run a specific phase test suite
npx vitest run tests/phase1.test.js
npx vitest run tests/phase2.test.js
npx vitest run tests/phase3.test.js
npx vitest run tests/phase4.test.js
npx vitest run tests/phase5.security.test.js
npx vitest run tests/phase6.complete_backend.test.js
```

---

## 2. Test Phase Breakdown & Coverage Matrix

### Total Test Count: **118 Passing Tests (0 Failures)**

| Phase | Test File | Tests | Coverage Focus |
|---|---|---|---|
| **Phase 1** | `tests/phase1.test.js` | 13 | Table creation, overdraft check constraints, seed credentials verification, double-entry seed deposits, database immutability triggers (block `UPDATE`, `DELETE`, `TRUNCATE`), SHA-256 hash chain verification. |
| **Phase 2** | `tests/phase2.test.js` | 24 | Login authentication, rate limiting (429 response), JWT tampering detection, server-side dynamic role re-reading from DB, `canMoveFrom` IDOR helper, account listing and details role scoping. |
| **Phase 3** | `tests/phase3.test.js` | 17 | Amount validation (reject floats, negatives, strings, zero, exceeding max cap), double-entry deposit/withdrawal/transfer execution, insufficient funds refusal committed to ledger, idempotency replay, payload mismatch 422 rejection, role write restrictions. |
| **Phase 4** | `tests/phase4.test.js` | 27 | Account statements with pagination and ASC/DESC ordering, kind=`refused` statement rows, duplicate replay markers, `GET /audit/verify` normal state, simulated direct database owner-role hash tampering and detection, `GET /audit/duplicates`. |
| **Phase 5** | `tests/phase5.security.test.js` | 7 | Missing/weak JWT secret startup rejection, distinct production runtime/migration URL validation, production demo seed prohibition, least-privilege `ledgerline_runtime` role verification. |
| **Phase 6** | `tests/phase6.complete_backend.test.js` | 30 | Full user registration, duplicate email rejection, weak password rejection, role escalation prevention, logout, account creation with double-entry opening balances, account balance retrieval, account status lifecycle (`ACTIVE`, `FROZEN`, `CLOSED`), transaction blocking on frozen/closed accounts, **simultaneous withdrawal race conditions** (double-spending prevention), **simultaneous circular transfers** (deadlock-free ordering), RESTful transaction and ledger query endpoints, structured audit logging, and audit log database immutability. |

---

## 3. Concurrency Test Implementation

The race-condition test in `tests/phase6.complete_backend.test.js` proves that simultaneous withdrawals cannot overdraft or cause double spending:
1. An account is funded with exactly ₹1,000.00 (100,000 paise).
2. Two concurrent withdrawal requests of ₹800.00 (80,000 paise) each are executed simultaneously using `Promise.all` with distinct idempotency keys.
3. The database row locks (`SELECT ... FOR UPDATE`) force serialized execution.
4. Exactly one request succeeds (`HTTP 200 OK`) and exactly one fails (`HTTP 422 Unprocessable Entity - INSUFFICIENT_FUNDS`).
5. The final account balance settles at exactly ₹200.00 (20,000 paise) and never becomes negative.
6. The global balance invariant $\sum \text{balance\_paise} = 0$ remains satisfied.
