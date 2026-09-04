# Server Architecture (`server/`)

ESM only. `app.js` builds and exports the Express application; `server.js`
connects MongoDB/Redis, starts the listener, and handles graceful shutdown.
`node app.js` remains a backwards-compatible PM2 entrypoint. Development runs
through `npm run server`.

## Request flow

`app.js` → `cookieParser(SESSION_SECRET)` + `express.json()` + CORS (allowlist incl. fileshelter.app, credentials) →

Protected (require `checkAuth`): `/directory`, `/file`, `/trash`, `/users` (+`checkIsNotUser`), `/subscriptions`.
Public: `/user`, `/auth`. The raw POST `/api/billing/webhook` is registered
before `express.json()` so Razorpay signatures use the exact request bytes.
Global error handler returns generic `{ error: "Something went wrong." }` with `err.status || 500`.

## Layout

- `config/`: `db.js` (mongoose connect), `redis.js`, `s3Client.js`, `roles.js`
  (permissions enforced on administrative user routes), `plans.js` (allowlisted
  RZP plan IDs → quotas), `setup.js` (applies collMod $jsonSchema validators),
  `disableValidation.js`.
- `models/`: user, directory, file, subscription, session (legacy), otp. See project-overview.md for fields.
- `routes/`: one router per resource; thin, delegate to controllers.
- `controllers/`: business logic inline (no service layer for domain logic yet).
  - `authController` — register, login, logout, Google/GitHub OAuth, OTP flows, password reset.
  - `fileController` — initiate/complete/cancel direct-to-S3 uploads, verify
    uploaded object size, download URL, rename, trash, delete, permanent delete.
    Concurrent quota reservation and atomic ancestor accounting remain roadmap work.
  - `directoryController` — CRUD, listing with cursor pagination (merged files+dirs via `$unionWith`), recursive trash/restore/delete. Materialized `path[]` has legacy-rebuild fallback.
  - `trashController` — list trashed, restore, empty trash.
  - `subscriptionController` — create Razorpay subscription, verify, cancel.
  - `webhookController` — Razorpay webhook → quota updates. Not idempotent yet (roadmap).
  - `adminUserController`, `userController` — profile, admin role management (owner-only checks inline).
- `middlewares/`: `authMiddleware.js` (`checkAuth`, `checkIsNotUser`, unused `requirePermissionMiddleware`), `rateLimitMiddleware.js` (named Redis fixed-window limiters, hashed keys, RateLimit headers), `validateIdMiddleware.js`.
- `services/`: `s3Service` (presigned S3 upload and object lifecycle),
  `cloudFrontService` (signed URLs/cookies), `sessionService` (Redis session JSON,
  session cap w/ oldest-eviction), `verificationGrantService` (single-use,
  hashed-key Redis grants), `otpService`, `googleAuthService`,
  `githubAuthService`, `razorpayService`.
- `validators/authValidators.js` — Zod safeParse → `400 { error: fieldErrors }`; auth routes only.

## Auth & sessions (NOT JWT)

1. Login verifies credentials / OAuth ID token server-side.
2. Creates Redis key `session:<sid>` = JSON `{ userId, rootDirId, role, lastActiveAt, ... }`, TTL-managed, capped sessions per user (oldest evicted).
3. Sets signed cookie `sid` (`SESSION_SECRET`; `secure` when NODE_ENV=production).
4. `checkAuth` reads `sid` → loads Redis JSON → sets `req.user = { _id, rootDirId, role }`; updates `lastActiveAt` fire-and-forget.

## Pagination

Opaque cursor = base64url(`{ updatedAt, id }`). Keyset predicate `$or [{updatedAt < c.updatedAt}, {and eq updatedAt, _id < c.id}]`, sort `{updatedAt:-1,_id:-1}` (matches compound indexes). Fetches limit+1 for `hasMore`; limit clamped 1–100.

## Storage

S3 via SDK v3. Downloads go through CloudFront signed URLs. Upload architecture is mixed/dual (local stream vs presigned PUT) — see roadmap Phase 1 decision item before adding features here.
