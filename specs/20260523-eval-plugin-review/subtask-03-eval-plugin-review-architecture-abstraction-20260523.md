# Subtask: Architecture & Abstraction Review

## Metadata
- **Subtask ID**: 03
- **Feature**: Eval Plugin Implementation & Application Review
- **Assigned Subagent**: zoto-eval-architect
- **Dependencies**: 01
- **Created**: 20260523

## Objective

Critically review the plugin's macro-architecture and abstraction model. The
focus is on detecting **redundant or illogical structural decisions** and
identifying **simplification opportunities**, with rigorous trade-off analysis
behind every recommendation. Use subtask 01's inventory as the source of truth
for what exists.

## Deliverables Checklist

- [x] `findings-03-architecture.md` covering each of the following themes with **Finding → Rationale → Recommendation → Trade-off** structure:

  - [x] **Layer model**: command → agent → skill → engine (TS scripts) → templates. Are layer responsibilities cleanly separated, or do agents/skills duplicate behaviour the engine already encodes? Are skills genuinely needed, or are they thin wrappers around an already-typed engine API?

  - [x] **Declarative vs code LLM strategy** (mutually exclusive):
    - Maintenance cost of supporting both: separate stamping paths, separate test runners (`eval:llm:declarative` vs `eval:llm:code`), separate validation gates (`validateEnriched()` vs first-line marker).
    - Use cases each strategy uniquely serves (per the README playbook).
    - **Explicit "deprecate one strategy" recommendation gate**: if the cost of carrying both exceeds the marginal user value, recommend a deprecation path with migration guidance. Otherwise, recommend simplifying within both.

  - [x] **Static-framework choice (pytest | vitest | jest)** as a separate dimension from LLM strategy. Is offering all three on the static side justified by user demand, or is one canonical default with `additionalAutomation` opt-ins simpler?

  - [x] **Mutual-exclusion model**: switching `static.framework` or `llm.strategy` requires `/z-eval-configure` + cleanup_plan + manual cleanup. Is this complexity load-bearing, or could it be replaced with idempotent stamping that tolerates parallel artefacts?

  - [x] **Manifest design**: `manifest.yml` (current state) + `manifest.history.yml` (append-only). Is the history file actually consumed anywhere, or write-only metadata? If write-only, propose either a consumer or removal.

  - [x] **Cache layer** (`.zoto/eval-system/cache/`): how is invalidation triggered, what is its hit rate likely to be in practice, and is the abstraction worth the complexity vs always-recompute?

  - [x] **Schema sprawl**: 7 schemas (config, manifest, result, case-meta, analyser-payload, cleanup-plan, needs-user-input). Identify candidates for merge or removal — see also subtask 07 for field-level analysis.

  - [x] **Hard-coded contracts**: `update.preserveUserAuthoredCases` and `update.writeMetaMarker` are hard-coded `true`. The keys are still surfaced in config + schema. Recommend either removing the keys (config simplification) or documenting why they remain visible.

  - [x] **Adviser vs judge** symmetry: pre-hoc vs post-hoc analysis. Is the duplication of taxonomy reasonable, or could one consume the other?

- [x] **Architecture diagram(s)** (mermaid) showing:
  - [x] Current command → agent → skill → engine flow.
  - [x] Recommended simplified flow (post-review).

- [x] **Findings ledger** (top of document): table of all findings with severity (info | minor | major | blocker for publish), confidence (low | medium | high), and effort estimate (S | M | L) for the proposed remediation.

- [x] No code, schema, or template files modified.

## Definition of Done

- [x] Findings document committed under `specs/20260523-eval-plugin-review/findings-03/`.
- [x] Every finding cites at least one `start:end:filepath` reference into the local plugin copy.
- [x] Every "deprecate" or "merge" recommendation has a written trade-off paragraph (not just an assertion).
- [x] No mutations outside this subtask's directory.

## Implementation Notes

- Read subtask 01's inventory first; do not re-do enumeration.
- The **declarative-vs-code strategy split** is the highest-impact architectural question; budget the largest portion of analysis time here.
- Acknowledge user-stated pre-authorisation: strategy deprecation is a permitted recommendation if rationale is rigorous (cost/benefit, prompt size, regression risk, user reach).
- For each "X is redundant" finding, propose **either** a removal **or** a consolidation, never both as a hedge.
- Cite the README playbook (`/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md` lines covering "Side-by-side comparison" and "Playbook: when to use each strategy") when characterising the declarative vs code split.

## Testing Strategy

**IMPORTANT**: Analysis only. Do NOT run any test suite or eval script.

## Execution Notes

### Agent Session Info
- Agent: zoto-eval-architect
- Started: 2026-05-23 22:55 UTC+10
- Completed: 2026-05-23 23:20 UTC+10

### Work Log
- Read subtask 01 inventory (`findings-01-inventory.md`) and spec index.
- Surveyed plugin README playbook + side-by-side declarative-vs-code comparison.
- Sampled the 9 themes against `/home/andrewv/.cursor/plugins/local/zoto-eval-system/` source:
  config schema, schemas folder, configurer/generator/updater agents, create/update skills,
  workflow + alias commands, hooks, cache/manifest references.
- Drafted findings doc with ledger, 2 mermaid diagrams, and Finding → Rationale →
  Recommendation → Trade-off blocks per theme.

### Blockers Encountered
None.

### Files Modified
- `specs/20260523-eval-plugin-review/findings-03/findings-03-architecture.md` (new)
- `specs/20260523-eval-plugin-review/subtask-03-eval-plugin-review-architecture-abstraction-20260523.md` (checklist + work log)

### Judge Verification (2026-05-23, adversarial verifier)
- Findings doc exists, is well-formed markdown, contains 11 findings, 32 `start:end:filepath` citations (matches the claim), 2 valid mermaid `flowchart TD` diagrams (current + recommended), and a fully populated 11-row findings ledger (#, Theme, Title, Severity, Confidence, Effort, Recommendation).
- **Strategy-deprecation spot-check (3 of 32 sampled)**: README 204-214 side-by-side comparison ✓ exact match; `zoto-update-evals/SKILL.md` 83-99 dispatcher table ✓ exact match; `templates/llm/code-cursor-sdk/_shared/graders/contains.ts.tmpl` 1-13 re-export ✓ exact match. The substantive duplication claim (parallel `agent-sdk/` vs `code-cursor-sdk/` template trees + standalone-vs-re-export grader duplication inside `code-cursor-sdk/` itself) is fully confirmed by direct file inspection. Note: one citation (`templates/llm/code-cursor-sdk/graders/contains.ts.tmpl 17:30`) has an off-by-N line range — the quoted block lives at lines 1-16 of the actual file, not 17-30. The substantive claim is still verified; only the line range is inaccurate. Logged as a minor accuracy issue, not a deliverable failure.
- **Mutual-exclusion ceremony spot-check**: configurer agent + skill Step-0 refusal gates verified; cleanup-plan schema framework-switch / strategy-switch groups verified; README "Switching strategies" section confirms `pnpm run eval:cleanup-stale --apply` ceremony. PASS.
- **`manifest.history.yml` write-only spot-check**: grep across the local plugin shows multiple writers (`update.ts.tmpl`, configurer/create/update skills, generator/updater agents) and a single read consumer — `zoto-help-evals/SKILL.md` lines 15 and 54 read it as state context for the help narrative. The findings doc explicitly acknowledges this in finding #7 ("the only mention of *reading* it is the help skill's narrative 'summarise the latest entry'"). The "no programmatic consumer of historical entries" claim is verified — drift detection diffs against `manifest.yml`, never `manifest.history.yml`. PASS.
- **Trade-off paragraph rigour (3 of 4 deprecate/merge findings sampled)**: finding #4 (deprecate `code` strategy) has a 7-line trade-off with mitigation + fallback recommendation; finding #2 (drop alias commands) has trade-off with runbook-cost + middle-ground "keep one alias"; finding #7 (remove or add consumer to `manifest.history.yml`) has trade-off comparing options A and B; finding #11 (extract shared library) also has trade-off. All four "deprecate/merge" recommendations carry genuine trade-off paragraphs, not assertions. PASS.
- **Scope discipline**: `git status` shows the only files this subtask added are inside `specs/20260523-eval-plugin-review/findings-03/` and the subtask file itself. Other untracked files (`.cursor/agents/zoto-eval-architect.md`, `.cursor/agents/zoto-eval-engineer.md`, `.zoto/`) are spec-prep artefacts created **before** this subtask ran (they support multiple subtasks and are not specific to subtask 03). Pre-existing modified CRUX files are unrelated. PASS.
- **Verdict: Verified.** All 11 Deliverables Checklist items and all 4 Definition of Done items independently confirmed. One minor citation accuracy issue noted (line-range off in `contains.ts.tmpl`); the underlying claim is correct.
