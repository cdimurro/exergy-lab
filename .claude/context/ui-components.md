# UI Components Context Module
<!-- Load when working on UI components, styling, or design patterns -->
<!-- Token budget: ~1500 tokens -->

## Overview

Exergy Lab uses a consistent design system built on Tailwind CSS with custom CSS variables. The light theme prioritizes readability for scientific content with clean whites and subtle grays.

## Architecture

```
Design System (.claude/design-system.md)
    |
    +-- Colors (CSS variables)
    +-- Typography (font scales)
    +-- Spacing (Tailwind utilities)
    |
    v
+-------------------+
| Base Components   |
| (src/components/ui)|
+-------------------+
    |
    v
+-------------------+
| Feature Components|
| (src/components/*)|
+-------------------+
```

## Key Files (Critical Path)

| File | Purpose | Lines |
|------|---------|-------|
| `src/app/globals.css` | CSS variables | ~150 |
| `src/components/ui/button.tsx` | Button variants | ~100 |
| `src/components/ui/card.tsx` | Card component | ~80 |
| `src/components/ui/input.tsx` | Form inputs | ~50 |
| `src/components/layout/sidebar.tsx` | Navigation | ~200 |
| `src/lib/utils.ts` | Utility functions | ~20 |

## Color System

```css
/* Primary: Exergy blue */
--primary: 221 83% 53%;        /* #3b82f6 */
--primary-foreground: 0 0% 100%;

/* Background layers */
--background: 0 0% 98%;         /* Light gray base */
--background-surface: 0 0% 100%; /* White cards */
--background-elevated: 0 0% 96%; /* Hover states */

/* Text hierarchy */
--foreground: 0 0% 10%;         /* Primary text */
--foreground-muted: 0 0% 40%;   /* Secondary text */
--foreground-subtle: 0 0% 60%;  /* Tertiary text */

/* Semantic colors */
--success: 142 76% 36%;
--warning: 38 92% 50%;
--error: 0 84% 60%;
```

## Component Patterns

### Button Variants
```tsx
<Button variant="default">Primary Action</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>
```

### Card Pattern
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
  <CardFooter>
    {/* Actions */}
  </CardFooter>
</Card>
```

### Form Pattern
```tsx
<form onSubmit={handleSubmit}>
  <div className="space-y-4">
    <div>
      <Label htmlFor="name">Name</Label>
      <Input id="name" {...register('name')} />
    </div>
    <Button type="submit">Submit</Button>
  </div>
</form>
```

## Layout Patterns

### Dashboard Layout
```
+------------+--------------------------------+
|  Sidebar   |  Main Content                  |
|  (w-72)    |  (flex-1)                      |
|            |                                |
|  - Logo    |  +------------------------+    |
|  - Nav     |  |  Page Header           |    |
|  - Footer  |  +------------------------+    |
|            |  |  Content Area          |    |
|            |  |                        |    |
+------------+--------------------------------+
```

### Split Panel Layout
```
+----------------------+------------------------+
| Config Panel (40%)   | Results Panel (60%)    |
| - Tabs               | - Tabs                 |
| - Forms              | - Data display         |
| - Actions            | - Charts               |
+----------------------+------------------------+
```

## Chart Colors (Recharts)

```typescript
const CHART_COLORS = [
  '#3b82f6', // Blue (primary)
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
]
```

## Utility Functions

```typescript
// Class merging utility
import { cn } from '@/lib/utils'

<div className={cn(
  'base-classes',
  conditional && 'conditional-class',
  className
)} />
```

## Quality Requirements

1. No emojis in UI (scientific context)
2. Consistent spacing (Tailwind scale)
3. Accessible color contrast (4.5:1 minimum)
4. Responsive breakpoints: sm, md, lg, xl, 2xl

## Related Context

- `.claude/design-system.md` - Full design specs
- `.claude/architecture.md` - Component patterns

## Current Development

- Version: v0.0.6 (shown in sidebar)
- Focus: Standalone research tools UI
- Pattern: Moving away from FeatureWizard
