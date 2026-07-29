# FarmGreen Architecture

## Overview

FarmGreen is a full-stack React application built on **TanStack Start** with SSR capabilities, file-based routing, and server functions. Data persists in **Supabase Postgres** with Row Level Security. AI features run server-side through the Lovable AI Gateway.

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (Client)                     │
│  React 19 + TanStack Router + React Query + shadcn/ui   │
└────────────────────────┬────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
   Supabase Client   Server Functions   localStorage
   (Auth + CRUD)     (createServerFn)   (weather cache)
         │               │
         ▼               ▼
┌─────────────────────────────────────────────────────────┐
│                    TanStack Start Server                   │
│  ai.functions.ts │ weather.functions.ts │ auth middleware│
└────────┬────────────────────┬───────────────────────────┘
         ▼                    ▼
   Supabase Postgres    External APIs
   (RLS enforced)       (Open-Meteo, Nominatim, Lovable AI)
```

## Routing

TanStack Router uses **file-based routing** in `src/routes/`. See `src/routes/README.md` for conventions.

| Route | File | Description |
|-------|------|-------------|
| `/auth` | `auth.tsx` | Login / signup (email + Google OAuth) |
| `/` | `_authenticated/index.tsx` | Dashboard |
| `/gardens` | `_authenticated/gardens.tsx` | Garden CRUD |
| `/gardens/:gardenId/logs` | `_authenticated/gardens.$gardenId.logs.tsx` | Per-garden log history |
| `/logs` | `_authenticated/logs.index.tsx` | All activity logs |
| `/logs/new` | `_authenticated/logs.new.tsx` | Create activity log |
| `/weather` | `_authenticated/weather.tsx` | Weather forecast |
| `/assistant` | `_authenticated/assistant.tsx` | AI chat assistant |
| `/diagnose` | `_authenticated/diagnose.tsx` | Disease image diagnosis |
| `/reports` | `_authenticated/reports.tsx` | AI monthly reports |

Authenticated routes share layout in `_authenticated/route.tsx`:
- `beforeLoad` checks Supabase auth; redirects to `/auth` if unauthenticated
- `ssr: false` for client-only auth state
- Sidebar layout via `AppSidebar`

`routeTree.gen.ts` is auto-generated — never edit manually.

## State Management

There is **no global state library** (no Redux, Zustand, etc.). State is managed via:

1. **TanStack React Query** — server state (gardens, logs, disease checks, weather)
2. **React `useState`** — local UI state (forms, dialogs, loading)
3. **localStorage** — weather location and cache (`use-weather.ts`)

Primary data hooks live in `src/lib/farm-store.ts`:

| Hook | Query Key | Purpose |
|------|-----------|---------|
| `useFarmStore()` | `["gardens"]`, `["logs"]` | Read gardens and activity logs |
| `useDiseaseChecks()` | `["disease_checks"]` | Read disease diagnosis history |
| `useFarmActions()` | — | Mutations with query invalidation |

## Service Layer

### Client-side Supabase

`src/integrations/supabase/client.ts` — browser Supabase client with publishable key. Used for auth and direct table access from the client.

### Server Functions

Server logic uses TanStack Start `createServerFn` in `src/lib/`:

| File | Functions |
|------|-----------|
| `ai.functions.ts` | `chatWithAssistant`, `generateMonthlyReport`, `listReports`, `deleteReport`, `diagnoseDisease`, `analyzeFarm` |
| `ai-parse.functions.ts` | `parseFarmLog` |
| `weather.functions.ts` | `getWeather` |

AI and authenticated functions use `requireSupabaseAuth` middleware from `src/integrations/supabase/auth-middleware.ts`, which validates the Bearer JWT and injects `{ supabase, userId }` into context.

### External Services

| Service | Usage | Auth |
|---------|-------|------|
| Supabase | Auth, Postgres | Publishable key + user JWT |
| Lovable AI Gateway | Gemini chat/completions | `LOVABLE_API_KEY` (server only) |
| Open-Meteo | Weather forecast | Public, no key |
| Nominatim | Reverse geocoding | Public, User-Agent header |

## Authentication Flow

1. User signs in via `/auth` (email/password or Google OAuth via Lovable)
2. Supabase session stored in localStorage
3. `_authenticated` layout checks `supabase.auth.getUser()` on navigation
4. Server functions receive JWT via Authorization header (attached by TanStack Start auth attacher)

## Component Architecture

```
src/routes/           → Page-level components (route files)
src/components/       → Feature components (DashboardAI, WeatherCard, AppSidebar, …)
src/components/ui/    → shadcn/ui primitives (Button, Card, Dialog, …)
src/hooks/            → Shared hooks (use-mobile)
src/lib/              → Business logic, server functions, data hooks
```

Pages compose feature components. Feature components compose shadcn/ui primitives. Avoid duplicating UI patterns — check `src/components/ui/` first.

## Build & Deploy

- **Bundler**: Vite 8 via `@lovable.dev/vite-tanstack-config`
- **SSR entry**: `src/server.ts` (error wrapper)
- **Path alias**: `@/*` → `src/*`
- **CSS**: Tailwind v4 with `@theme inline` in `src/styles.css`

Do not manually add Vite plugins listed in `vite.config.ts` comments — the Lovable config already includes them.

## Error Handling

- Root error boundary: `src/routes/__root.tsx` (`ErrorComponent`)
- Toast notifications: `sonner` via `<Toaster />`
- Lovable error reporting: `src/lib/lovable-error-reporting.ts`

## Key Design Decisions

1. **Client-side Supabase for CRUD** — gardens and logs use direct Supabase calls with RLS, not server functions. Keeps mutations simple.
2. **Server functions for AI and weather** — secrets stay server-side; weather avoids CORS issues.
3. **Vietnamese-first UI** — all user-facing copy in Vietnamese.
4. **Button-triggered AI** — no automatic AI calls; see `DashboardAI` component as the reference pattern.
