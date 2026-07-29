# FarmGreen — Project Analysis

> **Purpose:** Onboarding reference for the Garden Management MVP sprint.  
> **Scope:** Document the existing codebase as-is. No application code was modified to produce this file.  
> **Date:** July 2026

---

## 1. Tech Stack


| Layer                | Technology                                     | Notes                                                                     |
| -------------------- | ---------------------------------------------- | ------------------------------------------------------------------------- |
| Framework            | **TanStack Start** + **React 19**              | Full-stack React with SSR support; authenticated routes use `ssr: false`  |
| Routing              | **TanStack Router**                            | File-based routing in `src/routes/`; `routeTree.gen.ts` is auto-generated |
| Language             | **TypeScript** (strict)                        | Path alias `@/*` → `src/*`                                                |
| Styling              | **Tailwind CSS v4** + **shadcn/ui** (new-york) | Theme in `src/styles.css`; Plus Jakarta Sans font                         |
| Data fetching        | **TanStack React Query v5**                    | QueryClient created per router instance in `src/router.tsx`               |
| Backend / DB         | **Supabase**                                   | Auth, Postgres, Row Level Security (RLS)                                  |
| Server logic         | **TanStack Start `createServerFn`**            | AI and weather run server-side in `src/lib/*.functions.ts`                |
| Auth (OAuth)         | **Lovable Cloud Auth**                         | Google sign-in via `@lovable.dev/cloud-auth-js`                           |
| AI gateway           | **Lovable AI Gateway** (Gemini)                | `LOVABLE_API_KEY` — server only                                           |
| Weather APIs         | Open-Meteo + Nominatim                         | Server-side via `weather.functions.ts`                                    |
| Bundler              | **Vite 8**                                     | Config via `@lovable.dev/vite-tanstack-config`                            |
| Package manager      | npm / bun                                      | Both `package-lock.json` and `bun.lock` present                           |
| Linting / formatting | ESLint 9 + Prettier                            | `npm run lint`, `npm run format`                                          |


### Architecture Summary

```
Browser (React 19 + TanStack Router + React Query + shadcn/ui)
    │
    ├── Supabase Client (auth + direct CRUD for gardens/logs)
    ├── Server Functions (AI, weather — via createServerFn)
    └── localStorage (weather location/cache)
         │
         ▼
TanStack Start Server
    ├── requireSupabaseAuth middleware (JWT validation)
    └── External APIs (Lovable AI, Open-Meteo, Nominatim)
         │
         ▼
Supabase Postgres (RLS enforced per user)
```

**State management:** No global state library (no Redux, Zustand). Server state via React Query; local UI state via `useState`; weather location/cache in `localStorage`.

---

## 2. Folder Structure

```
farmgreen-9738c2a9/
├── src/
│   ├── routes/                  # Pages (TanStack file-based routing)
│   │   ├── __root.tsx           # App shell, QueryClientProvider, Toaster, error boundary
│   │   ├── auth.tsx             # Login / signup
│   │   └── _authenticated/      # Protected layout (sidebar + auth guard)
│   │       ├── route.tsx        # Auth layout wrapper
│   │       ├── index.tsx        # Dashboard
│   │       ├── gardens.tsx      # Garden list + create/delete
│   │       ├── gardens.$gardenId.logs.tsx
│   │       ├── logs.index.tsx   # All activity logs
│   │       ├── logs.new.tsx     # Create activity log
│   │       ├── weather.tsx      # (out of sprint scope)
│   │       ├── assistant.tsx    # (out of sprint scope)
│   │       ├── diagnose.tsx     # (out of sprint scope)
│   │       └── reports.tsx      # (out of sprint scope)
│   ├── components/              # Feature-level components
│   │   ├── app-sidebar.tsx
│   │   ├── dashboard-ai.tsx
│   │   ├── today-tasks.tsx
│   │   ├── spray-timing.tsx
│   │   ├── weather-card.tsx
│   │   ├── weather-alert.tsx
│   │   └── ui/                  # shadcn/ui primitives (46 components)
│   ├── lib/                     # Business logic, hooks, server functions
│   │   ├── farm-store.ts        # Gardens/logs data hooks + mutations
│   │   ├── use-weather.ts       # Weather + location hooks
│   │   ├── ai.functions.ts      # AI server functions
│   │   ├── ai-parse.functions.ts
│   │   ├── weather.functions.ts
│   │   ├── utils.ts             # cn() helper
│   │   └── ...
│   ├── hooks/
│   │   └── use-mobile.tsx       # Responsive breakpoint hook
│   ├── integrations/
│   │   ├── supabase/            # Client, types, auth middleware
│   │   └── lovable/             # OAuth wrapper
│   ├── router.tsx               # Router factory
│   ├── start.ts                 # TanStack Start config (middleware)
│   ├── server.ts                # SSR entry
│   ├── routeTree.gen.ts         # Auto-generated — do not edit
│   └── styles.css               # Tailwind theme + design tokens
├── supabase/
│   └── migrations/              # SQL migrations (3 files)
├── docs/                        # Project documentation
├── .cursor/rules/               # Cursor AI coding rules
├── components.json              # shadcn/ui config
├── package.json
├── vite.config.ts
├── tsconfig.json
└── AGENTS.md                    # AI assistant guide
```

### Key Conventions

- **Never** create `src/pages/` — routing lives exclusively in `src/routes/`.
- **Never** edit `routeTree.gen.ts` manually.
- **Never** rename top-level folders (`routes`, `components`, `lib`, `integrations`).
- UI copy is **Vietnamese**; code and types are **English**.
- Primary CTA style: `gradient-primary text-primary-foreground`.

---

## 3. Existing Components

### Feature Components (`src/components/`)


| Component      | File                | Purpose                                                      |
| -------------- | ------------------- | ------------------------------------------------------------ |
| `AppSidebar`   | `app-sidebar.tsx`   | Collapsible navigation sidebar; auth email display; sign-out |
| `DashboardAI`  | `dashboard-ai.tsx`  | Button-triggered AI farm analysis on dashboard               |
| `TodayTasks`   | `today-tasks.tsx`   | Task reminders derived from garden log history               |
| `SprayTiming`  | `spray-timing.tsx`  | Weather-based spray window suggestions                       |
| `WeatherCard`  | `weather-card.tsx`  | 7-day weather forecast widget                                |
| `WeatherAlert` | `weather-alert.tsx` | Weather warning banner for dashboard                         |


### Page-Local Components

Several routes define private sub-components inline (not exported):


| Route                   | Inline Components                       |
| ----------------------- | --------------------------------------- |
| `gardens.tsx`           | `AddGardenDialog`, `DeleteGardenButton` |
| `index.tsx` (dashboard) | `StatCard`, `EmptyState`                |
| `auth.tsx`              | `Field` (form input wrapper)            |


These are co-located with their route files and are not shared across pages.

---

## 4. Existing Pages

All authenticated pages share the layout in `_authenticated/route.tsx` (sidebar + sticky header).


| URL                       | Route File                                  | Description                                   | Garden MVP Relevance                             |
| ------------------------- | ------------------------------------------- | --------------------------------------------- | ------------------------------------------------ |
| `/auth`                   | `auth.tsx`                                  | Email/password login, signup, Google OAuth    | Prerequisite — users must auth to manage gardens |
| `/`                       | `_authenticated/index.tsx`                  | Dashboard: stats, recent logs, weather, tasks | Shows garden count/area; links to gardens        |
| `/gardens`                | `_authenticated/gardens.tsx`                | Garden list, add dialog, delete confirmation  | **Core Garden MVP page**                         |
| `/gardens/:gardenId/logs` | `_authenticated/gardens.$gardenId.logs.tsx` | Per-garden activity log timeline              | Garden detail view (logs only)                   |
| `/logs`                   | `_authenticated/logs.index.tsx`             | All logs with garden/type filters             | Related — journal, not garden CRUD               |
| `/logs/new`               | `_authenticated/logs.new.tsx`               | Create activity log form                      | Related — pre-selects garden via `?gardenId=`    |
| `/weather`                | `_authenticated/weather.tsx`                | Full weather page                             | Out of sprint scope                              |
| `/assistant`              | `_authenticated/assistant.tsx`              | AI chat assistant                             | Out of sprint scope                              |
| `/diagnose`               | `_authenticated/diagnose.tsx`               | Disease image diagnosis                       | Out of sprint scope                              |
| `/reports`                | `_authenticated/reports.tsx`                | AI monthly reports                            | Out of sprint scope                              |


### Routing Details

- **Auth guard:** `_authenticated/route.tsx` runs `beforeLoad` → `supabase.auth.getUser()` → redirect to `/auth` if unauthenticated.
- **SSR:** Auth routes and authenticated layout use `ssr: false` (client-only auth state).
- **Search params:** `/logs/new` accepts optional `gardenId` via Zod-validated search schema.
- **Dynamic params:** `/gardens/$gardenId/logs` reads `gardenId` from `Route.useParams()`.
- **SEO:** Each route defines `head()` with Vietnamese `title`, `description`, and Open Graph meta tags.

---

## 5. Existing Database Usage

### Tables (Supabase Postgres)


| Table            | Garden MVP Role                             | Access Pattern                           |
| ---------------- | ------------------------------------------- | ---------------------------------------- |
| `gardens`        | **Primary** — farm plots                    | Client-side Supabase via `farm-store.ts` |
| `activity_logs`  | Related — journal entries linked to gardens | Client-side Supabase via `farm-store.ts` |
| `disease_checks` | Out of scope                                | Client read + server write (AI)          |
| `ai_reports`     | Out of scope                                | Server functions only                    |


### `gardens` Schema


| Column       | Type                 | App Field                                    |
| ------------ | -------------------- | -------------------------------------------- |
| `id`         | UUID PK              | `id`                                         |
| `user_id`    | UUID FK → auth.users | Set on insert from `supabase.auth.getUser()` |
| `name`       | TEXT NOT NULL        | `name`                                       |
| `crop`       | TEXT NOT NULL        | `crop`                                       |
| `area`       | NUMERIC DEFAULT 0    | `area` (number)                              |
| `location`   | TEXT DEFAULT ''      | `location`                                   |
| `planted_at` | DATE NOT NULL        | `plantedAt` (camelCase mapping)              |
| `notes`      | TEXT                 | `notes`                                      |
| `created_at` | TIMESTAMPTZ          | `createdAt`                                  |
| `updated_at` | TIMESTAMPTZ          | Auto via trigger                             |


**RLS:** Policy `"own gardens"` — `auth.uid() = user_id` for ALL operations.

**Cascade:** Deleting a garden cascades to `activity_logs` (DB-level `ON DELETE CASCADE`).

### `activity_logs` Schema (Garden-Related)


| Column      | Type              | Notes                                         |
| ----------- | ----------------- | --------------------------------------------- |
| `garden_id` | UUID FK → gardens | Required; cascade delete                      |
| `type`      | TEXT              | App-enforced enum (Vietnamese activity types) |
| `date`      | DATE              | Activity date                                 |
| `note`      | TEXT              | Free text                                     |
| `cost`      | NUMERIC           | Expense in VND (out of sprint scope for MVP)  |


### Client Access Pattern

```typescript
// Read
supabase.from("gardens").select("*").order("created_at", { ascending: false })

// Insert
supabase.from("gardens").insert({ user_id, name, crop, area, location, planted_at, notes })

// Delete
supabase.from("gardens").delete().eq("id", id)
```

**Not implemented:** `update` mutation for gardens (no `updateGarden` in `useFarmActions()`).

### TypeScript Types

Generated types live in `src/integrations/supabase/types.ts`. Domain types with camelCase mapping are defined manually in `src/lib/farm-store.ts` (`Garden`, `ActivityLog`, `ActivityType`).

### Environment Variables


| Variable                        | Scope                             |
| ------------------------------- | --------------------------------- |
| `VITE_SUPABASE_URL`             | Client                            |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Client                            |
| `SUPABASE_URL`                  | Server (SSR / server functions)   |
| `SUPABASE_PUBLISHABLE_KEY`      | Server                            |
| `LOVABLE_API_KEY`               | Server (AI — out of sprint scope) |


---

## 6. Existing Services

### Client-Side Data Layer (`src/lib/farm-store.ts`)

Central module for garden and log data. Acts as both **service** and **hook** layer.


| Export                                  | Type     | Description                                                                                          |
| --------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `useFarmStore()`                        | Hook     | Fetches gardens + logs via React Query                                                               |
| `useFarmActions()`                      | Hook     | Mutations: `addGarden`, `deleteGarden`, `addLog`, `deleteLog`, `deleteDiseaseCheck`, `invalidateAll` |
| `useDiseaseChecks()`                    | Hook     | Fetches disease check history                                                                        |
| `ACTIVITY_TYPES`                        | Constant | Vietnamese activity type list                                                                        |
| `Garden`, `ActivityLog`, `ActivityType` | Types    | Domain models                                                                                        |


**Query keys:** `["gardens"]`, `["logs"]`, `["disease_checks"]`.

**Mapping:** Snake_case DB rows → camelCase domain objects via `mapGarden()`, `mapLog()`, `mapDisease()`.

### Supabase Integration (`src/integrations/supabase/`)


| File                 | Purpose                                                               |
| -------------------- | --------------------------------------------------------------------- |
| `client.ts`          | Browser Supabase client (lazy singleton via Proxy); auto-generated    |
| `client.server.ts`   | Server-side client variant                                            |
| `types.ts`           | Generated Database types                                              |
| `auth-middleware.ts` | `requireSupabaseAuth` — validates Bearer JWT for server functions     |
| `auth-attacher.ts`   | `attachSupabaseAuth` — attaches session token to server function RPCs |


### Server Functions (`src/lib/*.functions.ts`)


| File                    | Functions                                                                                                     | Garden MVP Relevance |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------- |
| `ai.functions.ts`       | `chatWithAssistant`, `generateMonthlyReport`, `listReports`, `deleteReport`, `diagnoseDisease`, `analyzeFarm` | None — out of scope  |
| `ai-parse.functions.ts` | `parseFarmLog`                                                                                                | None — out of scope  |
| `weather.functions.ts`  | `getWeather`                                                                                                  | None — out of scope  |


Server functions use `createServerFn` with `requireSupabaseAuth` middleware. Auth token is attached client-side via `attachSupabaseAuth` registered in `src/start.ts`.

### Lovable Integration (`src/integrations/lovable/index.ts`)

Wraps `@lovable.dev/cloud-auth-js` for Google OAuth. Sets Supabase session after OAuth callback.

### Utility Services


| File                                 | Purpose                               |
| ------------------------------------ | ------------------------------------- |
| `src/lib/utils.ts`                   | `cn()` — Tailwind class merge helper  |
| `src/lib/error-page.ts`              | HTML error page for server middleware |
| `src/lib/lovable-error-reporting.ts` | Error reporting to Lovable            |
| `src/lib/error-capture.ts`           | Error capture utility                 |


---

## 7. Existing Hooks

### Data Hooks (`src/lib/farm-store.ts`)


| Hook                 | Returns                               | Query Keys                         |
| -------------------- | ------------------------------------- | ---------------------------------- |
| `useFarmStore()`     | `{ gardens, logs, isLoading }`        | `["gardens"]`, `["logs"]`          |
| `useDiseaseChecks()` | React Query result for disease checks | `["disease_checks"]`               |
| `useFarmActions()`   | Mutation functions object             | — (invalidates queries on success) |


### Weather Hooks (`src/lib/use-weather.ts`)


| Hook            | Returns                                       | Notes                       |
| --------------- | --------------------------------------------- | --------------------------- |
| `useLocation()` | `{ location, status, requestGPS, setManual }` | GPS/manual/default location |
| `useWeather()`  | Weather query + location controls             | 30-min localStorage cache   |


### Shared Hooks (`src/hooks/`)


| Hook            | File             | Purpose                                               |
| --------------- | ---------------- | ----------------------------------------------------- |
| `useIsMobile()` | `use-mobile.tsx` | Returns `true` when viewport < 768px; used by sidebar |


### Hook Usage in Garden Pages

- `gardens.tsx` → `useFarmStore()`, `useFarmActions()`
- `gardens.$gardenId.logs.tsx` → `useFarmStore()` (reads gardens + logs, filters client-side)
- `logs.new.tsx` → `useFarmStore()`, `useFarmActions()`
- `logs.index.tsx` → `useFarmStore()`, `useFarmActions()`
- `index.tsx` (dashboard) → `useFarmStore()`

---

## 8. Reusable Components

### shadcn/ui Primitives (`src/components/ui/`)

46 components installed (new-york style). Key ones used in garden-related pages:


| Component                                                                                                      | Used In                    |
| -------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `Button`                                                                                                       | All pages                  |
| `Card`, `CardContent`, `CardHeader`, `CardTitle`                                                               | Gardens, dashboard, logs   |
| `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`, `DialogTrigger`, `DialogDescription` | Add garden dialog          |
| `AlertDialog` (+ sub-components)                                                                               | Delete garden confirmation |
| `Input`, `Label`, `Textarea`                                                                                   | Garden/log forms           |
| `Badge`                                                                                                        | Crop tags, log counts      |
| `Select` (+ sub-components)                                                                                    | Log filters, form selects  |
| `Sidebar` (+ sub-components)                                                                                   | App layout                 |
| `Tabs` (+ sub-components)                                                                                      | Auth page                  |
| `Sonner` / `Toaster`                                                                                           | Toast notifications (root) |


Full inventory: accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input, input-otp, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toggle, toggle-group, tooltip.

### Design System Utilities


| Utility                 | Location               | Usage                      |
| ----------------------- | ---------------------- | -------------------------- |
| `cn()`                  | `src/lib/utils.ts`     | Conditional class merging  |
| `gradient-primary`      | `src/styles.css`       | Primary button/card accent |
| `text-gradient-primary` | `src/styles.css`       | Gradient text (404 page)   |
| `toast` (sonner)        | Imported from `sonner` | Success/error feedback     |


### Layout Patterns (from `docs/ui-guideline.md`)

```tsx
// Standard page container
<div className="mx-auto max-w-7xl space-y-6 p-6">

// Garden card grid
<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

// Empty state
<Card><CardContent className="flex flex-col items-center justify-center py-16 text-center">
```

### What Is NOT Reusable Yet

- `AddGardenDialog` and `DeleteGardenButton` are private to `gardens.tsx`.
- `StatCard` and `EmptyState` are private to the dashboard.
- No shared `GardenCard` component — garden card markup is inline in `gardens.tsx`.
- No shared form components for garden fields.

---

## 9. Technical Risks

### Garden Module Specific


| Risk                                      | Severity | Details                                                                                                                     |
| ----------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------- |
| **No edit/update garden**                 | High     | `useFarmActions()` supports `addGarden` and `deleteGarden` only. Users cannot edit garden details after creation.           |
| **No dedicated garden detail page**       | Medium   | `/gardens/:gardenId/logs` shows logs only — no garden metadata view, no edit form.                                          |
| **Over-fetching on gardens page**         | Medium   | `useFarmStore()` always fetches both gardens AND all logs, even when only garden list is needed.                            |
| **Client-side filtering**                 | Medium   | Per-garden logs are filtered in-memory from the full logs array, not queried by `garden_id` at the DB level.                |
| **No pagination**                         | Medium   | All gardens and logs loaded at once. Will degrade with large datasets.                                                      |
| **Delete is destructive**                 | Medium   | Deleting a garden cascades to all related logs (by design). UI warns user but no soft-delete or archive.                    |
| **No form validation library on gardens** | Low      | Garden form uses manual validation (`toast.error`) instead of react-hook-form + zod (available but unused on gardens page). |
| **No optimistic updates**                 | Low      | Mutations wait for server response before invalidating queries. UI may feel slow on poor connections.                       |


### Platform / Architecture


| Risk                                         | Severity | Details                                                                                                                                                |
| -------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Lovable platform coupling**                | Medium   | Auto-generated files (`client.ts`, `auth-middleware.ts`, `auth-attacher.ts`, `lovable/index.ts`) should not be edited. Vite config managed by Lovable. |
| **No global error boundary for mutations**   | Low      | Mutation errors caught per-component with `try/catch` + `toast.error`. Inconsistent if a new page forgets error handling.                              |
| **Auth is client-only for protected routes** | Low      | `ssr: false` on authenticated layout means no server-side auth check for page content. Acceptable for MVP but limits SSR benefits.                     |
| **Activity types are app-enforced strings**  | Low      | No DB enum for log types. Typos or new types won't be caught at DB level.                                                                              |
| **Mixed package managers**                   | Low      | Both `bun.lock` and `package-lock.json` exist. Team should standardize on one.                                                                         |


### Out-of-Scope Module Interference


| Risk                                            | Severity | Details                                                                                                                                    |
| ----------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Dashboard mixes garden data with weather/AI** | Low      | Dashboard (`index.tsx`) imports weather and AI components. Garden MVP changes to dashboard stats should avoid touching weather/AI widgets. |
| **Sidebar shows all modules**                   | Low      | Navigation includes weather, AI, diagnose, reports. No feature-flag or route gating for sprint scope.                                      |


---

## 10. Suggestions before Implementing Garden Module

### Understand What Already Exists

Garden Management is **partially implemented**. Before building new features, audit these existing capabilities:

- ✅ List gardens (card grid with crop, area, location, planted date, notes)
- ✅ Create garden (dialog form)
- ✅ Delete garden (with cascade warning)
- ✅ Per-garden log count badge
- ✅ Link to per-garden log history
- ✅ Quick link to create log for a garden
- ❌ Edit/update garden
- ❌ Garden detail page (metadata view)
- ❌ Garden-specific DB queries (filtered server-side)
- ❌ Pagination or search

### Recommended Implementation Priorities

1. **Add `updateGarden` mutation** in `farm-store.ts` and an edit UI (dialog or detail page). This is the most obvious gap for a complete CRUD cycle.
2. **Create a garden detail route** (e.g. `/gardens/:gardenId`) showing garden metadata, stats (log count, total cost, last activity), and links to logs. Currently only `/gardens/:gardenId/logs` exists.
3. **Extract reusable components** before growing the gardens page further:
  - `GardenCard` — card display used in list
  - `GardenForm` — shared between add and edit dialogs
  - `EmptyGardenState` — empty list placeholder
4. **Optimize data fetching** for garden pages:
  - Consider a `useGardens()` hook that fetches only gardens (without logs).
  - Add a `useGardenLogs(gardenId)` hook that queries `activity_logs` filtered by `garden_id` at the Supabase level.
  - Use `select("*, gardens(name)")` joins if displaying garden name on log pages.
5. **Follow existing patterns strictly:**
  - Data access: `useFarmStore()` / `useFarmActions()` in `farm-store.ts`
  - UI: shadcn/ui primitives from `src/components/ui/`
  - Feedback: `toast` from `sonner`
  - Styling: `gradient-primary`, Vietnamese copy, mobile-first layout
  - Types: extend `Garden` in `farm-store.ts`; map snake_case ↔ camelCase
6. **Do not touch out-of-scope modules** during this sprint:
  - Weather (`use-weather.ts`, `weather.functions.ts`, weather components)
  - AI (`ai.functions.ts`, `dashboard-ai.tsx`, assistant/diagnose/reports routes)
  - Do not add new npm packages unless explicitly approved (per `AGENTS.md`)
7. **Database changes:** If new garden fields are needed, follow migration rules in `docs/database.md`:
  - Additive migrations only (no drops)
  - Enable RLS with `"own [table]"` policy
  - Add `updated_at` trigger
  - Regenerate `types.ts`
8. **Test key user flows manually:**
  - Create garden → appears in list → log count shows 0
  - Delete garden → logs cascade-deleted → dashboard stats update
  - Navigate from garden card → per-garden logs → back to list
  - Create log with `?gardenId=` pre-selected from garden card
9. **Read project rules before coding:**
  - `AGENTS.md` — hard rules for AI assistants
  - `.cursor/rules/00-project.mdc` through `09-git.mdc`
  - `docs/ui-guideline.md` — layout and component standards
  - `docs/architecture.md` — system design reference

### Files Most Likely to Change


| File                                                   | Reason                                   |
| ------------------------------------------------------ | ---------------------------------------- |
| `src/lib/farm-store.ts`                                | New mutations, optimized queries, types  |
| `src/routes/_authenticated/gardens.tsx`                | Edit UI, component extraction            |
| `src/routes/_authenticated/gardens.$gardenId.logs.tsx` | May split detail vs. logs                |
| New: `src/components/garden-*.tsx`                     | Extracted reusable garden components     |
| `supabase/migrations/`                                 | Only if new garden columns/tables needed |


### Files to Avoid Modifying


| File                                           | Reason                    |
| ---------------------------------------------- | ------------------------- |
| `src/integrations/supabase/client.ts`          | Auto-generated            |
| `src/integrations/supabase/auth-middleware.ts` | Auto-generated            |
| `src/integrations/supabase/auth-attacher.ts`   | Auto-generated            |
| `src/integrations/lovable/index.ts`            | Auto-generated            |
| `src/routeTree.gen.ts`                         | Auto-generated            |
| `vite.config.ts`                               | Managed by Lovable config |
| Weather, AI, reports, diagnose routes          | Out of sprint scope       |


---

## Quick Reference


| Concern           | Location                                               |
| ----------------- | ------------------------------------------------------ |
| Garden data hooks | `src/lib/farm-store.ts`                                |
| Garden list page  | `src/routes/_authenticated/gardens.tsx`                |
| Per-garden logs   | `src/routes/_authenticated/gardens.$gardenId.logs.tsx` |
| Auth guard        | `src/routes/_authenticated/route.tsx`                  |
| Sidebar nav       | `src/components/app-sidebar.tsx`                       |
| DB schema docs    | `docs/database.md`                                     |
| UI standards      | `docs/ui-guideline.md`                                 |
| Architecture      | `docs/architecture.md`                                 |
| AI coding rules   | `AGENTS.md`, `.cursor/rules/`                          |


