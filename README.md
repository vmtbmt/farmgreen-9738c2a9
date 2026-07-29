# FarmGreen — Nông Trại Xanh

AI-powered farm management platform designed for Vietnamese farmers. A daily working tool for garden management, weather monitoring, farm journals, expense tracking, schedules, and AI agricultural assistance.

> **Not** a landing page. **Not** e-commerce. Built for farmers who need simple, mobile-first tools.

## Features

- **Garden Management** — Multi-garden support with crop, area, and location tracking
- **Farm Journal** — Activity logs (watering, fertilizing, spraying, harvest, etc.)
- **Expense Tracking** — Cost per activity log
- **Weather Monitoring** — GPS-based forecasts via Open-Meteo
- **AI Assistant** — Chat with farm data or expert agricultural knowledge
- **Disease Diagnosis** — Image-based plant disease analysis
- **AI Reports** — Monthly farm summaries
- **Task Suggestions** — Watering, fertilizing, and spray reminders from log history

## Tech Stack

- [TanStack Start](https://tanstack.com/start) + React 19 + TypeScript
- [TanStack Router](https://tanstack.com/router) (file-based routing)
- [TanStack React Query](https://tanstack.com/query)
- [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- [Supabase](https://supabase.com) (Auth, Postgres, RLS)
- Lovable AI Gateway (Gemini)

## Getting Started

Requires Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd farmgreen-9738c2a9
npm i
npm run dev
```

Connect Supabase and set `LOVABLE_API_KEY` via [Lovable Cloud](https://lovable.dev) or local environment variables.

## Project Structure

```
src/routes/              Pages (TanStack file-based routing)
src/components/          Feature components
src/components/ui/       shadcn/ui components
src/lib/                 Hooks, server functions, utilities
src/integrations/        Supabase, Lovable auth
supabase/migrations/     Database migrations
docs/                    Architecture, product, and AI documentation
.cursor/rules/           Cursor AI rules
```

See [`docs/architecture.md`](docs/architecture.md) for full system design.

## Documentation

| Document | Description |
|----------|-------------|
| [AGENTS.md](AGENTS.md) | Guide for AI coding assistants |
| [docs/product.md](docs/product.md) | Product goals and personas |
| [docs/architecture.md](docs/architecture.md) | Technical architecture |
| [docs/ui-guideline.md](docs/ui-guideline.md) | UI/UX standards |
| [docs/database.md](docs/database.md) | Database schema |
| [docs/api.md](docs/api.md) | Server functions and APIs |
| [docs/roadmap.md](docs/roadmap.md) | Feature roadmap |
| [docs/prompt-library.md](docs/prompt-library.md) | AI prompt templates |

## Lovable Integration

This project is connected to [Lovable](https://lovable.dev). Changes pushed to the connected branch sync back to the Lovable editor.

- Open in [Lovable editor](https://lovable.dev) for prompt-based development
- Avoid force-pushing or rewriting published git history (see [AGENTS.md](AGENTS.md))

## Scripts

```sh
npm run dev       # Development server
npm run build     # Production build
npm run lint      # ESLint
npm run format    # Prettier
```
