# PROJECT_STATUS.md

Last updated: Phase 0 — initial.

## Phase status
| Phase | Status |
|---|---|
| 0 Foundation | IN PROGRESS — docs prepared, scaffolding task next |
| 1 Core Infra | NOT STARTED |
| 2 Education  | NOT STARTED |
| 3 Learning   | NOT STARTED |
| 4 Assessment | NOT STARTED |
| 5 Analytics  | NOT STARTED |
| 6 Comms/Cert | NOT STARTED |
| 7 Billing    | NOT STARTED |
| 8 AI         | NOT STARTED |
| 9 Hardening  | NOT STARTED |

## Completed
- Phase 0 documentation drafted.
- T0.0 — Documentation baseline (validated).
- T0.1 — Repository scaffold (Next.js, TS, Tailwind 3, ESLint 9, Prisma 7
  with @prisma/adapter-pg). Prisma 7 datasource URL in prisma.config.ts.
  Versions pinned. Build/typecheck/lint/test green.
- T1.1 — Prisma schema v1 (8 entities), docker compose (Postgres 5434,
     Redis 6379, pgsty/silo 9000/9001), tenantPrisma extension, AppError
     hierarchy, permissions helpers, tenant-isolation tests, init migration
     applied.
- T1.2 — Auth.js v5 (credentials, argon2id, DB sessions), email
  verification, password reset, Redis rate limiting, Console email
  provider, 5 UI pages (ar/fr/en, RTL), auth service + validation
  + integration tests.

## In progress
- None.

## Outstanding issues
- None yet.

## Known bugs
- None.

## Technical decisions log
- D001 Stack = Next.js 15 + Prisma + Postgres + Auth.js + Tailwind/shadcn + next-intl.
- D002 Sessions DB-backed (not JWT).
- D003 Tenant isolation = schema + Prisma extension + service guards + tests
  (RLS in Phase 9).
- D004 Background jobs = BullMQ/Redis behind JobQueue interface.
- D005 AI output = draft + teacher approval; never authoritative.
- D006 Billing = Stripe behind PaymentProvider interface; webhook-only activation.
- D007 Learning time from heartbeats only; aggregated to daily buckets.
- D008 Modular monolith; API routes contain no business logic.

## Next implementation task
T1.3 — Organizations + memberships CRUD + invitations (service layer + minimal admin UI + tests).
