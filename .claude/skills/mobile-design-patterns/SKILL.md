# Mobile & Tablet Design Patterns

Guidelines for building mobile/tablet-friendly pages in this Next.js + Tailwind codebase. Staff use tablets (iPad) and phones daily, so mobile-first is critical.

## When to Use

Apply these patterns whenever creating or modifying pages, especially:
- Staff-facing forms (vendor receipts, cash check, inventory, bookings)
- POS interfaces (tablet-primary)
- Any page used on mobile during daily operations

## Root Layout Context

The root layout (`app/layout.tsx`) already provides:
```
<div className="min-h-screen bg-background flex flex-col">
  <Nav />
  <main className="flex-1">{children}</main>
</div>
```
Every page renders inside `<main className="flex-1">`. Do NOT duplicate `min-h-screen` or `bg-background`.

---

## Page Wrapper Patterns

### Pattern 1: Mobile-First Form (Single Column)
For simple staff forms (vendor receipts, cash check, lead feedback).

```tsx
// DO - flat, no Card wrapper
<div className="mx-auto max-w-lg px-4 py-6 sm:px-6">
  <h1 className="text-xl font-semibold tracking-tight">Page Title</h1>
  <div className="mt-4 space-y-4">
    {/* form fields directly - no Card wrapper */}
  </div>
</div>
```

```tsx
// DON'T - double container with Card
<div className="container mx-auto py-6 px-4 max-w-md">
  <Card>
    <CardHeader><CardTitle>Page Title</CardTitle></CardHeader>
    <CardContent>
      {/* adds unnecessary padding + border on mobile */}
    </CardContent>
  </Card>
</div>
```

**Why**: On mobile, `container` adds padding, then `Card` adds border + more padding = wasted space and visual noise. Use Card only when the content is one section among several, not when it IS the page.

### Pattern 2: Full-Width Immersive (Time Clock, POS)
For tablet-primary interfaces that need max screen real estate.

```tsx
<div className="min-h-full">
  <ComponentThatOwnsItsLayout />
</div>
```

### Pattern 3: Admin Dashboard (Wide Content)
For admin pages with tables, charts, multiple sections.

```tsx
<div className="container mx-auto px-3 py-4 sm:px-4 sm:py-6 space-y-4 sm:space-y-6">
  {/* Cards are OK here - they separate distinct sections */}
</div>
```

### Pattern 4: Responsive Padding Progression
Use this consistent padding scale across breakpoints:

```
Mobile:  px-3 py-4   or  px-4 py-6
Tablet:  sm:px-4 sm:py-6  or  sm:px-6 sm:py-8
Desktop: lg:px-8
```

---

## Container Width Guide

| Use Case | Class | Width | Example Pages |
|---|---|---|---|
| Mobile form | `max-w-lg` | 512px | vendor-receipts, cash-check |
| Settings form | `max-w-xl` | 576px | coaching availability |
| Content page | `max-w-2xl` | 672px | reprint-receipt |
| Multi-column | `max-w-4xl` | 896px | inventory |
| Dashboard | `max-w-[1400px]` | 1400px | bank-reconciliation |
| Wide admin | `max-w-[1600px]` | 1600px | expense-tracker admin |

Prefer `max-w-lg` over `max-w-md` for mobile forms - the extra 64px helps on tablets without hurting phone layout.

---

## Anti-Patterns to Avoid

### 1. Card-as-Page-Wrapper
```tsx
// BAD - Card wrapping the entire page content
<Card>
  <CardHeader><CardTitle>Title</CardTitle></CardHeader>
  <CardContent>{/* entire form */}</CardContent>
</Card>

// GOOD - Title + fields directly, Card only for subsections
<h1 className="text-xl font-semibold tracking-tight">Title</h1>
<div className="space-y-4">{/* form fields */}</div>
```

**When Card IS appropriate**: Multiple distinct sections on one page (e.g., KPI cards in dashboards, settings tabs, separate data panels).

### 2. Nested Cards
```tsx
// BAD - Card inside Card
<Card>
  <CardContent>
    <Card>{/* inner content */}</Card>
  </CardContent>
</Card>

// GOOD - Use dividers or simple borders
<div className="divide-y">
  {items.map(item => <div className="py-3" key={item.id}>...</div>)}
</div>
```

### 3. Fixed Container + Max Width + Card
```tsx
// BAD - triple nesting of containers
<div className="container mx-auto px-4">
  <div className="max-w-md mx-auto">
    <Card>...</Card>
  </div>
</div>

// GOOD - single constraint
<div className="mx-auto max-w-lg px-4 py-6 sm:px-6">
  {/* content directly */}
</div>
```

---

## Touch-Friendly Interactive Elements

### Minimum Tap Targets
Apple/Google recommend minimum 44x44px touch targets. This codebase provides utility classes:

```css
.touch-target { min-height: 44px; min-width: 44px; }
.mobile-touch-target { min-height: 48px; min-width: 48px; } /* phones only */
.tablet-touch-target { min-height: 44px; min-width: 44px; } /* 768-1024px */
```

### Touch Optimization
```tsx
// For interactive elements on touch screens
className="touch-manipulation"  // Removes 300ms click delay

// For buttons that should not trigger text selection
className="touch-target tap-highlight no-select"
```

### Responsive Button Sizing
```tsx
// Mobile-larger, desktop-normal buttons
className="h-12 sm:h-10 text-base sm:text-sm px-4 sm:px-3"

// Full-width on mobile, auto on desktop
className="w-full sm:w-auto"
```

---

## Lists & Collections on Mobile

### Simple Divided List (Preferred for Recent Items)
```tsx
<div className="divide-y">
  {items.map(item => (
    <div key={item.id} className="flex items-center gap-3 py-3 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{item.title}</p>
        <p className="text-xs text-muted-foreground">{item.subtitle}</p>
      </div>
      <ActionIcon className="h-4 w-4 shrink-0" />
    </div>
  ))}
</div>
```

### Collapsible Section
```tsx
<Button
  variant="ghost"
  className="w-full justify-between text-muted-foreground"
  onClick={() => setExpanded(!expanded)}
>
  <span className="text-sm">Section Title ({count})</span>
  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
</Button>
{expanded && <div className="mt-2 divide-y">{/* items */}</div>}
```

---

## Form Field Spacing

```tsx
// Standard form layout
<div className="space-y-4">
  <div className="space-y-2">
    <Label>Field Name *</Label>
    <Input ... />
  </div>
  <div className="space-y-2">
    <Label>Next Field</Label>
    <Select>...</Select>
  </div>
  <Button className="w-full">Submit</Button>
</div>
```

- `space-y-4` between fields
- `space-y-2` between label and input
- `w-full` buttons on mobile forms
- Required fields marked with `*` in label text

---

## Checklist Before Shipping

- [ ] No Card wrapping an entire single-purpose page
- [ ] No nested Cards (Card inside Card)
- [ ] No triple container nesting (container + max-w + Card)
- [ ] Touch targets are 44px+ on interactive elements
- [ ] Responsive padding (tighter on mobile, wider on desktop)
- [ ] Buttons are `w-full` on mobile forms
- [ ] Text truncates properly (`truncate` + `min-w-0` on flex children)
- [ ] Test on 375px width (iPhone SE) and 768px (iPad)
