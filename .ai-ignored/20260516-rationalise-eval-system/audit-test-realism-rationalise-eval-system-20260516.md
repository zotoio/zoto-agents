# Test Realism Audit — Rationalise Eval System (20260516)

## Summary

| Rating | Realism | Graders | Readability |
|--------|---------|---------|-------------|
| Realistic / Strong / Obvious | 3 | 2 | 7 |
| Mixed | 4 | 3 | 0 |
| Synthetic / Weak / Opaque | 0 | 2 | 0 |
| **Total files** | **7** | **7** | **7** |

**Cross-cutting finding:** Zero `graders[]` entries across all 37 cases in all 7 files. All grading relies exclusively on `assertions` (LLM-judge natural language) and `assertion_patterns` (regex). No `tool-called` invariants, no explicit `contains` or `regex` grader objects, no typed grader dispatch. This is the single biggest structural gap.

---

## Files Reviewed

### `evals/llm/test_command_z-eval-execute.test.ts` (318 lines, 6 cases)

| Case id | Prompt (one-liner) | assertions | assertion_patterns | graders (count × type) |
|---|---|---|---|---|
| `abort-when-eval-system-config-yml-missing` | `/z-eval-execute` (bare) | 2 | 2 | 0 |
| `static-only-run-honours-config-and-writes-run-artefacts` | `/z-eval-execute` (bare) | 3 | 3 | 0 |
| `full-run-forwards-model-into-executor-task` | `/z-eval-execute --full --model opus-4.6` | 4 | 3 | 0 |
| `missing-cursor-api-key-triggers-askquestion-before-task` | `/z-eval-execute --full` + 1 follow_up | 4 | 4 | 0 |
| `needs-user-input-on-credentials-resumes-once-answered` | `/z-eval-execute --full` + 1 follow_up | 2 | 1 | 0 |
| `configuration-knobs-respected-without-touching-configure-command` | `/z-eval-execute` (bare) | 2 | 2 | 0 |

- **Realism:** Mixed — Three cases use flags or follow_ups (`full-run`, `missing-cursor-api-key`, `needs-user-input`) mirroring real usage. Three cases are bare `/z-eval-execute` with no fixtures or follow-ups; case 1 is acceptable for the abort path but case 6 (`configuration-knobs-respected`) tests an abstract invariant without concrete workspace context, making it synthetic.
- **Graders:** Mixed — Assertions are well-written and behaviorally specific (shell commands, artifact presence, credential flow). Assertion_patterns target meaningful strings (`pnpm run eval`, `static\.yml`, `credential_resolution`). However, zero graders[] means no `tool-called` checks verify that the Task tool was actually invoked for executor dispatch. Case 5 has only 1 assertion_pattern.
- **Readability:** Obvious — Single `defineLlmCodeEval` invocation; CASES array is concrete and self-contained. Each case's `expected_output` complements the assertions well.

---

### `evals/llm/test_command_z-spec-create.test.ts` (332 lines, 5 cases)

| Case id | Prompt (one-liner) | assertions | assertion_patterns | graders (count × type) |
|---|---|---|---|---|
| `abort-when-spec-system-configuration-is-missing` | `/z-spec-create` (bare) | 2 | 2 (duplicate: both `/z-spec-create`) | 0 |
| `guided-creation-with-no-file-or-description-arguments` | `/z-spec-create` (bare) | 3 | 3 (triplicate: all `/z-spec-create`) | 0 |
| `creation-seeded-from-an-attached-design-document-path` | `/z-spec-create @workspace/docs/northstar-brief.md` | 2 | 2 (duplicate: both match full prompt) | 0 |
| `creation-driven-by-a-quoted-feature-description` | `/z-spec-create "Add resilient offline queueing..."` | 2 | 2 (duplicate: both `/z-spec-create`) | 0 |
| `status-scaffolding-review-summary-judge-spawn-and-ready-for-review` | `/z-spec-create` + 1 follow_up | 2 | 2 (distinct: `pnpm run spec-status-roundtrip -- scaffold`, `zoto-spec-judge`) | 0 |

- **Realism:** Mixed — Cases 3 and 4 use realistic arguments (`@workspace/docs/...`, quoted description). Case 5 has a meaningful follow_up testing the review-judge loop. Cases 1 and 2 are bare commands; case 2 tests a guided flow with no follow_ups to drive the interactive portion, making it synthetic for a multi-step workflow.
- **Graders:** Weak — **Critical issue:** In cases 1–4, assertion_patterns are duplicated copies of the prompt text (or the command name alone). Case 1 has patterns `["/z-spec-create", "/z-spec-create"]`; case 2 has three identical `/z-spec-create` patterns. These provide zero additional grading signal beyond confirming the prompt was echoed. Only case 5 has meaningful patterns (`pnpm run spec-status-roundtrip`, `zoto-spec-judge`). The LLM-judge assertions are well-written but the regex layer is effectively absent for 80% of cases.
- **Readability:** Obvious — Fixtures are inline, ids are descriptive, expected_output is present on every case.

---

### `evals/llm/test_agent_zoto-eval-judge.test.ts` (83 lines, 3 cases)

| Case id | Prompt (one-liner) | assertions | assertion_patterns | graders (count × type) |
|---|---|---|---|---|
| `judge-latest-run-from-stored-artifacts-only` | Detailed prose: judge from stored artifacts only | 7 | 5 | 0 |
| `weak-grader-follow-up-routes-through-eval-update` | Adversarial: "rewrite those eval definitions and land changes" | 3 | 4 | 0 |
| `explicit-eval-json-edit-request-is-delegated` | Adversarial: "Patch evals/_llm/case.ts yourself" | 2 | 3 | 0 |

- **Realism:** Realistic — All three prompts mirror how a real operator or agent would interact with the judge: case 1 is a detailed task description matching the agent's actual invoke context; cases 2 and 3 test adversarial boundary conditions that are expected real-world pressure points. No bare slash-commands; every prompt carries meaningful context.
- **Graders:** Strong — Case 1 has 7 assertions and 5 complex regex patterns using `(?is)` multi-line lookaheads to verify behavioral combinations (e.g., `(?is)(?=.*static\.yml)(?=.*\bllm\.yml\b)(?=.*report\.yml).*`). Cases 2 and 3 use lookahead regex to verify refusal-plus-delegation behavior and `needs_user_input` routing. This is the strongest grading in the audit. The recent tightening commits are evident here.
- **Readability:** Obvious — Case 1's prompt is long but fully self-contained. The id names clearly describe the scenario being tested.

---

### `evals/llm/test_skill_zoto-create-spec.test.ts` (322 lines, 5 cases)

| Case id | Prompt (one-liner) | assertions | assertion_patterns | graders (count × type) |
|---|---|---|---|---|
| `custom-plans-directory-from-spec-system-yaml` | Complex: OAuth rotation with PKCE, honour repo settings | 12 | 11 | 0 |
| `workspace-missing-spec-system-configuration-file` | Missing-config: prepaid wallet ledger initiative | 3 | 3 | 0 |
| `sequential-requirement-interviewing` | Metering API throttling + 3 follow_ups | 2 | 0 | 0 |
| `impossible-cyclical-sequencing-blocked` | Cycle detection: subtask 01↔02 mutual dependency | 3 | 0 | 0 |
| `redirects-implementation-pressure-toward-specs-only-work` | Adversarial: "just patch handler.rs immediately" | 3 | 2 | 0 |

- **Realism:** Realistic — Case 1 is an exhaustive multi-paragraph prompt with inline fixtures. Case 3 exercises the multi-turn interview loop with 3 follow_ups. Case 4 tests a genuine edge case (cyclic dependencies). Case 5 is an adversarial boundary test. All prompts are specific, contextual, and non-trivial.
- **Graders:** Mixed — Extreme variance: case 1 is outstanding (12 assertions + 11 patterns covering config, explore, approval, mermaid, judge, parallelism). Cases 3 and 4 have **zero** assertion_patterns despite testing important behaviors — the interview cadence and cycle detection rely entirely on the LLM judge's interpretation of 2–3 assertions. Case 5 has only 2 patterns. Residual weakness after tightening commits: cases 3–4 need regex patterns to ground the LLM judge.
- **Readability:** Obvious — Case 1's prompt is verbose but the `assertions` array acts as a detailed specification that makes intent clear without external lookup.

---

### `evals/llm/test_hook_zoto-eval-system.test.ts` (127 lines, 4 cases)

| Case id | Prompt (one-liner) | assertions | assertion_patterns | graders (count × type) |
|---|---|---|---|---|
| `sessionstart-with-unreadable-eval-config-prints-empty-hook-json` | sessionStart with invalid YAML config | 2 | 0 | 0 |
| `sessionstart-nudges-when-a-skill-lacks-evals-json` | sessionStart with skill missing evals.json | 3 | 2 (duplicate: both `additional_context`) | 0 |
| `sessionstart-drift-reminder-when-manifest-exists` | sessionStart with manifest present, no drift-check file | 3 | 2 (distinct: `additional_context`, `.zoto/eval-system/.last-drift-check`) | 0 |
| `sessionstart-warns-about-stale-eval-run-directories` | sessionStart with 14-day-old run dir | 3 | 1 (`additional_context`) | 0 |

- **Realism:** Mixed — Hook prompts appropriately describe execution context (sessionStart trigger, sandbox state) rather than user invocations, which is the correct framing for a hook primitive. However, none exercise error recovery, edge-case YAML, or multi-hook sequencing. The prompts are descriptive but each tests exactly one happy path or one degraded scenario.
- **Graders:** Weak — Case 1 has zero assertion_patterns. Case 2's two patterns are identical (`additional_context`), providing no discriminating power. Case 4 has a single generic `additional_context` pattern. The assertions themselves are specific (exit status, JSON shape, file creation) but the regex layer adds almost nothing. A hook emitting any JSON with an `additional_context` field would pass most patterns regardless of content.
- **Readability:** Obvious — Each case has inline fixtures and a clear `expected_output` description. The hook execution context in the prompt is sufficient to understand what is being tested.

---

### `evals/llm/test_agent_zoto-spec-generator.test.ts` (328 lines, 6 cases)

| Case id | Prompt (one-liner) | assertions | assertion_patterns | graders (count × type) |
|---|---|---|---|---|
| `configured-directories-drive-scaffolding-vocabulary` | OAuth token refresh hardening effort, follow spec-system | 10 | 6 | 0 |
| `command-palette-creation-cadence` | `/z-spec-create` migrating job runner + 1 follow_up | 2 | 0 | 0 |
| `parallel-phase-testing-discipline` | Payment webhook splitting, concurrent phases | 1 | 0 | 0 |
| `memory-extension-acknowledgment` | Rate-limit telemetry dashboards, standard spec workflow | 1 | 1 | 0 |
| `maxsubtasks-ceiling-binds-decomposition` | Finest-grained decomposition, backward compat | 1 | 1 | 0 |
| `decline-immortalizing-coordination-markdown` | Adversarial: "mirror into docs/architecture" | 1 | 0 | 0 |

- **Realism:** Realistic — Case 1 is deeply realistic with fixtures and 10 assertions. Case 2 uses a real slash-command with description and follow_up. Cases 4–5 use fixtures with specific config. Case 6 tests a legitimate adversarial scenario. Only case 3 is thin (no fixtures, no follow_up, single assertion).
- **Graders:** Mixed — Extreme bimodal distribution: case 1 is strong (10 assertions, 6 patterns covering config, directories, subtask naming, parallelLimit, adversarialVerification). Cases 2, 3, and 6 have **zero** assertion_patterns and **1–2 assertions** each — this means a single LLM-judge interpretation is the only grading signal. Cases 4 and 5 each have 1 assertion and 1 pattern, which is thin. Five of six cases would benefit from at least 2–3 targeted regex patterns.
- **Readability:** Obvious — Fixtures are inline, ids are descriptive, case 1's detailed assertions serve as a mini-specification.

---

### `evals/llm/test_command_z-eval-update.test.ts` (347 lines, 8 cases)

| Case id | Prompt (one-liner) | assertions | assertion_patterns | graders (count × type) |
|---|---|---|---|---|
| `abort-when-eval-system-configuration-file-is-absent` | `/z-eval-update` (bare, no config) | 2 | 2 | 0 |
| `rediscovery-dry-run-without-apply-writes-nothing-pending-confirmation` | `/z-eval-update` (bare, default dry-run) | 2 | 2 | 0 |
| `scoped-dry-run-limits-discovery-output-to-targets-matching-glob` | `/z-eval-update --target "**/.../commands/*.md"` | 2 | 2 | 0 |
| `interactive-apply-loops-askquestion-and-resumes-until-completion` | `/z-eval-update --apply` + 2 follow_ups | 4 | 4 | 0 |
| `targeted-apply-regenerates-only-matched-primitives` | `/z-eval-update --target "command:z-eval-update" --apply` + 1 follow_up | 2 | 2 | 0 |
| `ci-check-runs-parity-gate-then-exits-with-configured-drift-codes` | `/z-eval-update --check` | 3 | 3 | 0 |
| `reuse-cached-analyser-payloads-without-llm-invalidation` | `/z-eval-update --no-analyser --apply` + 1 follow_up | 3 | 3 | 0 |
| `abort-when-manifest-yml-is-missing-after-config-loads` | `/z-eval-update` (bare, config but no manifest) | 2 | 1 | 0 |

- **Realism:** Mixed — Five of eight cases use meaningful flags (`--apply`, `--check`, `--target`, `--no-analyser`) and three have follow_ups, mirroring realistic operator workflows. Case 4 (`apply` + 2 follow_ups for Accept/Reject) is the most realistic multi-turn case in the entire audit. Three bare-command cases (1, 2, 8) test default/abort paths which are reasonable but lack workspace context to fully ground the scenario.
- **Graders:** Strong — Most cases pair assertions with matching assertion_patterns targeting specific behavioral markers (`askQuestion`, `needs_user_input`, `config.update.checkExitCodeOnCriticalDrift`, `process.env.CI`). Case 4 has 4+4 coverage for the full apply loop. Patterns reference config keys, function names, and CLI flags rather than generic strings. Case 8 is the weakest with only 1 pattern.
- **Readability:** Obvious — The 8 cases are self-contained. The id naming convention clearly communicates the scenario.

---

## Aggregate Case Statistics

| File | Cases | Total assertions | Total patterns | Total graders | Has follow_ups |
|---|---|---|---|---|---|
| `test_command_z-eval-execute` | 6 | 17 | 15 | 0 | 2 of 6 |
| `test_command_z-spec-create` | 5 | 11 | 11 (8 duplicate) | 0 | 1 of 5 |
| `test_agent_zoto-eval-judge` | 3 | 12 | 12 | 0 | 0 of 3 |
| `test_skill_zoto-create-spec` | 5 | 23 | 16 | 0 | 1 of 5 |
| `test_hook_zoto-eval-system` | 4 | 11 | 5 | 0 | 0 of 4 |
| `test_agent_zoto-spec-generator` | 6 | 16 | 8 | 0 | 1 of 6 |
| `test_command_z-eval-update` | 8 | 20 | 19 | 0 | 3 of 8 |
| **Totals** | **37** | **110** | **86** | **0** | **8 of 37** |

---

## Follow-up Items (priority order)

### Priority 1 — Structural gaps

1. **[z-spec-create: cases 1–4]** — `assertion_patterns` are duplicated copies of the prompt text (`/z-spec-create` repeated 2–3 times per case), providing zero grading signal beyond confirming the prompt was echoed. **Fix:** Replace with behavior-verifying patterns: case 1 → `/z-spec-init`; case 2 → `zoto-spec-generator`, `subtask-NN`; case 3 → `northstar-brief\.md`, `subtask-NN`; case 4 → `ingestion.worker|offline.queuing`, date-slug pattern.

2. **[All 7 files: all 37 cases]** — Zero `graders[]` entries across the entire corpus. The `CodeStrategyCaseDefinition.graders` field is never populated. Subagent-dispatching cases (z-eval-execute cases 2–5, z-spec-create case 5, zoto-spec-generator case 1) would benefit from `tool-called` graders verifying `Task` tool invocations with expected `subagent_type` values. **Fix:** Via `/z-eval-update --apply`, add `tool-called` grader entries to cases that verify subagent dispatch.

3. **[hook/zoto-eval-system: sessionstart-nudges-when-a-skill-lacks-evals-json]** — Duplicate patterns: both entries are `additional_context`. **Fix:** Replace with discriminating patterns: `evals/evals\.json`, `notes-ingest`, `/z-eval-update`.

### Priority 2 — Thin grading

4. **[zoto-spec-generator: cases 2, 3, 6]** — Zero `assertion_patterns` and only 1–2 assertions each. Case 3 (`parallel-phase-testing-discipline`) has exactly 1 assertion and 0 patterns — a single LLM-judge call is the sole grading signal. **Fix:** Add targeted patterns: case 2 → `clarif`, `specs/`; case 3 → `parallel.*targeted|concurrent.*test`; case 6 → `refuse|reject|ephemeral`.

5. **[zoto-create-spec: cases 3, 4]** — Zero `assertion_patterns` for `sequential-requirement-interviewing` and `impossible-cyclical-sequencing-blocked`. These test critical behaviors (interview pacing, cycle detection) but have no regex backup. **Fix:** Case 3 → add pattern for turn-count or scope convergence marker; case 4 → add pattern for `cycl|contradiction|dependency.*pair`.

6. **[hook/zoto-eval-system: sessionstart-with-unreadable-eval-config-prints-empty-hook-json]** — Zero `assertion_patterns`. Exit code and JSON shape verification relies entirely on LLM judge. **Fix:** Add pattern `\{\s*\}` for empty JSON object verification.

7. **[hook/zoto-eval-system: sessionstart-warns-about-stale-eval-run-directories]** — Single generic `additional_context` pattern. Would pass for any hook output containing that field regardless of content. **Fix:** Add `stale|fourteen|14.*day|/z-eval-execute` pattern.

### Priority 3 — Realism improvements

8. **[z-eval-execute: configuration-knobs-respected-without-touching-configure-command]** — Synthetic: bare `/z-eval-execute` with no fixtures or follow_ups, testing an abstract invariant (config keys echoed). **Fix:** Add a fixture with a specific `config.yml` and assertion_patterns that verify framework/strategy values are reflected in output.

9. **[z-eval-execute: needs-user-input-on-credentials-resumes-once-answered]** — Only 1 assertion_pattern (`needs_user_input`) for a case testing the resume loop. **Fix:** Add patterns for `askQuestion`, `credential`, and `pnpm run eval`.

10. **[z-spec-create: guided-creation-with-no-file-or-description-arguments]** — Bare command for a guided multi-step flow with no `follow_ups` to drive the interactive portion. **Fix:** Add 2–3 follow_ups simulating operator answers to scope questions.

---

## Out-of-scope Observations

1. **No `expected_filesystem` usage.** The `CodeStrategyCaseDefinition` type supports `expected_filesystem` for post-test file verification, but no audited case uses it. Cases that assert file creation (z-spec-create cases 2–4, hook case 3's `.last-drift-check`) would benefit from this field.

2. **Template-stamped header uniformity.** All 7 files share identical 13-line header comments from `per-primitive-test.ts.tmpl`. The stamping mechanism is working correctly and the `_meta.generated: true` marker is present on every file.

3. **`expected_output` is present on every case** but is not a grader — it serves as documentation. Its content overlaps heavily with the `assertions` array. Consider whether the runner should use `expected_output` as an additional LLM-judge reference signal.

4. **Assertion density is bimodal.** The "hero" case in each file (typically case 1) carries 7–12 assertions while remaining cases often drop to 1–3. This suggests the stamper or analyser front-loads effort on the first case and under-invests in subsequent cases.

5. **Multi-turn coverage is low.** Only 8 of 37 cases (22%) use `follow_ups`. The eval-update apply case (3 follow_ups) is the richest multi-turn test. Most command and agent evals test single-shot behavior, which may miss regression in conversational state handling.
