# PRODUCT_REQUIREMENTS.md

## 1. Purpose
A commercial, multi-tenant LMS SaaS enabling independent teachers, training
centers, schools, and companies to run their own online learning workspaces.

## 2. Actors (RBAC)
- SUPER_ADMIN — platform operator
- ORG_OWNER — owner of an organization workspace
- ORG_ADMIN — delegated administrator inside an org
- TEACHER — creates and grades content
- STUDENT — learns, submits, takes exams
- PARENT — (Phase 1 schema only) read-only guardian of a student

## 3. Functional Requirements (by module)

### M1 — Auth & User Management
- Email+password registration with email verification (token, 24h TTL).
- Login / logout / logout-all-devices.
- Password reset (token, 1h TTL, single-use).
- Sessions stored server-side, revocable.
- Profile CRUD.
- Account suspension by ORG_ADMIN (within org) and SUPER_ADMIN (platform).
- TOTP 2FA: schema ready in Phase 1; UI in Phase 1.5.
- Org invitations: tokenized, email-delivered, role-bound, single-use.

### M2 — Multi-Tenant Organizations
- CRUD organization (SUPER_ADMIN creates; ORG_OWNER edits).
- Membership table with role + status.
- Per-org settings (branding, locale default, feature flags).
- Usage counters (students, courses, storage bytes) maintained transactionally.
- Suspension (SUPER_ADMIN) locks out all org users except billing contact.
- Tenant isolation enforced server-side and database-side.

### M3 — Course Management
- Course → Module → Lesson → (Activity | Quiz | Assignment).
- Media: video (upload or external URL), PDF, image, text.
- Publish / unpublish; visibility (private, org, public-catalog optional).
- Enrollment rules: open, invite-only, paid (Phase 7).
- Categories per org.
- Soft-delete with cascade rules.

### M4 — Learning Experience
- Lesson viewer with resume position (per student, per lesson).
- Explicit completion rules (watched %, read time, or activity completion).
- Heartbeat-based learning-time tracking.
- Progress % computed from real completion records.

### M5 — Exercises & Assignments
- Question types: MCQ, true/false, short answer, long answer, file upload, practical.
- Assignments: deadline, submission, teacher grade + feedback, resubmission policy.
- File submissions stored privately, accessed via signed URLs.

### M6 — Quiz & Exam Engine
- Question bank (per org, per course).
- Quiz config: shuffle, question count, time limit, passing score, attempt
  limit, availability window.
- Auto-grade MCQ/TF; manual grade for text.
- Correct answers NEVER returned in public API before submission/close.
- Exam attempts immutable after submission (except audited teacher regrade).

### M7 — Learning Analytics
- Per-student: enrolled courses, lessons done/remaining, activity log, scores,
  time (from heartbeats), completion %, last activity, history.
- Teacher dashboard: students, active/inactive, completion %, avg score,
  at-risk list.
- Student dashboard: progress, upcoming work, results, certificates.
- All metrics computed from database. No hardcoded numbers.

### M8 — Notifications
- In-app notification feed per user.
- Events: assignment due, new course, exam result, feedback, announcement.
- Email channel abstracted; in-app default, email opt-in per event type.
- Announcements scoped to org and/or course.

### M9 — Certificates
- Template per org (Phase 6).
- Auto-issue on completion rule.
- Unique public verification URL.
- PDF generation via background job.

### M10 — Subscription & Billing
- Plans: Free, Trial (14d), Pro Monthly, Pro Yearly, Enterprise (contact).
- Plan limits: students, teachers, storage, AI tokens.
- Upgrade/downgrade proration handled by provider.
- Invoices and payment history mirrored from provider.
- Webhook-only activation with signature verification and idempotency.
- Payment provider abstraction (Stripe first).

### M11 — AI Assistant
- Provider abstraction (OpenAI, Gemini, DeepSeek).
- Features: lesson draft, exercise generation, quiz generation, summarization,
  concept explanation, learning recommendations, performance analysis,
  teacher assist.
- AI-generated content enters DRAFT state; requires teacher approval.
- AI output never auto-graded as authoritative.
- Usage metering, per-org caps, graceful degradation if provider down.
- Optional per-org feature flag.

## 4. Non-Functional Requirements
- Multilingual: ar (RTL), fr, en. Locale-prefixed routes.
- Accessibility: WCAG 2.1 AA target.
- Performance: p95 API < 300ms for read endpoints at 10k students/org scale.
- Security: see ARCHITECTURE.md and the security strategy.
- Observability: structured logs (pino), error tracking (Sentry later).
- Backup: daily database snapshots, 30-day retention, restore procedure documented.

## 5. MVP+ Scope (first commercial release = end of Phase 7)
All features above except: TOTP UI, parent UI, AI features (beta post-launch),
virus scanning, RLS (Phase 9). Manual grading UI and certificate PDFs ARE in MVP.

## 6. Out of Scope for v1
Native mobile apps, live video classes, public course marketplace,
SCORM/xAPI import, advanced gamification, SSO/SAML.
