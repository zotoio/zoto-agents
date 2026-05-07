---
name: z-eval-update
description: "Diff-aware eval updater. Re-invokes the LLM analyser per drifted primitive, dispatches per-framework / per-strategy regeneration through hard-coded user-case preservation gates, and appends a manifest snapshot. Command-owned askQuestion per change in apply modes; subagent uses resume. The `_meta.generated` (case) and `// _meta.generated\\: true` (file) contracts are enforced at runtime AND compile time. Targeted, rediscovery, `--no-analyser`, and CI `--check` modes."
---

# z-eval-update

Detects when covered AI primitives have changed and presents each proposed eval update for user confirmation before writing. Behavioural drift is managed consciously — nothing is rewritten silently. User-authored cases (no `_meta`, or `_meta.generated === false`) are NEVER mutated; user-authored test files (no first-line `_meta.generated` marker) are NEVER overwritten. Both contracts are enforced at runtime AND compile time via `evals/_llm/_user-case-guards.ts`.

## Usage

```
/z-eval-update                                  # rediscovery dry-run
/z-eval-update --apply                          # rediscovery apply (command askQuestion per change)
/z-eval-update --target <glob>                  # targeted dry-run (matches target.path or target.id)
/z-eval-update --target <glob> --apply          # targeted apply
/z-eval-update --check                          # CI gate (exit 0 or 2); runs parity check first
/z-eval-update --no-analyser [--apply|--check]  # skip LLM call; reuse cached _meta.primitive_analysis
```

## Flag set

| Flag | Behaviour |
|------|-----------|
| `--check` (default for CI) | Drift report only. Runs `pnpm exec tsx scripts/check-analyser-payload-parity.ts` first; surfaces drift in `parity_drift`. Exit `config.update.checkExitCodeOnCriticalDrift` (default 2) on critical drift, else 0. Subtask 12's orchestrator drift hook calls this mode. |
| `--apply` | Per-primitive regeneration. Each drifted primitive triggers `runAnalyser({ invalidate: true })` (LLM) then dispatches to the per-framework / per-strategy stamper. The command runs `askQuestion` per critical drift; the subagent yields decisions via resume. |
| `--target <glob>` | Restrict scope to a subset of primitives. Glob matches against `target.path` or `target.id` (dot-aware, via minimatch). |
| `--no-analyser` | Reuse cached `_meta.primitive_analysis` payloads from `.zoto/eval-system/cache/analyser/`. With `process.env.CI === "true"` this emits `[CI WARNING] --no-analyser used in CI; cached analyser payloads may be stale and produce drift` to stderr. Optional config escalation: `update.failOnNoAnalyserInCI: true` aborts with exit 5. |

## Instructions

### Precondition

Before doing anything else, verify that **`.zoto/eval-system/config.yml`** exists at the repository root. If it does not, abort with the exact message:

> Eval System is not initialised. Run `/z-eval-init` first to create `.zoto/eval-system/config.yml`.

Do not synthesize a default config and do not proceed.

### Pre-collect

- **`--check`**: none — fully non-interactive.
- **`--apply`** / **targeted apply**: no upfront checklist — instead, **per-change** `askQuestion` as each diff is presented by the subagent (or consume batched `needs_user_input` from the subagent and map each to `askQuestion`).
- **`--no-analyser`**: confirm the operator understands cached payloads may be stale. In CI the stderr warning is automatic.

### Spawn subagent

Spawn a `zoto-eval-updater` subagent that uses the `zoto-update-evals` skill.

### Resume loop

When the subagent returns `needs_user_input` for an apply decision, run `askQuestion`, then **resume** with the user's choice. Repeat until completion.

### Argument handling

- **No args**: rediscovery dry-run. With `--apply`, command-driven prompts per change.
- **`--target <glob>`**: targeted mode. Same dry-run / apply semantics.
- **`--check`**: non-interactive CI mode. Always runs the parity self-check first.
- **`--no-analyser`**: applies to every mode; reuses cached analyser payloads and emits the CI warning when applicable.

### What happens (apply modes)

1. Load `.zoto/eval-system/config.yml`, `.zoto/eval-system/manifest.yml`, and the manifest snapshot (`evals/_llm/manifest-snapshot.ts#readManifestSnapshot()`). Abort if the manifest is missing.
2. Rediscover using `manifest.discovery_config`.
3. Classify each delta against `config.update.criticalChangeRules`.
4. For each `added` / `modified` target:
   - Refresh analyser payload via `runAnalyser({ target, invalidate: true })` (skipped under `--no-analyser`).
   - Dispatch to the per-framework helper (`regeneratePytest` / `regenerateVitest` / `regenerateJest`) AND/OR the per-strategy helper (`regenerateLlmCode` / `regenerateLlmDeclarative`).
   - Each helper enforces the file-level guard (`isGeneratedFile`) before overwriting any test file and the case-level guard (`isGeneratedCase`) before mutating any `evals.json` row.
5. Command presents each change via `askQuestion` (accept / reject / edit / skip-rest), feeding answers back through resume.
6. Write accepted patches, refresh `.zoto/eval-system/manifest.yml` (new `git_ref`, `updated_at`, `targets[]`), append `.zoto/eval-system/manifest.history.yml`.
7. Summarise: `{ mode, regenerated_targets, files_written, files_preserved_user_authored, user_cases_preserved, reports[] }`.

## Related

- `zoto-eval-updater` agent — wraps the diff engine.
- `zoto-update-evals` skill — the documented workflow.
- `/z-eval-create` — prerequisite; initial scaffold produces the manifest.
- `/z-eval-execute` (subtask 12) — runs `pnpm run eval:update -- --check` as its drift hook.
- `pnpm run eval:update -- --check` — CI-equivalent non-interactive gate.
- `pnpm run eval:update -- --apply` — interactive regeneration; requires `CURSOR_API_KEY` unless `--no-analyser` is passed.
