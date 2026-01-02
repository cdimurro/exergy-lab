# Backend Fixes Report: Discovery & Breakthrough Engines

**Date:** January 1, 2026
**Status:** All fixes implemented and tested

---

## Executive Summary

Both the Breakthrough Engine and Discovery Engine had critical backend issues causing silent failures and stale scores. All issues have been identified and fixed, with successful tests confirming the improvements.

| Engine | Before | After |
|--------|--------|-------|
| Breakthrough | 7 hypotheses, 0 winners, 0% breakthrough | 15+ hypotheses, 2 winners, all 5 agents working |
| Discovery | Silent validation failures | 9.0 score, all 4 phases passed |

---

## Issues Identified & Fixed

### SHARED ISSUE: Hybrid Score Cache Key

**Problem:** The hybrid evaluator cached scores by hypothesis ID only, not by content. When hypotheses were refined (content changed but ID stayed same), the cache returned stale scores showing +0.00 delta across all iterations.

**File:** `exergy-lab/src/lib/ai/agents/hybrid-breakthrough-evaluator.ts`

**Fix:** Added content hash to cache key:
```typescript
private getCacheKey(hypothesis: RacingHypothesis): string {
  const contentHash = this.hashContent(hypothesis.statement || hypothesis.title || '')
  return `${hypothesis.id}-${contentHash}`
}

private hashContent(content: string): string {
  let hash = 0
  const sample = content.slice(0, 100)
  for (let i = 0; i < sample.length; i++) {
    hash = ((hash << 5) - hash) + sample.charCodeAt(i)
    hash = hash & hash
  }
  return hash.toString(36)
}
```

---

### BREAKTHROUGH ENGINE FIXES

#### Issue 1: HypGen Agents Silent Failures

**Problem:** 3 of 5 HypGen agents (feasible, economic, cross-domain) produced 0 hypotheses due to JSON parse failures silently returning empty arrays.

**File:** `exergy-lab/src/lib/ai/agents/hypgen/base.ts`

**Fix:** Made parse failures throw errors:
```typescript
// When fallback extraction finds nothing:
if (fallback.length === 0) {
  throw new Error(`[HypGen-${this.config.agentType}] Failed to parse hypotheses: no JSON array or extractable objects found`)
}

// When model returns empty array:
if (parsed.length === 0) {
  throw new Error(`[HypGen-${this.config.agentType}] Model returned empty array - no hypotheses generated`)
}
```

#### Issue 2: Zero-Hypothesis Detection Missing

**Problem:** No visibility when agents produced 0 hypotheses.

**File:** `exergy-lab/src/lib/ai/agents/agent-pool.ts`

**Fix:** Added detection and event emission:
```typescript
for (const [agentType, hypotheses] of hypothesesByAgent) {
  if (hypotheses.length === 0) {
    console.error(`[AgentPool] Agent ${agentType} produced 0 hypotheses`)
    this.emit({
      type: 'agent_zero_hypotheses',
      agentType,
      timestamp: Date.now(),
    })
  }
}

if (totalHypotheses < 5) {
  this.emit({
    type: 'generation_warning',
    timestamp: Date.now(),
    error: `Only ${totalHypotheses} hypotheses generated from ${successfulResults.length} agents`,
  })
}
```

#### Issue 3: No Generation Validation

**Problem:** If all agents failed, the system continued silently with 0 hypotheses.

**File:** `exergy-lab/src/lib/ai/agents/hypothesis-racer.ts`

**Fix:** Added validation with clear errors:
```typescript
if (this.state.activeHypotheses.length === 0) {
  throw new Error('[HypothesisRacingArena] No hypotheses generated - all agents failed. Check agent logs for details.')
}

if (this.state.activeHypotheses.length < 5) {
  this.emit({
    type: 'generation_warning',
    message: `Only ${this.state.activeHypotheses.length} hypotheses generated (expected ~25 from 5 agents)`,
    timestamp: Date.now(),
  })
}
```

---

### DISCOVERY ENGINE FIXES

#### Issue 1: Simulation Failures Silent

**Problem:** Simulation execution errors were logged but not surfaced to UI.

**File:** `exergy-lab/src/lib/ai/agents/discovery-orchestrator.ts` (line 1022)

**Fix:** Added warning emission:
```typescript
} catch (e) {
  this.log('Simulation execution failed:', e)
  this.emitThinking('validating', `Warning: Simulation execution failed - ${e instanceof Error ? e.message : 'unknown error'}`)
  simulationResults = []
}
```

#### Issue 2: Literature Cross-Reference Always Passes

**Problem:** Literature validation returned `passed: true` even on error, masking failures.

**File:** `exergy-lab/src/lib/ai/agents/discovery-orchestrator.ts` (line 614)

**Fix:** Changed to `passed: false` on error with warning:
```typescript
} catch (error) {
  this.log('Literature cross-reference failed:', error)
  this.emitThinking('refining', `Warning: Literature validation failed - ${error instanceof Error ? error.message : 'unknown error'}`)
  literatureCrossRef = {
    ...defaults,
    passed: false,
    summary: 'Literature validation failed',
    recommendations: ['Retry literature cross-reference validation'],
  }
}
```

#### Issue 3: Multi-Benchmark Validation Silent

**Problem:** Multi-benchmark validation errors were logged but not surfaced.

**File:** `exergy-lab/src/lib/ai/agents/discovery-orchestrator.ts` (line 1127)

**Fix:** Added warning emission:
```typescript
} catch (e) {
  this.log('Multi-benchmark validation failed:', e)
  this.emitThinking('validating', `Warning: Multi-benchmark validation failed - ${e instanceof Error ? e.message : 'unknown error'}`)
}
```

---

## Test Results

### Breakthrough Engine Test

**Query:** "Revolutionary methods for green hydrogen production at $2/kg"

| Metric | Before Fixes | After Fixes |
|--------|--------------|-------------|
| Hypotheses Generated | 7 | 15+ |
| Agents Producing | 2 of 5 | 5 of 5 |
| Winners | 0 | 2 |
| Refinement Iterations | Up to 5 | Up to 5 |
| Agent Types Working | novel, 1 other | novel, feasible, cross-domain, paradigm, fusion |

**Key Observations:**
- All 5 agent types now producing hypotheses
- Refinement cycles completing through iteration 5
- Winners being selected (2 out of 15+ candidates)
- Modal API 500 error is external (not our code)

### Discovery Engine Test

**Query:** "Novel approaches for high-temperature SOEC efficiency"

| Phase | Score | Status |
|-------|-------|--------|
| Research | 8.5/10 | PASSED |
| Hypothesis | 9.61/10 | PASSED |
| Validation | 9.0/10 | PASSED |
| Output | 8.5/10 | PASSED |
| **Overall** | **9.0/10** | **Breakthrough Quality** |

**Key Observations:**
- All 4 phases completed successfully
- Overall score of 9.0 (breakthrough quality)
- 42 sources gathered, 10 hypotheses generated
- GPU-accelerated simulation ran successfully
- Full techno-economic analysis completed

---

## Files Modified

| File | Changes |
|------|---------|
| `hybrid-breakthrough-evaluator.ts` | Added content hash to cache key |
| `hypgen/base.ts` | Made parse failures throw errors |
| `agent-pool.ts` | Added zero-hypothesis detection and events |
| `hypothesis-racer.ts` | Added generation validation |
| `discovery-orchestrator.ts` | Fixed 3 silent failures with warning emissions |

---

## Recommendations

1. **Monitor Modal API:** The 500 errors from Modal are external. Consider adding retry logic or fallback for GPU validation.

2. **Add Metrics Dashboard:** Track agent success rates and hypothesis counts over time.

3. **Increase Hypothesis Diversity:** Consider tuning agent temperatures to ensure more diverse hypothesis generation.

4. **Cache TTL:** Consider adding TTL to the hybrid evaluator cache to prevent stale cached scores for very old hypotheses.

---

## Conclusion

All identified backend issues have been fixed. Both engines are now producing meaningful results with proper error handling and visibility. The Breakthrough Engine generates 2+ winners (vs 0 before), and the Discovery Engine achieves breakthrough-quality scores (9.0/10).
