# Browser QA Instructions

## Overview

This document provides instructions for performing browser-based QA validation using the Claude Code Chrome extension. Browser QA should run automatically after UI changes to catch issues before they reach production.

## Prerequisites

1. Dev server running at http://localhost:3000
2. Chrome extension connected (start Claude with `claude --chrome`)
3. Browser window visible (no headless mode)

## When to Run Browser QA

| Trigger | Validation Mode | Automatic |
|---------|-----------------|-----------|
| After modifying any page component | Quick | Yes |
| After modifying layout or sidebar | Full | Yes |
| After modifying UI primitives (Button, Card, etc.) | Full | Yes |
| Before committing UI changes | Quick | Suggested |
| After fixing browser QA issues | Affected pages | Yes |
| User explicitly requests | As specified | Manual |

## Validation Modes

### Quick Validation (5 pages)
Use after small UI changes. Validates core pages:
- Dashboard (/)
- Discovery Engine (/discovery)
- Breakthrough Engine (/breakthrough)
- Search (/search)
- Simulations (/simulations)

### Full Validation (10 pages)
Use before major commits or after layout changes. Validates all pages:
- All Quick Validation pages
- Experiments (/experiments)
- TEA Reports (/tea-generator)
- Reports (/reports)
- Team (/team)
- Settings (/settings)

### Affected Pages Only
Use after fixing specific issues. Validates only the pages that were changed.

## Per-Page Validation Steps

### Step 1: Verify Server Running
```bash
curl -s http://localhost:3000 > /dev/null && echo "Server OK" || echo "Server NOT running"
```

### Step 2: Navigate to Page
Use Chrome extension to navigate to the page URL. Wait for the page to fully load.

### Step 3: Capture Screenshot
Take a screenshot of the current viewport. This provides visual documentation of the UI state.

### Step 4: Read Console Logs
Check browser console for:
- **Errors**: Must be addressed before continuing
- **Warnings**: Review for relevance, some are acceptable
- **Info**: Generally ignore

### Step 5: Verify Required Elements
Check that expected elements are present using the selectors defined in `pages.json`:
- Page titles
- Navigation elements
- Key interactive components
- Data test IDs

### Step 6: Record Results
Document the validation result:
- PASS: All checks passed
- FAIL: One or more checks failed
- WARN: Passed but with warnings

## Issue Severity Classification

| Severity | Description | Action |
|----------|-------------|--------|
| CRITICAL | Page crashes, blank page, server error | Stop validation, fix immediately |
| ERROR | Console errors, missing required elements | Log issue, continue validation, fix before commit |
| WARNING | Console warnings, minor style issues | Note for later, do not block commit |
| INFO | Minor observations | Document only |

## Issue Response Protocol

### On CRITICAL Issue
1. Stop further validation immediately
2. Log the issue with screenshot and console output
3. Identify the root cause
4. Fix the issue
5. Re-run full validation from the beginning

### On ERROR
1. Log the issue with details
2. Continue validating remaining pages
3. After completing validation, address all errors
4. Re-validate only the affected pages

### On WARNING
1. Note the warning in results
2. Continue validation
3. Include in summary report
4. Address if time permits

## Validation Output Format

After each validation run, provide a summary:

```
Browser QA (Quick): X/5 passed

[1/5] Dashboard (/)
  - Status: PASS
  - Console: 0 errors, 1 warning (favicon.ico - allowed)
  - Elements: All present

[2/5] Discovery (/discovery)
  - Status: FAIL
  - Console: 1 error
  - Error: "TypeError: Cannot read property 'map' of undefined"
  - Screenshot: Captured

[3/5] Breakthrough (/breakthrough)
  - Status: PASS
  - Console: 0 errors, 0 warnings
  - Elements: All present

...

Issues Found:
1. [ERROR] /discovery - TypeError in component
   - Console: "TypeError: Cannot read property 'map' of undefined"
   - Likely cause: Data not loaded before render
   - Recommendation: Add loading state check

Summary: 4/5 passed, 1 failed
Action Required: Fix discovery page error before commit
```

## Common Issues and Solutions

### React Hydration Errors
**Symptom**: Console error about text content mismatch
**Cause**: Server/client rendering inconsistency
**Solution**: Ensure dynamic content is wrapped in useEffect or uses suppressHydrationWarning

### Missing Elements
**Symptom**: Required selector not found
**Cause**: Element removed, renamed, or conditionally hidden
**Solution**: Check component code, update selector if needed

### Console Errors on Load
**Symptom**: JavaScript errors when page loads
**Cause**: Data fetching issues, undefined variables
**Solution**: Add proper loading states and null checks

### Layout Shift
**Symptom**: Visual content moves after initial render
**Cause**: Dynamic content loading, images without dimensions
**Solution**: Add skeleton loaders, specify image dimensions

## Allowed Console Patterns

Some console messages are expected and can be ignored:
- `favicon.ico` 404 errors (if no favicon configured)
- React development mode warnings
- Next.js hot reload messages

## Integration with Development Workflow

1. **Make UI changes** in code
2. **Save files** and wait for hot reload
3. **Run Browser QA** automatically
4. **Review results** in Claude's output
5. **Fix any issues** found
6. **Re-validate** affected pages
7. **Commit** when all checks pass

## Page Configuration Reference

See `.claude/browser-qa/config/pages.json` for:
- Complete list of pages and routes
- Required elements per page
- Console error thresholds
- Screenshot settings
