# Subtask: Audit LLM eval architecture & dual-strategy contract

## Metadata
- **Subtask ID**: 01
- **Feature**: Refactor LLM eval approach
- **Assigned Subagent**: crux-platform-architect
- **Dependencies**: None
- **Created**: 20260508

## Objective

Produce a concise architecture snapshot of the host repo’s LLM eval stack: where declarative cases live, how `evals/_llm/runner.ts` loads and validates them, how `scripts/eval-stamp.ts` emits `evals/llm/test_*.test.ts` from `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl`, and how `.zoto/eval-system/manifest.yml` ties discovery to both worlds. Identify duplication hot-spots (notably the repeated `CaseDefinition` block in every stamped test) and list concrete files to change in later subtasks.

## Deliverables Checklist
- [ ] Written inventory table: **declarative JSON paths** (`plugins/zoto-eval-system/evals/**/*.json`), **code tests** (`evals/llm/test_*.test.ts`), **shared helpers** (`evals/llm/_shared/*`, `evals/_llm/*`), **scripts** (`eval-stamp`, `eval-discover`, `eval-analyse`, `eval-update`)
- [ ] Explicit **dual-strategy contract**: when to add/update JSON vs Vitest; how `eval:llm:declarative` vs `eval:llm:code` map to user workflows (`package.json` scripts)
- [ ] **Open questions** list for subtasks 03–06 (e.g. whether `EvalCase` and code-strategy case types should merge vs alias, table-driven codegen limits)
- [ ] No code changes in this subtask (read-only audit)

## Definition of Done
- [ ] Deliverables captured in this subtask’s **Execution Notes** (or linked bullet list the executor can paste into the spec index **Execution Notes**)
- [ ] No linter concerns (markdown / doc only)

## Implementation Notes
- Read `evals/_llm/case.ts` (`EvalCase`, `DeclarativeGraderConfig`, enriched validation) vs `CaseDefinition` in a representative `evals/llm/test_*.test.ts` and the template `per-primitive-test.ts.tmpl`.
- Confirm manifest keys in `.zoto/eval-system/manifest.yml` and schema under `plugins/zoto-eval-system/templates/schema/`.
- **Do not** run full LLM eval suites unless needed for behavior verification; this subtask is architectural.

## Testing Strategy
- Read-only. No automated tests.

## Execution Notes

### Agent Session Info
- Agent: crux-platform-architect
- Started: 2026-05-08T20:07:00+10:00
- Completed: 2026-05-08T20:15:00+10:00

### Work Log

---

## D01 — Inventory Table

### Declarative JSON case files (`plugins/zoto-eval-system/evals/**/*.json`)

| Path | Target Kind | Target ID |
|------|-------------|-----------|
| `plugins/zoto-eval-system/evals/commands/z-eval-advise.json` | command | `command:z-eval-advise` |
| `plugins/zoto-eval-system/evals/commands/z-eval-compare.json` | command | `command:z-eval-compare` |
| `plugins/zoto-eval-system/evals/commands/z-eval-configure.json` | command | `command:z-eval-configure` |
| `plugins/zoto-eval-system/evals/commands/z-eval-create.json` | command | `command:z-eval-create` |
| `plugins/zoto-eval-system/evals/commands/z-eval-execute.json` | command | `command:z-eval-execute` |
| `plugins/zoto-eval-system/evals/commands/z-eval-help.json` | command | `command:z-eval-help` |
| `plugins/zoto-eval-system/evals/commands/z-eval-init.json` | command | `command:z-eval-init` |
| `plugins/zoto-eval-system/evals/commands/z-eval-judge.json` | command | `command:z-eval-judge` |
| `plugins/zoto-eval-system/evals/commands/z-eval-update.json` | command | `command:z-eval-update` |
| `plugins/zoto-eval-system/evals/commands/z-eval-workflow.json` | command | `command:z-eval-workflow` (new) |
| `plugins/zoto-eval-system/evals/agents/zoto-eval-adviser.json` | agent | `agent:zoto-eval-adviser` |
| `plugins/zoto-eval-system/evals/agents/zoto-eval-analyser-subagent.json` | agent | `agent:zoto-eval-analyser-subagent` |
| `plugins/zoto-eval-system/evals/agents/zoto-eval-comparer.json` | agent | `agent:zoto-eval-comparer` |
| `plugins/zoto-eval-system/evals/agents/zoto-eval-configurer.json` | agent | `agent:zoto-eval-configurer` |
| `plugins/zoto-eval-system/evals/agents/zoto-eval-executor.json` | agent | `agent:zoto-eval-executor` |
| `plugins/zoto-eval-system/evals/agents/zoto-eval-generator.json` | agent | `agent:zoto-eval-generator` |
| `plugins/zoto-eval-system/evals/agents/zoto-eval-judge.json` | agent | `agent:zoto-eval-judge` |
| `plugins/zoto-eval-system/evals/agents/zoto-eval-updater.json` | agent | `agent:zoto-eval-updater` |
| `plugins/zoto-eval-system/evals/hooks/zoto-eval-system.json` | hook | `hook:zoto-eval-system` |

**Total: 19 JSON files** (18 previously tracked + 1 new `z-eval-workflow.json`).

### Code-strategy test files (`evals/llm/test_*.test.ts`)

37 stamped files. Each is ~240 lines, generated from `per-primitive-test.ts.tmpl`. Breakdown by kind:

| Kind | Count | Example |
|------|-------|---------|
| skill | 11 | `test_skill_zoto-judge-evals.test.ts` |
| command | 15 | `test_command_z-eval-update.test.ts` |
| agent | 8 | `test_agent_zoto-eval-comparer.test.ts` |
| hook | 3 | `test_hook_zoto-spec-system.test.ts` |

### Shared helpers

| Layer | Path | Purpose |
|-------|------|---------|
| **Declarative backend** | `evals/_llm/runner.ts` | Declarative strategy entry point; loads JSON, validates via `validateEnriched`, sandboxes via `@cursor/sdk` |
| | `evals/_llm/case.ts` | `EvalCase`, `EvalFile`, `DeclarativeGraderConfig`, `validateEnriched()`, `detectPlaceholderPrompt()` |
| | `evals/_llm/update.ts` | Diff-aware updater; `computeDeltas`, `dispatchRegeneration`, `surgicallyReplaceGeneratedCases` |
| | `evals/_llm/writer.ts` | Writes `evals/_runs/<ts>/llm.yml` |
| | `evals/_llm/metrics.ts` | `computeMetrics()` for declarative cases |
| | `evals/_llm/compare.ts` | Cross-run comparison |
| | `evals/_llm/sandbox.ts` | Sandbox creation, snapshotting, fixture materialisation |
| | `evals/_llm/sdk-bridge.ts` | `createAgent`, `sendPrompt`, `awaitRun`, `closeAgent`, `resolveTokens` |
| | `evals/_llm/_user-case-guards.ts` | `isGeneratedCase()`, `isGeneratedFile()` — canonical guards |
| | `evals/_llm/manifest-snapshot.ts` | `readManifestSnapshot()` for update/cleanup |
| | `evals/_llm/graders/*.ts` | `contains`, `regex`, `tool-called`, `llm-judge` grader implementations |
| | `evals/_llm/result.schema.json` | JSON Schema for llm.yml output |
| **Code-strategy shared** | `evals/llm/_shared/sdk-bridge.ts` | COPY of `evals/_llm/sdk-bridge.ts` |
| | `evals/llm/_shared/sandbox-helpers.ts` | Sandbox preSnapshot/postSnapshot/diff |
| | `evals/llm/_shared/setup.ts` | `.env` loading + CURSOR_API_KEY gate |
| | `evals/llm/_shared/zoto-llm-reporter.ts` | `reportCase()`, `reportSuite()` for per-case sidecar emission |
| | `evals/llm/_shared/_user-case-guards.ts` | COPY of `evals/_llm/_user-case-guards.ts` |
| | `evals/llm/_shared/graders/*.ts` | COPIES of declarative graders |
| | `evals/llm/vitest.config.ts` | Vitest config; generated inline by `stampLlmCodeStrategy` |

### Scripts

| Script | Path | Role |
|--------|------|------|
| `eval-stamp` | `scripts/eval-stamp.ts` | Stamps central eval JSON + per-primitive test files (pytest/vitest/jest/llm-code/llm-declarative) |
| `eval-discover` | `scripts/eval-discover.ts` | Walks `skillsRoots`/`discoveryTargets` → manifest-shaped JSON |
| `eval-analyse` | `scripts/eval-analyse.ts` | Heuristic + LLM-driven analyser; produces `AnalyserPayload` per primitive |
| `eval-update` | `evals/_llm/update.ts` | Diff-aware updater; rediscovery/targeted/check modes |
| `eval-cleanup-stale` | `scripts/eval-cleanup-stale.ts` | Framework/strategy switch cleanup engine |

---

## D02 — Dual-Strategy Contract

### Strategy selection

The active strategy is set in `.zoto/eval-system/config.yml`:

```yaml
llm:
  strategy: code             # or "declarative"
  codeFramework: vitest      # only relevant when strategy=code
```

### When to use each

| Aspect | `declarative` (JSON) | `code` (Vitest/Jest) |
|--------|---------------------|---------------------|
| **Case storage** | `evals.json` files under skill/command/agent/hook directories | Stamped `evals/llm/test_*.test.ts` files |
| **Runner** | `evals/_llm/runner.ts --full` | `vitest run --config evals/llm/vitest.config.ts` |
| **package.json script** | `eval:llm:declarative` | `eval:llm:code` |
| **SDK invocation** | Runner constructs Agent per case, sends prompt, awaits | Each `it()` block constructs Agent, sends prompt, awaits |
| **Grading** | Runner dispatches `contains`/`regex`/`tool-called`/`llm-judge` from `graders[]` in JSON | Test body dispatches same graders + an `llm-judge` rubric over `assertions[]` |
| **Validation gate** | `validateEnriched()` rejects placeholder prompts, missing `_meta.primitive_analysis` on generated cases | No equivalent pre-run gate; relies on stamping quality |
| **Best for** | Low-branch deterministic checks; bulk primitive coverage; CI "did the analyser produce something real?" | Multi-step prompts with `follow_ups`; complex sandbox setups; command evals needing inline test logic |
| **Update path** | `pnpm run eval:update --apply` → `surgicallyReplaceGeneratedCases()` | `pnpm run eval:update --apply` → `stampLlmCodeStrategy()` re-stamps entire test file |
| **User-authored safety** | Case-level: `_meta.generated === true` check before mutation | File-level: `// _meta.generated: true` first-line marker |

### Mutual exclusion

Both strategies ship a mutual-exclusion guard (`assertNoConflictingLlmStrategy` in `eval-stamp.ts`):
- **code → declarative conflict**: detected by the literal `/* zoto-declarative-strategy:active */` marker in `evals/_llm/runner.ts` or existence of `evals/_llm/cases.json`
- **declarative → code conflict**: detected by any `evals/llm/*.test.ts` carrying `// _meta.generated: true`

Switching strategy requires `eval:cleanup-stale --apply` to remove the old artefacts first.

### Type landscape

| Type | Defined in | Used by |
|------|-----------|---------|
| `EvalCase` | `evals/_llm/case.ts` | Declarative runner, declarative updater, declarative stamp |
| `DeclarativeGraderConfig` | `evals/_llm/case.ts` | Declarative runner grader dispatch |
| `CaseDefinition` | **Inline in per-primitive-test.ts.tmpl** (stamped 37×) | Code-strategy test bodies |
| `AnalyserPayload` / `AnalyserCase` | `scripts/eval-analyse.ts` (canonical) | Stamp, update, analyse, code-strategy case-runner |
| `AnalyserPayload` (duplicate) | `evals/llm/_shared/case-runner.ts.tmpl` | Code-strategy shared runner |
| `StampedCase` / `StampedDoc` | `scripts/eval-stamp.ts` | Declarative JSON stamping |
| `DeclarativeStampedCaseRow` | `scripts/eval-stamp.ts` | Declarative strategy row building |

---

## D03 — Open Questions for Subtasks 03–06

### Q1: Should `EvalCase` and `CaseDefinition` merge or alias?

`EvalCase` (declarative) has fields like `graders: DeclarativeGraderConfig[]`, `_meta: CaseMeta`. `CaseDefinition` (code-strategy template) has `assertion_patterns: string[]`, `graders: Array<Record<string, unknown>>`. They are semantically close but structurally different. **Options:**
- (a) Export a single `SharedCaseShape` from a new `evals/_llm/shared-types.ts` with discriminated union for strategy-specific fields. Both consumers import it.
- (b) Keep them separate but auto-derive `CaseDefinition` from the `AnalyserPayload` shape at stamp time (current approach).
- (c) Alias: `type CaseDefinition = Pick<EvalCase, 'id' | 'prompt' | ...> & { assertion_patterns?: string[] }`.

**Recommendation for subtask 03:** Option (a) — a shared types module that both strategies import.

### Q2: How far can table-driven codegen reduce per-file boilerplate?

The `per-primitive-test.ts.tmpl` is 241 lines. Of those, ~60 lines are the `CaseDefinition` interface (duplicated 37×), ~120 lines are the `describe`/`it`/grader-dispatch body (identical in every file except `CASES_JSON` and constants). The new `case-runner.ts.tmpl` already exists as a shared runner factory but the stamped files do **not yet import it**. **Question:** Can subtask 04 make each stamped test file a ~15-line thin wrapper that calls `runAnalyserCaseInSandbox()` from `_shared/case-runner.ts`?

**Risk:** The existing template renders graders inline and handles `follow_ups` differently than the case-runner. Aligning them is feasible but requires verifying the case-runner covers all grader types the template supports (it does — it already imports `regex`, `toolCalled`, `llmJudge`).

### Q3: `AnalyserPayload` is defined in three places — which is canonical?

1. `scripts/eval-analyse.ts` — the runtime source of truth
2. `evals/llm/_shared/case-runner.ts.tmpl` — a COPY stamped into host repos
3. `plugins/zoto-eval-system/templates/schema/analyser-payload.schema.json` — JSON Schema

**Recommendation for subtask 03:** Declare `scripts/eval-analyse.ts` as canonical. The case-runner template should import from a shared types package or use `typeof import("...")` to avoid drift. The JSON schema should remain for validation but not be a source of TypeScript types.

### Q4: `sdk-bridge.ts` and `_user-case-guards.ts` are COPIED verbatim into `evals/llm/_shared/`

This creates a maintenance burden: any change to the source file in `evals/_llm/` requires re-stamping all host repos. Should the code-strategy tests import from `evals/_llm/` directly (adjusting relative paths) instead of using copies?

**Trade-off:** Direct import is simpler but couples the code-strategy test tree to the declarative backend's source files. If the host repo only runs `code` strategy, they'd still need the `_llm/` directory to exist. Current copy approach is explicit but error-prone.

### Q5: Report format parity — `llm.yml` from declarative vs code strategy

The declarative runner writes `llm.yml` via `evals/_llm/writer.ts`. The code-strategy runner writes it via `evals/llm/_shared/zoto-llm-reporter.ts` (262 lines) using sidecar aggregation. Both produce YAML but with slightly different shapes. **Should subtask 05 enforce a single `LlmReportDocument` schema for both?**

### Q6: The `eval:llm` orchestrator script — what runs both strategies?

`pnpm run eval:llm` routes through `scripts/eval-orchestrate.ts` with `--llm-only`. But the individual strategies have separate scripts: `eval:llm:declarative` and `eval:llm:code`. **Question for subtask 06:** Should the orchestrator detect the active strategy from config and route automatically, or should both always run (with skips) for comparison purposes?

---

## Duplication Hot-Spots

1. **`CaseDefinition` interface** — Stamped into all 37 `test_*.test.ts` files (lines 43–58 of template). Identical in every file. Should be extracted to `_shared/case-types.ts`.

2. **Grader dispatch block** — Lines 111–167 of the template contain identical grader loop + `llm-judge` rubric construction logic in every test file. Already extracted to `case-runner.ts.tmpl` but not yet wired in.

3. **SDK lifecycle boilerplate** — `createAgent`/`sendPrompt`/`awaitRun`/`closeAgent` sequence appears in every `it()` body (~30 lines). The case-runner already encapsulates this.

4. **`AnalyserPayload` interface** — Defined in `eval-analyse.ts` and re-declared in `case-runner.ts.tmpl` (lines 72–110). Should be a single export.

5. **`sdk-bridge.ts` / `_user-case-guards.ts` copies** — Verbatim copies in `evals/llm/_shared/` of sources in `evals/_llm/`. 2 files × 2 locations.

6. **Grader files** — 4 grader implementations (`contains`, `regex`, `tool-called`, `llm-judge`) + `common.ts` exist in both `evals/_llm/graders/` and `evals/llm/_shared/graders/`. 10 files total (5 source + 5 copy).

---

## Concrete Files to Change in Later Subtasks

| Subtask | Files to touch |
|---------|---------------|
| 03 (Shared types) | NEW `evals/_llm/shared-types.ts`; UPDATE `evals/_llm/case.ts`, `scripts/eval-analyse.ts`, template `per-primitive-test.ts.tmpl` |
| 04 (Runner factory) | UPDATE template `per-primitive-test.ts.tmpl` (thin wrapper), UPDATE `case-runner.ts.tmpl` (ensure all graders + follow_ups supported), RE-STAMP all 37 `test_*.test.ts` |
| 05 (Templates) | UPDATE `per-primitive-test.ts.tmpl`, `vitest.config.ts.tmpl`; REMOVE inline `CaseDefinition`; UPDATE `stampLlmCodeStrategy()` in `scripts/eval-stamp.ts` |
| 06 (Exemplar taxonomy) | UPDATE `plugins/zoto-eval-system/templates/schema/config.schema.json`, UPDATE `scripts/eval-stamp.ts` stamp functions, UPDATE `evals/_llm/update.ts` regeneration dispatch |

### Blockers Encountered
None — read-only audit completed without issues.

### Files Modified
None — this is a read-only audit subtask (D04 satisfied).
