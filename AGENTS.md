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
cd server && npm test              # backend integration and S3 service tests

# Client
cd client && npm run dev           # vite --host
cd client && npm run lint          # eslint .
```

The backend uses Vitest + Supertest with an in-memory MongoDB replica set and
Redis test double. The client still has a stub `dummyTest.js`.

## Critical facts

- **Auth is NOT JWT** — signed-cookie session ID (`sid`) stored in Redis as JSON (`session:<sid>`), with a legacy Mongo `Session` model still consulted by admin features. README's env/JWT claims are outdated.
- **Env names**: real ones are `MONGODB_URI`, `SESSION_SECRET`, `S3_BUCKET`, `CLOUDFRONT_DOMAIN`, `RZP_*` (NOT `MONGO_URI`, `JWT_SECRET`, etc. as README says).
- **Roles**: lowercase strings `"user" | "manager" | "admin" | "owner"`
  (userModel enum). Administrative `/users` routes enforce `config/roles.js`
  permissions, while controller-level hierarchy checks prevent actors managing
  peers or higher roles. Role changes and account deletion revoke Redis sessions.
- **Quota model**: `user.maxStorageInBytes` (default 1GB free); plans map Razorpay plan IDs → quotas (Pro 200GB, Premium 2TB) via `config/plans.js`. Directory sizes roll up ancestors on upload/delete.
- **Storage transactions**: `services/storageService.js` serializes account storage
  writes through the existing user `__v` field in a MongoDB transaction. Pending
  non-trashed file rows reserve quota; completion and ancestor totals commit
  together. Restores also enforce quota. All new storage writers must use this helper.
- **Cleanup**: metadata deletion queues S3 keys transactionally. The server's
  maintenance loop expires 24-hour pending uploads, retries leased cleanup jobs,
  and reconciles directory sizes. Successful cleanup tombstones are retained and
  revisited daily. See `server/docs/STORAGE_RELIABILITY.md` for costs and limits.
- **Soft deletes everywhere**: `isTrashed`/`trashedAt` on files/dirs/users, `isDeleted` on users. Hard delete only via `/permanent` endpoints or empty-trash.
- **Ownership scoping**: every file/dir query filters by `userId: req.user._id`.
- **Cursor pagination**: base64url of `{updatedAt, id}`, keyset predicate with `_id` tiebreaker; merged files+dirs page via `$unionWith`.

## Deep-dive docs

- [`.agents/project-overview.md`](./.agents/project-overview.md) — features, stack, data model
- [`.agents/server-architecture.md`](./.agents/server-architecture.md) — modules, request flow, auth/sessions, billing, storage
- [`.agents/client-architecture.md`](./.agents/client-architecture.md) — routing, API layer, key components
- [`.agents/conventions-and-gotchas.md`](./.agents/conventions-and-gotchas.md) — patterns, known gaps, traps

## Active roadmap (from FILE_SHELTER_ROADMAP.md)

1. Reliability: quota reservation, transactional accounting, abandoned-upload
   cleanup and durable S3 retries implemented. Next: scale large-account scans,
   review tombstone retention costs, and add a browser completion-retry flow.
2. Hardening: extend Zod validation beyond auth/sharing; add webhook event
   ordering/deduplication; make subscription+quota updates transaction-safe.
3. Tests: backend integration and S3 service tests gate deployment;
   extend coverage as reliability work lands. Sharing is implemented.
4. Observability → 5. Service-layer refactor → 6. README/OpenAPI polish.
