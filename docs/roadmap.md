# FarmGreen Roadmap

This roadmap reflects current implementation status and planned direction. AI assistants should treat **✅ Done** items as existing behavior to preserve, not redesign.

## Phase 1 — Core Farm Tool ✅ (Current)

| Item | Status | Notes |
|------|--------|-------|
| Auth (email + Google) | ✅ Done | `/auth` |
| Multi-garden CRUD | ✅ Done | `/gardens` |
| Activity journal | ✅ Done | `/logs`, `/logs/new` |
| Expense on logs | ✅ Done | `cost` column |
| Dashboard overview | ✅ Done | Stats, recent activity, task widgets |
| Weather widget | ✅ Done | Open-Meteo, GPS + manual location |
| Sidebar navigation | ✅ Done | `app-sidebar.tsx` |

## Phase 2 — AI Features ✅ (Current)

| Item | Status | Notes |
|------|--------|-------|
| AI chat assistant | ✅ Done | Farm + expert modes |
| Dashboard AI analysis | ✅ Done | Button-triggered only |
| Disease diagnosis | ✅ Done | Image upload → Gemini |
| Monthly AI reports | ✅ Done | Generate + history + Excel export |
| Natural language log parsing | 🔧 Backend only | `parseFarmLog` exists, not wired to UI |

## Phase 3 — Smart Schedules 🔜 (Partial)

| Item | Status | Notes |
|------|--------|-------|
| Watering reminders | ✅ Heuristic | 3-day threshold in TodayTasks |
| Fertilizer reminders | ✅ Heuristic | 30-day threshold |
| Spray reminders | ✅ Heuristic | 14-day threshold |
| Dedicated schedule pages | 🔜 Planned | User-configurable intervals per garden/crop |
| Push notifications | 🔜 Planned | Requires service worker / mobile app |
| Calendar view | 🔜 Planned | Visual schedule for upcoming tasks |

## Phase 4 — Harvest & Analytics 🔜

| Item | Status | Notes |
|------|--------|-------|
| Harvest tracking | 🔧 Partial | Activity type only, no yield quantity |
| Yield per garden | 🔜 Planned | Requires schema extension |
| Season comparison | 🔜 Planned | Year-over-year stats |
| Cost breakdown charts | 🔜 Planned | Keep simple — avoid dashboard clutter |

## Phase 5 — Collaboration 🔜

| Item | Status | Notes |
|------|--------|-------|
| Shared gardens | 🔜 Planned | Multi-user access per garden |
| Cooperative dashboards | 🔜 Planned | Aggregate view for cooperatives |
| Role-based access | 🔜 Planned | Owner vs worker roles |

## Technical Debt & Improvements

| Item | Priority | Notes |
|------|----------|-------|
| Wire `parseFarmLog` to journal UI | Medium | Voice/text quick entry |
| Extract service layer from `farm-store.ts` | Low | Separate fetch functions from hooks |
| Add React Query mutation hooks | Low | Replace inline invalidation pattern |
| Test coverage | Medium | No test framework configured yet |
| Offline support | Low | Cache critical data for field use |
| Image storage for disease checks | Medium | Currently stores data URL in DB |

## Guidelines for AI Assistants Working on Roadmap Items

1. **Check status** — do not rebuild features marked ✅ Done
2. **Schema changes** — create new migrations; never drop columns
3. **AI features** — always button-triggered; never auto-call on load
4. **UI additions** — follow [`ui-guideline.md`](ui-guideline.md)
5. **Scope** — implement one roadmap item per task unless asked otherwise
