# FarmGreen API Reference

Server functions (TanStack Start `createServerFn`) and external API integrations.

## Server Functions

All server functions live in `src/lib/*.functions.ts`. Client components call them via `useServerFn()` from `@tanstack/react-start`.

### Authentication Middleware

Functions marked 🔒 use `requireSupabaseAuth` middleware (`src/integrations/supabase/auth-middleware.ts`):

- Validates `Authorization: Bearer <jwt>` header
- Creates authenticated Supabase client scoped to the user
- Injects `{ supabase, userId, claims }` into handler context

---

### AI Functions (`src/lib/ai.functions.ts`)

Gateway: `https://ai.gateway.lovable.dev/v1/chat/completions`
Model: `google/gemini-3.6-flash`
Auth: `LOVABLE_API_KEY` (server env only)

#### `chatWithAssistant` 🔒 POST

AI chat assistant with two modes.

**Input** (Zod validated):
```typescript
{
  mode: "farm" | "expert",
  messages: Array<{ role: "user" | "assistant", content: string }>
}
```

**Behavior**:
- `"farm"` mode: loads user's gardens + logs, injects into system prompt
- `"expert"` mode: Tây Nguyên agricultural expert prompt (coffee, durian, pepper)

**Output**: `{ content: string }`

**Trigger**: User sends message in `/assistant` page

---

#### `generateMonthlyReport` 🔒 POST

Generates and persists a monthly AI report.

**Input**: None (uses authenticated user's data)

**Behavior**:
1. Loads gardens and logs
2. Computes monthly summary (activities, costs by type)
3. Calls Gemini for JSON analysis
4. Saves to `ai_reports` table

**Output**:
```typescript
{
  id: string,
  created_at: string,
  month: string,        // "YYYY-MM"
  title: string,
  summary: { total_activities, watering, fertilizing, spraying, total_cost },
  topGarden: { name, cost } | null,
  ai: { overview, observations[], risks[], recommendations[] }
}
```

**Trigger**: User clicks generate button on `/reports` page

---

#### `listReports` 🔒 GET

Lists user's saved AI reports.

**Output**: Array of report objects (same shape as generate, minus full detail)

**Trigger**: Page load on `/reports` (reads DB only, no AI call)

---

#### `deleteReport` 🔒 POST

**Input**: `{ id: string (UUID) }`

**Output**: `{ ok: true }`

**Trigger**: User confirms delete in reports history

---

#### `diagnoseDisease` 🔒 POST

Image-based plant disease diagnosis.

**Input**:
```typescript
{
  imageDataUrl: string,  // must start with "data:image/"
  gardenId?: string | null  // optional UUID
}
```

**Output**: Inserted `disease_checks` row

**Trigger**: User uploads image and taps analyze on `/diagnose`

---

#### `analyzeFarm` 🔒 POST

Dashboard farm analysis (rule-based, no Gemini call).

**Input**: None

**Output**:
```typescript
{
  summary: {
    activities_this_month: number,
    total_cost: number,
    top_activity_garden: string | null,
    top_cost_garden: string | null
  },
  recommendations: string[],
  alerts: Array<{ level: "warn" | "danger", message: string }>
}
```

**Trigger**: User clicks "Hỏi AI tư vấn hôm nay" on dashboard

> Note: Despite the AI branding, this function currently uses heuristic rules, not Gemini. The name reflects the UI context.

---

### Parse Functions (`src/lib/ai-parse.functions.ts`)

#### `parseFarmLog` POST

Parses natural language Vietnamese farm log text into structured fields.

**Input**: `{ text: string }`

**Output**:
```typescript
{
  activity_type: string,
  quantity: string,
  material: string,
  field_name: string
}
```

**Auth**: No auth middleware (should be added if wired to UI)

**Status**: Backend ready, not connected to UI yet

---

### Weather Functions (`src/lib/weather.functions.ts`)

#### `getWeather` POST

Fetches weather forecast from Open-Meteo.

**Input**:
```typescript
{ latitude: number, longitude: number }
```

**Output**: `WeatherResult` with current conditions, hourly (full array), and daily (7 days)

**External APIs**:
- Forecast: `https://api.open-meteo.com/v1/forecast`
- Geocoding: `https://nominatim.openstreetmap.org/reverse`

**Caching**: Client-side via `use-weather.ts` (30-minute TTL in localStorage)

---

## Client-Side Supabase API

Direct table access from the browser (RLS enforced):

| Table | Operations | Hook/Action |
|-------|-----------|-------------|
| `gardens` | SELECT, INSERT, DELETE | `useFarmStore`, `useFarmActions` |
| `activity_logs` | SELECT, INSERT, DELETE | `useFarmStore`, `useFarmActions` |
| `disease_checks` | SELECT, DELETE | `useDiseaseChecks`, `useFarmActions` |

### React Query Keys

| Key | Data |
|-----|------|
| `["gardens"]` | All user gardens |
| `["logs"]` | All user activity logs |
| `["disease_checks"]` | All disease diagnoses |
| `["weather", lat, lon]` | Weather for coordinates |

Mutations invalidate relevant keys via `queryClient.invalidateQueries()`.

---

## Auth API

Via Supabase Auth (`src/integrations/supabase/client.ts`):

| Method | Usage |
|--------|-------|
| `signInWithPassword` | Email login |
| `signUp` | Email registration |
| `signOut` | Logout |
| `getUser` | Session check |
| `onAuthStateChange` | Auth state listener |

Google OAuth via Lovable: `lovable.auth.signInWithOAuth("google")` in `src/integrations/lovable/`.

---

## Error Handling

| HTTP/Code | AI Gateway Message |
|-----------|-------------------|
| 429 | "AI đang quá tải, vui lòng thử lại sau." |
| 402 | "Đã hết tín dụng AI. Vui lòng nạp thêm." |
| Other | `"AI lỗi [status]: ..."` |

Server functions throw `Error` with Vietnamese messages. Client catches and shows via `toast.error()` or inline error UI.

---

## Rules for AI Assistants

1. **Never change function signatures** without explicit request
2. **New server functions** go in `src/lib/*.functions.ts` with Zod input validation
3. **AI functions** must use `requireSupabaseAuth` middleware
4. **Never expose** `LOVABLE_API_KEY` to client code
5. **Never auto-call** AI functions — always user-triggered
6. **Prefer extending** existing functions over creating duplicates
