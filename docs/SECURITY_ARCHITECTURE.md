# TaxBee Security Architecture

**Version:** 0.1  
**Date:** 2026-05-31  
**Scope:** As implemented in repository + target hardening from gap analysis

---

## 1. Security Principles

1. **Backend-only AI and tax computation** — no LLM keys in browser (currently satisfied; Gemini not wired).
2. **Verified data before filing-critical answers** — Bee Assistant refuses to invent numbers (`beeReasoningService.js`).
3. **Least privilege** — workspace permissions for reviewers; role-based portals.
4. **Auditability** — field-level `AuditEvent` trail.
5. **Defense in depth** — validation at edge (Next) and origin (Express).

---

## 2. Trust Boundaries

```
┌─────────────────────────────────────────────────────────┐
│  UNTRUSTED: Browser                                     │
│  - User input, uploaded files                           │
│  - Legacy localStorage JWT (deprecated path)            │
└───────────────────────────┬─────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼─────────────────────────────┐
│  TRUSTED EDGE: Next.js (Vercel)                         │
│  - HttpOnly auth_token cookie                           │
│  - CSP headers (next.config.ts)                       │
│  - API proxy (no direct Mongo access)                   │
└───────────────────────────┬─────────────────────────────┘
                            │ BACKEND_URL + Bearer
┌───────────────────────────▼─────────────────────────────┐
│  TRUSTED ORIGIN: Express API + Worker                   │
│  - JWT verification, RBAC, sanitization                 │
│  - MongoDB, encrypted job payloads                      │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│  DATA: MongoDB Atlas                                    │
│  Target: AWS S3 (documents) — NOT IMPLEMENTED           │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Authentication

| Control | Implementation | File |
|---------|----------------|------|
| Password hashing | bcryptjs, salt rounds 10 | `backend/models/user.js` |
| Password policy | min 8 chars at API | `authController.js` |
| JWT signing | HS256, 1d expiry | `authController.createToken` |
| JWT verification | issuer + audience in prod | `authMiddleware.js` |
| OTP storage | SHA256(otp + JWT_SECRET) | `authController.hashOtp` |
| OTP expiry | 10 minutes | `authController.js` |
| Session cookie | HttpOnly, Secure in prod, SameSite=Lax | `app/api/_utils/backend.ts` |
| Password reset token | SHA256 hashed, 30 min | `authController.js` |

**Gaps:**
- Legacy `localStorage` token (`authClient.ts`) — migrate off
- No refresh token rotation
- JWT secret reused for job payload encryption (`jobQueueService.js`) — separate keys recommended

---

## 4. Authorization

| Layer | Mechanism |
|-------|-----------|
| API default | `requireAuth` middleware on protected routes |
| Email gate | 403 `EMAIL_VERIFICATION_REQUIRED` if JWT `isVerified=false` |
| Reviewer access | `workspaceAccessService.resolveWorkspaceOwner` + permission flags |
| Portals | `allowedPortals` / `defaultPortal` in session payload |
| Metrics | Bearer `METRICS_TOKEN` in production |

**Admin routes:** Frontend page exists; comprehensive server-side admin RBAC audit: **partial — verify before production admin features**.

---

## 5. Input Validation & Sanitization

| Control | Details |
|---------|---------|
| Body validation | `validateBody`, `validateUploadBody` schemas |
| Text sanitization | `sanitizeText`, max lengths on fields |
| Mongo injection | `sanitizeFilter: true`, `strictQuery: true`, ObjectId validation |
| Upload limits | 6MB max, MIME allowlist |
| Message limits | Bee: 2000 chars message, 1000 memory |

File: `backend/middleware/validationMiddleware.js`

---

## 6. Transport & Headers

### Express (`securityMiddleware.js`)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` restrictive
- `COOP: same-origin`, `CORP: same-site`
- `Strict-Transport-Security` in production
- CSP: `default-src 'none'` on API responses

### Next.js (`next.config.ts`)
- CSP with `connect-src` limited to localhost backend — **must update for production BACKEND_URL**

### CORS
- Allowlist from `CORS_ORIGIN` / `CLIENT_ORIGIN`
- Localhost auto-allowed in non-production only
- Credentials enabled

---

## 7. Rate Limiting

In-memory token bucket per IP/user (`securityMiddleware.js`).

| Endpoint class | Production limit |
|----------------|------------------|
| Auth | 10 / 15 min |
| AI | 20 / min |
| Upload | 15 / 10 min |
| General API | 300 / min |

**Gap:** Not distributed — ineffective across multiple API instances without Redis.

---

## 8. Data Protection

| Data class | Protection today | Target |
|------------|------------------|--------|
| Passwords | bcrypt hash | Same |
| OTP / reset tokens | hashed | Same |
| Job upload payload | AES-256-GCM in Mongo | Move bytes to S3 SSE-KMS |
| PII (PAN, email) | MongoDB access control | Field encryption UNKNOWN |
| Logs | `safeLogger` — review redaction | Sentry scrubbing |

---

## 9. Document Security

| Topic | Current | Risk |
|-------|---------|------|
| Storage location | Mongo encrypted blob | Scale + backup exposure |
| Malware scan | None | HIGH — add at upload |
| Content-Type validation | MIME allowlist | Spoofing possible |
| Access control | userId on ImportedDocument | Reviewer via workspace |

**Target S3 controls:**
- Private bucket, no public ACLs
- Presigned URLs with short TTL
- IAM least privilege for API vs worker roles
- Server-side encryption (SSE-S3 or SSE-KMS)

---

## 10. Secrets Management

| Secret | Source | Rotation |
|--------|--------|----------|
| JWT_SECRET | env var | Manual — documented in DEPLOYMENT.md |
| MONGODB_URI | env var | Atlas rotation |
| METRICS_TOKEN | env var | Manual |
| GEMINI_API_KEY | env var (unused) | N/A |
| EMAIL/SMTP creds | env var | Manual |

**Gap:** No AWS Secrets Manager / Vault integration.

---

## 11. Observability & Incident Response

| Capability | Status |
|------------|--------|
| Request IDs | ✅ `X-Request-Id` |
| Structured logs | ✅ `safeLogger.js` |
| Error tracking (Sentry) | ❌ |
| Security alerts | ✅ failed login notifications |
| Audit trail | ✅ AuditEvent collection |

---

## 12. Dependency Security

- Lockfiles present (`package-lock.json`)
- Automated Dependabot/Snyk: **UNKNOWN**
- Native modules (`bcrypt`, `@napi-rs/canvas`) increase supply-chain surface

---

## 13. Compliance Considerations (Informational)

| Topic | Status |
|-------|--------|
| Privacy policy in repo | **UNKNOWN** |
| Data export/delete API | **UNKNOWN** |
| Indian DPDP alignment | **UNKNOWN** — requires legal review |
| Tax data sensitivity | Treat as high — encrypt at rest, audit access |

---

## 14. Security Roadmap (Linked to Sprints)

| Sprint | Security deliverable |
|--------|---------------------|
| 1 | Activate route guard; deprecate localStorage JWT |
| 2 | S3 private bucket IAM, presigned upload validation |
| 3 | Redis-backed rate limits |
| 4 | Gemini prompt injection guards, PII redaction in prompts |
| 9 | Resend SPF/DKIM, n8n webhook auth |
| 10 | Sentry with PII scrubbing, security event dashboards |

---

## 15. References

- `backend/middleware/`
- `backend/utils/env.js`
- `ARCHITECTURE_GAP_REPORT.md`
- `DEPLOYMENT.md`
