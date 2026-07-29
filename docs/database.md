# FarmGreen Database

Supabase Postgres with Row Level Security (RLS) on all tables. Migrations live in `supabase/migrations/`. TypeScript types are generated in `src/integrations/supabase/types.ts`.

## Schema Overview

```
auth.users
    │
    ├── gardens (1:N)
    │       │
    │       ├── activity_logs (1:N)
    │       └── disease_checks (1:N, optional garden_id)
    │
    ├── activity_logs (1:N, direct user_id)
    ├── disease_checks (1:N)
    └── ai_reports (1:N)
```

All tables scope data to `auth.uid() = user_id` via RLS policies.

## Tables

### `gardens`

User-owned farm plots / garden areas.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | `gen_random_uuid()` |
| `user_id` | UUID FK → auth.users | CASCADE delete |
| `name` | TEXT NOT NULL | Garden name |
| `crop` | TEXT NOT NULL | Crop type (e.g. Cà phê) |
| `area` | NUMERIC DEFAULT 0 | Area in m² |
| `location` | TEXT DEFAULT '' | Location description |
| `planted_at` | DATE NOT NULL | Planting date |
| `notes` | TEXT | Optional notes |
| `created_at` | TIMESTAMPTZ | Auto |
| `updated_at` | TIMESTAMPTZ | Auto via trigger |

**RLS**: `"own gardens"` — ALL operations where `auth.uid() = user_id`

**Index**: `gardens_user_id_idx`

**App mapping**: `Garden` type in `farm-store.ts` (camelCase: `plantedAt`, `createdAt`)

### `activity_logs`

Farm activity journal entries.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK → auth.users | CASCADE delete |
| `garden_id` | UUID FK → gardens | CASCADE delete |
| `type` | TEXT NOT NULL | Activity type (Vietnamese) |
| `date` | DATE NOT NULL | Activity date |
| `note` | TEXT DEFAULT '' | Free-text note |
| `cost` | NUMERIC DEFAULT 0 | Expense in VND |
| `created_at` | TIMESTAMPTZ | Auto |
| `updated_at` | TIMESTAMPTZ | Auto via trigger |

**Activity types** (app-enforced, not DB enum):

```
Tưới nước | Bón phân | Phun thuốc | Gieo trồng | Thu hoạch | Làm cỏ | Khác
```

**RLS**: `"own logs"` — ALL operations where `auth.uid() = user_id`

**Indexes**: `activity_logs_user_id_idx`, `activity_logs_garden_id_idx`

### `disease_checks`

AI plant disease diagnosis records.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID NOT NULL | |
| `garden_id` | UUID FK → gardens | SET NULL on delete, optional |
| `image_url` | TEXT NOT NULL | Currently stores data URL |
| `diagnosis` | TEXT DEFAULT '' | AI diagnosis |
| `confidence` | NUMERIC DEFAULT 0 | 0–1 confidence score |
| `cause` | TEXT DEFAULT '' | Identified cause |
| `recommendation` | TEXT DEFAULT '' | Treatment advice |
| `urgency` | TEXT DEFAULT 'thấp' | thấp / trung bình / cao |
| `created_at` | TIMESTAMPTZ | Auto |
| `updated_at` | TIMESTAMPTZ | Auto via trigger |

**RLS**: `"own disease checks"` — ALL operations where `auth.uid() = user_id`

### `ai_reports`

Monthly AI-generated farm reports.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID NOT NULL | |
| `month` | TEXT NOT NULL | Format: `YYYY-MM` |
| `title` | TEXT DEFAULT '' | Report title |
| `summary` | JSONB DEFAULT `{}` | Activity/cost summary |
| `top_garden` | JSONB | `{ name, cost }` |
| `ai` | JSONB DEFAULT `{}` | AI analysis sections |
| `created_at` | TIMESTAMPTZ | Auto |
| `updated_at` | TIMESTAMPTZ | Auto via trigger |

**RLS**: `"own ai reports"` — ALL operations where `auth.uid() = user_id`

**Index**: `ai_reports_user_created_idx` on `(user_id, created_at DESC)`

## Shared Infrastructure

### `update_updated_at_column()` trigger

Automatically sets `updated_at = now()` on UPDATE for all tables.

### Grants

- `authenticated` role: SELECT, INSERT, UPDATE, DELETE on all public tables
- `service_role`: ALL (never expose service role key to client)

## Migration Rules for AI Assistants

1. **Never drop tables or columns** — use additive migrations only
2. **Always enable RLS** on new tables
3. **Always add user_id** column with RLS policy matching existing pattern
4. **Add updated_at trigger** for new tables
5. **Grant to authenticated and service_role**
6. **Regenerate types** — update `src/integrations/supabase/types.ts` after schema changes
7. **Migration naming**: timestamp-based (Lovable/Supabase convention)

### Example: Adding a Column

```sql
ALTER TABLE public.gardens ADD COLUMN IF NOT EXISTS irrigation_type text DEFAULT '';
```

### Example: New Table Template

```sql
CREATE TABLE public.new_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  -- columns...
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.new_table TO authenticated;
GRANT ALL ON public.new_table TO service_role;
ALTER TABLE public.new_table ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own new_table" ON public.new_table FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_new_table_updated_at BEFORE UPDATE ON public.new_table
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

## Client Access Patterns

| Operation | Where | Method |
|-----------|-------|--------|
| Read gardens/logs | Client | `supabase.from(...).select()` via React Query |
| Insert/update/delete gardens/logs | Client | `supabase.from(...).insert/delete()` via `useFarmActions()` |
| AI operations | Server | `createServerFn` with `requireSupabaseAuth` middleware |
| Auth | Client | `supabase.auth.*` |

Client uses publishable key only. Server functions use publishable key + user's Bearer JWT.

## Environment Variables

| Variable | Scope | Purpose |
|----------|-------|---------|
| `VITE_SUPABASE_URL` | Client + Server | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Client | Public anon/publishable key |
| `SUPABASE_URL` | Server | Same URL for SSR |
| `SUPABASE_PUBLISHABLE_KEY` | Server | Same key for SSR auth middleware |

Never use or expose `SUPABASE_SERVICE_ROLE_KEY` in client code.
