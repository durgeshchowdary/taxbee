# TaxBee Product Requirements Document (PRD)

**Version:** 0.1 (repository-derived)  
**Date:** 2026-05-31  
**Status:** Baseline — derived from existing codebase + stated product vision

---

## 1. Product Overview

TaxBee is an AI-powered income tax filing platform for Indian taxpayers. Users sign up, verify email, build an ITR draft from uploaded documents (Form 16, AIS, Form 26AS) and manual inputs, compare tax regimes, receive guided assistance from **Bee Assistant**, collaborate with CAs/reviewers, and progress toward filing readiness with auditability.

**Evidence of current product:** `app/dashboard/page.tsx`, `app/import-data/page.tsx`, `backend/utils/taxEngine.js`, `DEPLOYMENT.md`

---

## 2. Problem Statement

Indian ITR filing requires reconciling salary, TDS, AIS/26AS, deductions, and regime choice. Taxpayers and CAs need a single workspace with provenance, review workflows, and trustworthy calculations — not generic chatbots that invent numbers.

**Bee Assistant constraint (implemented):** "TaxBee will not invent income, deductions, refunds, risks, or regime benefits." — `backend/services/beeReasoningService.js`

---

## 3. Target Users

| Persona | Role in system | Evidence |
|---------|----------------|----------|
| Individual taxpayer | `taxpayer` (default) | `backend/models/user.js` |
| CA / tax reviewer | `reviewer`, `ca` | Workspace collaboration |
| Platform admin | `admin`, `internal` | Portal gating in `authController.js` |

---

## 4. Core User Journey (Target)

```
Signup/Login → Email Verification → Dashboard → Upload Form16/AIS/26AS
→ Store Files → AI Extraction → Review Extracted Fields → Update ITR Draft
→ Old vs New Regime Comparison → Bee Assistant Guidance → Final Filing Workflow
→ Notifications → Audit Logs → Monitoring
```

**Current implementation status:** Steps through regime comparison and Bee guidance are largely built. **Final e-filing integration is not implemented** (external portal links only).

---

## 5. Functional Requirements

### 5.1 Authentication

| ID | Requirement | Status | Evidence |
|----|-------------|--------|----------|
| AUTH-1 | Email/password signup | ✅ Implemented | `POST /api/auth/signup` |
| AUTH-2 | Email OTP verification | ✅ Implemented | `POST /api/auth/verify-otp` |
| AUTH-3 | Login with JWT session | ✅ Implemented | `POST /api/auth/login` |
| AUTH-4 | Password reset | ✅ Implemented | forgot/reset routes |
| AUTH-5 | HttpOnly session cookie (production) | ✅ Partial | Next auth proxies |
| AUTH-6 | Multi-factor authentication | ❌ Not present | — |

### 5.2 Document Management

| ID | Requirement | Status | Evidence |
|----|-------------|--------|----------|
| DOC-1 | Upload tax documents | ✅ Partial | `/api/imports/upload`; stub page at `/upload-documents` |
| DOC-2 | Store files durably (S3) | ❌ Not present | Mongo payload only |
| DOC-3 | Classify document type | ✅ Implemented | FORM_16, AIS, FORM_26AS, etc. |
| DOC-4 | Extract structured fields | ✅ Partial | Rule-based + optional OCR |
| DOC-5 | Async processing for large/PDF files | ✅ Implemented | Mongo job queue |

### 5.3 Review & Draft

| ID | Requirement | Status | Evidence |
|----|-------------|--------|----------|
| REV-1 | Review extracted fields | ✅ Implemented | `PATCH /api/imports/:id/review` |
| REV-2 | Confirm/override with audit trail | ✅ Implemented | `AuditEvent`, import audit |
| REV-3 | ITR draft persistence | ✅ Implemented | `ITRDraft` model |
| REV-4 | Manual income/deduction entry | ✅ Implemented | `file-your-itr`, deductions routes |

### 5.4 Tax Intelligence

| ID | Requirement | Status | Evidence |
|----|-------------|--------|----------|
| TAX-1 | Old vs new regime comparison | ✅ Implemented | `taxEngine.js` |
| TAX-2 | Tax savings suggestions | ✅ Implemented | `/api/tax-savings` |
| TAX-3 | Filing readiness scoring | ✅ Partial | `taxIntelligenceService.js` |
| TAX-4 | FY 2025-26 policy | ✅ Implemented | `TAX_POLICY` in taxEngine |

### 5.5 Bee Assistant

| ID | Requirement | Status | Evidence |
|----|-------------|--------|----------|
| BEE-1 | Context-aware answers from user data | ✅ Implemented | Mongo-grounded reasoning |
| BEE-2 | Workflow guides for filing | ✅ Implemented | `BeeAssistantConfig.ts` guides |
| BEE-3 | Gemini-style conversational AI | ❌ Not in backend path | UI direction in `GEMINI.md` |
| BEE-4 | Provenance/audit explanations | ✅ Implemented | audit mode in beeReasoning |

### 5.6 Collaboration

| ID | Requirement | Status | Evidence |
|----|-------------|--------|----------|
| COL-1 | Invite reviewer/CA | ✅ Implemented | collaboration routes |
| COL-2 | Field-level comments | ✅ Implemented | `ReviewComment` |
| COL-3 | Reviewer workspace view | ✅ Implemented | `app/reviewer/` |

### 5.7 Notifications & Audit

| ID | Requirement | Status | Evidence |
|----|-------------|--------|----------|
| NOT-1 | In-app notifications | ✅ Implemented | `Notification` model |
| NOT-2 | Email notifications | ✅ Partial | job type `email_send` |
| AUD-1 | Audit timeline | ✅ Implemented | `/api/audit-timeline` |

### 5.8 Filing

| ID | Requirement | Status | Evidence |
|----|-------------|--------|----------|
| FILE-1 | Pre-filing checklist UI | ✅ Partial | `file-tax`, guides |
| FILE-2 | Direct e-filing API | ❌ Not present | UNKNOWN integration path |
| FILE-3 | Export ITR data | ❌ UNKNOWN | — |

---

## 6. Non-Functional Requirements

| Category | Target | Current |
|----------|--------|---------|
| Availability | 99.9% (target vision) | Health/ready endpoints exist |
| Security | OWASP baseline, encrypted docs | Middleware + JWT; gaps in S3/monitoring |
| Performance | Async doc processing | Mongo queue + worker |
| Compliance | Indian tax data sensitivity | Audit logs; DPA/privacy policy **UNKNOWN** |
| Observability | Sentry + metrics | Logs + `/api/metrics` only |

---

## 7. Out of Scope (Current Phase)

- Direct integration with Income Tax e-filing portal APIs
- Payment/subscription billing (pricing page exists — monetization logic **UNKNOWN**)
- Mobile native apps
- Multi-tenant white-label

---

## 8. Success Metrics (Proposed — not instrumented)

| Metric | Definition |
|--------|------------|
| Activation | Verified user with ≥1 import |
| Extraction accuracy | % fields confirmed without override |
| Filing readiness | Users reaching `calculationStatus: calculated` |
| Assistant engagement | Bee sessions per active user |
| Time to draft | Signup → first calculated regime comparison |

PostHog instrumentation: **not present** (Sprint 10).

---

## 9. Open Questions (UNKNOWN)

1. Official e-filing integration partner or API access model?
2. Data residency requirements beyond MongoDB Atlas region selection?
3. Pricing tiers and feature gating rules?
4. Legal disclaimers required on tax calculations?
5. Maximum document retention period?

---

## 10. References

- `REPOSITORY_AUDIT.md`
- `ARCHITECTURE_GAP_REPORT.md`
- `docs/USER_FLOWS.md`
- `DEPLOYMENT.md`
