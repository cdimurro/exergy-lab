# Theme Standards Document

## Overview

This document defines the visual design standards for the Exergy Lab Discovery Engine UI. All new components and features should follow these guidelines to maintain consistency.

---

## Color Palette

### Background Colors

| Use Case | Tailwind Class | Description |
|----------|----------------|-------------|
| Page background | `bg-background` | Main dark background |
| Card background | `bg-card` | Slightly elevated surfaces |
| Muted sections | `bg-muted/30` or `bg-muted/50` | Subtle section dividers |
| Input backgrounds | `bg-background` or `bg-muted` | Form inputs |

### Text Colors

| Use Case | Tailwind Class | Description |
|----------|----------------|-------------|
| Primary text | `text-foreground` | Main readable text |
| Secondary text | `text-muted-foreground` | Descriptions, hints |
| Labels | `text-sm text-muted-foreground` | Form labels, section headers |

### Status Colors (IMPORTANT)

Use dark-theme-friendly variants with `/10` or `/20` opacity backgrounds:

| Status | Background | Border | Text/Icon | Use |
|--------|------------|--------|-----------|-----|
| **Success** | `bg-emerald-500/10` | `border-emerald-500/30` | `text-emerald-400` | Completed phases, passed validation |
| **Warning** | `bg-amber-500/10` | `border-amber-500/30` | `text-amber-400` | Needs attention, low scores |
| **Error** | `bg-red-500/10` | `border-red-500/30` | `text-red-400` | Failed phases, errors |
| **Info/Active** | `bg-blue-500/10` | `border-blue-500/30` | `text-blue-400` | Running, in progress |
| **Neutral** | `bg-slate-500/10` | `border-slate-500/30` | `text-slate-400` | Pending, future states |

### AVOID These (Light Theme Colors)

Do NOT use these solid light background colors:
- `bg-amber-50`, `bg-emerald-50`, `bg-red-50`, `bg-blue-50`
- `bg-amber-100`, `bg-emerald-100`, `bg-red-100`, `bg-blue-100`
- `text-amber-900`, `text-emerald-900`, `text-red-900` (too dark for dark theme)

---

## Component Standards

### Cards

```tsx
// Standard card
<div className="border rounded-xl bg-card overflow-hidden">

// Status cards (e.g., failure, success)
<div className="border border-amber-500/30 rounded-xl bg-amber-500/10 p-6">
```

### Buttons

```tsx
// Primary action
<Button className="bg-primary text-primary-foreground">

// Secondary/Outline
<Button variant="outline">

// Ghost (subtle)
<Button variant="ghost">

// Destructive
<Button variant="destructive">
```

### Status Badges

```tsx
// Success badge
<Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">

// Warning badge
<Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">

// Error badge
<Badge className="bg-red-500/20 text-red-400 border-red-500/30">
```

### Phase Timeline Colors

| Phase Status | Icon Color | Border | Background |
|--------------|------------|--------|------------|
| Pending | `text-slate-400` | `border-slate-300` | `bg-transparent` |
| Running | `text-blue-500` | `border-blue-500` | `bg-transparent` |
| Completed (passed) | `text-emerald-500` | `border-emerald-500` | `bg-transparent` |
| Completed (failed) | `text-amber-500` | `border-amber-500` | `bg-transparent` |
| Failed | `text-red-500` | `border-red-500` | `bg-transparent` |

---

## Typography

### Headings

```tsx
<h1 className="text-2xl font-bold tracking-tight">Page Title</h1>
<h2 className="text-xl font-semibold">Section Title</h2>
<h3 className="font-semibold">Card Title</h3>
<h4 className="text-sm font-medium">Subsection</h4>
```

### Body Text

```tsx
<p className="text-foreground">Primary content</p>
<p className="text-muted-foreground">Secondary content</p>
<p className="text-sm text-muted-foreground">Descriptions, hints</p>
<span className="text-xs text-muted-foreground">Timestamps, metadata</span>
```

---

## Spacing

### Standard Padding

- Cards: `p-4` to `p-6`
- Card headers: `p-4` with `border-b`
- Card content: `p-4` to `p-5`
- Inline elements: `px-3 py-1.5` or `px-4 py-2`

### Gaps

- Stack items: `space-y-4` or `gap-4`
- Inline items: `gap-2` to `gap-3`
- Section spacing: `space-y-6`

---

## Interactive Elements

### Hover States

```tsx
// Cards/buttons that are clickable
className="hover:bg-muted/50 transition-colors cursor-pointer"

// Scale effect for important actions
className="hover:scale-105 transition-all"
```

### Focus States

Always use ring for focus:
```tsx
className="focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
```

### Disabled States

```tsx
className="opacity-50 cursor-not-allowed"
```

---

## Status Indicators

### Phase Running Indicator

```tsx
// Pulsing dot
<span className="w-3 h-3 bg-blue-500 rounded-full animate-ping" />

// Spinning loader
<Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
```

### Score Display

```tsx
// High score (>= 7)
<span className="text-emerald-400 font-bold">{score.toFixed(1)}/10</span>

// Medium score (5-7)
<span className="text-amber-400 font-bold">{score.toFixed(1)}/10</span>

// Low score (< 5)
<span className="text-red-400 font-bold">{score.toFixed(1)}/10</span>
```

---

## Examples

### Failure Alert (Correct)

```tsx
<div className="border border-amber-500/30 rounded-xl bg-amber-500/10 p-6">
  <div className="flex items-start gap-4">
    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
      <AlertTriangle className="w-5 h-5 text-amber-400" />
    </div>
    <div>
      <h3 className="font-semibold text-foreground">Discovery Needs Attention</h3>
      <p className="text-sm text-muted-foreground">The research phase scored below threshold.</p>
    </div>
  </div>
</div>
```

### Success Alert (Correct)

```tsx
<div className="border border-emerald-500/30 rounded-xl bg-emerald-500/10 p-5">
  <div className="flex items-center gap-3">
    <CheckCircle className="w-5 h-5 text-emerald-400" />
    <h3 className="font-semibold text-foreground">Phase Completed Successfully</h3>
  </div>
</div>
```

---

## Checklist for New Components

- [ ] Uses `bg-card` or `bg-background` for backgrounds (NOT light colors)
- [ ] Uses status colors with `/10` or `/20` opacity
- [ ] Text is `text-foreground` or `text-muted-foreground`
- [ ] Status colors use `text-{color}-400` for dark theme visibility
- [ ] Buttons use standard variants from shadcn/ui
- [ ] Interactive elements have hover/focus states
- [ ] Spacing follows standard patterns (p-4 to p-6, gap-3 to gap-4)
