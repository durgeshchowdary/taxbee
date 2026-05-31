# TaxBee Repository Audit

**Audit date:** 2026-05-31  
**Scope:** Full repository inspection (frontend, backend, worker, deployment docs)  
**Method:** File-backed statements only. Unknown items are marked `UNKNOWN`.

---

## Executive Summary

TaxBee is a **dual-service monorepo**: a **Next.js 16** frontend with App Router API proxies, and a **real Express 5 backend** with a **MongoDB-backed job worker**. The product vision describes AWS S3, Redis/BullMQ, Gemini AI, n8n, Resend, Sentry, and PostHog — **none of these are implemented in application source code today**. Core auth, ITR draft, document import/extraction, tax intelligence, Bee Assistant (rule-based), audit timeline, collaboration, and notifications are substantially implemented on MongoDB.

---

## Existing Architecture

### Frontend

| Attribute | Actual state | Evidence |
|-----------|--------------|----------|
| Framework | Next.js **16.2.1** App Router | `package.json`, `app/` directory |
| Language | TypeScript + some JS pages | `tsconfig.json`, `app/dashboard/taxCalculator.js` |
| UI | Tailwind CSS 4, Framer Motion, Lucide | `package.json`, `app/globals.css` |
| Routing | File-based App Router under `app/` | `app/dashboard/page.tsx`, `app/login/page.tsx`, etc. |
| API layer | Next Route Handlers proxy to Express | `app/api/**/route.ts`, `app/api/_utils/backend.ts` |
| Auth cookie | HttpOnly `auth_token` set by Next auth proxies | `app/api/auth/login/route.ts`, `app/api/_utils/backend.ts` |
| Route guard | `proxy.ts` at repo root defines protected prefixes | `proxy.ts` — **no `middleware.ts` found; wiring status UNKNOWN** |
| Backend coupling | Frontend imports backend utilities via `@/backend/*` | `components/BeeAssistant.tsx`, `app/dashboard/page.tsx` |

**Notable:** `react-router-dom` is listed in root `package.json` but **no usage found** in app source.

### Backend

| Attribute | Actual state | Evidence |
|-----------|--------------|----------|
| Framework | Express **5.2.1** (ES modules) | `backend/server.js`, `backend/package.json` |
| Database | MongoDB via Mongoose **9.3.3** | `backend/server.js`, models in `backend/models/` |
| Auth | JWT HS256 + bcryptjs + OTP email verification | `backend/controllers/authController.js`, `backend/middleware/authMiddleware.js` |
| Job queue | MongoDB `Job` collection with encrypted `securePayload` | `backend/models/Job.js`, `backend/services/jobQueueService.js` |
| Worker | Separate Node process polling Mongo jobs | `backend/worker.js`, `backend/services/jobWorkerService.js` |
| Email | Nodemailer (Gmail or SMTP) | `backend/services/emailService.js` |
| OCR | Tesseract.js optional (`OCR_PROVIDER=tesseract`) | `backend/services/ocrProviderService.js` |
| AI extraction | Rule-based field mapping from extracted text | `backend/services/documentProcessingService.js` |
| Bee Assistant API | Rule-based `beeReasoningService` grounded in Mongo tax context | `backend/controllers/aiController.js`, `backend/services/beeReasoningService.js` |
| Tax engine | In-process JS slab/regime calculator | `backend/utils/taxEngine.js` |
| Observability | Structured logging, in-memory metrics, `/api/metrics` | `backend/utils/safeLogger.js`, `backend/services/metricsService.js` |

**Notable:** `@google/generative-ai` and `@anthropic-ai/sdk` are backend dependencies but **no application imports** of Gemini or Anthropic APIs were found in `backend/` source (excluding `node_modules`). `GEMINI_API_KEY` is listed in `backend/utils/env.js` optional env only.

### Deployment (documented)

| Service | Platform (documented) | Evidence |
|---------|----------------------|----------|
| Frontend | Vercel | `DEPLOYMENT.md` |
| Backend API | Railway or Render | `DEPLOYMENT.md`, `backend/server.js` |
| Worker | Railway or Render (same `backend/` codebase) | `DEPLOYMENT.md`, `backend/worker.js` |
| Database | MongoDB Atlas | `DEPLOYMENT.md`, `.env.example` |

CI/CD pipelines, Dockerfiles, and IaC: **UNKNOWN** (not found in repo root).

### Request Flow

```
Browser
  → Next.js pages (app/*)
  → Next.js API routes (app/api/*)  [auth cookie → Bearer forward]
  → Express backend (backend/server.js) on PORT (default 5000)
  → MongoDB Atlas
  → Worker (backend/worker.js) polls Job collection
```

---

## Existing Features

### Authentication & Session

- Signup with email OTP verification (`POST /api/auth/signup`, `verify-otp`)
- Login with JWT issuance; unverified users get OTP resend flow
- Password reset via email token (`forgot-password`, `reset-password`)
- Session restore (`GET /api/auth/session`)
- Role-based portals: `taxpayer`, `reviewer`, `admin` (`authController.buildSessionPayload`)
- Roles enum on User: `taxpayer`, `reviewer`, `ca`, `admin`, `internal`

### Dashboard & Tax Intelligence

- Dashboard aggregates user, draft, imports, intelligence (`GET /api/dashboard`)
- Tax context builder with 30s in-memory cache (`backend/utils/taxContextService.js`)
- Old vs new regime comparison in tax engine (`backend/utils/taxEngine.js`, FY 2025-26 / AY 2026-27)
- Tax savings recommendations (`GET /api/tax-savings`)
- Deductions CRUD (`GET/PUT /api/deductions`)

### Document Import & Extraction

- Upload via JSON body: `fileName`, `mimeType`, `text`, `fileBase64`, `sizeBytes`
- Supported MIME types include PDF, plain text, CSV, images (`documentProcessingService.js`)
- Sync processing for small text; async queue for PDF/image/large payloads
- Field extraction via keyword rules (salary, TDS, 80C, HRA, etc.)
- Review workflow: confirm/override extracted fields (`PATCH /api/imports/:id/review`)
- Soft delete imports (`DELETE /api/imports/:id`)
- Primary UI: `app/import-data/page.tsx` (calls `/api/imports/upload`)

### ITR Draft

- Persisted MongoDB draft keyed by `userKey` (`backend/models/ITRDraft.js`)
- Load/save via `/api/itr-draft/:userKey` and legacy POST
- Manual filing UI: `app/file-your-itr/page.tsx`

### Bee Assistant

- Global floating assistant component (`components/BeeAssistant.tsx`, ~1900 lines)
- Frontend: local NLP scoring, intent classification, guided workflows (`app/_utils/beeAssistantIntent.ts`, `backend/utils/BeeAssistantConfig.ts`)
- Backend: Mongo-grounded explainable responses without LLM call in happy path (`beeReasoningService.js`)
- Proxied at `POST /api/ai/bee-assistant`

### Collaboration (CA / Reviewer)

- Workspace invites, accept/revoke (`backend/controllers/collaborationController.js`)
- Review comments on fields (`ReviewComment` model)
- Reviewer workspace pages under `app/reviewer/`

### Audit & Notifications

- Immutable-style audit event log (`AuditEvent` model, `auditTrailService.js`)
- Audit timeline API and UI (`/api/audit-timeline`, `app/audit-timeline/page.tsx`)
- In-app notifications with optional email job types (`Notification` model)

### Health & Ops

- `GET /health`, `GET /ready`, `GET /metrics` (metrics token-gated in production)
- Env validation on startup (`backend/utils/env.js`)
- Rate limits: in-memory per-IP/user buckets (`securityMiddleware.js`)

### Tests

- **21** backend test files using Node built-in test runner (`backend/**/*.test.js`)

---

## Existing Technical Debt

| Issue | Severity | Evidence |
|-------|----------|----------|
| README inaccurately describes backend as "mocked" and Next 15 | Medium | `README.md` vs `backend/server.js` |
| `worker.js` connects with `MONGO_URI` only; server uses `getMongoUri()` (`MONGODB_URI` \| `MONGO_URI`) | **High** | `backend/worker.js:21`, `backend/utils/env.js:84` |
| `proxy.ts` route protection may not run (no `middleware.ts`) | **High** | `proxy.ts` exists; glob finds no `middleware.ts` |
| `upload-documents/page.tsx` is a UI stub (alert only, no API) | Medium | `app/upload-documents/page.tsx` |
| `incomeRoutes.js` exists but is **not mounted** in `server.js` | Low | `backend/routes/incomeRoutes.js`, `backend/server.js` |
| Frontend directly imports backend modules | Medium | `@/backend/utils/taxEngine` in dashboard |
| Duplicate bcrypt packages (`bcrypt`, `bcryptjs`) | Low | `backend/package.json` |
| Unused deps: `react-router-dom`, `@anthropic-ai/sdk` (in app source) | Low | grep across `app/`, `backend/` |
| `GEMINI_API_KEY` documented but unused in source | Medium | `.env.example`, no Gemini imports |
| Job payloads (incl. base64 files) stored encrypted in Mongo, not object storage | **High** (scale) | `Job.securePayload`, `jobQueueService.js` |
| In-memory rate limiting and metrics (not durable across instances) | Medium | `securityMiddleware.js`, `metricsService.js` |
| CSP `connect-src` hardcodes localhost backend only | Medium | `next.config.ts:28` |
| `personalityEngine.js` at root appears unused by BeeAssistant flow | Low | root file; Bee uses `BeeAssistantConfig.ts` |
| Mixed JS/TS across stack | Low | various |
| `.env.example` missing OCR, SMTP, worker vars present in `env.js` | Low | compare `.env.example` vs `backend/utils/env.js` |

---

## Security Risks

| Risk | Detail | Evidence |
|------|--------|----------|
| Legacy JWT in `localStorage` | `authClient.ts` still supports bearer from `localStorage` key `token` | `app/_utils/authClient.ts` |
| Document content in Mongo job queue | Base64 upload encrypted with key derived from `JWT_SECRET` | `jobQueueService.encryptPayload` |
| Dev OTP returned in API response | When email provider missing and `NODE_ENV !== production` | `authController.sendVerificationOtp` |
| No WAF / API gateway in repo | UNKNOWN external controls | not in repo |
| No Sentry/error tracking | Failures logged to stdout only | `safeLogger.js` |
| CORS strict in production | Good — but misconfiguration blocks legit clients | `server.js`, `env.js` |
| Password min length mismatch | Schema min 6, controller requires 8 | `user.js:7`, `authController.js:143` |
| Admin routes exist (`app/admin/dashboard`) | Authorization enforcement on backend routes for admin: **partial** — role checks in session portals, dedicated admin API surface UNKNOWN | `app/admin/dashboard/page.tsx`, `authController.allowedPortalsFor` |

---

## Missing Components (vs Target Vision)

| Target component | Repo status |
|------------------|-------------|
| AWS S3 file storage | **Not implemented** — uploads via JSON/base64 to API |
| Redis | **Not implemented** |
| BullMQ | **Not implemented** — Mongo job queue instead |
| Gemini AI (production extraction/assistant) | **Not wired** — deps present, no source usage |
| n8n automation | **Not present** |
| Resend email | **Not present** — Nodemailer/Gmail/SMTP instead |
| Sentry | **Not present** |
| PostHog | **Not present** |
| Direct e-filing integration | **Not present** — links to incometax.gov.in in UI |
| Managed OCR provider | Interface stub only (`OCR_PROVIDER=managed` throws) |
| Production middleware route guard | **Likely missing** |
| Unified `.env.example` for backend SMTP/OCR vars | Partial |

---

## Refactoring Opportunities

1. **Extract shared domain package** — `taxEngine`, `siteMap`, `BeeAssistantConfig` used by both frontend and backend; move to `packages/shared` to remove `@/backend` imports from Next.js.
2. **Unify Mongo connection in worker** — use `getMongoUri()` from `env.js`.
3. **Activate or replace route protection** — wire `proxy.ts` as Next middleware or merge into `middleware.ts`.
4. **Retire stub pages** — connect `upload-documents` to `/api/imports/upload` or redirect to `import-data`.
5. **Queue abstraction** — `jobQueueService.js` already abstracts queue; swap Mongo implementation for BullMQ without changing controllers.
6. **Consolidate auth storage** — deprecate `localStorage` token path once cookie flow is verified in production.
7. **Update README** — align with actual architecture to reduce onboarding errors.

---

## Build Risks

| Risk | Notes |
|------|-------|
| Next.js 16 breaking changes | Documented in `AGENTS.md`; agents must read `node_modules/next/dist/docs/` |
| Express 5 | Newer major; ensure platform Node version supports it |
| `@napi-rs/canvas` native binding | Required for PDF rendering; may fail on some deploy targets |
| Tesseract.js in worker | CPU/memory heavy; worker timeout defaults 120s (`WORKER_JOB_TIMEOUT_MS`) |
| Frontend build imports backend `.js` | May break if backend uses Node-only APIs in shared paths |
| No monorepo workspace tooling | Frontend and backend have separate `package.json`; manual dual install |
| `tsconfig` excludes `taxbee` folder | `tsconfig.json:33` — purpose UNKNOWN |

---

## Deployment Risks

| Risk | Notes |
|------|-------|
| Three services must share MongoDB URI and JWT secrets | `DEPLOYMENT.md` |
| Worker env mismatch (`MONGO_URI` vs `MONGODB_URI`) | Worker may fail if only `MONGODB_URI` set |
| Vercel CSP blocks production backend URL | `next.config.ts` connect-src limited to localhost |
| Mongo queue at scale | Documented in `DEPLOYMENT.md` as phase-appropriate, not high-volume |
| Atlas IP allowlisting | Platform egress dependency |
| No automated deploy config in repo | Manual Vercel/Railway setup |
| Secrets in git | `.gitignore` excludes `.env*`; `backend/.env` exists locally (not audited for secrets) |

---

## File Inventory (Key Paths)

```
taxbee/
├── app/                    # Next.js App Router pages + API proxies
├── backend/
│   ├── server.js           # Express API entry
│   ├── worker.js           # Job worker entry
│   ├── controllers/        # Route handlers
│   ├── models/             # Mongoose schemas
│   ├── routes/             # Express routers
│   ├── services/           # Domain services (jobs, OCR, email, tax)
│   ├── middleware/         # Auth, validation, security, observability
│   └── utils/              # Tax engine, env, email helpers
├── components/             # React UI (BeeAssistant, etc.)
├── lib/assistant/          # Assistant UI theme
├── docs/                   # Project documentation (this audit phase)
├── proxy.ts                # Intended Next route guard
├── .env.example            # Env template (frontend-oriented)
├── DEPLOYMENT.md           # Deployment runbook
└── package.json            # Frontend dependencies
```

---

## Verification Commands

```bash
# Frontend
npm install && npm run build

# Backend
cd backend && npm install && npm test

# Local smoke (requires MongoDB)
cd backend && npm start
npm run dev   # from root, separate terminal
```

---

*This audit is the baseline for Phase 1 documentation and sprint planning. No production code changes were made.*
