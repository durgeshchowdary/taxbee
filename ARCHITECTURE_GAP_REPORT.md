# TaxBee Architecture Gap Report

**Date:** 2026-05-31  
**Baseline:** Repository audit (`REPOSITORY_AUDIT.md`)  
**Target:** Product vision (Next.js → Express → MongoDB Atlas → AWS S3 → Redis → BullMQ → Document Workers → Gemini → n8n → Resend → Sentry → PostHog)

Legend: **Critical** | **High** | **Medium** | **Low**

---

## Summary Matrix

| Domain | Current State | Target State | Gap Rank |
|--------|---------------|--------------|----------|
| Authentication | JWT + OTP + HttpOnly cookie proxy | Same + hardened session | **Medium** |
| Authorization | Role portals, workspace permissions | RBAC + admin audit | **High** |
| Storage | MongoDB + encrypted job payloads | MongoDB + **AWS S3** objects | **Critical** |
| Documents | JSON/base64 upload, rule extraction | S3 + worker pipeline | **Critical** |
| Extraction | Regex/rules + optional Tesseract | **Gemini** + OCR fallback | **Critical** |
| ITR Engine | Full in-process tax engine | Same + e-file export | **Medium** |
| Bee Assistant | Rule-based + local NLP UI | **Gemini context engine** | **High** |
| Email | Nodemailer/Gmail/SMTP | **Resend** + n8n flows | **High** |
| Monitoring | Logs + private `/api/metrics` | **Sentry** + alerting | **Critical** |
| Analytics | None | **PostHog** product analytics | **High** |
| Deployment | Documented 3-service manual setup | CI/CD + env parity | **High** |
| Security | Solid middleware baseline | Secret mgmt, WAF, S3 policies | **High** |

---

## Authentication

**Current:** Express JWT (HS256, 1-day expiry), bcryptjs passwords, email OTP verification, Next.js proxies set HttpOnly `auth_token` cookie. Legacy `localStorage` token path retained.

**Target:** Production-grade auth foundation with cookie-first session, rotation, and no client-side token storage.

| Gap | Rank | Notes |
|-----|------|-------|
| Legacy bearer in `localStorage` | **Medium** | XSS exposure surface; `app/_utils/authClient.ts` |
| No refresh token / rotation | **Medium** | Single 1-day JWT |
| Route guard may be inactive | **High** | `proxy.ts` without confirmed `middleware.ts` wiring |
| No MFA | **Low** | Not in current or stated near-term scope |
| Password schema minlength 6 vs API 8 | **Low** | `backend/models/user.js` |

---

## Authorization

**Current:** User roles (`taxpayer`, `reviewer`, `ca`, `admin`, `internal`), workspace permissions on `WorkspaceAccess`, reviewer comment model, portal gating after email verification.

**Target:** Consistent RBAC across all API routes and admin UI; least-privilege defaults.

| Gap | Rank | Notes |
|-----|------|-------|
| Admin UI exists; dedicated admin API audit incomplete | **High** | `app/admin/dashboard/page.tsx` |
| No centralized policy middleware | **Medium** | Per-controller checks |
| Reviewer workspace scoped via `workspaceAccessService` | — | Partially implemented |
| No API-level resource ownership tests for all routes | **Medium** | Some controller tests exist |

---

## Storage

**Current:** MongoDB Atlas for all persisted data. Uploaded file bytes travel as base64 in request body and encrypted `Job.securePayload` in Mongo.

**Target:** AWS S3 for document objects; Mongo stores metadata and references only.

| Gap | Rank | Notes |
|-----|------|-------|
| No S3 SDK or bucket config | **Critical** | Zero S3 references in app source |
| Large documents in Mongo jobs | **Critical** | 6MB upload cap; not object-store scalable |
| No virus scanning / content policy | **High** | UNKNOWN external tooling |
| No lifecycle / retention policies | **Medium** | Soft delete on imports only |

---

## Documents

**Current:** `POST /api/imports/upload` accepts JSON with text or base64. PDF text extraction + optional Tesseract OCR. Async via Mongo `document_extraction` jobs.

**Target:** S3 upload → queue → worker extraction → review workflow.

| Gap | Rank | Notes |
|-----|------|-------|
| No presigned S3 upload flow | **Critical** | |
| Stub upload page | **Medium** | `app/upload-documents/page.tsx` |
| `import-data` is functional UI | — | Uses `/api/imports/upload` |
| Managed OCR not configured | **High** | `ocrProviderService.js` stub |
| No Form 16/AIS structured parsers | **High** | Rule-based keyword extraction only |

---

## Extraction

**Current:** `documentProcessingService.js` — MIME validation, PDF text, image OCR (Tesseract), field rules with confidence scores. No LLM extraction.

**Target:** Gemini AI extraction pipeline with human review.

| Gap | Rank | Notes |
|-----|------|-------|
| `GEMINI_API_KEY` unused in source | **Critical** | Env only |
| `@google/generative-ai` not imported in backend services | **Critical** | |
| Extraction quality limited to heuristics | **High** | |
| Worker OCR default `OCR_PROVIDER=none` | **High** | Must be explicitly enabled |

---

## ITR Engine

**Current:** Comprehensive `taxEngine.js` — FY 2025-26 slabs, surcharge, 80C/80D caps, regime comparison, `buildTaxIntelligence`. Draft persisted in `ITRDraft` model. Filing UI at `file-your-itr`, `file-tax`.

**Target:** Draft engine + regime comparison + final filing workflow.

| Gap | Rank | Notes |
|-----|------|-------|
| Regime comparison | — | **Implemented** |
| ITR draft persistence | — | **Implemented** |
| E-filing API integration | **Critical** | UI links only to incometax.gov.in |
| Export to government XML/JSON schema | **High** | UNKNOWN format support |
| `incomeRoutes.js` returns 501 | **Low** | Not mounted |

---

## Bee Assistant

**Current:** Dual-layer — rich frontend (`BeeAssistant.tsx`) with intents/guides; backend `beeReasoningService` produces grounded answers from Mongo tax context, audit provenance, reviewer comments. **No Gemini call in production path.**

**Target:** Context-aware Gemini copilot with emotional UX.

| Gap | Rank | Notes |
|-----|------|-------|
| No LLM integration in `aiController` | **High** | Rule engine only |
| Frontend/backend intent duplication | **Medium** | `beeAssistantIntent.ts` + `beeReasoningService` |
| `personalityEngine.js` unused | **Low** | Aspirational Gemini JSON format |
| Memory summary passed but not persisted server-side | **Medium** | Request body only |

---

## Email

**Current:** Nodemailer via Gmail or custom SMTP (`EMAIL_USER`/`EMAIL_PASS`, `SMTP_*`). OTP, password reset, collaboration invites via job type `email_send`.

**Target:** Resend + n8n orchestration.

| Gap | Rank | Notes |
|-----|------|-------|
| No Resend SDK | **High** | |
| No n8n webhooks or workflows | **High** | |
| Email skipped when provider missing | **Medium** | Dev OTP fallback |
| No HTML templates / deliverability monitoring | **Medium** | Plain text only |

---

## Monitoring

**Current:** `safeLogger` structured logs, request IDs, `/api/health`, `/api/ready`, token-gated `/api/metrics`, in-memory job counters.

**Target:** Sentry error tracking + operational dashboards.

| Gap | Rank | Notes |
|-----|------|-------|
| No Sentry SDK | **Critical** | |
| No APM/tracing | **High** | |
| Metrics not exported to Prometheus/Datadog | **Medium** | |
| Worker failure alerting | **High** | Log-only today |

---

## Analytics

**Current:** None in source.

**Target:** PostHog product analytics.

| Gap | Rank | Notes |
|-----|------|-------|
| No PostHog SDK | **High** | |
| No funnel/event schema | **Medium** | |
| No privacy/consent layer | **Medium** | Required for production |

---

## Deployment

**Current:** Manual 3-service deploy documented (`DEPLOYMENT.md`). No Dockerfile, no GitHub Actions found.

**Target:** Production startup platform with env parity and smoke tests.

| Gap | Rank | Notes |
|-----|------|-------|
| No CI pipeline in repo | **High** | |
| Worker `MONGO_URI` vs `MONGODB_URI` mismatch | **Critical** | Deploy breakage risk |
| CSP blocks non-localhost API in production build | **High** | `next.config.ts` |
| No staging environment definition | **Medium** | UNKNOWN |
| Dual package install (root + backend) | **Low** | Operational friction |

---

## Security

**Current:** Env validation, CORS, rate limits, input sanitization, JWT issuer/audience in production, encrypted job payloads, security headers on Express and Next.

**Target:** Defense in depth with object-store IAM, secret rotation, monitoring.

| Gap | Rank | Notes |
|-----|------|-------|
| JWT secret also derives payload encryption key | **High** | Key reuse in `jobQueueService.js` |
| No secrets manager integration | **High** | Plain env vars |
| No S3 bucket policies | **Critical** | S3 not present |
| Rate limit state in memory | **Medium** | Multi-instance bypass |
| Dependency audit automation | **Medium** | UNKNOWN |

---

## Priority Roadmap Alignment

The gaps above map directly to **Sprints 1–10** in `docs/IMPLEMENTATION_ROADMAP.md`:

| Sprint | Closes gaps |
|--------|-------------|
| 1 Auth Foundation | Route guard, localStorage deprecation, env parity |
| 2 S3 Upload Foundation | Storage Critical, Documents Critical |
| 3 Redis + BullMQ | Queue scale, rate limit durability |
| 4 AI Extraction Pipeline | Extraction Critical, Gemini wiring |
| 5 Review Workflow | Documents High (UI parity) |
| 6 ITR Draft Engine | ITR Medium (hardening) |
| 7 Tax Intelligence Engine | ITR + Extraction cross-cut |
| 8 Bee Assistant Context Engine | Bee Assistant High |
| 9 Email + n8n | Email High |
| 10 Sentry + PostHog | Monitoring Critical, Analytics High |

---

*Approve this gap report before Sprint 1 implementation begins.*
