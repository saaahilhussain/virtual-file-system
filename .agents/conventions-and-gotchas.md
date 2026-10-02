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

1. **README reflects current sessions and env names**: Redis signed-cookie sessions; `MONGODB_URI`, `SESSION_SECRET`, `S3_BUCKET`, `CLOUDFRONT_DOMAIN`, `RZP_*`. Examples are in `server/.env.example` and `client/.env.example`.
2. **Administrative RBAC is wired**: `/users` routes use permission middleware,
   and controller-level role hierarchy prevents actors managing peers or higher
   roles. Role changes and account deletion invalidate Redis sessions.
3. **Uploads use presigned S3 PUTs**: pending file records reserve quota in an account transaction. Completion verifies S3 size and atomically commits the flag and ancestor totals. Browser completion retry reuses the file ID while the Drive page is mounted.
4. **Billing current-state sync**: webhook signatures use raw bytes; an event ledger and billingRevision fencing protect atomic subscription/quota updates. See `server/docs/BILLING_RELIABILITY.md`.
5. **Shared account transaction**: storage and billing conflict on User.__v via `accountTransactionService.js`. New storage writers must use this protocol. MongoDB requires a replica set.
6. **Cleanup and reconciliation**: metadata deletion queues S3 jobs transactionally. Maintenance expires pending uploads, retries leased cleanup, and repairs directory sizes. Tombstones are retained and revisited daily; see `server/docs/STORAGE_RELIABILITY.md` for limits.
7. **Legacy Session Mongo model** remains in the repository but administrative
   features now use Redis, the authoritative session store.
8. **Directory.path[] materialized chain** has a legacy-rebuild fallback in directoryController — old docs may lack full path arrays.
9. **Role strings must stay lowercase** end-to-end (DB enum, middleware lowercases again defensively, client RoleGuard lowercases too).
10. **Cursor pagination** depends on compound index `{userId, parentDirId, isTrashed, updatedAt:-1, _id:-1}` on files AND directories — keep indexes in sync if you touch listing queries.

## Testing

Backend: Vitest + Supertest with an in-memory MongoDB replica set and Redis/provider doubles. Tests cover security, storage concurrency and rollback, cleanup, sharing, billing consistency and S3 SDK behavior. Backend deployment is gated on this suite.

Client: Vitest + Testing Library exercise real Drive UI and API calls with fetch/XHR doubles. Frontend deployment runs `npm test` before build/publish. `npm run demo:upload` records a deterministic Playwright browser flow; it is not a live-provider certification. Repository-wide client lint has existing debt.
