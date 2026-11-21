# DATABASE.md

## Conventions
- IDs: UUIDv7 (application-generated).
- Timestamps: createdAt, updatedAt on every table.
- Soft-delete: deletedAt on user-facing content tables only.
- Money: integer minor units (amountCents) + currency.
- All tenant-owned rows include organizationId.

## Core entities

### Platform
- User(id, email UNIQUE, passwordHash, name, locale, emailVerifiedAt,
  totpSecret?, totpEnabled, status ACTIVE|SUSPENDED, createdAt, updatedAt)
- Session(id, userId, tokenHash, userAgent, ip, expiresAt, revokedAt?)
- VerificationToken(id, userId, type EMAIL_VERIFY|PASSWORD_RESET, tokenHash,
  expiresAt, usedAt?)
- Organization(id, name, slug UNIQUE, logoFileId?, description, defaultLocale,
  status ACTIVE|SUSPENDED, settings jsonb, createdAt, updatedAt)
- Membership(id, userId, organizationId,
  role ORG_OWNER|ORG_ADMIN|TEACHER|STUDENT|PARENT,
  status INVITED|ACTIVE|SUSPENDED, invitedBy?, joinedAt,
  UNIQUE(userId, organizationId))
- Invitation(id, organizationId, email, role, tokenHash, invitedBy,
  expiresAt, acceptedAt?)
- GuardianLink(id, parentUserId, studentUserId, organizationId, status)
- AuditLog(id, actorId?, organizationId?, action, targetType, targetId?,
  metadata jsonb, ip, userAgent, createdAt)  -- append-only

### Catalog
- Category(id, organizationId, name, slug, UNIQUE(organizationId, slug))
- Course(id, organizationId, authorId, categoryId?, title, slug, description,
  coverFileId?, visibility, status DRAFT|PUBLISHED|ARCHIVED, enrollmentRule,
  publishedAt?, deletedAt?, UNIQUE(organizationId, slug))
- Module(id, courseId, title, position)
- Lesson(id, moduleId, title, position,
  contentType TEXT|VIDEO|PDF|EXTERNAL, bodyText?, fileId?, externalUrl?,
  estimatedMinutes, completionRule jsonb)

### Learning
- Enrollment(id, courseId, studentUserId, status, enrolledAt, completedAt?,
  UNIQUE(courseId, studentUserId))
- LessonProgress(id, lessonId, studentUserId,
  state NOT_STARTED|IN_PROGRESS|COMPLETED, lastPositionSeconds, completedAt?,
  UNIQUE(lessonId, studentUserId))
- LearningEvent(id, organizationId, studentUserId, courseId?, lessonId?,
  type LESSON_VIEW|HEARTBEAT|VIDEO_PLAY|VIDEO_PAUSE|DOWNLOAD|COMPLETE,
  payload jsonb, occurredAt)  -- append-only, indexed by (studentUserId, occurredAt)
- LearningTimeBucket(id, studentUserId, lessonId, day DATE, seconds INT,
  UNIQUE(studentUserId, lessonId, day))  -- aggregated from heartbeats

### Assessment
- QuestionBank(id, organizationId, courseId?, title)
- Question(id, bankId, type MCQ|TF|SHORT|LONG|FILE|PRACTICAL, prompt,
  options jsonb?, correctAnswer jsonb (never returned to students), points,
  aiGenerated BOOLEAN, approvedBy?, approvedAt?)
- Assignment(id, lessonId?, courseId, title, instructions, dueAt?, maxPoints,
  allowResubmit, resubmitLimit)
- Submission(id, assignmentId, studentUserId, files jsonb, textAnswer?,
  submittedAt, status SUBMITTED|GRADED|RETURNED, grade?, feedback?,
  gradedBy?, gradedAt?)
- Quiz(id, courseId, title,
  config jsonb { shuffle, count, timeLimit, passScore, maxAttempts, openAt, closeAt },
  status)
- QuizQuestion(id, quizId, questionId, position, points)
- QuizAttempt(id, quizId, studentUserId, startedAt, submittedAt?, score?,
  status IN_PROGRESS|SUBMITTED|GRADED, attemptNumber)
- QuizAnswer(id, attemptId, questionId, answer jsonb, autoScore?, manualScore?,
  gradedBy?)

### Analytics (derived, recomputable)
- CourseProgress(id, courseId, studentUserId, percent, lessonsCompleted,
  lessonsTotal, lastActivityAt, updatedAt, UNIQUE(courseId, studentUserId))

### Comms
- Notification(id, userId, organizationId?, type, payload jsonb, readAt?, createdAt)
- Announcement(id, organizationId, courseId?, authorId, title, body,
  publishedAt, expiresAt?)
- EmailOutbox(id, toEmail, template, payload jsonb, status, attempts, sentAt?)

### Certificates
- CertificateTemplate(id, organizationId, name, htmlTemplate, fields jsonb)
- Certificate(id, organizationId, studentUserId, courseId, templateId,
  serial UNIQUE, verifyTokenHash, issuedAt, revokedAt?, pdfFileId?)

### Billing
- Plan(id, code UNIQUE, name, priceCentsMonthly, priceCentsYearly, currency,
  limits jsonb { students, teachers, storageBytes, aiTokens }, features jsonb)
- Subscription(id, organizationId UNIQUE, planId,
  status TRIALING|ACTIVE|PAST_DUE|CANCELED|EXPIRED, provider,
  providerCustomerId, providerSubscriptionId, currentPeriodStart,
  currentPeriodEnd, cancelAtPeriodEnd, trialEndsAt?)
- Invoice(id, organizationId, providerInvoiceId, amountCents, currency, status,
  periodStart, periodEnd, pdfUrl?, paidAt?)
- BillingEvent(id, provider, providerEventId UNIQUE, type, payload jsonb,
  processedAt, idempotencyKey UNIQUE)  -- webhook ledger
- UsageCounter(id, organizationId, metric, periodStart, value,
  UNIQUE(org, metric, period))

### Files & AI
- File(id, organizationId, uploadedBy, storageKey, sizeBytes, mimeType,
  originalName, checksum, purpose, createdAt)
- AiProviderConfig(id, organizationId, provider, model, isEnabled,
  credentialsCiphertext, monthlyTokenCap)
- AiUsageLog(id, organizationId, userId, provider, model, feature,
  inputTokens, outputTokens, costCents, createdAt)
- AiDraft(id, organizationId, authorId, kind LESSON|EXERCISE|QUIZ|SUMMARY,
  payload jsonb, status PENDING|APPROVED|REJECTED, approvedBy?, approvedAt?,
  createdAt)

## Key indexes
- Membership(organizationId, role)
- Course(organizationId, status)
- Lesson(moduleId, position)
- LearningEvent(studentUserId, occurredAt DESC)
- LearningEvent(organizationId, type, occurredAt DESC)
- Enrollment(courseId, status)
- QuizAttempt(quizId, studentUserId, attemptNumber)
- Subscription(status, currentPeriodEnd)
- BillingEvent(providerEventId) UNIQUE
- AuditLog(organizationId, createdAt DESC)

## Cascade rules (summary)
- Organization delete: RESTRICT if active subscription; otherwise soft-archive.
- Course delete: soft; hard delete only via admin job after 30 days.
- User delete: soft-suspend; PII anonymized on GDPR request (Phase 9).

## ERD (overview)
User 1─* Membership *─1 Organization
Organization 1─* Course 1─* Module 1─* Lesson
Course 1─* Enrollment *─1 User
Lesson 1─* LessonProgress *─1 User
Course 1─* Quiz 1─* QuizQuestion *─1 Question
Quiz 1─* QuizAttempt *─1 User
Assignment 1─* Submission *─1 User
Organization 1─1 Subscription *─1 Plan
Organization 1─* Invoice
Organization 1─* AiDraft / AiUsageLog / File / Certificate
