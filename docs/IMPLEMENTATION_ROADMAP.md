# TaxBee Implementation Roadmap

**Version:** 0.1  
**Date:** 2026-05-31  
**Status:** Planning only — **await approval before Sprint 1 code changes**

This roadmap extends the gap analysis into executable sprints. Each sprint preserves existing APIs where possible and extends — never duplicates.

---

## Sprint Overview

| Sprint | Theme | Risk | Depends on |
|--------|-------|------|------------|
| 1 | Auth Foundation | Medium | — |
| 2 | S3 Upload Foundation | High | Sprint 1 |
| 3 | Redis + BullMQ | High | Sprint 2 |
| 4 | AI Extraction Pipeline | Critical | Sprint 2, 3 |
| 5 | Review Workflow | Medium | Sprint 4 |
| 6 | ITR Draft Engine | Medium | Sprint 5 |
| 7 | Tax Intelligence Engine | Medium | Sprint 6 |
| 8 | Bee Assistant Context Engine | High | Sprint 7 |
| 9 | Email + n8n | Medium | Sprint 3 |
| 10 | Sentry + PostHog | Low | Sprint 1 |

---

## SPRINT 1 — Auth Foundation

### Goals
- Wire Next.js route protection (`proxy.ts` → active middleware)
- Fix worker Mongo URI parity (`getMongoUri()`)
- Deprecate `localStorage` JWT path (cookie-only production)
- Align `.env.example` with backend env validation
- Fix production CSP `connect-src` for `BACKEND_URL`

### Files affected
- `proxy.ts` → `middleware.ts` (or equivalent Next 16 wiring)
- `backend/worker.js`
- `app/_utils/authClient.ts`
- `.env.example`
- `next.config.ts`
- `README.md` (accuracy fix)

### Dependencies
- None

### Risk level
**Medium** — auth regressions if cookie/bearer forwarding breaks

### Testing strategy
- Extend `backend/controllers/authController.test.js`
- Manual: login → protected route → verify-email gate → logout
- Verify worker connects with `MONGODB_URI` only

### Rollback strategy
- Revert middleware file; keep bearer path enabled
- Worker env: set both `MONGO_URI` and `MONGODB_URI` as hotfix

---

## SPRINT 2 — S3 Upload Foundation

### Goals
- Add AWS S3 client and presigned POST/PUT flow
- Store `storageRef` on `ImportedDocument`; stop putting raw base64 in new jobs
- Backward compatible: legacy Mongo payload jobs still processable
- Update `importController.uploadImport` to accept S3 reference OR legacy body

### Files affected
- `backend/services/storageService.js` (new)
- `backend/models/ImportedDocument.js` (storageRef fields)
- `backend/controllers/importController.js`
- `backend/services/documentJobService.js`
- `app/api/imports/upload/route.ts`
- `app/import-data/page.tsx`
- `app/upload-documents/page.tsx` (wire or redirect)
- `.env.example` (`AWS_REGION`, `AWS_S3_BUCKET`, credentials)

### Dependencies
- Sprint 1 (stable auth for upload)

### Risk level
**High** — misconfigured IAM exposes documents

### Testing strategy
- Unit tests for storage key generation and ACL assumptions
- Integration test with LocalStack or mocked S3 SDK
- Smoke: presign → PUT → worker reads object

### Rollback strategy
- Feature flag `STORAGE_PROVIDER=mongo|s3` default `mongo`
- Dual-write period optional

---

## SPRINT 3 — Redis + BullMQ

### Goals
- Introduce Redis connection and BullMQ queues mirroring existing job types
- Adapt `jobQueueService.js` to use BullMQ while keeping `enqueueJob` / `serializeJob` API
- Move rate limit buckets to Redis (optional in same sprint or follow-up)
- Worker process uses BullMQ consumer instead of Mongo poll loop

### Files affected
- `backend/services/jobQueueService.js`
- `backend/services/jobWorkerService.js`
- `backend/worker.js`
- `backend/middleware/securityMiddleware.js`
- `backend/package.json` (bullmq, ioredis)
- `.env.example` (`REDIS_URL`)

### Dependencies
- Sprint 2 recommended (large payloads off Mongo before queue migration)

### Risk level
**High** — job loss if migration mishandled

### Testing strategy
- Existing `jobQueueService.test.js`, `jobQueueLifecycle.test.js` adapted
- Dual-run shadow mode: enqueue to both Mongo and BullMQ, compare — optional
- Load test: 50 concurrent document jobs

### Rollback strategy
- Env `QUEUE_BACKEND=mongo|bullmq` default `mongo` until validated
- Keep Mongo Job collection writes during transition

---

## SPRINT 4 — AI Extraction Pipeline

### Goals
- Wire `@google/generative-ai` with `GEMINI_API_KEY`
- Structured extraction schema for Form 16 / AIS / 26AS field paths matching `documentProcessingService` rules
- Fallback: existing rule-based extraction when Gemini fails or low confidence
- Enable `OCR_PROVIDER=tesseract` path for scanned PDFs before Gemini structuring

### Files affected
- `backend/services/geminiExtractionService.js` (new)
- `backend/services/documentProcessingService.js`
- `backend/services/documentJobService.js`
- `backend/utils/env.js`
- `.env.example`

### Dependencies
- Sprint 2 (S3 document input)
- Sprint 3 (BullMQ worker throughput)

### Risk level
**Critical** — incorrect extraction affects tax liability display

### Testing strategy
- Golden-file tests with anonymized sample PDFs/text fixtures
- Confidence threshold gates auto-apply vs review-required
- Compare rule-based vs Gemini on fixture set; human review checklist

### Rollback strategy
- `EXTRACTION_PROVIDER=rules|gemini|hybrid` default `hybrid` with rules fallback
- Never auto-confirm Gemini fields without review status `extracted`

---

## SPRINT 5 — Review Workflow

### Goals
- Unify review UI across `import-data` and `documents` pages
- Bulk confirm/reject extracted fields
- Audit events for every confirmation (already partial — complete coverage)
- Job status polling UX for async imports

### Files affected
- `app/import-data/page.tsx`
- `app/documents/page.tsx`
- `backend/controllers/importController.js` (reviewImport enhancements if needed)
- `app/api/imports/[id]/review/route.ts`

### Dependencies
- Sprint 4 (meaningful extracted fields)

### Risk level
**Medium**

### Testing strategy
- API tests for review PATCH edge cases
- E2E manual script: upload → queue → review → confirmed status

### Rollback strategy
- UI feature flags; API backward compatible (partial field updates already supported)

---

## SPRINT 6 — ITR Draft Engine

### Goals
- Map confirmed extraction fields → ITRDraft paths automatically (partial exists — harden)
- Conflict resolution when manual draft differs from extracted value
- Version snapshot on draft save for audit
- Retire or mount `incomeRoutes` only if needed — avoid duplicate APIs

### Files affected
- `backend/controllers/itrDraftController.js`
- `backend/utils/taxContextService.js`
- `app/file-your-itr/page.tsx`
- `backend/models/ITRDraft.js` (optional version field)

### Dependencies
- Sprint 5 (confirmed fields)

### Risk level
**Medium**

### Testing strategy
- `taxEngine.test.js`, new mapping tests extraction → draft
- Regression: existing draft loads unchanged

### Rollback strategy
- Auto-apply mapping behind `AUTO_APPLY_EXTRACTIONS=false`

---

## SPRINT 7 — Tax Intelligence Engine

### Goals
- Harden `taxIntelligenceService` and regime recommendation with extraction-sourced data
- Surface calculation status consistently on dashboard, tax-savings, Bee context
- Ensure `tax_intelligence_recalculation` job idempotent and debounced

### Files affected
- `backend/services/taxIntelligenceService.js`
- `backend/utils/taxEngine.js`
- `backend/controllers/dashboardController.js`
- `backend/controllers/taxSavingsController.js`
- `app/dashboard/page.tsx`
- `app/tax-savings/page.tsx`

### Dependencies
- Sprint 6

### Risk level
**Medium**

### Testing strategy
- Existing `taxIntelligenceService.test.js`, `taxEngine.test.js`
- Fixture users: salary-only, AIS+deductions, missing data

### Rollback strategy
- Cache invalidation already exists; revert intelligence version flag

---

## SPRINT 8 — Bee Assistant Context Engine

### Goals
- Add optional Gemini layer **on top of** `beeReasoningService` grounded facts (not replacing)
- Pass structured tax context + audit refs as system context; LLM phrasing only
- Consolidate frontend/backend intent duplication where safe
- Persist conversation summary server-side (optional collection) — scope TBD

### Files affected
- `backend/controllers/aiController.js`
- `backend/services/beeReasoningService.js`
- `backend/services/geminiAssistantService.js` (new)
- `components/BeeAssistant.tsx`
- `app/_utils/beeAssistantIntent.ts`
- `personalityEngine.js` (merge or deprecate)

### Dependencies
- Sprint 7 (rich tax context)

### Risk level
**High** — prompt injection / hallucination if guardrails weak

### Testing strategy
- `beeReasoningService.test.js` extended
- Red-team prompts attempting to override tax numbers
- Verify `degraded: true` when Gemini unavailable

### Rollback strategy
- `BEE_ASSISTANT_LLM=off|on` — off uses current rule-only path

---

## SPRINT 9 — Email + n8n

### Goals
- Add Resend provider alongside Nodemailer (provider abstraction)
- HTML templates for OTP, invite, job complete/fail
- n8n webhook emission on key audit events (job_failed, collaboration_invite)
- Process `email_send` jobs via BullMQ

### Files affected
- `backend/services/emailService.js`
- `backend/services/notificationService.js`
- `backend/services/n8nWebhookService.js` (new)
- `backend/services/jobWorkerService.js`
- `.env.example` (`RESEND_API_KEY`, `N8N_WEBHOOK_URL`)

### Dependencies
- Sprint 3 (reliable job queue)

### Risk level
**Medium**

### Testing strategy
- Mock Resend API; assert template rendering
- Webhook retry with dead-letter logging

### Rollback strategy
- `EMAIL_PROVIDER=nodemailer|resend` default nodemailer until verified

---

## SPRINT 10 — Sentry + PostHog

### Goals
- Sentry SDK on Express (`server.js`, `errorMiddleware`) and Next.js
- PostHog browser SDK on key funnel events (signup, import, review, regime view)
- PII scrubbing rules (no PAN, email in event properties)
- Dashboard links in DEPLOYMENT.md

### Files affected
- `backend/server.js`
- `backend/middleware/errorMiddleware.js`
- `app/layout.tsx`
- `next.config.ts`
- `DEPLOYMENT.md`
- `.env.example` (`SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY`)

### Dependencies
- Sprint 1 (stable deploy targets)

### Risk level
**Low**

### Testing strategy
- Trigger test error in staging; verify Sentry receipt
- Validate PostHog events in dev project

### Rollback strategy
- Env-gated: empty DSN disables SDK init

---

## Cross-Cutting Rules (All Sprints)

1. **No duplicate APIs/models** — extend existing routes and schemas
2. **Backward compatibility** — feature flags for storage, queue, extraction, LLM
3. **Update `.env.example`** every sprint that adds env vars
4. **Audit logging** — new mutations emit `AuditEvent` where applicable
5. **Show diffs before merge** — PR review required per engineering mandate

---

## Definition of Done (Platform)

- [ ] All 10 sprints complete or explicitly deferred with sign-off
- [ ] `REPOSITORY_AUDIT.md` refreshed post-Sprint 10
- [ ] Production smoke tests in `DEPLOYMENT.md` pass
- [ ] No Critical gaps open in `ARCHITECTURE_GAP_REPORT.md`

---

## Approval Gate

**Stop here.** Do not begin Sprint 1 implementation until stakeholders approve:

1. `REPOSITORY_AUDIT.md`
2. This roadmap and gap priorities
3. S3/BullMQ/Gemini vendor choices and budget

---

## References

- `ARCHITECTURE_GAP_REPORT.md`
- `docs/TRD.md`
- `docs/SECURITY_ARCHITECTURE.md`
- `DEPLOYMENT.md`
