# Client Architecture (`client/`)

React 18 + Vite 6, TailwindCSS v4 (via `@tailwindcss/vite`), react-router-dom v7. **No state library** — local state, props, and a fetch-based API layer.

## Routing (`src/App.jsx`)

`createBrowserRouter`:
- `/` LandingPage, `/plans`, `/privacy`
- `/register`, `/login`, `/forgot-password`, `/auth/github/callback` (GitHubCallback)
- `/app`, `/app/directory/:dirId` → DirectoryView (the drive)
- `/trash`, `/profile`
- `/users` → wrapped in `<RoleGuard>` (fetches user; allows only `manager|admin|owner`; redirects unauth → /login, denied → /app)

Theme: `dark-mode` class on body toggled from localStorage in `App`.

## API layer (`src/apis/`)

One module per resource: `authApi`, `userApi`, `fileApi`, `directoryApi`, `trashApi`, `subscriptionApi`, plus `loginWithGoogle` / `loginWithGithub`. `apiResponse.js` normalizes responses — throws `new Error(message)` from nested payload. Cookies ride along automatically (session auth); no token handling client-side. Env via `import.meta.env.VITE_*`.

## Key pages/components

- `pages/DirectoryView.jsx` — main drive screen: breadcrumb nav, folder listing, uploads. Owns the `item` object shape passed down (see `client/items-context.md`) — Mongo fields + React-added `isDirectory`, `isUploading`.
- `DirectoryList.jsx` → `DirectoryItem.jsx` → `ContextMenu.jsx` / `TrashContextMenu.jsx` (right-click actions: rename, details, trash, download).
- Modals: `CreateDirectoryModal`, `RenameModal`, `DetailsModal`.
- `TopBar`, `Sidebar`, `Breadcrumb` (uses `breadcrumbTrail` from server), `BrandMark`.
- `components/landing/*` — marketing sections (Hero, Features, Pricing, Preview, HowToUse, Footer, CurrentPlanCard).
- `pages/UsersView.jsx` — admin panel behind RoleGuard.

## Conventions

- Named default exports per file; pages in `pages/`, reusable in `components/`.
- Styling = Tailwind utility classes inline; dark mode via `.dark-mode` CSS class variants.
- Lint: `npm run lint` (eslint 9 flat config). No tests (`test` script runs stub `dummyTest.js`).

## Gotchas

- README env examples are wrong for the server; client uses `VITE_*` vars defined in `client/.env` (loaded by vite dev script with `node --env-file`).
- `RoleGuard` duplicates server role logic (role strings lowercase) — keep in sync when changing roles.
