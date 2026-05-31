# TaxBee Technical Requirements Document (TRD)

**Version:** 0.1  
**Date:** 2026-05-31  
**Source:** Repository inspection + target architecture vision

---

## 1. System Context

```
┌─────────────────┐     HTTPS      ┌──────────────────┐
│  Next.js 16     │ ──────────────►│  Express 5 API   │
│  (Vercel)       │   BACKEND_URL  │  (Railway/Render)│
│  app/api/* proxy│                │  backend/server  │
└────────┬────────┘                └────────┬─────────┘
         │ cookies                           │
         │                                   ├──► MongoDB Atlas
         │                                   │
         │                                   └──► Worker (worker.js)
         │
    Browser UI (app/*, components/*)
```

**Target extension (not built):**

```
Express/Worker ──► AWS S3 (documents)
                ──► Redis + BullMQ (queue)
                ──► Gemini API (extraction + assistant)
                ──► Resend (email) ◄── n8n (workflows)
Frontend/Backend ──► Sentry, PostHog
```

---

## 2. Technology Stack (Actual)

| Layer | Technology | Version (from package.json) |
|-------|------------|----------------------------|
| Frontend framework | Next.js | 16.2.1 |
| UI | React, Tailwind CSS | 19.2.4, 4.3.0 |
| Backend | Express | 5.2.1 |
| ODM | Mongoose | 9.3.3 |
| Auth | jsonwebtoken, bcryptjs | 9.0.3, 3.0.3 |
| Email | nodemailer | 8.0.4 |
| OCR | tesseract.js (optional) | 7.0.0 |
| PDF | @napi-rs/canvas, pdf text extractor | 1.0.0 |
| AI SDKs (installed, unused in app code) | @google/generative-ai, @anthropic-ai/sdk | present in deps |

---

## 3. Service Boundaries

### 3.1 Frontend (Next.js)

**Responsibilities:**
- Render taxpayer/reviewer/admin UI
- Proxy authenticated API calls to Express (`app/api/_utils/backend.ts`)
- Set/clear HttpOnly `auth_token` on auth routes
- Client-side tax previews via shared `taxEngine` import

**Must not:**
- Store long-lived secrets
- Call Gemini directly (vision: backend-only AI) — **currently satisfied** (no Gemini in frontend)

**Key files:** `app/`, `components/BeeAssistant.tsx`, `proxy.ts`

### 3.2 Backend API (Express)

**Responsibilities:**
- Auth, CRUD, tax computation, import processing orchestration
- Enqueue background jobs
- Bee Assistant API
- Health/metrics

**Entry:** `backend/server.js`  
**Port:** `process.env.PORT || 5000`

### 3.3 Worker

**Responsibilities:**
- Poll Mongo `Job` collection
- Run `document_extraction`, `tax_intelligence_recalculation`, email jobs
- Emit notifications on completion/failure

**Entry:** `backend/worker.js`  
**Scripts:** `npm run worker`, `npm run worker:once`

**Known defect:** uses `process.env.MONGO_URI` directly instead of `getMongoUri()`.

---

## 4. Data Flow: Document Upload

```
1. Client POST /api/imports/upload (Next proxy)
2. Express importController.uploadImport
3. validateUpload (size, mime, filename)
4. If async: create ImportedDocument (queued) + Job(document_extraction)
   Else: processUploadedDocument sync
5. Worker claims job → decryptPayload → extractDocumentText → processTaxDocument
6. Update ImportedDocument fields + audit events
7. Enqueue tax_intelligence_recalculation
8. Client polls GET /api/jobs/:id or refreshes imports list
```

**Storage today:** File bytes in encrypted Mongo job payload — **not S3**.

---

## 5. Data Flow: Bee Assistant

```
1. Client POST /api/ai/bee-assistant { message, memorySummary }
2. aiController.getBeeAssistantReply
3. getUserTaxContext(userId) — cache 30s
4. buildTaxIntelligenceReport + analyzeTaxContext
5. buildBeeReasoningResponse (rule-based, no LLM)
6. Return answer, reasoning, confidence, sources, suggestedActions
```

Frontend may answer locally for casual intents before calling backend (`beeAssistantIntent.ts`).

---

## 6. Authentication Technical Spec

| Property | Value |
|----------|-------|
| Algorithm | HS256 |
| Secret | `JWT_SECRET` (min 32 chars) |
| Issuer | `JWT_ISSUER` (default `taxbee-api`) |
| Audience | `JWT_AUDIENCE` (default `taxbee-web`) |
| Expiry | 1 day |
| Payload | `{ id, role, isVerified }` |
| Transport | `Authorization: Bearer` or `auth_token` cookie |

OTP: 6-digit, SHA256 hashed with JWT_SECRET salt, 10-minute expiry.

---

## 7. Environment Variables

See `.env.example`, `DEPLOYMENT.md`, and `backend/utils/env.js`.

| Variable | Required | Services |
|----------|----------|----------|
| `MONGODB_URI` | Yes | API, worker |
| `JWT_SECRET` | Yes | API, worker |
| `JWT_ISSUER`, `JWT_AUDIENCE` | Production | API, worker |
| `CORS_ORIGIN` | Production | API |
| `METRICS_TOKEN` | Production | API |
| `BACKEND_URL` | Yes | Next.js |
| `GEMINI_API_KEY` | Optional (unused) | — |
| `EMAIL_USER`, `EMAIL_PASS` / `SMTP_*` | Optional | API, worker |
| `OCR_PROVIDER` | Optional (`none\|tesseract\|managed`) | API, worker |
| `WORKER_*` | Optional | Worker |

**Gap:** `.env.example` does not list OCR/SMTP vars present in `env.js`.

---

## 8. API Surface

Full contracts: `docs/API_CONTRACTS.md`

Mounted routes in `server.js`:
- `/api/auth`, `/api/users`, `/api/itr-draft`, `/api/tax-context`
- `/api/deductions`, `/api/dashboard`, `/api/imports`, `/api/tax-savings`
- `/api/audit-timeline`, `/api/collaboration`, `/api/ai`, `/api/jobs`
- `/api/notifications`, `/api/health`, `/api/ready`, `/api/metrics`

**Not mounted:** `incomeRoutes.js` (501 stub).

---

## 9. Queue Design (Current)

| Job type | Handler |
|----------|---------|
| `document_extraction` | OCR + field rules |
| `tax_intelligence_recalculation` | Rebuild intelligence snapshot |
| `audit_event_enrichment` | Reserved |
| `email_invite`, `email_send` | Nodemailer |
| `cleanup_stale_jobs` | Maintenance |

State machine: `queued → processing → completed | failed`  
Retry: exponential backoff base 30s, max attempts configurable.

**Target:** BullMQ on Redis preserving `jobQueueService` interface.

---

## 10. Security Controls (Implemented)

- CORS allowlist (`env.js`)
- Rate limits (auth, AI, upload, global API)
- Request ID propagation
- Input sanitization (`validationMiddleware.js`)
- Mongo ObjectId validation (`mongoSafety.js`)
- Production metrics token gate
- Security headers (Express + Next CSP)
- Job payload encryption (AES-256-GCM)

Details: `docs/SECURITY_ARCHITECTURE.md`

---

## 11. Testing Strategy (Current)

- Backend unit/integration tests: `node --test` (21 files)
- No frontend test suite found
- Smoke tests documented in `DEPLOYMENT.md`

---

## 12. Deployment Architecture

| Service | Start command | Platform |
|---------|---------------|----------|
| Frontend | `npm run build && npm start` | Vercel |
| API | `cd backend && npm start` | Railway/Render |
| Worker | `cd backend && npm run worker` | Railway/Render |

MongoDB Atlas: dedicated cluster, backups, indexes per `DEPLOYMENT.md`.

---

## 13. Target Technical Requirements (Not Yet Built)

1. **S3:** presigned PUT, object key schema `{userId}/{documentId}/{filename}`
2. **Redis:** connection for BullMQ and rate-limit store
3. **BullMQ:** replace Mongo claim loop with worker concurrency controls
4. **Gemini:** structured extraction schema + assistant completion with tax context injection
5. **Resend:** transactional templates for OTP, invites, job status
6. **n8n:** webhook triggers on audit events / job failures
7. **Sentry:** Node + Next SDK with PII scrubbing
8. **PostHog:** client events + server-side critical funnel

---

## 14. Constraints & Rules (Engineering)

From product/engineering mandate:

- Do not duplicate folders, APIs, models, or auth systems
- Extend existing queue abstraction, Bee Assistant, import pipeline
- Mark uncertainties UNKNOWN — do not fabricate schemas

---

## 15. References

- `REPOSITORY_AUDIT.md`
- `ARCHITECTURE_GAP_REPORT.md`
- `docs/DATABASE_DESIGN.md`
- `docs/IMPLEMENTATION_ROADMAP.md`
