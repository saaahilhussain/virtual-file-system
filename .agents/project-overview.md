# Project Overview

Full-stack Google Drive clone: upload/download/rename files and nested folders, trash + restore, storage quotas, subscription billing, admin user management.

- Live: https://fileshelter.app
- Author: Sahil Hussain (portfolio/interview project — code quality and interview-defensibility matter more than features)
- Monorepo: `client/` (React SPA) + `server/` (REST API). No shared packages.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite 6, react-router-dom v7, TailwindCSS v4, @phosphor-icons/react |
| Backend | Node.js 18+, Express 5-style (ESM), Zod v4 (auth routes only) |
| Database | MongoDB via Mongoose v9; Redis v5 (sessions, rate limits) |
| Storage | AWS S3 (SDK v3), CloudFront signed URLs (`@aws-sdk/cloudfront-signer`) |
| Payments | Razorpay subscriptions + webhooks |
| Email | Resend (OTP / password reset codes) |
| Auth | Local email+password, Google OAuth (server-side ID token verify), GitHub OAuth |

## Data model (Mongo)

- **User**: name, email, password hash (bcrypt, optional for OAuth-only), `authProviders[]` (`local|google|github`), `maxStorageInBytes` (default 1GB), `rootDirId`, `role` (`user|manager|admin|owner` lowercase), `isTrashed`, `isDeleted`.
- **Directory**: name, `size` (recursive rollup of contents!), `userId`, `parentDirId` (null = root), `path` (array of ancestor ObjectIds — materialized path), `isTrashed`, `trashedAt`.
- **File**: name, size, extension, userId, parentDirId, `isTrashed`, `trashedAt`, `uploadCompletedAt` (null until upload finishes).
- **Subscription**: Razorpay subscription state per user.
- **Session** (legacy Mongo): superseded by Redis but still read by some admin flows.
- **Otp**: hashed OTPs for email verification / password reset.

All file/dir/user schemas use `{ strict: "throw" }`; production also has DB-level `$jsonSchema` validators applied by `npm run setup` (`config/setup.js`).

## Quotas & plans

- Free: 1GB. Pro: 200GB. Premium: 2TB.
- `config/plans.js` maps Razorpay plan IDs (env `RZP_PLAN_*`) → byte quotas.
- Directory `size` rolls up through ancestor `path` chain on upload/delete.

## Roadmap status

See `FILE_SHELTER_ROADMAP.md`. Phase order: 1 correctness → 2 hardening → 3 tests → 4 sharing feature → 5 observability → 6 service-layer refactor. Nothing from Phase 1–3 is done yet.
