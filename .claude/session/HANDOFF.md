# Session Handoff Summary
<!-- GENERATED WHEN CONTEXT APPROACHES LIMIT OR SESSION ENDS -->
<!-- Next agent: Read this FIRST, then ACTIVE.md -->

## Quick Resume
**One-liner:** [Single sentence describing exactly what was being done]

## What Was Being Done
[2-3 sentences explaining the task context and goal]

## Current State
- **[File 1]:** [Status - % complete, what's done, what's left]
- **[File 2]:** [Status]

## Immediate Next Steps
1. [Exact next action to take]
2. [Following action]
3. [Then this]

## Critical Context
- [Key technical decision or constraint]
- [Important pattern being followed]
- [Relevant type or interface reference]

## Files to Read First
1. `.claude/context/[feature].md` - [Why]
2. `/path/to/current/file.tsx` - [What state it's in]
3. `/path/to/reference/file.ts` - [Why it matters]

## Known Issues
- [Any issues encountered or warnings]

## Session History Summary
[Condensed narrative of what happened in the session]

## Token Budget Used
- Session tokens: ~[X] / 200,000
- Reason for handoff: [Context limit | Session end | Feature switch]

---

## Handoff Generation Protocol

When generating a handoff summary:

1. **Trigger Conditions:**
   - Context usage exceeds 85% (170k tokens)
   - User requests handoff
   - Switching to significantly different feature area
   - Before planned session end

2. **Update ACTIVE.md:**
   - Mark status as "HANDED_OFF"
   - Record final state of all active files

3. **Notify User:**
   - "Context limit approaching. Handoff prepared in `.claude/session/HANDOFF.md`"

---

## Template Usage Notes

- Delete this section and everything below when generating actual handoff
- Replace all [bracketed placeholders] with actual content
- Keep handoff under 1200 tokens for efficient resumption
- Focus on ACTIONABLE next steps, not history
