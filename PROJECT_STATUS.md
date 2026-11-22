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
- T1.3 — Organizations (create/update/list), memberships (invite/accept/
  role/suspend/remove), invitations (token-based, single-use), 9 API routes,
  minimal admin UI (4 pages, ar/fr/en, RTL), extended permissions
  (assertOrgOwner/assertOrgAdmin), cross-org isolation tests.
- T1.4 — Audit logging (service-layer, append-only), SUPER_ADMIN role
  (User.isSuperAdmin), minimal audit viewer + org management UI,
  promote-super-admin script, tenant-isolation release gate (full
  cross-org suite). Phase 1 complete.
- T2.1 — Schema extension (Category, Course, enums), migration add_catalog,
  Categories CRUD (slug unique per org), Courses CRUD + soft-delete +
  status workflow, 8 API routes, teacher UI (5 pages, ar/fr/en, RTL),
  cross-org isolation tests. Phase 2 complete.
- T2.2 — Schema extension (Module, Lesson, LessonContentType,
  LessonCompletionRule), migration add_lessons, Modules CRUD + reorder,
  Lessons CRUD + reorder + move-between-modules + soft-delete, 6 API routes,
  course content editor UI (5 pages, ar/fr/en, RTL), cross-org isolation tests.
  Phase 3 complete.
- T2.3 — File upload pipeline: signed PUT/GET URLs via @aws-sdk/client-s3,
  MinIO/Silo private bucket, auto-bucket-creation, MIME magic-byte validation,
  size limits per purpose, FileUploader client component, 4 API routes,
  cross-org isolation tests. Course-content uploads only (avatars deferred).
- T2.4 — Schema extension (Enrollment, LessonProgress + enums), migration
  add_enrollment, enrollment service (STUDENT, OPEN-only, idempotent,
  progress-blocked unenroll), student views (my-courses, available, learn),
  5 API routes, cross-org isolation tests. Completion tracking deferred to T2.5.
- T2.5 — Schema extension (LearningEvent, LearningTimeBucket,
  LearningEventType), migration add_learning_events, heartbeat ingestion
  (30s anti-spam), daily bucket aggregation, real lesson/course progress
  from events, lesson viewer heartbeat hook + progress indicators,
  anti-cheat (no completion without prior activity), cross-org isolation
  tests. Completion tracking real (not 'opened page').

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
- D009 Learning time from heartbeats only, aggregated to daily
  LearningTimeBucket. No wall-clock estimation. Anti-cheat: completion
  requires prior STARTED/HEARTBEAT event.
- T3.1 — Learning experience UI refinement: CoursePlayer layout
  (module/lesson tree, progress badges, active highlight, mobile drawer),
  resume-position endpoint (first incomplete lesson by module/lesson position),
  lesson viewer refactor with prev/next navigation, my-courses refinement
  (progress bar, continue button, time spent, empty/loading/error states),
  course completion page (100% check, certificate placeholder). No schema
  change, no new migration. i18n ar/fr/en, RTL.
- D010 Resume position = first incomplete lesson by (module.position,
  lesson.position). Course completion page redirects to resume if < 100%.

## Next implementation task
T4.1 — Assessment foundation (Question, QuestionBank, Quiz models;
question types: MCQ, true/false, short answer; teacher UI to create
questions per lesson). Per master roadmap Phase 4.
