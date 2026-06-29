# PathAble

AI-powered accessible campus navigation app for differently abled students at Lakewood University.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, routed at `/api`)
- `pnpm --filter @workspace/pathable run dev` — run the frontend (port 26072, routed at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, shadcn/ui, Wouter routing, TanStack Query
- Map: Leaflet.js + react-leaflet (static imports — do NOT dynamic-import leaflet inside useEffect, it causes multiple React instances)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Charts: Recharts (admin dashboard)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all API contracts)
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks
- `lib/db/src/schema/` — Drizzle ORM schema files
- `artifacts/pathable/src/pages/` — all frontend pages
- `artifacts/pathable/src/components/` — shared components (layout, ui/)
- `artifacts/api-server/src/routes/` — Express route handlers

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → typed React Query hooks used everywhere
- AI Assistant is a rule-based campus knowledge-base (no external AI key required)
- Leaflet imported statically at top of navigate.tsx — dynamic imports break React hooks
- All accessibility themes use CSS custom properties on `body.theme-*` classes
- Gamification, obstacle reports, SOS alerts, safe rooms are all real DB-backed via the API

## Product

- **Onboarding**: Disability type, mobility aid, navigation preferences setup
- **Home**: Live campus stats, active obstacle warnings, campus-wide alert banner, quick actions
- **Navigate**: Leaflet map with crowd density heatmap, obstacle overlays, step-free route guidance
- **Report**: Submit/confirm obstacle reports (elevator, ramp, wet floor, construction, etc.)
- **Safe Rooms**: Sensory rooms with real-time occupancy, check-in/check-out
- **Emergency**: SOS alert with 5-second cancel window, first aid resource finder
- **AI Assistant**: Rule-based campus assistant with voice input/output
- **Leaderboard**: Gamification points and badges for top contributors
- **Profile**: Disability profile, class schedule, accessibility colour themes (6 themes)
- **Admin Dashboard**: Zone incident chart, obstacle management, SOS response, push campus alerts

## User preferences

- Keep AI assistant as rule-based (no external API key required)

## Gotchas

- Do NOT dynamic-import leaflet inside useEffect — use static `import L from "leaflet"` at top of file
- `zod` must be in `artifacts/api-server/package.json` dependencies (not just devDependencies)
- After changing OpenAPI spec, always run `pnpm --filter @workspace/api-spec run codegen`
- Crowd density data is time-based (hour of day) — simulated for demo

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
