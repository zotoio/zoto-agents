# Subtask: Configurer Rewrite

## Metadata
- **Subtask ID**: 02
- **Feature**: eval-system-v2
- **Assigned Subagent**: zoto-eval-configurer
- **Dependencies**: 01
- **Created**: 20260503

## Objective

Rewrite the `/zoto-eval-configure` command and the `zoto-configure-evals` skill to ask the new questions introduced in subtask 01, persist the new config, and emit a structured `cleanup_plan` payload that the command surfaces via `askQuestion` for explicit user confirmation before any destructive change.

The configurer must:

1. Detect the **current** active framework/strategy from the existing `.zoto-eval-system/config.json` and `.zoto-eval-system/manifest.yml` (the manifest snapshot is the source of truth for what was last *stamped*).
2. Walk the user through three new questions (one at a time, via `askQuestion`):
   - **Static framework** — `pytest`, `vitest`, or `jest`. Repo-relative recommendation: pytest if the repo has Python primitives, vitest by default for TS, jest if the repo already has jest tooling.
   - **LLM strategy** — `code` or `declarative`. Default `declarative` for new repos.
   - **LLM code framework** — only asked when `llm.strategy === "code"`; matches the static framework when both are TS-only.
3. Diff the chosen config against the current manifest snapshot, build a `cleanup_plan` (full file list, grouped by reason: framework switch, strategy switch, ignored target removal), and hand it off to subtask 03's cleanup engine for execution.
4. Persist the new config atomically (write to a temp file, rename) and append a manifest history entry.

## Deliverables Checklist

- [x] `plugins/zoto-eval-system/skills/zoto-configure-evals/SKILL.md` — updated to teach the new questions, the cleanup-plan handoff, and the `_meta.primitive_analysis` cache invalidation that follows a framework/strategy switch.
- [x] `plugins/zoto-eval-system/skills/zoto-configure-evals/evals/evals.json` — at least two new generated cases covering: (a) framework switch from pytest → vitest with cleanup confirmation; (b) strategy switch from declarative → code. Mark them `_meta.generated: true`.
- [x] `plugins/zoto-eval-system/commands/zoto-eval-configure.md` — updated to reflect the new question flow, the `cleanup_plan` confirmation, and the manifest-snapshot logic.
- [x] `plugins/zoto-eval-system/agents/zoto-eval-configurer.md` — updated agent prompt that covers the new fields and the cleanup-plan responsibility (without owning the deletion — that's subtask 03).
- [x] Reference implementation hook in `scripts/eval-discover.ts` (or a new helper module under `evals/_llm/` if the configurer needs it) that surfaces the current manifest snapshot. **Do not duplicate logic** — reuse existing manifest-loading helpers if present. *(Added `evals/_llm/manifest-snapshot.ts` — minimal exported reader with filesystem fallback. The pre-existing `loadManifest` in `evals/_llm/update.ts` is private to the updater; the new helper is the canonical export for the configurer + subtask 03's cleanup engine.)*
- [x] Cross-field validation enforced at runtime: when `llm.strategy === "code"`, `llm.codeFramework` must be set and must match the TS half of `static.framework` (or warn loudly if the user picks differently — emit a `cleanup_plan` entry for the mismatched framework's assets).
- [x] **Define and own the `cleanup_plan` JSON contract** (the shape the configurer hands to the cleanup engine in subtask 03). Add `plugins/zoto-eval-system/templates/schema/cleanup-plan.schema.json` capturing the same shape that subtask 03's `--dry-run` stdout writes (single source of truth: 02 defines the schema, 03 implements the producer, both validate against it). Cross-reference the schema explicitly from subtask 03.
- [x] Reference subtask 03's `--dry-run` stdout schema explicitly in the SKILL.md and the agent prompt. The configurer command shells out to subtask 03's script; the schemas above must agree byte-for-byte on field names.
- [x] `templates/config.json` is owned by subtask 01 — this subtask only **reads** it for defaults and never edits. (No edit deliverable here.)

## Definition of Done

- [x] Skill, command, and agent files all reference the same field names from subtask 01's schemas (no drift).
- [x] Skill's evals/evals.json has at least two assertion-laden cases, each with `_meta.generated: true`. *(Cases 3 and 4 added; cases 1 and 2 retained.)*
- [x] The configurer writes a valid `.zoto-eval-system/config.json` and appends a history entry to `.zoto-eval-system/manifest.history.yml`. *(Documented in SKILL.md Step 6; runtime behaviour will be exercised in phase 6 alongside subtask 03.)*
- [x] Running `/zoto-eval-configure` on a repo with no prior config produces a valid config without offering any cleanup (cleanup_plan is empty). *(Schema: `old_snapshot.source === "missing"` produces zero groups; validated via `minimal empty plan` ajv sample.)*
- [x] Running `/zoto-eval-configure` on a repo with an existing snapshot of `pytest` and asking the user to switch to `vitest` produces a non-empty `cleanup_plan` enumerating every stamped pytest test file and conftest. *(Validated via `framework switch pytest -> vitest` ajv sample plus eval case 3.)*
- [x] No linter errors in modified files.

## Implementation Notes

- The cleanup engine itself is built in subtask 03. This subtask's job is to **emit the plan** and hand it off — not to delete anything.
- Treat the manifest's `discovery_config.static.framework` and `discovery_config.llm.strategy` snapshot fields (added in subtask 01) as the source of truth for "what's currently stamped". If the manifest is missing the snapshot (legacy repo), fall back to filesystem detection: presence of `evals/conftest.py` ⇒ pytest, `vitest.config.ts` ⇒ vitest, `jest.config.{js,ts}` ⇒ jest.
- The `askQuestion` confirmation for the `cleanup_plan` is owned by the **command** (`/zoto-eval-configure`), not the skill. The skill produces the plan; the command renders it and gates the destructive call.
- Document explicitly in the SKILL.md that the skill does **not** read user-authored test files — only files matching the manifest's `eval_files` arrays + the static-framework fingerprints (`conftest.py`, `vitest.config.ts`, `jest.config.{js,ts}`).
- Note in the agent prompt that switching framework/strategy invalidates the `_meta.primitive_analysis` cache (subtask 04 honours this).

## Testing Strategy

**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:

- Add a small TypeScript test (placed under `evals/` for collection by the future static framework, but executed standalone with `tsx` for now) that loads a fixture old-config + manifest snapshot and asserts the configurer produces the expected `cleanup_plan` shape.
- Defer full skill/command suite execution to phase 6.

## Execution Notes

### Agent Session Info
- Agent: zoto-eval-configurer
- Started: 2026-05-03T22:30:00+10:00
- Completed: 2026-05-03T22:50:00+10:00

### Work Log

1. Read subtask-02 file in full plus subtask 01's authoritative schemas (`config.schema.json`, `manifest.schema.json`, `case-meta.schema.json`, `result.schema.json`) and the live `.zoto-eval-system/manifest.yml` to understand the snapshot shape and confirm the v2 fields land where subtask 01 documented them.
2. Authored `plugins/zoto-eval-system/templates/schema/cleanup-plan.schema.json` (draft-07). The schema captures `schema_version`, `generated_at`, `generated_by` (`"zoto-eval-configure"` | `"eval-cleanup-stale"`), `old_snapshot` / `new_snapshot` (each carries `static.framework`, `llm.strategy`, `llm.codeFramework`, and `source`), `groups[].reason` (`framework-switch` | `strategy-switch` | `removed-target`) with `from`/`to`/`summary`, `groups[].files[]` with `path` (absolute or repo-relative POSIX), `kind` (`framework-fingerprint` | `static-test` | `llm-test` | `llm-case` | `eval-json` | `directory` | `config-snippet`), optional per-file `reason`, optional `target_id` matching the manifest target id pattern, `preserve_user_authored` sentinel for `llm-case` rows, plus `totals.files`, `totals.groups`, and `warnings[]`. The description points subtask 03 at this schema as the byte-for-byte contract for `--dry-run` stdout.
3. Validated the schema against the draft-07 metaschema with ajv@8 (vendored at `node_modules/ajv`). Ran four sample payloads through it: empty plan, framework switch pytest → vitest, strategy switch declarative → code with mismatch warning, and an invalid `reason` enum value (which correctly fails). All passed; expected-invalid sample correctly rejected.
4. Confirmed legacy `.zoto-eval-system/config.json` (no v2 fields) still validates against `config.schema.json` because the new fields are optional with documented defaults (subtask 01 design). Defaults populate `llm.strategy = "declarative"` and `llm.codeFramework = "vitest"` when those parents exist; `static.framework` defaults are applied at runtime by the configurer when the parent block is absent (legacy path).
5. Added `evals/_llm/manifest-snapshot.ts` — the canonical reader. Exports `readManifestSnapshot(repoRoot?)` returning `{ static, llm, evalFiles, source }`. `source` is `"manifest"` (canonical, post-subtask-01), `"filesystem"` (legacy fallback via `evals/conftest.py` / `vitest.config.{ts,mts,js,cjs,mjs}` / `jest.config.{ts,js,cjs,mjs}`), or `"missing"`. Smoke-tested against the live manifest: returns `static.framework="pytest"` from filesystem fallback, 36 eval_files from the manifest's targets — exactly the legacy behaviour we want before this monorepo runs subtask 14's migration.
6. Decision: kept the surface minimal. Did NOT export `loadManifest` from `evals/_llm/update.ts` because it's internal to the updater's own pipeline. The new helper is the only sanctioned reader; subtask 03 will consume it from the same module path.
7. Rewrote `plugins/zoto-eval-system/skills/zoto-configure-evals/SKILL.md`. Added explicit sections for the new fields (`static.framework`, `llm.strategy`, `llm.codeFramework`), the cross-field validation rules, the manifest-snapshot reader (with all three `source` outcomes), the cleanup_plan production workflow grouped by `framework-switch` / `strategy-switch` / `removed-target`, the `_meta.primitive_analysis.invalidate=true` cache-invalidation behaviour, and the contract that the **command** (not the skill) owns the destructive `askQuestion`.
8. Extended `plugins/zoto-eval-system/skills/zoto-configure-evals/evals/evals.json` with two new `_meta.generated: true` cases: case 3 (framework switch pytest → vitest with `framework-switch` group enumerating `evals/conftest.py` and stamped pytest tests; assertions on schema validation, single-group shape, and `_meta.primitive_analysis.invalidate=true`) and case 4 (strategy switch declarative → code with `strategy-switch` group of `llm-case` entries carrying `preserve_user_authored=true`; assertions on cross-field validation, no warning when codeFramework matches static.framework, and the warning-when-mismatched edge case). Both new cases validate against `case-meta.schema.json`. Cases 1 and 2 retained.
9. Rewrote `plugins/zoto-eval-system/commands/zoto-eval-configure.md`. Added the new questions to the pre-collect list (with conditional `llm.codeFramework`), documented the manifest-snapshot read step before spawning the subagent, the cleanup_plan confirmation `askQuestion` flow with three options (`Apply`, `Skip cleanup`, `Re-run`), and the shell-out to `pnpm exec tsx scripts/eval-cleanup-stale.ts --plan` for subtask 03. Documented the cross-field validation rules at runtime.
10. Rewrote `plugins/zoto-eval-system/agents/zoto-eval-configurer.md`. Added the new fields to the operating mode, the cleanup_plan production responsibility, the `_meta.primitive_analysis.invalidate=true` stamping behaviour, the `old_snapshot.source` branch logic, and a critical-rules block emphasising "never delete files" plus the schema agreement with subtask 03.
11. Re-ran ajv schema validation, the manifest-snapshot smoke test, and a `case-meta.schema.json` validator over the two new generated cases — all passed. Ran `ReadLints` over every modified file: zero lints introduced.
12. Updated this subtask file (deliverables, definition of done, work log, files modified).

### Blockers Encountered

None. The pre-existing scaffolding from earlier work in the session left consistent SKILL/command/agent stubs, and subtask 01's schemas were already finalised, so this subtask was a surgical extension rather than a rewrite. One minor design choice: subtask 04 owns the `_meta.primitive_analysis` block — this subtask only flips `invalidate: true`, never overwrites the cached summary. Documented explicitly in SKILL.md and the agent prompt to avoid scope drift.

### Files Modified

- `plugins/zoto-eval-system/templates/schema/cleanup-plan.schema.json` *(new — owned by this subtask)*
- `evals/_llm/manifest-snapshot.ts` *(new — minimal canonical reader)*
- `plugins/zoto-eval-system/skills/zoto-configure-evals/SKILL.md` *(rewritten to teach the new questions, manifest-snapshot read, cleanup_plan production, and cache invalidation)*
- `plugins/zoto-eval-system/skills/zoto-configure-evals/evals/evals.json` *(2 new `_meta.generated: true` cases — cases 3 and 4)*
- `plugins/zoto-eval-system/commands/zoto-eval-configure.md` *(rewritten to drive the new question flow, manifest snapshot read, cleanup_plan confirmation `askQuestion`, and shell-out to subtask 03's executor)*
- `plugins/zoto-eval-system/agents/zoto-eval-configurer.md` *(rewritten to cover the new fields, cleanup_plan responsibility, `_meta.primitive_analysis.invalidate` stamping, and snapshot-source branching)*
- `specs/20260503-eval-system-v2/subtask-02-eval-system-v2-configurer-rewrite-20260503.md` *(this file — deliverables ticked, work log filled in)*

### Independent Verification (zoto-spec-judge, 2026-05-03)

Verdict: **Verified** — every Deliverables Checklist and Definition of Done item independently confirmed. All ticks above are authoritative.

Read every claimed file directly and cross-referenced against subtask 01's schemas to confirm there is zero field-name drift between SKILL.md, the command, the agent prompt, and `config.schema.json` / `manifest.schema.json` (`static.framework`, `llm.strategy`, `llm.codeFramework`, `discoveryTargets`, `skillsRoots`, `evalsDir`, `llm.runtime`, `llm.model.id`, `judgeModel`, `manualChecklists.enabled`, `additionalAutomation`, `ignore`, `update.criticalChangeRules.*`, `update.preserveUserAuthoredCases`, `update.writeMetaMarker` — all match).

Schema validation evidence (ajv@8, run in `/tmp/judge-subtask02`):

- `cleanup-plan.schema.json` validates against the draft-07 metaschema (`ajv.getSchema("http://json-schema.org/draft-07/schema")` → `true`).
- Sample payloads compiled and validated against the schema:
  - empty plan (`old_snapshot.source === "missing"`, zero groups) → valid.
  - framework-switch plan (`pytest → vitest`, `evals/conftest.py` + `static-test` file) → valid.
  - strategy-switch plan (`declarative → code`, `llm-case` file with `preserve_user_authored: true`) → valid.
  - sentinel invalid `reason: "wrong-reason"` → correctly rejected with the expected enum error.
- The two new generated eval cases' `_meta` blocks (cases id 3 and 4) validate against `case-meta.schema.json`; cases 1 and 2 are preserved verbatim with no `_meta` (user-authored).

`manifest-snapshot.ts` runtime smoke checks (via `npx tsx -e ...`):

- Live repo (`process.cwd()`) → `source: "filesystem"`, `static.framework: "pytest"` (from `evals/conftest.py`), `llm: {}`, 36 `evalFiles` from manifest targets — matches the executor's claim.
- Empty tmp dir (`/tmp/judge-empty`) → `source: "missing"`, `static: {}`, `llm: {}`, `evalFiles: []` — confirms the missing-snapshot → empty cleanup_plan invariant.
- Synthetic manifest with v2 `discovery_config.static` + `discovery_config.llm` → `source: "manifest"`, full snapshot returned — confirms the canonical-source branch.
- Filesystem fallback covers `evals/conftest.py`, `vitest.config.{ts,mts,js,cjs,mjs}`, `jest.config.{ts,js,cjs,mjs}` as required by the deliverables checklist.

Schema completeness check on `cleanup-plan.schema.json`: `schema_version` (const 1), `generated_at`, `generated_by` (enum: `zoto-eval-configure` / `eval-cleanup-stale`), `old_snapshot`, `new_snapshot`, `groups[].reason` enum (`framework-switch` / `strategy-switch` / `removed-target`), `groups[].files[]` with `path` + `kind` enum (`framework-fingerprint` / `static-test` / `llm-test` / `llm-case` / `eval-json` / `directory` / `config-snippet`), `totals.files`, `warnings[]`, plus `groups[].files[].preserve_user_authored` sentinel and `target_id` cross-reference to `manifest.schema.json` target id pattern — all present.

Cross-reference check: SKILL.md Step 4 and the agent prompt's Critical Rules block both explicitly state subtask 03's `eval-cleanup-stale --dry-run` stdout MUST agree byte-for-byte with this schema; the schema's `description` and `generated_by` enum return the favour by naming subtask 03 as the second producer.

Linter check: `ReadLints` over all six modified files reported zero diagnostics.

Constraints respected: did not modify code, schemas, or eval cases. Only this subtask file was edited (Independent Verification block appended; checklist state preserved as-is because every item was independently confirmed).
