# Server Architecture (`server/`)

ESM only. Entry: `app.js` (run with `node --env-file=.env --watch app.js` via `npm run server`).

## Request flow

`app.js` → `cookieParser(SESSION_SECRET)` + `express.json()` + CORS (allowlist incl. fileshelter.app, credentials) →

Protected (require `checkAuth`): `/directory`, `/file`, `/trash`, `/users` (+`checkIsNotUser`), `/subscriptions`.
Public: `/user`, `/auth`. Webhook: raw POST `/api/billing/webhook` (Razorpay signature verify).
Global error handler returns generic `{ error: "Something went wrong." }` with `err.status || 500`.

## Layout

- `config/`: `db.js` (mongoose connect), `redis.js`, `s3Client.js`, `roles.js` (permission arrays per role — NOT wired to routes yet), `plans.js` (RZP plan IDs → quotas), `setup.js` (applies collMod $jsonSchema validators), `disableValidation.js`.
- `models/`: user, directory, file, subscription, session (legacy), otp. See project-overview.md for fields.
- `routes/`: one router per resource; thin, delegate to controllers.
- `controllers/`: business logic inline (no service layer for domain logic yet).
  - `authController` — register, login, logout, Google/GitHub OAuth, OTP flows, password reset.
  - `fileController` — initiate/complete/cancel upload, download URL, rename, trash, delete, permanent delete. **Known bug area: `uploadComplete` cleanup paths** (roadmap #1).
  - `directoryController` — CRUD, listing with cursor pagination (merged files+dirs via `$unionWith`), recursive trash/restore/delete. Materialized `path[]` has legacy-rebuild fallback.
  - `trashController` — list trashed, restore, empty trash.
  - `subscriptionController` — create Razorpay subscription, verify, cancel.
  - `webhookController` — Razorpay webhook → quota updates. Not idempotent yet (roadmap).
  - `adminUserController`, `userController` — profile, admin role management (owner-only checks inline).
- `middlewares/`: `authMiddleware.js` (`checkAuth`, `checkIsNotUser`, unused `requirePermissionMiddleware`), `rateLimitMiddleware.js` (named Redis fixed-window limiters, hashed keys, RateLimit headers), `validateIdMiddleware.js`.
- `services/`: `s3Service` (both local-stream and presigned-S3 paths exist — must pick one), `cloudFrontService` (signed URLs/cookies), `sessionService` (Redis session JSON, session cap w/ oldest-eviction), `otpService`, `googleAuthService`, `githubAuthService`, `razorpayService`.
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
