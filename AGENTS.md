<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# FarmGreen — AI Agent Guide

This document orients AI coding assistants (Cursor, Claude Code, GitHub Copilot, ChatGPT) working on **FarmGreen** — an AI-powered farm management platform for Vietnamese farmers.

## What This Project Is

FarmGreen is a **daily working tool**, not a landing page or e-commerce site. Users are farmers, coffee growers, farm owners, and agricultural cooperatives — usually **not technical**. Optimize for clarity, simplicity, and mobile-first UX.

See also: [`docs/product.md`](docs/product.md), [`docs/architecture.md`](docs/architecture.md).

## Tech Stack (Do Not Change Without Request)

| Layer | Technology |
|-------|------------|
| Framework | TanStack Start + React 19 |
| Routing | TanStack Router (file-based, `src/routes/`) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 + shadcn/ui (new-york) |
| Data fetching | TanStack React Query |
| Backend / DB | Supabase (Auth + Postgres + RLS) |
| Server logic | TanStack Start `createServerFn` in `src/lib/*.functions.ts` |
| AI gateway | Lovable AI Gateway (`LOVABLE_API_KEY`, Gemini) |
| Weather | Open-Meteo + Nominatim (server-side) |

## Folder Structure

```
src/
  routes/           # Pages (TanStack file-based routing)
  components/       # Feature components
  components/ui/    # shadcn/ui primitives — reuse, don't duplicate
  lib/              # Hooks, server functions, utilities
  integrations/     # Supabase client, Lovable auth
  hooks/            # Shared React hooks
supabase/migrations/  # Database migrations
docs/               # Project documentation for humans and AI
.cursor/rules/      # Cursor-specific rule files
```

**Never rename folders. Never break routing.** `routeTree.gen.ts` is auto-generated — do not edit manually.

## Hard Rules for AI Assistants

### Scope

- Reuse existing components; prefer editing over duplicating.
- Never redesign unrelated pages.
- Never change API contracts or database schema unless explicitly requested.
- Do not install packages unless explicitly requested.
- Do not refactor existing features as part of unrelated tasks.

### AI Cost Control

AI calls are expensive. **Never call AI automatically.**

- ✅ Only after the user presses an explicit button (e.g. "Hỏi AI tư vấn hôm nay", "Phân tích với AI", "Gửi", "Tạo báo cáo").
- ❌ Never on page load, refresh, navigation, or inside `useEffect` without user interaction.
- Cache AI responses when appropriate (see `use-weather.ts` for a caching pattern).

Server functions that call AI live in `src/lib/ai.functions.ts` and `src/lib/ai-parse.functions.ts`.

### Supabase

- Never drop tables or remove columns.
- Prefer new migrations in `supabase/migrations/`.
- RLS is enabled on all tables — maintain user-scoped policies.
- Never expose service role keys; use publishable key + user JWT only.

### Language & UX

- UI copy is **Vietnamese**.
- Use friendly, plain language.
- Follow design principles in [`docs/ui-guideline.md`](docs/ui-guideline.md).

## Key Entry Points

| Concern | Location |
|---------|----------|
| Data hooks (gardens, logs) | `src/lib/farm-store.ts` |
| AI server functions | `src/lib/ai.functions.ts` |
| Weather | `src/lib/weather.functions.ts`, `src/lib/use-weather.ts` |
| Auth layout | `src/routes/_authenticated/route.tsx` |
| Sidebar navigation | `src/components/app-sidebar.tsx` |
| DB types | `src/integrations/supabase/types.ts` |
| Theme / colors | `src/styles.css` |

## Documentation Index

| File | Purpose |
|------|---------|
| [`docs/architecture.md`](docs/architecture.md) | System design and data flow |
| [`docs/product.md`](docs/product.md) | Product goals and user personas |
| [`docs/roadmap.md`](docs/roadmap.md) | Planned features |
| [`docs/ui-guideline.md`](docs/ui-guideline.md) | Visual and UX standards |
| [`docs/database.md`](docs/database.md) | Schema, RLS, migrations |
| [`docs/api.md`](docs/api.md) | Server functions and external APIs |
| [`docs/prompt-library.md`](docs/prompt-library.md) | Reusable prompts for AI assistants |

## Local Development

```sh
npm i
npm run dev
```

Required env vars (via Lovable Cloud or `.env`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `LOVABLE_API_KEY`.
