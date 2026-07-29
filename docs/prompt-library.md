# FarmGreen Prompt Library

Reusable prompts for AI coding assistants working on this project. Copy and adapt these when starting tasks.

---

## General Task Prompt

```
You are working on FarmGreen — an AI-powered farm management app for Vietnamese farmers.

Rules:
- Read AGENTS.md and relevant docs/ files before making changes
- Do NOT modify application logic, UI, or schema unless the task requires it
- Reuse existing shadcn/ui components from src/components/ui/
- All UI text must be in Vietnamese
- AI features must be button-triggered only (never auto-call on page load)
- Never drop database tables or columns
- Follow patterns in src/lib/farm-store.ts for data hooks

Task: [DESCRIBE TASK HERE]
```

---

## Add a New Page

```
Add a new authenticated page to FarmGreen at route /[ROUTE_NAME].

Requirements:
1. Create src/routes/_authenticated/[route-name].tsx following TanStack Router file conventions
2. Add navigation item to src/components/app-sidebar.tsx
3. Use authenticated layout (already provided by _authenticated/route.tsx)
4. Follow UI patterns from docs/ui-guideline.md:
   - Page container: mx-auto max-w-7xl space-y-6 p-4 sm:p-6
   - Card-based layout
   - Vietnamese labels
   - Loading, error, and empty states
5. Do NOT edit routeTree.gen.ts (auto-generated)
6. Set page meta via Route head() function

Feature description: [DESCRIBE FEATURE]
```

---

## Add a Database Column

```
Add a new column to the [TABLE_NAME] table in FarmGreen.

Rules:
- Create a new migration in supabase/migrations/ (additive only, no drops)
- Enable RLS if creating a new table
- Update src/integrations/supabase/types.ts with the new column
- Update the mapping function in src/lib/farm-store.ts if needed
- Update the UI form in the relevant route file
- Do NOT remove or rename existing columns

Column details:
- Name: [COLUMN_NAME]
- Type: [TYPE]
- Default: [DEFAULT]
- Purpose: [WHY]
```

---

## Add an AI Feature

```
Add a new AI-powered feature to FarmGreen.

CRITICAL AI RULES:
- AI must ONLY execute when user presses an explicit button
- Never call AI in useEffect, on page load, on navigation, or on refresh
- Server function goes in src/lib/ai.functions.ts
- Use requireSupabaseAuth middleware
- Use Zod for input validation
- Use LOVABLE_API_KEY server-side only (never expose to client)
- Model: google/gemini-3.6-flash via Lovable AI Gateway
- Handle 429 and 402 errors with Vietnamese messages
- Show loading, error, and success states in UI
- Reference DashboardAI component (src/components/dashboard-ai.tsx) as the pattern

Feature: [DESCRIBE AI FEATURE]
User trigger: [BUTTON LABEL AND ACTION]
```

---

## Fix a Bug

```
Fix a bug in FarmGreen without changing unrelated code.

Process:
1. Read the relevant route file and components
2. Identify root cause
3. Apply minimal fix — do not refactor surrounding code
4. Preserve existing UI design and Vietnamese copy
5. Ensure loading/error/empty states still work

Bug description: [DESCRIBE BUG]
Expected behavior: [EXPECTED]
Current behavior: [ACTUAL]
File(s) involved: [FILES IF KNOWN]
```

---

## Add a Form / CRUD Feature

```
Add CRUD functionality for [ENTITY] in FarmGreen.

Patterns to follow:
- Data hooks: src/lib/farm-store.ts (useQuery + useFarmActions pattern)
- Forms: react-hook-form + zod (if complex) or controlled useState (if simple)
- UI: Dialog for create, AlertDialog for delete confirmation
- Toast feedback: sonner (toast.success / toast.error)
- Supabase: direct client calls with RLS (no server function needed for simple CRUD)
- Invalidate React Query keys after mutations

Reference implementation: src/routes/_authenticated/gardens.tsx

Entity details: [DESCRIBE ENTITY AND FIELDS]
```

---

## Improve Performance

```
Optimize performance for [AREA] in FarmGreen.

Allowed techniques:
- React.memo / useMemo / useCallback where renders are expensive
- React Query staleTime / gcTime configuration
- Lazy loading routes or heavy components
- localStorage caching (see use-weather.ts pattern)
- Code splitting via dynamic import

Do NOT:
- Change UI design
- Add new dependencies
- Over-engineer with unnecessary abstractions

Target: [DESCRIBE SLOW AREA]
```

---

## UI Copy / Localization

```
Update UI text in FarmGreen to Vietnamese.

Rules:
- Friendly, plain language for non-technical farmers
- Use vi-VN locale for dates and numbers
- Keep emoji sparingly (👋 🌱 acceptable for warmth)
- Error messages: explain what happened + what to do
- Button labels: action-oriented ("Ghi nhật ký", not "Submit")

Changes needed: [LIST TEXT CHANGES]
```

---

## Code Review Checklist Prompt

```
Review this FarmGreen change for:

- [ ] Scope: only changes related to the task
- [ ] UI: Vietnamese text, mobile-friendly, card layout
- [ ] AI: no automatic API calls
- [ ] Database: no dropped tables/columns, RLS maintained
- [ ] Types: no unnecessary `any`, proper Zod validation
- [ ] Components: reuses shadcn/ui, no duplicates
- [ ] Routing: no broken routes, routeTree.gen.ts untouched
- [ ] States: loading, error, empty, success handled
- [ ] Secrets: no API keys in client code
```

---

## System Prompts (Runtime — Do Not Modify Without Reason)

These are the AI prompts used at runtime in server functions. Documented here for assistant awareness.

### Farm Assistant (`ai.functions.ts`)

```
Bạn là trợ lý nông trại AI cá nhân. Trả lời NGẮN GỌN, RÕ RÀNG bằng tiếng Việt,
dựa CHÍNH XÁC trên dữ liệu khu vườn và nhật ký của người dùng.
```

### Expert Mode (`ai.functions.ts`)

```
Bạn là CHUYÊN GIA NÔNG NGHIỆP TÂY NGUYÊN, chuyên sâu về cà phê, sầu riêng,
hồ tiêu và cây ăn trái, ưu tiên điều kiện canh tác tại Đắk Lắk, Lâm Đồng, Gia Lai.
```

### Disease Diagnosis (`ai.functions.ts`)

```
Bạn là chuyên gia bệnh cây trồng Tây Nguyên (cà phê, sầu riêng, hồ tiêu, cây ăn trái).
Quan sát ảnh và chẩn đoán. Trả JSON: diagnosis, confidence, cause, recommendation, urgency.
```

### Log Parser (`ai-parse.functions.ts`)

```
Bạn là trợ lý phân tích nhật ký nông trại tiếng Việt.
Trích xuất: activity_type, quantity, material, field_name.
activity_type thuộc: Tưới nước, Bón phân, Phun thuốc, Gieo trồng, Thu hoạch, Làm cỏ, Khác.
```
