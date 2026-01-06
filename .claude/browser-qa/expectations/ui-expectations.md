# UI Expectations for Exergy Lab

This document defines the expected visual patterns and elements that should be consistent across all pages. Use this as a reference when validating UI during browser QA.

## Global Layout Requirements

### Sidebar (Desktop)
- Fixed position on left side
- Width: 288px (w-72) expanded, 80px (w-20) collapsed
- Contains Exergy Lab logo with Zap icon in emerald/primary color
- Main navigation items with icons
- Secondary navigation section below divider
- Version number in footer (currently v0.0.6)
- Collapse/expand toggle button
- Active nav item highlighted with primary/emerald background tint

### Main Content Area
- Proper padding: `p-4` on mobile, `p-6` on desktop (lg:)
- Left margin to account for sidebar width
- Scrollable when content exceeds viewport
- Background: `--background` (#0c111b dark, #f8fafc light)

### Responsive Behavior
- Sidebar hidden on mobile (< 1024px)
- Mobile menu button visible in header on small screens
- Content takes full width on mobile
- Grid layouts collapse to single column

## Color Consistency

### Dark Theme (Default)
| Element | Color |
|---------|-------|
| Background | #0c111b (deep charcoal blue) |
| Cards/Elevated | #1a2332 |
| Primary/Brand | #10b981 (emerald-500) |
| Text Primary | #fafafa |
| Text Muted | #94a3b8 (slate-400) |
| Borders | #334155 (slate-700) |

### Light Theme
| Element | Color |
|---------|-------|
| Background | #f8fafc (slate-50) |
| Cards/Elevated | #f1f5f9 (slate-100) |
| Primary/Brand | #10b981 (emerald-500) |
| Text Primary | #0f172a (slate-900) |
| Text Muted | #64748b (slate-500) |
| Borders | #e2e8f0 (slate-200) |

## Component Patterns

### Cards
- `rounded-xl` border radius
- Subtle shadow
- Background: elevated color
- Consistent padding (p-4 or p-6)

### Buttons
- `rounded-lg` border radius
- Primary: emerald-500 background
- Hover states with opacity change
- Consistent sizing (h-9, h-10, h-11)

### Inputs
- `rounded-md` border radius
- Slate border color
- Focus ring in primary color
- Placeholder text in muted color

### Icons
- Lucide React icons
- Sizes: 16px (w-4), 20px (w-5), or 24px (w-6)
- Color matches text or uses primary for emphasis

## Page-Specific Requirements

### Dashboard (/)
- **Title**: "Exergy Lab" as h1
- **Subtitle**: "AI-powered scientific research platform"
- **Stats Row**: 5 stat cards (Searches, Experiments, Simulations, TEA Reports, Discoveries)
- **Main Content**: Two-column layout on desktop
  - Left: About section with 6 feature buttons, Recent activity
  - Right: Quick Actions card, Session Insights
- **Data Test ID**: `stats-row`, `quick-actions`

### Discovery Engine (/discovery)
- **Title**: Contains "Discovery"
- **Icon**: Cpu icon in header
- **Main Element**: Full-width chat interface
- **Input**: Textarea for queries
- **Layout**: Full-width interface

### Breakthrough Engine (/breakthrough)
- **Title**: Contains "Breakthrough"
- **Icon**: Microscope icon in header
- **Layout**: Full-width interface matching Discovery Engine

### Search (/search)
- **Main Element**: Search input prominently displayed
- **Filters**: Domain/source filter options visible
- **Results Area**: Grid or list for search results

### Experiments (/experiments)
- **Title**: Contains "Experiment"
- **Icon**: FlaskConical or Zap icon
- **Layout**: Workflow interface with phases

### Simulations (/simulations)
- **Title**: Contains "Simulation"
- **Icon**: Bot icon
- **Layout**: Workflow interface with tier selection

### TEA Reports (/tea-generator)
- **Title**: Contains "TEA"
- **Icon**: Calculator icon
- **Version Badge**: Shows current version (v0.6.0)
- **Layout**: Workflow stepper visible

### Reports (/reports)
- **Title**: "Reports"
- **Icon**: FileText icon
- **Controls**: Search input, filter controls
- **Layout**: Grid of report cards

### Team (/team)
- **Title**: "Team"
- **Icon**: Users icon
- **Content**: Organization info or creation form
- **Layout**: Member list if organization exists

### Settings (/settings)
- **Title**: "Settings"
- **Icon**: Settings/gear icon
- **Layout**: Tab navigation on left, content panel on right

## Common Issues to Check

### Critical Issues
1. **Blank/White Page**: No content renders
2. **Server Error**: 500 error page shown
3. **Crash**: JavaScript error prevents rendering

### Error-Level Issues
1. **Console Errors**: Red error messages in browser console
2. **Missing Required Elements**: Page title, sidebar, main content missing
3. **Broken Navigation**: Links don't work or go to wrong pages
4. **Hydration Errors**: React server/client mismatch warnings

### Warning-Level Issues
1. **Console Warnings**: Yellow warnings (review for relevance)
2. **Missing Images/Icons**: Broken image placeholders
3. **Layout Shift**: Content moves after initial render
4. **Slow Loading**: Page takes >3 seconds to render content
5. **Incorrect Colors**: Elements using wrong theme colors
6. **Inconsistent Spacing**: Padding/margin differs from other pages

## Typography

- **Font Family**: Inter (sans-serif), JetBrains Mono (monospace)
- **Headings**: Semibold or bold weight
- **Body Text**: Normal weight
- **Code/Technical**: Monospace font

## Accessibility Considerations

- Sufficient color contrast (WCAG AA minimum)
- Focus indicators visible on interactive elements
- Alt text on images (when images are used)
- Keyboard navigable interfaces
