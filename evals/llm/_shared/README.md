# evals/llm/_shared/

Single import surface for the unified LLM eval harness consumed by every co-located `<kind>/evals/<name>.test.ts`. SDK and interaction changes patch one bridge layer instead of every stamped test file.

User-facing documentation: [plugins/zoto-eval-system/README.md — Strategy bridge](../../plugins/zoto-eval-system/README.md#strategy-bridge).

## Modules

| Module | Purpose | Key exports | Consumers |
|--------|---------|-------------|-----------|
| `sdk-bridge.ts` | Sole direct `@cursor/sdk` wrapper; pins SDK version and token-field fallback | `createAgent`, `sendPrompt`, `awaitRun`, `closeAgent`, `resolveTokens`, `PINNED_SDK_VERSION`, `TOKEN_RESULT_FIELD` | `askquestion-bridge.ts`, `run-llm-suite.ts`, `scripts/eval-analyse.ts`, stamped templates |
| `askquestion-bridge.ts` | Scripted AskQuestion simulation via synthetic `agent.send()` follow-ups | `resolveInteractionPlanFromCase`, `runCaseWithScriptedAnswers`, `beginScriptedInteractionCase`, `observeToolCallsFromRun`, `InteractionPlan`, `ScriptedRunResult` | `run-llm-suite.ts`, stamped `<kind>/evals/<name>.test.ts` with `interactions.answers` |
| `llm-case.ts` | Canonical case shape for stamped Vitest tests | `LlmCaseDefinition`, `CaseInteractions` | `run-llm-suite.ts`, every stamped `CASES` array |
| `run-llm-suite.ts` | Centralized harness — replaces per-file boilerplate loops | `defineLlmEval`, `validateCasesAtSuiteLoad`, `resolveReportInteractionStyle` | All stamped `<kind>/evals/<name>.test.ts` |
| `zoto-llm-reporter.ts` | Accumulates cases and writes `llm.yml` + per-case logs | `reportCase`, `reportSuite`, `flush`, `ReportedCase` | `run-llm-suite.ts` (via `afterAll`) |
| `sandbox-helpers.ts` | Thin wrapper over `evals/_llm/sandbox.ts` for fixture copy and diff | `buildSandbox`, `preSnapshot`, `postSnapshot`, `diffSandbox` | `run-llm-suite.ts` |
| `setup.ts` | Vitest `setupFiles` — loads `.env`, prints LLM gate status, warms baseline | _(side effects only)_ | `evals/vitest.config.ts` |
| `_user-case-guards.ts` | Generated vs user-authored detection (file + case level) | `isGeneratedFile`, `isGeneratedCase`, `isUserAuthoredCase`, `classifyGeneratedFilePath` | `run-llm-suite.ts`, `scripts/eval-cleanup-stale.ts`, updater |
| `zoto-create-plugin-suite.ts` | Classify-and-stamp helpers for `/zoto-create-plugin` Step 6e | `classifyAndStampPluginComponent`, `classifyAndStampPluginComponents`, `FALLBACK_OPERATOR_NOTE` | `.cursor/skills/zoto-create-plugin/SKILL.md` workflow |
| `index.ts` | Barrel re-export for template stability | Re-exports from `askquestion-bridge`, `llm-case`, `sdk-bridge` | Stamped tests importing `#eval-engine/*` aliases |

### graders/

| Module | Purpose | Key exports | Consumers |
|--------|---------|-------------|-----------|
| `graders/common.ts` | Shared grader report types (mirrors `evals/_llm/graders/common.ts`) | `Verdict`, `GraderReport` | All grader modules, `zoto-llm-reporter.ts` |
| `graders/contains.ts` | Substring match grader | `contains` | `run-llm-suite.ts` |
| `graders/regex.ts` | Regex match grader | `regex` | `run-llm-suite.ts` |
| `graders/tool-called.ts` | Tool-call trace grader (uses bridge observations) | `toolCalled` | `run-llm-suite.ts` |
| `graders/llm-judge.ts` | Adversarial LLM rubric grader | `llmJudge` | `run-llm-suite.ts` |

## Discipline

- Only **`sdk-bridge.ts`** imports from `@cursor/sdk` directly. All other modules use the bridge.
- Stamped `<kind>/evals/<name>.test.ts` files import from a relative path to `evals/llm/_shared/` or `#eval-engine/*` aliases — never duplicate SDK imports.
- Interactive cases use `interactions.answers` (preferred) or legacy `follow_ups[]`; the bridge resolves precedence at runtime.
- Stamped cases with `interactions` must carry `_meta.primitive_analysis.requiresInteraction: true` — enforced at suite load.
- User-authored cases (`_meta.generated !== true` or missing file marker) are never mutated by stampers or updaters.

## Interaction case authoring

Set `requiresInteraction: true` in the analyser payload (or let the analyser infer it) when stamping interactive command evals. Case data then uses:

```typescript
interactions: { answers: ["user answer 1", "user answer 2"] }
```

Do not rely on synthetic `follow_ups[]` for new cases — they remain a migration fallback only.

## See also

- [plugins/zoto-eval-system/README.md#strategy-bridge](../../plugins/zoto-eval-system/README.md#strategy-bridge) — user-facing hybrid model and migration matrix
- [site/eval-system/design.html#llm-backend](../../site/eval-system/design.html#llm-backend) — visual design reference
- [specs/20260526-eval-askquestion-strategy-bridge/audit/sdk-askquestion-adr.md](../../specs/20260526-eval-askquestion-strategy-bridge/audit/sdk-askquestion-adr.md) — SDK surface ADR
