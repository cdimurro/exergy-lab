# Poetiq ARC-AGI Solver Analysis

## Techniques Applicable to Exergy Lab Refinement Agent

---

## Executive Summary

The Poetiq ARC-AGI solver achieved state-of-the-art results through a sophisticated iterative refinement architecture. After analyzing their codebase, I've identified **10 key techniques** that can significantly improve our refinement agent's hypothesis generation and validation workflow.

**Key Insight**: Poetiq's success comes from treating hypothesis refinement as an **iterative optimization problem** with structured feedback loops, rather than a single-shot generation task.

---

## 1. Solution History with Structured Feedback

### Poetiq's Approach
```python
# In solve_coding.py
solutions: list[ARCAGISolution] = []

for it in range(max_iterations):
    # ... generate solution
    feedback, score = _build_feedback(train_res, train_in, train_out)
    solutions.append(ARCAGISolution(code=code, feedback=feedback, score=score))
```

Each iteration maintains a history of solutions with:
- The solution itself (code/hypothesis)
- Structured feedback explaining what failed
- Numeric score for ranking

### Current State in Exergy Lab
Our `EnhancedRefinementAgent` generates feedback but doesn't maintain a structured solution history that persists across iterations.

### Recommended Enhancement
Create a `HypothesisHistory` structure:

```typescript
interface HypothesisHistory {
  hypothesisId: string
  iterations: {
    version: number
    hypothesis: RacingHypothesis
    feedback: RefinementFeedback
    score: number
    timestamp: number
    dimensionScores: Map<string, number>
  }[]
}
```

**Impact**: Enables the model to see progression and learn from past failures.

---

## 2. Diff-Based Feedback Visualization

### Poetiq's Approach
```python
def _array_diff(arr1: np.ndarray, arr2: np.ndarray) -> str:
    # Shows: "prediction/correct" for each cell
    # Example output: "1 2/3 4" (cell 2 predicted 2 but should be 3)
```

This gives the model **precise visual feedback** on what's wrong.

### Recommended Enhancement for Exergy Lab
For hypothesis refinement, create structured diffs showing:

```markdown
## Dimension: BC1_PERFORMANCE
Current Score: 45% | Target: 80%

BEFORE (Score: 45%):
"This technology achieves improved efficiency..."

AFTER SUGGESTION (Target: 80%):
"This technology achieves **33.2% efficiency**, representing a **25% improvement** over the SOTA benchmark of 26.5%..."

GAPS IDENTIFIED:
- Missing: Specific percentage values
- Missing: SOTA baseline comparison
- Missing: Mechanism explanation
```

**Impact**: Model sees exactly what's missing vs. what's present.

---

## 3. Multi-Expert Parallel Processing (Ensemble)

### Poetiq's Approach
```python
# Multiple experts with different configs run in parallel
tasks = [
    asyncio.create_task(
        solve_coding(..., config=cfg)
    )
    for cfg in expert_configs  # 1-8 experts
]
results = await asyncio.gather(*tasks)
```

Each expert may use:
- Different prompts (SOLVER_PROMPT_1, _2, _3)
- Different temperatures
- Different seeds

### Current State in Exergy Lab
We have different hypothesis generation agents (novel, feasible, economic, cross-domain, paradigm) but they don't run with ensemble voting.

### Recommended Enhancement
Add ensemble mode to hypothesis evaluation:

```typescript
interface EnsembleConfig {
  numExperts: number
  temperatureVariation: [number, number] // e.g., [0.3, 0.7]
  promptVariants: string[]
  votingStrategy: 'majority' | 'weighted' | 'diversity-first'
}
```

Run 3-5 refinement attempts in parallel, aggregate via voting.

**Impact**: More robust hypothesis refinement through diversity.

---

## 4. Soft Scoring for Partial Credit

### Poetiq's Approach
```python
def _soft_score(pred: np.ndarray, truth: np.ndarray) -> float:
    if pred.shape != truth.shape:
        return 0.0
    return float(np.mean(pred == truth))  # 0.0 to 1.0
```

Even failed solutions get partial credit, enabling ranking.

### Recommended Enhancement
Already partially implemented in our dimension scoring. Enhance with:

```typescript
interface SoftDimensionScore {
  dimension: BreakthroughDimension
  rawScore: number      // Current score
  maxScore: number      // Max possible
  percentAchieved: number
  gapFromThreshold: number  // How far from passing
  trajectory: 'improving' | 'stable' | 'declining'
}
```

**Impact**: Better ranking of near-breakthrough hypotheses.

---

## 5. Improving Order (Worst-to-Best)

### Poetiq's Approach
```python
# In create_examples()
if improving_order:
    inds = inds[::-1]  # Reverse to show worst first
```

Shows model solutions from worst to best, so it sees the **progression of improvement**.

### Recommended Enhancement
When including past iterations in prompts:

```typescript
// Order feedback from lowest-scoring to highest-scoring
const sortedHistory = hypothesisHistory.sort((a, b) => a.score - b.score)

// Prompt shows:
// Iteration 1 (Score: 3.2): [feedback]
// Iteration 2 (Score: 4.8): [feedback]
// Iteration 3 (Score: 6.1): [feedback]
// Now generate Iteration 4 targeting 7.5+
```

**Impact**: Model learns the improvement pattern.

---

## 6. Probabilistic Solution Selection

### Poetiq's Approach
```python
mask = rng.uniform(size=len(solutions)) < selection_probability
selected = [s for s, keep in zip(solutions, mask) if keep]
```

With `selection_probability=1.0`, includes all past solutions.
Lower values randomly select a subset, preventing context overflow.

### Recommended Enhancement
```typescript
interface ContextManagementConfig {
  maxSolutionsInContext: number  // e.g., 5
  selectionStrategy: 'top-k' | 'probabilistic' | 'diverse'
  selectionProbability: number   // 0.0-1.0
}
```

**Impact**: Manages context window effectively for long refinement sessions.

---

## 7. Example Shuffling for Robustness

### Poetiq's Approach
```python
if shuffle and len(train) > 1:
    perm = rng.permutation(len(train))
    train = [train[i] for i in perm]
```

Randomizes example order to prevent order bias.

### Recommended Enhancement
Shuffle dimension order, feedback order, and competitive insight order:

```typescript
function shuffleFeedbackOrder(
  feedback: DimensionFeedback[],
  seed: number
): DimensionFeedback[] {
  const rng = seedrandom(seed.toString())
  return feedback.sort(() => rng() - 0.5)
}
```

**Impact**: Reduces positional bias in refinement suggestions.

---

## 8. Voting-Based Aggregation

### Poetiq's Approach
```python
# Group identical outputs
candidate_buckets: dict[str, list[ARCAGIResult]] = {}
for res in results:
    key = canonical_test_key(res.get("results", []))
    candidate_buckets.setdefault(key, []).append(res)

# More votes = higher confidence
passer_groups = sorted(passer_groups, key=len, reverse=True)
```

Identical solutions from different experts get grouped; more agreeing experts = higher confidence.

### Recommended Enhancement
For hypothesis evaluation:

```typescript
interface HypothesisConsensus {
  hypothesisId: string
  variants: RefinedHypothesis[]  // Different refinement attempts
  consensusScore: number         // Weighted by agreement
  confidence: number             // Higher with more agreement
  divergenceAreas: string[]      // Where variants disagree
}
```

**Impact**: Higher confidence in refinements with expert agreement.

---

## 9. Structured Prompt Templates

### Poetiq's Approach
```python
SOLVER_PROMPT_1 = '''
**1. Analyze the Examples:**
  * Identify key objects...
  * Determine relationships...

**2. Formulate a Hypothesis:**
  * Based on your analysis...
  * Prioritize simpler rules first...

**3. Implement the Code:**
  * Write a Python function...

**4. Test and Refine:**
  * Test on all examples...
  * Use debugging techniques...

**5. Output:**
  * Provide brief explanation...
  * Include complete code...
'''
```

Very structured with clear sections and numbered steps.

### Recommended Enhancement
Enhance our refinement prompts:

```typescript
const REFINEMENT_PROMPT_TEMPLATE = `
## PART 1: CURRENT STATE ANALYSIS
Hypothesis: {{hypothesis}}
Current Score: {{score}}/10
Target: {{targetScore}}/10
Iterations Remaining: {{iterationsRemaining}}

## PART 2: DIMENSION-BY-DIMENSION GAP ANALYSIS
{{#each weakDimensions}}
### {{dimension}}
Current: {{currentScore}}% | Target: {{targetScore}}%
Missing Elements:
{{#each gaps}}
- {{this}}
{{/each}}
{{/each}}

## PART 3: PAST IMPROVEMENT TRAJECTORY
{{#each history}}
Iteration {{version}} ({{score}}):
- Changed: {{changesFromPrevious}}
- Result: {{scoreChange}}
{{/each}}

## PART 4: COMPETITIVE CONTEXT
Top 3 Competitors:
{{#each competitors}}
- {{title}} ({{score}})
{{/each}}

## PART 5: YOUR TASK
Generate a refined hypothesis that:
1. Addresses the TOP 3 gaps identified above
2. Includes specific numbers/percentages
3. Builds on successful patterns from past iterations
4. Differentiates from competitors

CRITICAL: Provide BEFORE/AFTER examples for each improvement.
`
```

**Impact**: More consistent, higher-quality refinements.

---

## 10. Feedback Prompt Integration

### Poetiq's Approach
```python
FEEDBACK_PROMPT = '''
**EXISTING PARTIAL/INCORRECT SOLUTIONS:**

Following are some of the best, though not completely correct, solutions so far.
For each solution, its code, corresponding feedback regarding its output on the
example problems, and a numeric score between 0. (worst) and 1. (best)
indicating the quality of outputs is also provided.

Study these solutions and corresponding feedback and produce a new solution
fixing all the issues.

$$feedback$$
'''
```

Explicitly shows past attempts with their feedback and scores.

### Recommended Enhancement
Create a dedicated feedback integration prompt section:

```typescript
const PAST_ATTEMPTS_SECTION = `
## PREVIOUS REFINEMENT ATTEMPTS

The following hypotheses were attempted but did not reach breakthrough status.
Learn from their strengths and weaknesses:

{{#each pastAttempts}}
### Attempt {{index}} (Score: {{score}}/10)

**Hypothesis:**
{{hypothesis}}

**What Worked:**
{{#each strengths}}
- {{this}}
{{/each}}

**What Failed:**
{{#each weaknesses}}
- {{dimension}}: {{description}}
{{/each}}

**Lesson Learned:**
{{lessonLearned}}
{{/each}}

---

Now generate a NEW hypothesis that incorporates the lessons above.
`
```

**Impact**: Explicit learning from past failures.

---

## Implementation Priority

| Technique | Impact | Effort | Priority |
|-----------|--------|--------|----------|
| Solution History | High | Medium | 1 |
| Diff-Based Feedback | High | Low | 2 |
| Structured Prompts | High | Low | 3 |
| Improving Order | Medium | Low | 4 |
| Feedback Integration | High | Medium | 5 |
| Multi-Expert Ensemble | High | High | 6 |
| Soft Scoring | Medium | Low | 7 |
| Voting Aggregation | Medium | High | 8 |
| Probabilistic Selection | Low | Low | 9 |
| Example Shuffling | Low | Low | 10 |

---

## Quick Wins (Can Implement Today)

### 1. Add iteration history to feedback prompts
```typescript
// In EnhancedRefinementAgent.buildFeedbackPrompt()
const iterationHistory = context.hypothesis.history?.slice(-3) || []
const historySection = iterationHistory.map((h, i) =>
  `Iteration ${i+1} (Score: ${h.score.toFixed(1)}): ${h.changesApplied.join(', ')}`
).join('\n')
```

### 2. Add BEFORE/AFTER examples in dimension feedback
Already in our prompt but can be made more prominent.

### 3. Show improvement trajectory
```typescript
const trajectory = previousScore ?
  (currentScore > previousScore ? '+' : currentScore < previousScore ? '-' : '=') :
  'N/A'
```

---

## Architecture Comparison

| Aspect | Poetiq | Exergy Lab Current | Recommended |
|--------|--------|-------------------|-------------|
| Iteration Control | `max_iterations` config | Fixed phases | Configurable max with early exit |
| Solution History | Full history maintained | No history | Add HypothesisHistory |
| Feedback Format | Diff + score + text | Text only | Add structured diffs |
| Expert Diversity | Multiple configs | Multiple agent types | Add temperature/prompt variants |
| Scoring | Soft scores (0-1) | Dimension scores | Keep current, add trajectory |
| Aggregation | Voting buckets | Best hypothesis | Add consensus scoring |
| Prompt Structure | 5-part template | 4-part template | Enhance with past attempts |

---

## Next Steps

1. **Phase 1 (1-2 days)**: Implement solution history tracking
2. **Phase 2 (1 day)**: Add structured diff visualization
3. **Phase 3 (1 day)**: Enhance prompt templates with Poetiq patterns
4. **Phase 4 (2-3 days)**: Add multi-expert ensemble mode
5. **Phase 5 (1 day)**: Implement voting aggregation

Total estimated effort: 6-8 days for full implementation.

---

## Conclusion

Poetiq's architecture succeeds through **disciplined iteration** with **structured feedback**. Their key insight is treating AI reasoning as an optimization problem where:

1. Past attempts inform future attempts (solution history)
2. Feedback is precise and actionable (diff visualization)
3. Diversity improves robustness (multi-expert ensemble)
4. Partial progress is valued (soft scoring)

Applying these patterns to our refinement agent could significantly improve hypothesis quality and breakthrough rate.
