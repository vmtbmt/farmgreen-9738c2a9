# FarmGreen Product Description

## Mission

FarmGreen helps Vietnamese farmers manage their daily farm work with simple, mobile-friendly tools and optional AI assistance. The app is a **working tool** used in the field — not marketing content.

## Target Users

| Persona | Needs |
|---------|-------|
| Smallholder farmers | Track daily activities, remember watering/fertilizing schedules |
| Coffee farmers (Tây Nguyên) | Crop-specific advice, spray timing, disease diagnosis |
| Farm owners | Multi-garden overview, expense tracking, monthly reports |
| Agricultural cooperatives | Shared visibility into farm activity (future) |

Users are typically **not technical**. They use phones outdoors, often with limited connectivity patience. Every screen must be self-explanatory.

## Primary Goals

| Feature | Status | Description |
|---------|--------|-------------|
| Garden Management | ✅ Implemented | Create, view, delete gardens with crop, area, location |
| Multi Garden Support | ✅ Implemented | Multiple gardens per user account |
| Farm Journal | ✅ Implemented | Activity logs with type, date, note, cost |
| Expense Tracking | ✅ Implemented | Cost field on activity logs |
| Weather Monitoring | ✅ Implemented | GPS/manual location, 7-day forecast |
| Watering Schedule | ✅ Partial | Reminders derived from log history (TodayTasks) |
| Fertilizer Schedule | ✅ Partial | 30-day reminder heuristic in TodayTasks |
| AI Agricultural Assistant | ✅ Implemented | Chat modes: farm data + expert knowledge |
| Harvest Management | ✅ Partial | "Thu hoạch" activity type in logs |
| Disease Diagnosis | ✅ Implemented | Photo upload → AI diagnosis |
| AI Monthly Reports | ✅ Implemented | On-demand report generation |
| Spray Timing | ✅ Implemented | Weather-based spray window suggestions |

## User Journeys

### Morning check-in

1. Open app → Dashboard shows weather, today's tasks, recent activity
2. Review weather alert and spray timing widget
3. Optionally tap "Hỏi AI tư vấn hôm nay" for AI summary

### Log an activity

1. Tap "Ghi nhật ký" from sidebar or dashboard
2. Select garden, activity type, date, optional cost and note
3. Save → appears in activity history

### Get expert advice

1. Navigate to "Trợ lý AI"
2. Choose mode: farm data or expert knowledge
3. Type question or tap suggestion chip → send

### Diagnose plant disease

1. Navigate to "Chẩn đoán bệnh"
2. Upload photo, optionally link to garden
3. Tap analyze → view diagnosis, cause, recommendation, urgency

## Design Principles

Always optimize for:

- **Simple UI** — one primary action per screen section
- **Large buttons** — easy to tap with gloves or outdoors
- **Readable typography** — Plus Jakarta Sans, generous line height
- **Mobile-first** — responsive grids, collapsible sidebar
- **Large spacing** — avoid cramped layouts
- **Minimal clicks** — shortcuts from dashboard to common actions
- **Friendly language** — Vietnamese, conversational tone
- **Green color palette** — oklch greens in `src/styles.css`
- **Card-based layout** — content grouped in Cards
- **Avoid dashboard clutter** — no unnecessary charts or metrics
- **Avoid unnecessary charts** — simple bar indicators over complex visualizations

## What FarmGreen Is NOT

- ❌ A marketing landing page
- ❌ An e-commerce or marketplace
- ❌ A complex ERP or accounting system
- ❌ A real-time IoT sensor dashboard (future consideration)

## Localization

- **UI language**: Vietnamese (vi)
- **HTML lang**: `vi` (set in `__root.tsx`)
- **Date/number formatting**: `vi-VN` locale
- **Crop focus**: Tây Nguyên — coffee, durian, pepper, fruit trees
- **Default weather location**: Buôn Ma Thuột (12.6667, 108.05)

## Success Metrics (Product-Level)

- User can log an activity in under 30 seconds
- Dashboard answers "what should I do today?" at a glance
- AI features are opt-in and clearly labeled
- App works on mobile viewport (375px+) without horizontal scroll
