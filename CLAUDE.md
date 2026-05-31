# TaxBee — Agent & Engineering Guide

**Last updated:** 2026-05-31

This file complements `AGENTS.md` (Next.js conventions) with TaxBee-specific architecture, documentation map, and engineering rules.

---

## What TaxBee Is

AI-powered Indian income tax filing platform. Monorepo:

| Part | Path | Stack |
|------|------|-------|
| Frontend | `/app`, `/components` | Next.js 16 App Router, React 19, Tailwind 4 |
| Backend API | `/backend` | Express 5, Mongoose 9, MongoDB |
| Worker | `/backend/worker.js` | Same codebase, Mongo job consumer (target: BullMQ) |

**Read first:** `REPOSITORY_AUDIT.md` for verified current state.

---

## Documentation Map

| Document | Purpose |
|----------|---------|
| `REPOSITORY_AUDIT.md` | As-built architecture, debt, risks |
| `ARCHITECTURE_GAP_REPORT.md` | Current vs target vision |
| `docs/PRD.md` | Product requirements |
| `docs/TRD.md` | Technical requirements |
| `docs/USER_FLOWS.md` | End-user flows |
| `docs/DATABASE_DESIGN.md` | MongoDB schemas |
| `docs/API_CONTRACTS.md` | REST API reference |
| `docs/SECURITY_ARCHITECTURE.md` | Security controls & gaps |
| `docs/IMPLEMENTATION_ROADMAP.md` | Sprints 1–10 (approval required) |
| `DEPLOYMENT.md` | Vercel + Railway/Render runbook |
| `GEMINI.md` | Bee Assistant UX rules (no duplicate systems) |

---

## Critical Facts (Do Not Assume)

1. Backend is **real Express + MongoDB** — not mocked (`README.md` is outdated).
2. **No S3, Redis, BullMQ, Sentry, PostHog, n8n, or Resend** in application code today.
3. **`GEMINI_API_KEY` is not used** in source — Bee Assistant backend is rule-based (`beeReasoningService.js`).
4. Document upload uses **JSON/base64** to `/api/imports/upload`, not S3.
5. Primary import UI is **`/import-data`**, not `/upload-documents` (stub).
6. **`proxy.ts` exists** but route guard wiring must be verified before relying on it.
7. Worker uses **`MONGO_URI`** in `worker.js` while server accepts **`MONGODB_URI`** — fix in Sprint 1.

---

## Request Path

```
Browser → Next.js page
       → /api/* Route Handler (auth cookie → Bearer)
       → Express backend:5000
       → MongoDB Atlas
       → worker.js (job processing)
```

Env: `.env.example`, `DEPLOYMENT.md`, `backend/utils/env.js`

---

## Engineering Rules

### NEVER
- Create duplicate folders, APIs, models, or auth systems
- Rewrite working code without cause
- Invent database schemas or integrations not in docs
- Remove existing functionality
- Start Sprint 1+ without approval

### ALWAYS
- Inspect repository before changing code
- Cite actual files in reviews and audits
- Keep diffs minimal and backward compatible
- Update `.env.example` when adding env vars
- Add validation, error handling, audit logging for new mutations
- Mark unknowns as **UNKNOWN** — do not fabricate

---

## Next.js Note

See `AGENTS.md`: Next.js 16 in this repo may differ from training data. Before Next.js changes, read:

```
node_modules/next/dist/docs/
```

---

## Local Development

```bash
# Terminal 1 — backend (requires MongoDB)
cd backend && npm install && npm start

# Terminal 2 — worker
cd backend && npm run worker

# Terminal 3 — frontend
npm install && npm run dev
```

Backend tests: `cd backend && npm test`

---

## Target Architecture (Vision — Not All Built)

Next.js → Express → MongoDB Atlas → **AWS S3** → **Redis** → **BullMQ** → Document Workers → **Gemini** → **n8n** → **Resend** → **Sentry** → **PostHog**

Gap details: `ARCHITECTURE_GAP_REPORT.md`  
Execution plan: `docs/IMPLEMENTATION_ROADMAP.md`

---

## Bee Assistant

- UI: `components/BeeAssistant.tsx`
- Config/guides: `backend/utils/BeeAssistantConfig.ts`
- API: `POST /api/ai/bee-assistant`
- Backend reasoning: `backend/services/beeReasoningService.js` (Mongo-grounded, no LLM today)
- Product rules: `GEMINI.md` — casual chat must not trigger filing workflow cards

---

## Key Models

`User`, `ITRDraft`, `ImportedDocument`, `Job`, `AuditEvent`, `Notification`, `WorkspaceAccess`, `ReviewComment` — see `docs/DATABASE_DESIGN.md`

---

## Current Phase

**Phase 0–3 complete:** audit and documentation only.  
**Next:** Await approval, then Sprint 1 (Auth Foundation) per `docs/IMPLEMENTATION_ROADMAP.md`.

---

@AGENTS.md
