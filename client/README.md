# File Shelter client

React 18 + Vite 6 + TailwindCSS 4. Setup and environment configuration are in
the [project README](../README.md).

```bash
npm ci
# Copy .env.example to .env and configure its public values.
npm run dev
npm test
npm run test:watch
npm run build
npm run lint
```

Vitest and Testing Library test the actual Drive page, API calls and upload
recovery with fetch/XHR doubles. `npm test` exits unsuccessfully if assertions
fail. The GitHub Actions frontend workflow runs it before deployment.
Repository-wide lint still reports pre-existing issues in other components.

The [upload recovery demo](../docs/upload-recovery.md) includes a deterministic
Playwright recording of the real UI, with one injected completion failure.
