# DEVELOPMENT_ROADMAP.md

Phase 0 — Foundation (current)
  Docs: PRD, ARCHITECTURE, DATABASE, ROADMAP, STATUS.
  Repo scaffolding task prepared for Copilot.
  Exit: docs reviewed, repo builds.

Phase 1 — Core Infrastructure (largest phase)
  1.1 Project scaffold (Next.js 15, TS strict, Tailwind, shadcn, next-intl,
      pino, zod, Vitest).
  1.2 Prisma schema v1 (Auth + Org + Membership + AuditLog + File base).
  1.3 DB client + tenant extension + error model + guards.
  1.4 Auth.js credentials + argon2 + sessions + email verification + password reset.
  1.5 Registration, login, logout, verify-email, reset flows (UI + API, i18n).
  1.6 Organizations CRUD + invitations + membership management.
  1.7 Tenant-isolation test suite (release gate).
  1.8 Audit logging middleware + basic admin view (SUPER_ADMIN).

Phase 2 — Educational Management
  2.1 Categories + Courses CRUD + publish flow.
  2.2 Modules + Lessons + content types.
  2.3 File upload pipeline (signed PUT, confirm, signed GET, private buckets).
  2.4 Teacher course builder UI (RTL/i18n aware).

Phase 3 — Learning Experience
  3.1 Enrollment (open + invite).
  3.2 Student lesson viewer + resume position.
  3.3 Heartbeat tracking + LearningTimeBucket aggregation job.
  3.4 Completion rules + CourseProgress recompute job.
  3.5 Student dashboard (real data).

Phase 4 — Assessment Engine
  4.1 Question bank + Question CRUD (correct answers protected).
  4.2 Assignments + submissions + file uploads + teacher grading.
  4.3 Quiz/exam config + attempt lifecycle + auto-grading.
  4.4 Manual grading for text; regrade auditing.

Phase 5 — Analytics
  5.1 Teacher dashboard (real metrics).
  5.2 At-risk detection (rule-based v1).
  5.3 Student reports, course engagement reports, export.

Phase 6 — Comms & Certificates
  6.1 In-app notifications + email outbox worker.
  6.2 Announcements.
  6.3 Certificate templates, auto-issue, public verify page, PDF job.

Phase 7 — Commercial SaaS
  7.1 Plans + Subscription lifecycle.
  7.2 Stripe integration (checkout, portal, webhooks, idempotency).
  7.3 Usage limits enforcement.
  7.4 Invoices UI (mirrored from provider).

Phase 8 — AI (beta post-launch ok)
  8.1 AIProvider abstraction + provider configs per org.
  8.2 Draft generation (lesson/exercise/quiz/summary) + teacher approval flow.
  8.3 Recommendations + performance analysis.
  8.4 Usage caps + graceful degradation.

Phase 9 — Production Hardening
  9.1 RLS on critical tables.
  9.2 Virus-scan hook + ClamAV adapter.
  9.3 Full E2E suite, load test, backup/restore drill.
  9.4 Sentry, uptime checks, alerting.
  9.5 Security audit checklist + penetration test pass.
  9.6 Production deployment runbook.

Complexity estimate (solo + Copilot, disciplined):
  Phase 1: ~3–4 weeks. Phases 2–4: ~2–3 weeks each.
  Phases 5–7: ~2 weeks each. Phase 8: ~2 weeks. Phase 9: ~2–3 weeks.

Dependency: 1 -> 2 -> 3 -> 4 -> 5 ; 2 -> 6 ; 2 -> 7 ; 1 -> 8 ; all -> 9.
