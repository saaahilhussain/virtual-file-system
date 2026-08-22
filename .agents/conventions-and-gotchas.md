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
2. **RBAC is aspirational**: `config/roles.js` permission arrays + `requirePermissionMiddleware` exist but are wired to NO routes. Actual enforcement = `checkIsNotUser` gate on `/users` + inline owner checks in `adminUserController.updateRole`. Don't add "protected by permissions" claims without wiring it.
3. **Dual upload architectures** (local stream vs presigned S3) coexist in `fileController`/`s3Service` — roadmap says pick one. Check both paths before editing upload code.
4. **Webhooks are not idempotent** — duplicate Razorpay deliveries can double-apply quota changes.
5. **No transactions** except User+rootDir creation. Subscription+quota updates and recursive delete+S3 cleanup are non-atomic.
6. **Directory.size drift possible**: ancestor rollups can partially fail; no reconciliation job yet.
7. **Legacy Session Mongo model** still consulted by admin features even though Redis is authoritative.
8. **Directory.path[] materialized chain** has a legacy-rebuild fallback in directoryController — old docs may lack full path arrays.
9. **Role strings must stay lowercase** end-to-end (DB enum, middleware lowercases again defensively, client RoleGuard lowercases too).
10. **Cursor pagination** depends on compound index `{userId, parentDirId, isTrashed, updatedAt:-1, _id:-1}` on files AND directories — keep indexes in sync if you touch listing queries.

## Testing

None yet. `client` test script is a stub. When adding tests (roadmap Phase 3), highest-value cases: duplicate webhook delivery, upload size mismatch, nested dir restore/delete, session-cap eviction.
