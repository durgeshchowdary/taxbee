# TaxBee API Contracts

**Version:** 0.1  
**Date:** 2026-05-31  
**Base URL (backend):** `{BACKEND_URL}` default `http://127.0.0.1:5000`  
**Frontend access:** Same-origin `/api/*` Next.js proxies forward to backend with auth headers.

**Auth:** `Authorization: Bearer <JWT>` or HttpOnly `auth_token` cookie (converted to Bearer by Next proxy).

**Response envelope (common):**
```json
{
  "success": true,
  "message": "Human-readable status",
  "data": { }
}
```
Legacy top-level fields (e.g. `token`, `import`) are still returned on some routes for backward compatibility.

**Error envelope:**
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE",
  "data": { "requestId": "uuid" }
}
```

---

## Health (no auth)

### GET `/health` and GET `/api/health`

**Response 200/503:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "app": "taxbee-backend",
    "database": "connected",
    "uptimeSeconds": 123,
    "environment": "development",
    "version": "local"
  }
}
```

### GET `/api/ready`

Readiness includes env validation + Job collection access.

### GET `/api/metrics`

**Auth:** Bearer `METRICS_TOKEN` (production required)  
Returns in-memory counters + job aggregates.

---

## Authentication

### POST `/api/auth/signup`

**Body:**
```json
{ "name": "string", "email": "string", "password": "string" }
```
**Validation:** password ≥ 8 chars, valid email  
**Response 201:** `requiresVerification: true`, optional `devOtp` in development

### POST `/api/auth/login`

**Body:** `{ "email", "password" }`  
**Response 200:** `{ token, user, allowedPortals, defaultPortal }` + sets cookie via Next proxy  
**Response 403:** unverified → OTP resent

### POST `/api/auth/verify-otp`

**Body:** `{ "email", "otp" }` — OTP 6 digits  
**Response 200:** JWT + session payload

### POST `/api/auth/resend-verification`

**Body:** `{ "email" }`

### GET `/api/auth/session`

**Auth:** required  
**Response:** session payload (user, portals, verification state)

### POST `/api/auth/logout`

**Auth:** none required  
Clears client cookie via Next proxy.

### POST `/api/auth/forgot-password`

**Body:** `{ "email" }` — always 200 (no enumeration)

### POST `/api/auth/reset-password`

**Body:** `{ "email", "token", "password" }`

---

## Users

### GET `/api/users/:id`

**Auth:** required — ownership rules in controller

### PUT `/api/users/:id`

**Auth:** required

---

## Dashboard

### GET `/api/dashboard`

**Auth:** required  
**Response data includes:** user, draft, deductions, imports summary, extractionReview, taxIntelligence, hasTaxData

---

## Tax Context

### GET `/api/tax-context`

**Auth:** required  
Full aggregated context for assistant and intelligence (cached 30s server-side).

---

## Deductions

### GET `/api/deductions`

### PUT `/api/deductions`

**Auth:** required  
**Body:** deduction field map (validated)

---

## Tax Savings

### GET `/api/tax-savings`

**Auth:** required  
Regime comparison and opportunity cards.

---

## ITR Draft

### GET `/api/itr-draft/:userKey`

**Auth:** required  
**`:userKey`:** typically Mongo user id string

### POST `/api/itr-draft/legacy`

**Auth:** required — legacy save path

---

## Imports / Documents

### POST `/api/imports/upload`

**Auth:** required  
**Rate limit:** upload bucket  
**Body:**
```json
{
  "fileName": "form16.pdf",
  "mimeType": "application/pdf",
  "text": "",
  "fileBase64": "<base64>",
  "sizeBytes": 12345
}
```
**Limits:** max ~6MB (`documentProcessingService.js`)

**Response 201 (sync):** `{ import: SerializedImport }`  
**Response 202 (async):** `{ import, job }`

### POST `/api/imports`

Manual import create (pre-extracted payload).

### GET `/api/imports?page=1&limit=25`

**Auth:** required — workspace scope for reviewers

### PATCH `/api/imports/:id/review`

**Body:**
```json
{
  "extractedFields": [ { "fieldId", "path", "value", "status", ... } ],
  "auditTrail": [ ... ]
}
```

### DELETE `/api/imports/:id`

Soft delete.

---

## Jobs

### GET `/api/jobs/:id`

**Auth:** required  
**Response:** job status, attempts, resultRef

---

## AI / Bee Assistant

### POST `/api/ai/bee-assistant`

**Auth:** required  
**Rate limit:** AI bucket (20/min)  
**Body:**
```json
{
  "message": "string (max 2000 chars)",
  "memorySummary": "string (max 1000 chars, optional)"
}
```

**Response 200 (data fields):**
```json
{
  "answer": "string",
  "reasoning": ["string"],
  "confidence": 0.0,
  "basedOn": ["MongoDB ITR draft", "..."],
  "sourceFields": [],
  "sourceDocuments": [],
  "auditReferences": [],
  "missingData": [],
  "suggestedActions": [],
  "reviewerNotes": [],
  "mode": "simple|detailed|audit|reviewer",
  "requestId": "uuid",
  "degraded": false
}
```

### GET `/api/ai/bee-assistant/health`

Public health — mode `mongo-grounded-explainable`.

---

## Audit Timeline

### GET `/api/audit-timeline?page=1&limit=20`

### GET `/api/audit-timeline/value/:fieldKey`

Field-level provenance history.

---

## Collaboration

Base: `/api/collaboration`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/access` | Invite reviewer |
| GET | `/access` | List access grants |
| PATCH | `/access/:id/accept` | Accept invite |
| PATCH | `/access/:id/revoke` | Revoke |
| POST | `/comments` | Add comment |
| GET | `/comments` | List comments |
| PATCH | `/comments/:id/resolve` | Resolve |
| GET | `/workspaces` | Reviewer workspace list |
| GET | `/workspaces/:ownerId` | Workspace detail |
| GET | `/workspaces/:ownerId/summary` | Summary |
| GET | `/workspaces/:ownerId/threads` | Comment threads |

All require auth; permission checks via `workspaceAccessService`.

---

## Notifications

### GET `/api/notifications`

### PATCH `/api/notifications/:id/read`

---

## Next.js Proxy Routes

Mirrors backend at `/api/*` — see `app/api/` tree.

| Next route | Backend |
|------------|---------|
| `/api/auth/*` | `/api/auth/*` |
| `/api/dashboard` | `/api/dashboard` |
| `/api/imports/*` | `/api/imports/*` |
| `/api/ai/bee-assistant` | `/api/ai/bee-assistant` |
| `/api/collaboration/[...path]` | `/api/collaboration/*` |
| `/api/ais/decrypt` | **Frontend-only AIS helper** — not Express |

---

## Not Implemented / Unmounted

| Route | Status |
|-------|--------|
| `/api/income` | Defined in `incomeRoutes.js` but **not mounted** — returns 501 if mounted |
| S3 presigned upload | **Not present** |
| Webhooks (n8n) | **Not present** |

---

## Rate Limits

| Bucket | Window | Max |
|--------|--------|-----|
| auth (prod) | 15 min | 10 |
| auth (dev) | 1 min | 100 |
| ai | 1 min | 20 |
| upload | 10 min | 15 |
| api global | 1 min | 300 |

Source: `backend/middleware/securityMiddleware.js`

---

## Codes Reference

| Code | Meaning |
|------|---------|
| `AUTH_REQUIRED` | Missing token |
| `AUTH_INVALID` | Bad/expired JWT |
| `EMAIL_VERIFICATION_REQUIRED` | Unverified user |
| `RATE_LIMITED` | Too many requests |
| `IMPORTS_LOAD_FAILED` | Import list error |
| `METRICS_PRIVATE` | Metrics auth failed |
| `NOT_IMPLEMENTED` | income route stub |

---

## References

- `backend/routes/`
- `backend/controllers/`
- `app/api/`
- `docs/TRD.md`
