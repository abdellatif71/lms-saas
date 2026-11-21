# ARCHITECTURE.md

## 1. Stack (final decision)

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router), TypeScript strict | One framework for UI + API routes. |
| UI | Tailwind + shadcn/ui + Radix primitives | Accessible, RTL-capable, no lock-in. |
| i18n | next-intl | RSC-friendly, namespaced messages, RTL support. |
| DB | PostgreSQL 16 | Relational integrity, JSONB, RLS available later. |
| ORM | Prisma | Typed schema, migrations, client extensions for tenant guard. |
| Auth | Auth.js v5 (credentials) + argon2id + DB sessions | Revocable sessions, 2FA-friendly. |
| Jobs | BullMQ + Redis behind a JobQueue interface | Reliable, self-hostable, no vendor lock. |
| Storage | S3-compatible (R2 prod / MinIO dev), private buckets | Signed URLs, no public objects. |
| Payments | Stripe behind a PaymentProvider interface | Reference impl; abstraction allows alternates. |
| AI | AIProvider interface; OpenAI / Gemini / DeepSeek | Swap per org via feature flags. |
| Logging | pino (structured JSON) | Fast, portable. |
| Errors | Sentry (Phase 9) | Standard. |
| Testing | Vitest (unit/int), Playwright (E2E), tenant-isolation suite | Required. |
| Deploy | Single Next.js app + worker process; Docker | Simple, portable, cheap. |

## 2. Modular monolith layout

src/
  app/               Next.js routes (RSC + API handlers)
    [locale]/        public + authenticated UI
    api/             route handlers -> call module services only
  modules/
    auth/
    organizations/
    users/
    courses/
    learning/
    assessments/
    analytics/
    notifications/
    certificates/
    billing/
    ai/
    files/
  lib/               cross-cutting: db client, logger, errors, guards, queue, storage
  db/                schema.prisma, migrations, seed
  i18n/              messages/ar.json, fr.json, en.json
  jobs/              BullMQ worker processors
  tests/             unit, integration, e2e, tenant-isolation

Rule: /app/api/* contains no business logic. It authenticates, validates (zod),
calls a module service, shapes the response. Modules never import each other's
internals; cross-module calls go through exported services.

## 3. Request lifecycle

1. Route handler -> getSession() (Auth.js).
2. Zod validation of params/body.
3. Authorization guard: assertRole, assertOrgMember, assertResourceInOrg.
4. Service call (module).
5. Prisma (tenant client extension in tenant-scoped contexts).
6. Response shaping (never leak internal fields, e.g. correct answers).

## 4. Multi-tenant strategy (defense in depth)

- Layer 1 — Schema: every tenant-owned table has organizationId UUID NOT NULL
  and a composite index (organizationId, ...). FK to Organization with
  ON DELETE RESTRICT.
- Layer 2 — Prisma client extension: tenantPrisma(orgId) wraps the client so
  findMany/findFirst/update/delete on tenant-scoped models automatically add
  where: { organizationId: orgId }, and create injects it. Raw queries are
  forbidden in tenant contexts (lint rule).
- Layer 3 — Service guards: every service entrypoint takes
  ctx: { userId, orgId, role } and asserts membership before any DB call.
- Layer 4 — Tests: tenant-isolation.test.ts attempts cross-org reads/writes on
  every tenant-scoped endpoint; must fail with 403/404.
- Phase 9 hardening: PostgreSQL Row-Level Security for critical tables.

## 5. Auth & authorization

- Session cookie (httpOnly, secure, SameSite=Lax) backed by Session table.
- Passwords hashed with argon2id.
- Roles are per-organization membership (except SUPER_ADMIN, which is global).
- Permission checks are capability-based helpers in
  modules/auth/permissions.ts (e.g. canManageCourse, canGradeSubmission),
  not scattered role-string comparisons.

## 6. Files

- All uploads go to private S3 prefix org/{orgId}/...
- Two-step upload: (1) request signed PUT URL after policy check,
  (2) confirm upload via API which validates size + MIME (magic-byte sniffing),
  stores metadata row.
- Downloads: API issues short-lived signed GET (60s) after permission check.

## 7. Background jobs

- JobQueue interface: enqueue(name, payload).
- Processors in /src/jobs: email.send, certificate.generatePdf,
  ai.generateDraft, billing.sync, analytics.recompute.
- Idempotency key on every job.

## 8. Error model

- AppError hierarchy: ValidationError, NotFoundError, ForbiddenError,
  ConflictError, RateLimitError, ExternalServiceError.
- Central handler maps to HTTP + safe JSON. No stack traces in responses.
- All 5xx logged with request ID; user gets request ID for support.

## 9. i18n & RTL

- Locale in URL segment. next-intl server + client.
- html lang dir from locale.
- No physical left/right in components (Tailwind logical props).
- Message catalogs namespaced: course.builder.*, auth.*, ...

## 10. Environments

- development (local Docker: Postgres, Redis, MinIO).
- staging, production: separate DBs, buckets, Stripe keys.
- Secrets via env vars only. .env.example committed; .env ignored.

## 11. Explicit non-goals (v1)

Microservices, GraphQL, native mobile, real-time collaboration, SCORM.
