# Conventions & Gotchas

## Conventions

- ESM everywhere (`"type": "module"`), named exports, arrow-function controllers imported into routers.
- Server env loaded via Node `--env-file=.env` (no dotenv). Client via Vite `import.meta.env.VITE_*`.
- Prod gating: `NODE_ENV === "production"` → secure cookies.
- Errors: controllers return `{ error: "message" }` with explicit status; services throw `Error` with `.status` attached; everything unexpected hits the single global handler (generic 500 message). Client surfaces `err.message`.
- Validation today: Zod on auth routes only + Mongoose validators + DB-level `$jsonSchema` (via `npm run setup`). Schemas use `{ strict: "throw" }`.
- Every file/dir query scopes by `userId: req.user._id` — never query by ID alone.
- Soft deletes: check `isTrashed` in queries; hard delete only via `/permanent` or empty-trash.

## Traps / known gaps (do not assume these work)

1. **README is outdated**: claims JWT auth and env names `MONGO_URI`, `JWT_SECRET`, `AWS_BUCKET_NAME`, `CLOUDFRONT_URL`, `RAZORPAY_*`. Real: Redis signed-cookie sessions; env names `MONGODB_URI`, `SESSION_SECRET`, `S3_BUCKET`, `CLOUDFRONT_DOMAIN`, `RZP_*`. Fix README before trusting it.
2. **Administrative RBAC is wired**: `/users` routes use permission middleware,
   and controller-level role hierarchy prevents actors managing peers or higher
   roles. Role changes and account deletion invalidate Redis sessions.
3. **Uploads use presigned S3 PUTs**: initiation creates pending metadata,
   completion verifies S3 object size, then commits quota usage. Concurrent
   initiation/completion and abandoned pending uploads still need hardening.
4. **Webhook parsing is correct but ordering is not hardened**: Razorpay
   signatures are checked against raw bytes and provider status names are
   supported. There is no event ledger/deduplication or stale-event protection.
5. **No transactions** except User+rootDir creation. Subscription+quota updates and recursive delete+S3 cleanup are non-atomic.
6. **Directory.size drift possible**: ancestor rollups can partially fail; no reconciliation job yet.
7. **Legacy Session Mongo model** remains in the repository but administrative
   features now use Redis, the authoritative session store.
8. **Directory.path[] materialized chain** has a legacy-rebuild fallback in directoryController — old docs may lack full path arrays.
9. **Role strings must stay lowercase** end-to-end (DB enum, middleware lowercases again defensively, client RoleGuard lowercases too).
10. **Cursor pagination** depends on compound index `{userId, parentDirId, isTrashed, updatedAt:-1, _id:-1}` on files AND directories — keep indexes in sync if you touch listing queries.

## Testing

Backend: Vitest + Supertest integration harness using an in-memory MongoDB replica
set and Redis test double. There are currently 17 passing tests covering OTP-gated
registration, session lifecycle/cap eviction, role hierarchy, webhook signatures
and status transitions, upload lifecycle/mismatch cleanup, recursive directory
trash/restore/delete, root protection, plan allowlisting, and share boundaries.
The backend GitHub Actions deployment is gated on this suite. The client test
script remains a stub.
