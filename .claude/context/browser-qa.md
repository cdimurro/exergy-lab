# Browser QA Context Module
<!-- Load when performing browser-based QA validation -->
<!-- Token budget: ~800 tokens -->

## Overview

Browser QA uses the Claude Code Chrome extension to validate UI consistency and catch errors after code changes. This enables a feedback loop where issues are detected and fixed before completing tasks.

## Prerequisites

- Chrome browser with Claude extension v1.0.36+
- Claude Code started with `--chrome` flag
- Dev server running at localhost:3000

## When to Run Browser QA

| Trigger | Mode | Automatic |
|---------|------|-----------|
| After page/component changes | Quick | Yes |
| After layout/sidebar changes | Full | Yes |
| Before committing UI changes | Quick | Yes |
| After fixing issues | Affected | Yes |

## Validation Modes

### Quick (5 pages)
Dashboard, Discovery, Breakthrough, Search, Simulations

### Full (10 pages)
All Quick pages + Experiments, TEA, Reports, Team, Settings

## Per-Page Validation Steps

1. **Navigate** to page URL
2. **Wait** for content to load
3. **Capture screenshot** for visual record
4. **Read console logs** for errors/warnings
5. **Verify elements** using data-testid selectors
6. **Record result** (PASS/FAIL/WARN)

## Key Selectors

| Element | Selector |
|---------|----------|
| Sidebar | `[data-testid='sidebar']` |
| Stats row | `[data-testid='stats-row']` |
| Quick actions | `[data-testid='quick-actions']` |
| Main content | `[data-testid='main-content']` |
| Page title | `h1` |

## Issue Severity

| Level | Examples | Action |
|-------|----------|--------|
| CRITICAL | Blank page, crash | Fix immediately |
| ERROR | Console errors, missing elements | Fix before commit |
| WARNING | Style issues, warnings | Note for later |

## Feedback Loop Protocol

```
1. Detect issue during validation
2. Log finding with screenshot/console
3. Stop validation if CRITICAL
4. Fix the code
5. Re-validate affected pages
6. Confirm fix resolved issue
7. Continue with remaining pages
```

## Output Format

```
Browser QA (Quick): X/5 passed
- Dashboard: PASS (0 errors)
- Discovery: FAIL (1 error: hydration)
...
Issues Found: [list]
Action Required: [next steps]
```

## Reference Files

- `.claude/browser-qa/BROWSER-QA.md` - Full instructions
- `.claude/browser-qa/config/pages.json` - Page definitions
- `.claude/browser-qa/expectations/ui-expectations.md` - Visual patterns
