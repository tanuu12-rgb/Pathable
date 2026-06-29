---
name: API hook argument signatures
description: Key differences in generated Orval hook signatures for this project.
---

**Rule:** Not all generated hooks follow the same argument pattern.

- `useListCampusAlerts(options?)` — one optional arg containing `{ query, request }`
- `useListObstacles(params, options?)` — two args: query params first, then options
- `useGetAdminSummary(options?)` — one optional arg
- `useGetGamificationProfile(userId, options?)` — userId first, then options

**Why:** Orval generates hooks differently depending on whether the endpoint has path/query parameters.

**How to apply:** When getting "Expected 0-1 arguments, but got 2" errors, check the generated hook in `lib/api-client-react/src/generated/api.ts` to confirm the signature.
