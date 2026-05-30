# Subtask: LLM Token-Usage & Quality-Reliability Performance Review

## Metadata
- **Subtask ID**: 06
- **Feature**: Eval Plugin Implementation & Application Review
- **Assigned Subagent**: zoto-eval-architect
- **Dependencies**: 01, 02
- **Created**: 20260523

## Objective

Assess the plugin's **LLM economics** and **quality reliability** as two
intertwined axes. The plugin makes LLM calls in at least four distinct paths
(analyser, declarative LLM eval cases, code-strategy LLM eval cases, judge).
Each path has its own model selection, prompt construction, retry / cache
behaviour, and downstream verification. Find the highest-leverage levers to
reduce token cost without sacrificing quality, and the highest-leverage levers
to improve quality without exploding cost.

## Deliverables Checklist

- [x] `findings-06-token-quality-performance.md` covering:

  - [x] **Per-path token-cost map**: for each LLM-using path, document:
    - **Path 1: Analyser** (per-primitive analysis during `/z-eval-create` and `/z-eval-update`). Concurrency cap (`analyser.concurrency`, default 4), per-invocation cap (`analyser.maxCallsPerInvocation`, default 50), cache hit semantics, prompt template location, expected prompt+response token magnitude.
    - **Path 2: Declarative LLM run** (`evals/_llm/runner.ts` consuming `evals.json` cases). Per-case token magnitude, parallelism, model precedence (`--model` > `ZOTO_EVAL_MODEL` > config).
    - **Path 3: Code-strategy LLM run** (Vitest/Jest harness invoking the cursor SDK per `it()`). Per-case token magnitude vs declarative.
    - **Path 4: Judge** (`/z-eval-judge` with `judgeModel`, default `opus-4.6`). Whole-run consumption, per-case overhead.

  - [x] **Model-selection sanity**: the README declares `composer-2.5 | opus-4.6 | sonnet` for `llm.model.id` and `judgeModel` defaults to `opus-4.6`. Assess: is `opus-4.6` the right default for the judge given its routine invocation? Should the judge default to a cheaper model with `opus-4.6` opt-in?

  - [x] **Cache effectiveness**: the analyser cache lives at `.zoto/eval-system/cache/`. Assess:
    - Invalidation triggers (source hash change, framework switch, strategy switch, manifest snapshot mismatch).
    - Likely hit-rate in steady-state development.
    - Cost of cache miss vs hit.
    - Whether the cache covers the analyser path only, or also the judge/declarative paths.

  - [x] **Prompt-size hot-spots**: for each path, identify the largest contributor to prompt length (e.g. "the entire SKILL.md is concatenated", "all prior eval cases are included as few-shot examples"). Recommend trims with quality-impact analysis.

  - [x] **Redundant LLM calls**: any path that re-invokes the LLM where a cache lookup, a structured re-parse, or a deterministic transform would suffice.

  - [x] **Quality-reliability levers**:
    - Schema validation strictness on LLM outputs (does every LLM output get JSON-schema-validated? What happens on validation failure — retry, fail loud, silently accept?).
    - Grader rigour: `contains` vs `regex` vs `tool-called` vs `llm-judge`. The README rule routes to `regex`-where-possible — quantify how often `contains` is currently chosen.
    - Confidence / accuracy / verbosity soft metrics — are thresholds principled or arbitrary?
    - Retry strategy on transient LLM failures.

  - [x] **Application-context costs**: from subtask 02, factor in the current repo state — 336 run dirs accumulated, no manifest yet (so no analyser cache populated yet). Estimate the **cost of a cold-start `/z-eval-create`** in this repo (across all in-monorepo plugins' skills/agents/commands), and whether anything in the current design will surprise the user.

  - [x] **Quantification, not vibes**: every cost claim must include either:
    - A direct citation to a token-counter / cap in code (e.g. `maxCallsPerInvocation: 50`), OR
    - An order-of-magnitude estimate with assumptions stated (e.g. "assuming ~3k tokens prompt + ~1k tokens response per primitive, 50 primitives × 4 concurrent = ~200k tokens per `/z-eval-create`").

- [x] **Findings ledger** at top: severity (info | minor | major | blocker), confidence, effort.

- [x] **Top 5 token-reduction wins** ranked by estimated %-reduction × effort.

- [x] **Top 5 quality-reliability wins** ranked by estimated risk-reduction × effort.

- [x] No file mutations.

## Definition of Done

- [x] Findings document committed under `specs/20260523-eval-plugin-review/findings-06/`.
- [x] Per-path token-cost map populated for all 4 paths.
- [x] Every "reduce" recommendation has explicit quality-impact analysis (not just cost).
- [x] Every "improve quality" recommendation has explicit cost analysis.
- [x] No mutations outside this subtask's directory.

## Implementation Notes

- Read subtask 01's inventory and subtask 02's audit first. Do not re-enumerate.
- Locate prompt templates and analyser code in the local plugin copy. Cite `start:end:filepath` for every numerical claim.
- The model-precedence chain is documented in the README ("Model precedence at runtime"); confirm it matches the runner code.
- The judge default of `opus-4.6` is the single highest-leverage cost lever; treat it as a top-3 finding regardless of conclusion.
- Do **not** run any LLM call to validate. This is a static-analysis review.

## Testing Strategy

**IMPORTANT**: Static review only. Do NOT invoke any LLM, do NOT run any eval, do NOT execute any analyser path.

## Execution Notes

### Agent Session Info
- Agent: `zoto-eval-architect` (RETRY of prior `resource_exhausted` attempt)
- Started: 2026-05-23
- Completed: 2026-05-23

### Work Log
- Sampled subtask-01 inventory + subtask-02 audit via targeted Grep (no full reads) to preserve context budget.
- Listed plugin tree to locate prompt-template / runner-template locations.
- Read the four key templates representing each LLM path:
  - Analyser: `agents/zoto-eval-analyser-subagent.md`
  - Declarative runner: `templates/llm/agent-sdk/runner.ts.tmpl`
  - Code-strategy harness: `templates/llm/code-cursor-sdk/_shared/case-runner.ts.tmpl` (+ per-primitive template)
  - Judge: `agents/zoto-eval-judge.md` (+ judge grader `templates/llm/agent-sdk/graders/llm-judge.ts.tmpl`)
- Confirmed model precedence chain via README and runner code (`resolveModel` in `runner.ts.tmpl`).
- Counted primitives in host repo via shell `find` (37 covered; 26 require analyser given skill template-merge default + 1 allowlisted skill).
- Grepped for `"graders"` to quantify grader-type usage in evals.json (finding: 0 typed graders in any plugin-shipped case; templates ship `"graders": []`).
- Grepped for `model:` frontmatter across `agents/` (finding: all 8 subagents pin `claude-opus-4-6`).
- Wrote findings doc with 15 findings, per-path cost map, 5 token-reduction wins, 5 quality-reliability wins.

### Blockers Encountered
- None. Static-only review per spec.

### Files Modified
- `specs/20260523-eval-plugin-review/findings-06/findings-06-token-quality-performance.md` (created)
- `specs/20260523-eval-plugin-review/subtask-06-eval-plugin-review-token-quality-performance-20260523.md` (checklist + execution notes only)

### Adversarial Verification (zoto-spec-judge)
- Verdict: **Verified** (2026-05-23)
- All 13/13 Deliverables Checklist items independently confirmed against `/home/andrewv/.cursor/plugins/local/zoto-eval-system/` source.
- All 5/5 Definition of Done items independently confirmed.
- Spot-checks performed:
  - F1 (8 plugin subagents pin `claude-opus-4-6`): pass — 8 frontmatter `model:` lines found in `agents/`, all at line 3.
  - F2 (empty graders): pass — `templates/agent-evals/evals.json.tmpl:37` reads `"graders": []` (and again at line 67).
  - F3 (stub llmJudge): pass — `templates/llm/agent-sdk/runner.ts.tmpl:192-198` shows `judge: async ({ prompt }) => ({ score: 0.5, detail: 'stub: ${prompt.length} chars' })`.
  - F4 (sequential declarative runner): pass — `runner.ts.tmpl:360-363` shows `for (const c of allCases) { const out = await runCase(c, agent, model); }` with no concurrency.
  - Quantification rigour (sampled 3 claims): pass (3/3) — `analyser.concurrency: 4` and `maxCallsPerInvocation: 50` confirmed in `config.schema.json:84-96`; per-call ~9.5k token total carries explicit stated assumptions; cold-start cost math (8 misses × 9.5k tokens) shows derivation.
  - Judge-default cost rationale: pass — Section 2 includes explicit per-run cost estimate (~$0.75/run @ opus rates), invocation frequency (1-5/day dev, 10-50/day CI), and calibration justification for keeping opus.
  - 4-path coverage: pass — Section 1 enumerates Analyser / Declarative LLM Run / Code-Strategy LLM Run / Judge as four distinct tables.
  - Ledger completeness: pass — all 15 ledger rows (F1-F15) populated with severity, confidence, and effort columns.
- Scope discipline: pass — `git status` confirms no new modifications outside `specs/20260523-eval-plugin-review/`; only the findings doc and this subtask file were touched by subtask 06.
