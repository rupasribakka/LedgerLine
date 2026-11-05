# LedgerLine — AI Development Log & Prompts Record (PROMPTS.md)

This log records the prompts, architectural decisions, and design choices established during the development of **LedgerLine** for the Snovasys Round 2 hackathon.

---

## Phase 1: Project Setup Prompt

```text
# LedgerLine — Phase 1: Project Setup

Act as a senior full-stack developer, financial systems architect, and UI/UX designer.
I am a beginner building this project for the Snovasys Round 2 hackathon. Guide me step by step and write clean, understandable code. Explain important files and decisions in simple language.

Project objective:
Build LedgerLine, a secure financial transaction and ledger management system for handling deposits, withdrawals, and transfers without duplicate payments, unauthorized access, negative balances, or ledger tampering.

Technology stack:
- Frontend: React + Vite
- Styling: Tailwind CSS
- Backend: Node.js + Express
- Database: PostgreSQL
- ORM: Prisma
- Authentication: JWT + bcrypt
- Testing: Jest + Supertest
- Version control: Git + GitHub

UI design:
- Dark navy/charcoal theme with subtle blue and violet accents.
- Clean typography and consistent spacing.
- Responsive layout for desktop and mobile.
- Sidebar navigation and polished dashboard cards.
- Minimal text, meaningful icons, and clear transaction tables.
- Avoid unnecessary animations and clutter.

Phase 1 tasks:
1. Inspect the workspace before creating files.
2. Set up the React + Vite frontend.
3. Set up the Express backend.
4. Configure Tailwind CSS correctly.
5. Create a clean folder structure.
6. Add .gitignore and .env.example files.
7. Create a basic professional LedgerLine dashboard shell with sidebar navigation.
8. Add a simple backend health-check endpoint.
9. Add initial README setup instructions.
10. Verify that the frontend and backend both start successfully.
```

---

## Architectural Decisions Log (Phase 1)

### 1. JavaScript over TypeScript
- **Decision**: Used standard modern JavaScript (ES6+ for React, CommonJS for Node backend) rather than TypeScript.
- **Rationale**: Keeps the codebase beginner-friendly, eliminates compilation overhead and complex typing errors during fast hackathon prototyping, while retaining clean, modular architecture.

### 2. CommonJS for Express Backend
- **Decision**: Express server structured with CommonJS (`require` / `module.exports`).
- **Rationale**: Guarantees instant, zero-configuration compatibility with Jest and Supertest without requiring experimental Node VM module flags or Babel transpilation.

### 3. Tailwind CSS v4 with `@tailwindcss/vite`
- **Decision**: Integrated Tailwind CSS v4 via `@tailwindcss/vite` and `@import "tailwindcss";`.
- **Rationale**: Clean, modern single-import configuration without boilerplate PostCSS config files, fully integrated with Vite's lightning-fast hot module replacement (HMR).

### 4. Integer Paise Arithmetic Standard
- **Decision**: Strict convention that all monetary amounts represent integers in paise (₹1.00 = 100 paise).
- **Rationale**: Floating-point numbers in computers suffer from binary representation errors (e.g. `0.1 + 0.2 = 0.30000000000000004`). In financial systems, accumulating rounding discrepancies causes balance mismatches and legal compliance violations.

### 5. Separation of Concerns & Clean Directory Layout
- **Decision**: Strict split into `client/` and `server/` with isolated dependencies, environment files, and build pipelines.
- **Rationale**: Prevents frontend and backend dependency leakage, allows independent deployment (e.g., Vercel for frontend, Render/Railway for backend), and enforces clean API contracts via `/api/*`.

### 6. Zero Fake Balances Policy
- **Decision**: Phase 1 UI displays an informative empty state shell and architectural invariants rather than mocking balances or fake transactions.
- **Rationale**: Financial integrity software must never mislead users or evaluators with unbacked fake data. All financial numbers must come from verified ledger records.
