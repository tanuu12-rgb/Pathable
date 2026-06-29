---
name: Zod in API server dependencies
description: zod must be in runtime dependencies of api-server, not devDependencies.
---

**Rule:** `zod` must be in `artifacts/api-server/package.json` under `dependencies`, not `devDependencies`.

**Why:** The API server uses Zod for runtime request validation in route handlers. esbuild bundles from node_modules at build time, but the dependency declaration must be in `dependencies` for correctness in production deploys.

**How to apply:** If adding new route files that import zod, verify `zod` is still in `dependencies` (not devDependencies) in the api-server package.json.
