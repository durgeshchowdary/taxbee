# TaxBee Deployment Readiness

TaxBee is deployed as three services that share MongoDB Atlas:

- Frontend: Next.js on Vercel.
- Backend API: Express on Railway or Render.
- Worker: separate Node process on Railway or Render, using the same backend codebase and MongoDB queue.

## Commands

| Service | Install | Build | Start |
| --- | --- | --- | --- |
| Frontend | `npm install` | `npm run build` | `npm start` |
| Backend API | `cd backend && npm install` | none | `npm start` |
| Worker | `cd backend && npm install` | none | `npm run worker` |
| One-shot worker smoke test | `cd backend && npm install` | none | `npm run worker:once` |

## Environment Variables

| Variable | Service | Required | Notes |
| --- | --- | --- | --- |
| `MONGODB_URI` | backend, worker | yes | MongoDB Atlas connection string. `MONGO_URI` is still accepted for local compatibility, but production should use `MONGODB_URI`. |
| `JWT_SECRET` | backend, worker | yes | At least 32 high-entropy characters. Rotate if exposed. |
| `JWT_ISSUER` | backend, worker | production | Use one stable value, for example `taxbee-api`. |
| `JWT_AUDIENCE` | backend, worker | production | Use one stable value, for example `taxbee-web`. |
| `BACKEND_URL` | frontend | yes | Public HTTPS backend URL used by Next API proxy routes. |
| `NEXT_PUBLIC_API_URL` | frontend | optional | Public API URL for browser-visible config if needed. Prefer same value as `BACKEND_URL`. |
| `CORS_ORIGIN` | backend | production | Comma-separated allowed frontend origins. Include the Vercel production URL and preview URLs only if trusted. |
| `CLIENT_ORIGIN` | backend | legacy | Still accepted as a fallback for `CORS_ORIGIN`. |
| `NODE_ENV` | all | yes | Set to `production` in deployed services. |
| `METRICS_TOKEN` | backend | production | Bearer token for `/api/metrics`; at least 32 random characters. |
| `APP_VERSION` | backend | optional | Shows in `/api/health`; use commit SHA or release version. |
| `PORT` | backend | platform | Railway/Render usually inject this automatically. |
| `WORKER_ID` | worker | optional | Stable name for logs, for example `taxbee-worker-1`. |
| `WORKER_POLL_INTERVAL_MS` | worker | optional | Defaults are safe for local mode; tune after observing queue volume. |
| `WORKER_JOB_TIMEOUT_MS` | worker | optional | Maximum processing time per job before failure handling. |
| `GEMINI_API_KEY` | backend, worker | optional | Required only when Bee Assistant or extraction paths need Gemini. |
| `EMAIL_USER` / `EMAIL_PASS` | backend, worker | optional | Required when OTP/invite email sending is enabled. |

## Vercel Frontend

1. Create a Vercel project from the repository root.
2. Set build command to `npm run build`.
3. Set output/runtime defaults for Next.js.
4. Add frontend env vars:
   - `BACKEND_URL=https://<backend-domain>`
   - `NEXT_PUBLIC_API_URL=https://<backend-domain>`
   - `NEXT_PUBLIC_SITE_URL=https://<vercel-domain>`
   - `NODE_ENV=production`
5. After the backend is live, add the Vercel domain to backend `CORS_ORIGIN`.

Auth note: the Next login and OTP proxy routes set `auth_token` as an HttpOnly cookie with `Secure` in production and `SameSite=Lax`. The frontend still preserves current bearer-token response compatibility for existing client flows.

## Railway or Render Backend

1. Create a backend service from the `backend` directory.
2. Install command: `npm install`.
3. Start command: `npm start`.
4. Add backend env vars from the table above.
5. Set `NODE_ENV=production`.
6. Set `CORS_ORIGIN` to the exact frontend origin, for example `https://taxbee.example.com`.
7. Verify `/api/health` returns `200` after MongoDB connects.
8. Verify `/api/ready` returns `200` after env, DB, and queue checks pass.

Production CORS rejects unknown origins. Localhost origins are automatically allowed only outside production.

## Worker Service

1. Create a second Railway/Render service from the same `backend` directory.
2. Install command: `npm install`.
3. Start command: `npm run worker`.
4. Use the same `MONGODB_URI`, `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, and provider env vars as the backend.
5. Set a distinct `WORKER_ID`.

The queue is Mongo-backed today and stores job result references, not raw document content. Redis/BullMQ can be added later behind the existing queue abstraction.

## MongoDB Atlas

1. Create a dedicated Atlas project and cluster.
2. Create a least-privilege database user for TaxBee.
3. Restrict network access to the backend and worker platform egress ranges where practical.
4. Use a dedicated database name such as `taxbee_prod`.
5. Keep Atlas backups enabled.
6. Confirm indexes are built for `User`, `ITRDraft`, `ImportedDocument`, `AuditEvent`, `Job`, `WorkspaceAccess`, and `ReviewComment`.

## Private Metrics

`/api/metrics` is private in production. Call it with:

```bash
curl -H "Authorization: Bearer $METRICS_TOKEN" https://<backend-domain>/api/metrics
```

Do not expose this endpoint through public dashboards without an authenticated gateway.

## Smoke Tests

Set:

```bash
export API_BASE=https://<backend-domain>
export TOKEN=<user-jwt>
export METRICS_TOKEN=<metrics-token>
export JOB_ID=<job-id-from-upload>
```

Run:

```bash
curl -i "$API_BASE/api/health"
curl -i "$API_BASE/api/ready"
curl -i -H "Authorization: Bearer $METRICS_TOKEN" "$API_BASE/api/metrics"
curl -i -X POST "$API_BASE/api/auth/login" -H "Content-Type: application/json" -d '{"email":"user@example.com","password":"replace-me"}'
curl -i -H "Authorization: Bearer $TOKEN" "$API_BASE/api/dashboard"
curl -i -H "Authorization: Bearer $TOKEN" "$API_BASE/api/tax-context"
curl -i -H "Authorization: Bearer $TOKEN" "$API_BASE/api/imports?page=1&limit=10"
curl -i -H "Authorization: Bearer $TOKEN" "$API_BASE/api/jobs/$JOB_ID"
curl -i -H "Authorization: Bearer $TOKEN" "$API_BASE/api/audit-timeline?page=1&limit=20"
```

Upload smoke test uses the existing JSON upload route:

```bash
curl -i -X POST "$API_BASE/api/imports/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"documentType":"ais","fileName":"smoke.txt","mimeType":"text/plain","content":"interest income 1000"}'
```

Expected result: the upload response either extracts lightweight text synchronously or returns a queued job reference. The worker should move the job through `queued`, `processing`, and `completed` or `failed` with audit events.

## Deployment Risks

- Browser-side legacy token storage remains for route compatibility; the production-preferred path is the HttpOnly cookie set by Next auth proxy routes.
- OCR/AI providers need separate quota, latency, and failure alerting once real production volume is known.
- MongoDB Atlas IP allowlisting depends on platform egress behavior; use private networking where the platform supports it.
- Mongo-backed queue is suitable for this phase, but high-volume OCR workloads should move to Redis/BullMQ or a managed queue behind the existing abstraction.

