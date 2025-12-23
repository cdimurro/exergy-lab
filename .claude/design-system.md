# Design System

## Color Palette

**Dark Mode (Default)**
```css
--background: #0c111b          /* Deep charcoal blue */
--elevated: #1a2332            /* Card backgrounds */
--foreground: #fafafa          /* Primary text */
--muted: #94a3b8               /* Secondary text (slate-400) */
--primary: #10b981             /* Emerald-500 - brand color */
--success: #10b981             /* Emerald-500 */
--warning: #fbbf24             /* Amber-400 */
--error: #f87171               /* Red-400 */
--info: #3b82f6                /* Blue-500 */
--border: #334155              /* Slate-700 */
```

**Light Mode**
```css
--background: #f8fafc          /* Soft white (slate-50) */
--elevated: #f1f5f9            /* Slate-100 */
--foreground: #0f172a          /* Slate-900 */
--muted: #64748b               /* Slate-500 */
--border: #e2e8f0              /* Slate-200 */
```

**Energy Domain Colors (Consistent across themes)**
```css
--coal: #6b7989                /* Slate */
--oil: #78716c                 /* Stone */
--gas: #f97316                 /* Orange */
--nuclear: #a855f7             /* Purple */
--hydro: #60a5fa               /* Blue */
--solar: #fbbf24               /* Amber */
--wind: #2dd4bf                /* Teal */
--biomass: #34d399             /* Emerald */
--geothermal: #ef4444          /* Red */
--hydrogen: #06b6d4            /* Cyan */
--other-renewables: #84cc16    /* Lime */
```

## Typography
- **Sans Font**: Inter (Google Fonts) - `var(--font-sans)`
- **Mono Font**: JetBrains Mono - `var(--font-mono)`
- Base size: 16px with Tailwind's default scale

## Component Patterns
- Use Tailwind CSS utility classes
- Prefer composition over inheritance
- Cards use `rounded-xl` with subtle shadows
- Buttons: `rounded-lg` with emerald-500 primary color
- Inputs: `rounded-md` with slate borders
- Icons: Lucide React with 16-24px sizes

## Animation Guidelines
- Use `transition-all duration-200` for micro-interactions
- Staggered animations for lists (50ms delay between items)
- Skeleton loaders for async content
- Avoid excessive motion - respect `prefers-reduced-motion`
