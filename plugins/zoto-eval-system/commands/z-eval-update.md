---
name: z-eval-update
description: "Diff-aware eval updater. Re-invokes the LLM analyser per drifted primitive, dispatches per-framework / per-strategy regeneration through hard-coded user-case preservation gates, and appends a manifest snapshot. Command-owned askQuestion per change in apply modes; subagent uses resume. The `_meta.generated` (case) and `// _meta.generated\\: true` (file) contracts are enforced at runtime AND compile time. Targeted, rediscovery, `--no-analyser`, and CI `--check` modes."
---

# z-eval-update

Detects when covered AI primitives have changed and presents each proposed eval update for user confirmation before writing. Behavioural drift is managed consciously — nothing is rewritten silently. User-authored cases (no `_meta`, or `_meta.generated === false`) are NEVER mutated; user-authored test files (no first-line `_meta.generated` marker) are NEVER overwritten. Both contracts are enforced at runtime AND compile time via `plugins/zoto-eval-system/engine/_user-case-guards.ts`.

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
| `--no-analyser` | Reuse cached payloads from `.zoto/eval-system/cache/analyser/`. **`CI=true` without `--with-analyser` matches this**. With `process.env.CI === "true"` stderr emits `[CI WARNING] skipping fresh primitive analysis in CI; reusing payloads from .zoto/eval-system/cache/analyser/`. Optional escalation: `update.failOnNoAnalyserInCI: true` exits 5 right after that banner. |
| `--with-analyser` | Forces `runAnalyser` even under `CI=true` (fresh LLM analysis). Overrides the CI default cached-analyser path. |

## Instructions

### Precondition

Before doing anything else, verify that **`.zoto/eval-system/config.yml`** exists at the repository root. If it does not, abort with the exact message:

> Eval System is not initialised. Run `/z-eval-init` first to create `.zoto/eval-system/config.yml`.

Do not synthesize a default config and do not proceed.

### Pre-collect

- **`--check`**: none — fully non-interactive.
- **`--apply`** / **targeted apply**: no upfront checklist — instead, **per-change** `askQuestion` as each diff is presented by the subagent (or consume batched `needs_user_input` from the subagent and map each to `askQuestion`).
- **`--no-analyser` / CI default**: Cached payloads behave the same (`CI=true` omits `--with-analyser` unless you need LLM refreshes). In CI the stderr warning fires automatically whenever cached analysis applies.

### Spawn subagent

Spawn a `zoto-eval-updater` subagent that uses the `zoto-update-evals` skill.

### Resume loop

Palette-driven or unexpected subagent branches must surface as structured `needs_user_input` for this command — the subagent never calls `askQuestion` itself.

When the subagent returns `needs_user_input` for an apply decision, run `askQuestion`, then **resume** with the user's choice. Repeat until completion.

### Argument handling

- **No args**: rediscovery dry-run. With `--apply`, command-driven prompts per change.
- **`--target <glob>`**: targeted mode. Same dry-run / apply semantics.
- **`--check`**: non-interactive CI mode. Always runs the parity self-check first.
- **`--no-analyser`** or **`CI=true` without `--with-analyser`**: applies cached analyser payloads and emits the CI stderr warning when cached mode is active (`--with-analyser` forces fresh analyse).

### What happens (apply modes)

1. Load `.zoto/eval-system/config.yml`, `.zoto/eval-system/manifest.yml`, and the manifest snapshot (`plugins/zoto-eval-system/engine/manifest-snapshot.ts#readManifestSnapshot()`). Abort if the manifest is missing.
2. **Full-catalog** rediscover (`--check`, rediscovery dry/apply) using **`manifest.discovery_config`** only (not live `config.yml` discovery fields). **`--target`** modes use the current `config.yml` for discovery enumeration so operators can align with the live scaffold.
3. Classify each delta against `config.update.criticalChangeRules`.
4. For each `added` / `modified` target:
   - Refresh analyser payload via `runAnalyser({ target, invalidate: true })` (skipped under `--no-analyser` or `CI=true` without `--with-analyser`).
   - Dispatch to the per-framework static helper (`regeneratePytest` / `regenerateVitest` / `regenerateJest`) and/or the single unified LLM helper `regenerateLlm` (re-stamps the co-located `<kind>/evals/<name>.json` for the target).
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
- `pnpm run eval:update -- --apply` — interactive regeneration; requires `CURSOR_API_KEY` unless cached-analyser mode applies (`--no-analyser` or `CI=true` without `--with-analyser`).
