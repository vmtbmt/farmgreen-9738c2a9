# FarmGreen UI Guidelines

Design standards for all UI work. FarmGreen serves non-technical Vietnamese farmers working outdoors on mobile devices.

## Design Philosophy

**Simple over smart. Clear over clever.**

Every screen should answer one question at a time. Avoid dashboard clutter, dense data tables, and unnecessary charts.

## Color Palette

Defined in `src/styles.css` using oklch color space. Primary theme is **green**.

| Token | Usage |
|-------|-------|
| `--primary` | Buttons, accents, icons (oklch green ~145°) |
| `--primary-glow` | Gradient end color |
| `--background` | Page background (light green tint) |
| `--foreground` | Body text |
| `--muted-foreground` | Secondary text, hints |
| `--accent` | Highlight backgrounds (task badges, icon circles) |
| `--destructive` | Errors, danger alerts |
| `--sidebar-*` | Dark green sidebar theme |

### Utility Classes

```css
gradient-primary      /* Primary button gradient background */
text-gradient-primary /* Gradient text (404 page, headings) */
```

Use `gradient-primary text-primary-foreground` for primary CTAs.

## Typography

- **Font**: Plus Jakarta Sans (loaded in `__root.tsx`)
- **Headings**: `text-3xl font-bold tracking-tight` for page titles
- **Body**: Default size with `text-muted-foreground` for descriptions
- **Labels**: `text-sm` with `Label` component from shadcn/ui

Keep text **large enough to read outdoors**. Avoid `text-xs` for primary content.

## Layout

### Page Container

```tsx
<div className="mx-auto w-full max-w-7xl space-y-6 overflow-x-hidden p-4 sm:p-6">
```

Dashboard uses `max-w-7xl`. Forms use `max-w-3xl`.

### Grid Patterns

```tsx
// Stats row
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

// Two-column content
<div className="grid gap-6 lg:grid-cols-2">

// Sidebar + content (authenticated layout)
<div className="flex min-h-screen w-full">
  <AppSidebar />
  <main className="min-w-0 flex-1 overflow-x-hidden">
```

### Spacing

- Section gaps: `space-y-6`
- Card internal padding: `p-5` or `CardContent` defaults
- Between form fields: `space-y-4`
- Generous whitespace — when in doubt, add more

## Components

### Use shadcn/ui

All UI primitives live in `src/components/ui/`. **Never recreate** Button, Card, Dialog, etc.

| Component | Common Usage |
|-----------|-------------|
| `Card` | Content sections, stat blocks |
| `Button` | Actions — use `size="lg"` for primary outdoor-friendly buttons |
| `Badge` | Activity types, status labels |
| `Dialog` / `AlertDialog` | Create/edit forms, destructive confirmations |
| `Select` | Dropdowns (garden picker, activity type) |
| `Accordion` | Collapsible detail sections (AI results) |
| `Sidebar` | App navigation |

Style variant: **new-york** (see `components.json`).

### Icons

Use **lucide-react** icons consistently:

| Icon | Meaning |
|------|---------|
| `Sprout` | Gardens |
| `NotebookPen` | Journal / logs |
| `CloudSun` | Weather |
| `Sparkles` | AI features |
| `Stethoscope` | Disease diagnosis |
| `Leaf` | Brand logo |

Pair icons with text labels — never icon-only buttons without tooltips.

## Component Patterns

### Stat Card

```tsx
<Card>
  <CardContent className="p-5">
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="mt-2 text-3xl font-bold">{value}</p>
    <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
  </CardContent>
</Card>
```

### Empty State

Center content with dashed border, title, description, and optional action button. See `EmptyState` in `_authenticated/index.tsx`.

### Loading State

Use `Loader2` with `animate-spin` and descriptive Vietnamese text:

```tsx
<Loader2 className="h-8 w-8 animate-spin text-primary" />
<p className="text-sm text-muted-foreground">Đang tải...</p>
```

### Error State

Red-tinted border/background with retry button:

```tsx
<div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
```

## Mobile-First Rules

1. **Touch targets**: Minimum 44px height for buttons (`size="lg"` or `h-11`)
2. **No horizontal scroll**: Use `overflow-x-hidden`, `min-w-0`, `truncate`
3. **Responsive grids**: Start single column, expand at `sm:` and `lg:` breakpoints
4. **Collapsible sidebar**: Icon-only mode on small screens via shadcn Sidebar
5. **Sticky header**: Authenticated layout has `sticky top-0` header with sidebar trigger

## Language & Tone

- All UI text in **Vietnamese**
- Friendly, direct: "Xin chào, Nông dân 👋" not "Welcome, User"
- Error messages explain what happened and what to do: "Vui lòng chọn khu vườn."
- Toast messages via `sonner`: `toast.success(...)`, `toast.error(...)`

## What to Avoid

- ❌ Dense data tables for primary views
- ❌ Complex chart libraries for simple counts (use progress bars instead)
- ❌ Multiple primary buttons competing for attention
- ❌ English UI labels
- ❌ Small tap targets (`size="sm"` as primary action)
- ❌ Dark patterns or hidden AI auto-triggers
- ❌ Redesigning unrelated pages when fixing a bug

## Reference Screens

| Screen | File | Good Patterns |
|--------|------|---------------|
| Dashboard | `src/routes/_authenticated/index.tsx` | Stats, empty states, card layout |
| AI widget | `src/components/dashboard-ai.tsx` | Button-triggered AI, loading/error/success |
| Gardens | `src/routes/_authenticated/gardens.tsx` | Dialog forms, card grid |
| Auth | `src/routes/auth.tsx` | Centered card, tabs |
