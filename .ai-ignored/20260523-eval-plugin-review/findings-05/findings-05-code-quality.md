# Findings 05 - Code Quality & Implementation Review

Scope reviewed: authoritative plugin mirror at `/home/andrewv/.cursor/plugins/local/zoto-eval-system/` plus the two pre-authorized monorepo validators.

Constraints respected:
- Analysis only.
- No mutations outside `specs/20260523-eval-plugin-review/`.
- Only allowed read-only validator scripts were executed once each.

## Findings ledger (severity x confidence x effort)

| ID | Severity | Confidence | Effort | Finding |
|---|---|---|---|---|
| F05-01 | blocker | high | M | Claimed updater/guard/stamper implementation (`_user-case-guards`, `eval-stamp.ts`, `validate-plugin.ts`) is referenced but absent in authoritative plugin source. |
| F05-02 | high | high | S | Runtime config-path drift (`config.json` reads in code-strategy templates) conflicts with documented `config.yml`-only contract. |
| F05-03 | high | high | M | Declarative runner has inert grading paths (`toolCalled` has no captured calls; `llm-judge` uses stub judge function). |
| F05-04 | medium | high | S | Dead exports/modules exist (unconsumed exports + unimported template modules). |
| F05-05 | medium | high | M | High duplication across grader/reporter templates increases drift risk. |
| F05-06 | medium | medium | S | Hook is mostly idempotent, but writes `.last-drift-check` even when no manifest is present. |
| F05-07 | low | high | S | Validation scripts passed, but they do not exercise the eval plugin because it is absent from monorepo `plugins/` discovery path. |

---

## Validation script results (read-only, executed once each)

Executed from monorepo root:

```text
node scripts/validate-template.mjs
=> Validation passed.
=> 3 warnings (non-fatal):
   - zoto-spec-system: missing mcp.json
   - zoto-cursor-top: missing hooks/hooks.json
   - zoto-cursor-top: missing mcp.json
```

```text
node scripts/validate-skills.mjs
=> 4/4 skills valid
=> all PASS under zoto-cursor-top and zoto-spec-system
```

Coverage caveat:
- Both validators scan monorepo `plugins/` (see `20:27:/home/andrewv/git/cursor/zoto-agents/scripts/validate-skills.mjs` and marketplace/plugin-path traversal in `296:454:/home/andrewv/git/cursor/zoto-agents/scripts/validate-template.mjs`).
- The authoritative eval plugin source in this subtask is under Cursor local plugin path, not under monorepo `plugins/`.
- So these pass results are useful for repo health, but not proof of eval plugin implementation integrity.

---

## Engine module review

### Declarative LLM engine (`templates/llm/agent-sdk/`)

| Module | LOC | Public exports | Direct callers/importers in plugin source | Complexity hot-spots | Error/type notes |
|---|---:|---|---|---|---|
| `update.ts.tmpl` | 596 | `Mode`, `Delta`, `UpdateSummary`, `computeDeltas`, `applyCaseUpdates`, `removeOrphanedCases`, `summarise` (`45:376`) | CLI self-entry + package script reference (`13:15:/.../templates/package-scripts/base.json`) | `main()` path orchestration (`447:590`), drift classification (`211:249`) | Dynamic `require(...)` inside TS (`144:145`), broad `catch {}` blocks (`113:116`, `315:317`), many branches in one file |
| `runner.ts.tmpl` | 395 | none (CLI script) | package scripts reference (`10:12:/.../templates/package-scripts/base.json`) | `runCase(...)` (`140:233`) and `main()` flow (`282:389`) | `as never` dispatch casts (`189:194`), `as unknown as` close handling (`365`), bare catches (`132:134`, `369:371`) |
| `case.ts.tmpl` | 388 | core case types + loaders + validators (`29:387`) | imported by `runner.ts` (`48:53:/.../runner.ts.tmpl`) and `update.ts` (`34:35:/.../update.ts.tmpl`) | `validateGradersList` + `validateEnriched` (`210:387`) | good schema-shape intent, but depends on missing `./_user-case-guards.js` import (`18`) |
| `writer.ts.tmpl` | 131 | `WriterCase`, `WriteOptions`, `writeResults` (`18:117`) | imported by `runner.ts` (`55:/.../runner.ts.tmpl`) | schema validation + file writes (`53:117`) | tight/clean; throws on schema error (`106:109`) |
| `metrics.ts.tmpl` | 72 | `RawRun`, `SoftMetrics`, `computeMetrics` (`9:57`) | imported by `runner.ts` and `writer.ts` (`54:/.../runner.ts.tmpl`, `15:/.../writer.ts.tmpl`) | low complexity | token estimate heuristic by char count (`59:62`) |
| `compare.ts.tmpl` | 98 | none (CLI script) | package script entry (`15:/.../templates/package-scripts/base.json`) | flatten + output (`52:94`) | hard `process.exit(main())` (`97`) with no typed error wrapper |

### Code-strategy shared engine (`templates/llm/code-cursor-sdk/_shared/`)

| Module | LOC | Public exports | In-source callers | Complexity hot-spots | Error/type notes |
|---|---:|---|---|---|---|
| `_shared/case-runner.ts.tmpl` | 457 | case/payload types + runner helpers (`72:449`) | reporters import aggregation helper (`20:/.../zoto-llm-reporter.jest.ts.tmpl`, `26:/.../zoto-llm-reporter.vitest.ts.tmpl`) | `runAnalyserCaseInSandbox` (`165:356`) | several silent catches in sidecar walk (`424:442`); exported helpers not consumed in-tree (see dead code section) |
| `_shared/result-yaml-writer.ts.tmpl` | 206 | report types + builders (`36:205`) | consumed by `_shared/case-runner.ts` (`60:66:/.../case-runner.ts.tmpl`) | deterministic sort/serialize pipeline (`107:180`) | clean split |
| `_shared/sandbox-helpers.ts.tmpl` | 86 | re-exports + `preSnapshot`/`postSnapshot`/`diffMutations` (`28:85`) | consumed by `_shared/case-runner.ts` (`50:55:/.../case-runner.ts.tmpl`) | low | thin and coherent |

---

## F05-01 (blocker): referenced guard/stamper/validator implementation is missing

What is claimed:
- Changelog says compile-time validator exists at `scripts/validate-plugin.ts` (`40:40:/home/andrewv/.cursor/plugins/local/zoto-eval-system/CHANGELOG.md`).
- Multiple templates/skills/agents reference `_user-case-guards` as canonical guard module (`18:18:/.../templates/llm/agent-sdk/case.ts.tmpl`, `8:8:/.../commands/z-eval-update.md`, `50:51:/.../agents/zoto-eval-updater.md`).
- Many templates reference `scripts/eval-stamp.ts` stamping functions (`5:6:/.../templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl`, `6:6:/.../templates/static/vitest/setup.ts.tmpl`, `4:4:/.../templates/llm/code-cursor-sdk/vitest.config.ts.tmpl`).

What is present:
- No `_user-case-guards*` file in authoritative plugin tree (glob returned zero files).
- No `scripts/*` directory in authoritative plugin tree (glob returned zero files).
- No `validate-plugin.ts` under authoritative plugin (only changelog mention via search).

Impact:
- Guard contract cannot be verified end-to-end from authoritative source.
- Stamping placeholder replacement contracts cannot be code-traced.
- Compile-time literal-string `_meta.generated` enforcement cannot be confirmed.

Remediation:
1. Ship missing implementation files in authoritative plugin source (or update docs/changelog to match shipped reality).
2. Add a CI check that fails when documented script paths are absent.
3. Add integration test that resolves guard module imports from stamped output.

---

## F05-02 (high): `config.json` reads conflict with documented `config.yml` contract

Evidence:
- README states config path is `.zoto/eval-system/config.yml` and old `.json` path is unsupported (`54:54:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md`).
- Yet code-strategy shared modules still read `.zoto/eval-system/config.json`:
  - judge helper (`39:40:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/code-cursor-sdk/_shared/graders/llm-judge.ts.tmpl`)
  - vitest reporter (`73:74:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/code-cursor-sdk/_shared/reporters/zoto-llm-reporter.vitest.ts.tmpl`)
  - jest reporter (`73:74:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/code-cursor-sdk/_shared/reporters/zoto-llm-reporter.jest.ts.tmpl`)

Impact:
- Judge model/model metadata resolution can silently fall back to defaults even with valid YAML config.
- Runtime behavior diverges from documented operator expectations.

Remediation:
- Replace these reads with YAML parse of `config.yml` (single shared helper).
- Add one test asserting that `judgeModel` in YAML is honored.

---

## F05-03 (high): declarative runner has stubbed grading signals

Evidence:
- `toolCalls` initialized empty and never populated (`152:153:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/runner.ts.tmpl`), but `tool-called` grader executes against that array (`191:191:/.../runner.ts.tmpl`).
- `llm-judge` path uses a hardcoded stub judge returning score `0.5` (`194:196:/.../runner.ts.tmpl`), not an actual model call.

Impact:
- `tool-called` checks are effectively non-functional.
- `llm-judge` verdicts are synthetic; confidence/accuracy signals are degraded.

Remediation:
- Route grader execution through a real bridge abstraction (as done in code-strategy `_shared/graders/llm-judge.ts.tmpl`).
- Either capture tool events from SDK stream or disable `tool-called` in declarative mode until supported.

---

## F05-04 (medium): dead code (modules/exports with zero in-tree consumers)

Dead-code claim 1 - unconsumed updater exports:
- Definitions: `applyCaseUpdates`, `removeOrphanedCases`, `summarise` (`326:376:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/update.ts.tmpl`).
- Grep confirmation:
  - `rg "applyCaseUpdates\\(|removeOrphanedCases\\(|summarise\\(" /home/andrewv/.cursor/plugins/local/zoto-eval-system`
  - result shows only definition lines in `update.ts.tmpl` (no external call sites).

Dead-code claim 2 - unconsumed code-strategy helper exports:
- Definitions: `loadAnalyserPayload`, `emitCaseSidecar` (`136:139`, `362:387:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/code-cursor-sdk/_shared/case-runner.ts.tmpl`).
- Grep confirmation:
  - `rg "loadAnalyserPayload\\(|emitCaseSidecar\\(" /home/andrewv/.cursor/plugins/local/zoto-eval-system`
  - results show only declarations/docs in `_shared/case-runner.ts.tmpl`.

Dead-code claim 3 - unimported top-level code-strategy grader templates:
- Files:
  - `1:18:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/code-cursor-sdk/graders/common.ts.tmpl`
  - `1:30:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/code-cursor-sdk/graders/contains.ts.tmpl`
- Grep confirmation:
  - `rg "from \"\\./graders/common\\.js\"|from \"\\.\\./graders/common\\.js\"" .../templates/llm/code-cursor-sdk`
  - `rg "from \"\\./graders/contains\\.js\"|from \"\\.\\./graders/contains\\.js\"" .../templates/llm/code-cursor-sdk`
  - both returned no matches.

Dead-code count recorded for this subtask: **7** (3 unconsumed updater exports + 2 unconsumed case-runner exports + 2 unimported template modules).

---

## F05-05 (medium): duplication clusters

Duplication cluster 1 - declarative vs code-strategy grader implementations:
- `contains` implementations:
  - `1:24:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/graders/contains.ts.tmpl`
  - `10:29:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/code-cursor-sdk/graders/contains.ts.tmpl`
- `regex` implementations:
  - `1:33:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/graders/regex.ts.tmpl`
  - `7:35:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/code-cursor-sdk/graders/regex.ts.tmpl`
- `tool-called` implementations:
  - `1:24:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/graders/tool-called.ts.tmpl`
  - `14:36:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/code-cursor-sdk/graders/tool-called.ts.tmpl`

Duplication cluster 2 - static vitest/jest reporter logic:
- Vitest static reporter:
  - `51:178:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/static/vitest/reporters/zoto-eval-reporter.ts.tmpl`
- Jest static reporter:
  - `57:205:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/static/jest/reporters/zoto-eval-reporter.ts.tmpl`
- Both duplicate run-id resolution, case mapping, write path assembly, and shared writer invocation.

Duplication cluster 3 - static vitest/jest per-primitive payload assertions:
- Vitest:
  - `30:185:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/static/vitest/per-primitive-test.ts.tmpl`
- Jest:
  - `20:169:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/static/jest/per-primitive-test.ts.tmpl`
- Large repeated payload interfaces + assertion loops.

Duplication cluster 4 - dual code-strategy implementations (`_shared/*` and top-level equivalents):
- `_shared/setup.ts.tmpl` (`1:79:/.../_shared/setup.ts.tmpl`) vs top-level `setup.ts.tmpl` (`1:46:/.../setup.ts.tmpl`).
- `_shared/sandbox-helpers.ts.tmpl` (`1:86:/.../_shared/sandbox-helpers.ts.tmpl`) vs top-level `sandbox-helpers.ts.tmpl` (`1:56:/.../sandbox-helpers.ts.tmpl`).
- Comments indicate two different stamp flows for the same emitted locations.

Duplication count recorded for this subtask: **4 clusters**.

---

## Hook script review (`hooks/zoto-eval-session-start.ts` + `.mjs`)

Behavior checks:
- No-config behavior: returns `{}` (`123:128:/home/andrewv/.cursor/plugins/local/zoto-eval-system/hooks/zoto-eval-session-start.ts`).
- Legacy migration: `.zoto-eval-system` -> `.zoto/eval-system` + old config conversion (`100:121:/.../zoto-eval-session-start.ts`).
- Stale runs/missing evals nudges: yes (`133:141:/.../zoto-eval-session-start.ts`).

Idempotency notes:
- Migration branch is one-time gated (`103:104:/.../zoto-eval-session-start.ts`), good.
- Drift marker is touched whenever throttle window expires, even if no manifest exists (`143:150:/.../zoto-eval-session-start.ts`), causing periodic write churn without a real drift check.

Build process note:
- Both source `.ts` and compiled `.mjs` are shipped (`1:160:/.../zoto-eval-session-start.ts`, `1:128:/.../zoto-eval-session-start.mjs`), but no local plugin package/build script exists to prove regeneration workflow.

---

## `_user-case-guards` wiring review

Expected contract references:
- import in case loader (`18:18:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/case.ts.tmpl`)
- updater command/agent docs reference canonical guard module (`8:8:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-update.md`, `50:51:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-updater.md`)

Observed:
- No `_user-case-guards` file in authoritative plugin tree (glob result: zero files).
- No `isGeneratedFile(` runtime call in available executable templates; only docs/spec text mention it.

Conclusion:
- Case-level `_meta.generated` guard exists in `update.ts.tmpl` (`338:342:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/update.ts.tmpl`), but file-level guard wiring cannot be verified from shipped implementation because canonical guard module is absent.

---

## Stamped template placeholder sanity

Placeholder-heavy templates are present (examples):
- `{{CASES_JSON}}`, `{{TARGET_ID}}`, `{{MODEL_ID}}` in code-strategy test template (`19:26:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl`)
- `{{PAYLOAD_JSON}}` in static templates (`60:60:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/static/jest/per-primitive-test.ts.tmpl`, `70:70:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/static/vitest/per-primitive-test.ts.tmpl`)

But substitution code cannot be audited because stamping implementation is not shipped in authoritative source:
- templates repeatedly reference `scripts/eval-stamp.ts` (for example `5:6:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl`).
- local plugin has no `scripts/` directory.

So: placeholder definitions are visible, replacement guarantees are **not** verifiable in current source surface.

---

## Build & dependency hygiene

- Local plugin has no plugin-level `package.json`; only `templates/baseline-fixtures/package.json` exists.
- `plugin.json` points to `assets/logo.png` (`15:15:/home/andrewv/.cursor/plugins/local/zoto-eval-system/.cursor-plugin/plugin.json`) but no `assets/` directory exists in authoritative local source.
- README/dev docs still instruct `pnpm build`/`pnpm validate` (`474:490:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md`), but no local build scripts are shippable from this source mirror.
- `yarn vs pnpm` inconsistency note: implementation/docs currently assume `pnpm` (for example package script template `3:17:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/package-scripts/base.json`); carry forward to subtask 09.

---

## Error-handling review highlights

- Multiple silent catches in critical flows:
  - updater (`113:116`, `315:317`, `431:433:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/update.ts.tmpl`)
  - hook (`29:31`, `43:45`, `118:120:/home/andrewv/.cursor/plugins/local/zoto-eval-system/hooks/zoto-eval-session-start.ts`)
  - code-strategy sidecar walker (`424:442:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/code-cursor-sdk/_shared/case-runner.ts.tmpl`)
- Frequent direct `process.exit(...)` usage in scripts (for example `391:394:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/runner.ts.tmpl`, `97:97:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/compare.ts.tmpl`), which is acceptable for CLI entrypoints but complicates composability/testing unless wrapped.

---

## Prioritized refactor candidates (impact / effort)

1. **Restore missing authoritative implementation surface** (impact: very high, effort: M)
   - Reconcile docs/claims with shipped files: include `scripts/eval-stamp.ts`, guard module, and validator pipeline, or remove stale claims.
2. **Unify config loader to YAML helper** (impact: high, effort: S)
   - One shared `readEvalConfig()` used by reporters/graders/runners; eliminate `config.json` path usage.
3. **Replace declarative runner grading stubs with real bridge** (impact: high, effort: M)
   - Wire `llm-judge` and tool-call capture from shared SDK bridge; add contract tests.
4. **Collapse duplicated graders/reporters into shared modules** (impact: medium-high, effort: M)
   - Keep one canonical grader implementation per type; framework adapters only for wiring.
5. **Prune or explicitly deprecate dead exports/templates** (impact: medium, effort: S)
   - Remove unconsumed exports/modules or add explicit `@internal`/future-use markers with tests.
6. **Harden catch paths with structured diagnostics** (impact: medium, effort: S)
   - Replace bare catches in updater/hook/reporters with bounded warnings including path/context.

---

## DoD coverage

- Findings document produced at required path: **yes**.
- Dead-code claims include file location + explicit grep checks: **yes**.
- Duplication claims cite both copies with line refs: **yes**.
- Validation script results captured: **yes**.
- Mutations outside `specs/20260523-eval-plugin-review/`: **none**.
