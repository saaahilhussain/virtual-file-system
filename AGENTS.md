# File Shelter — Project Memory

Full-stack cloud storage platform (Google Drive clone). Live at https://fileshelter.app.
Author: Sahil Hussain. Portfolio/interview-focused project — see `FILE_SHELTER_ROADMAP.md` for active priorities.

## What it is

- **Backend** (`server/`): Node.js + Express, ESM only. MongoDB (Mongoose v9), Redis v5 (sessions + rate limiting), AWS S3 + CloudFront (signed URLs), Razorpay subscriptions, Resend email.
- **Frontend** (`client/`): React 18 + Vite 6, react-router-dom v7, TailwindCSS v4, no state library (local state + fetch in `client/src/apis/`).

## Commands

```bash
# Server (loads .env via node --env-file)
cd server && npm run server        # dev with --watch
cd server && npm run setup         # applies DB collMod $jsonSchema validators

# Client
cd client && npm run dev           # vite --host
cd client && npm run lint          # eslint .
```

No test suite yet (`client` has a stub `dummyTest.js`). Roadmap Phase 3 = add tests.

## Critical facts

- **Auth is NOT JWT** — signed-cookie session ID (`sid`) stored in Redis as JSON (`session:<sid>`), with a legacy Mongo `Session` model still consulted by admin features. README's env/JWT claims are outdated.
- **Env names**: real ones are `MONGODB_URI`, `SESSION_SECRET`, `S3_BUCKET`, `CLOUDFRONT_DOMAIN`, `RZP_*` (NOT `MONGO_URI`, `JWT_SECRET`, etc. as README says).
- **Roles**: lowercase strings `"user" | "manager" | "admin" | "owner"` (userModel enum). `config/roles.js` defines permission arrays but `requirePermissionMiddleware` is NOT wired to routes — enforcement today is `checkIsNotUser` on `/users` plus in-controller checks.
- **Quota model**: `user.maxStorageInBytes` (default 1GB free); plans map Razorpay plan IDs → quotas (Pro 200GB, Premium 2TB) via `config/plans.js`. Directory sizes roll up ancestors on upload/delete.
- **Soft deletes everywhere**: `isTrashed`/`trashedAt` on files/dirs/users, `isDeleted` on users. Hard delete only via `/permanent` endpoints or empty-trash.
- **Ownership scoping**: every file/dir query filters by `userId: req.user._id`.
- **Cursor pagination**: base64url of `{updatedAt, id}`, keyset predicate with `_id` tiebreaker; merged files+dirs page via `$unionWith`.

## Deep-dive docs

- [`.agents/project-overview.md`](./.agents/project-overview.md) — features, stack, data model
- [`.agents/server-architecture.md`](./.agents/server-architecture.md) — modules, request flow, auth/sessions, billing, storage
- [`.agents/client-architecture.md`](./.agents/client-architecture.md) — routing, API layer, key components
- [`.agents/conventions-and-gotchas.md`](./.agents/conventions-and-gotchas.md) — patterns, known gaps, traps

## Active roadmap (from FILE_SHELTER_ROADMAP.md)

1. Correctness: fix `fileController.uploadComplete` cleanup paths; unify role naming; pick ONE upload architecture (local-stream vs presigned-S3 — both exist); recursive-dir partial failures.
2. Hardening: zod validation beyond auth; rate limiting more endpoints; idempotent webhooks; transactions for user+rootDir, subscription+quota, delete+S3 cleanup; quota reconciliation.
3. Tests → 4. Sharing feature (recommended) → 5. Observability → 6. Service-layer refactor.
