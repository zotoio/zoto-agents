---
name: zoto-update-evals
description: "Diff-aware eval updater. Detects drift between covered targets and generated eval cases for skills and central plugin eval files (commands/agents/hooks), classifies changes as critical or non-critical, and preserves user-authored cases verbatim. Apply-mode regeneration re-invokes the LLM analyser per drifted primitive and dispatches per-framework / per-strategy stamping (CI defaults to cached analyser payloads unless `--with-analyser`). The `_meta.generated === true` (case) and `// _meta.generated\\: true` (file) contracts are enforced at runtime AND compile time. Supports targeted mode, rediscovery mode, `--no-analyser` / CI cache reuse, and CI `--check` (exit 2 on critical drift)."
---

# Update Evals

Surgical diff engine that detects when covered AI primitives have changed and presents each proposed eval update for user confirmation before writing. Behavioural drift is managed consciously — nothing is rewritten silently. User-authored cases are never mutated and user-authored test files are never overwritten — both contracts are enforced at runtime and at compile time, gated by the canonical helpers in `plugins/zoto-eval-system/engine/_user-case-guards.ts` (`isGeneratedCase`, `isGeneratedFile`).

## Configuration

Reads `.zoto/eval-system/config.yml` and `.zoto/eval-system/manifest.yml`. Both must exist; if the manifest is missing, the skill aborts with `"Run /z-eval-create first."`.

The rediscovery path uses `manifest.discovery_config` for **skillsRoots**, **discoveryTargets**, optional **ignore** globs, and the rest of the stored discovery snapshot — not live `config.yml` discovery fields during **full-catalog** rediscovery (`--check` or rediscovery without `--target`). **`--target`** runs use the live `config.yml` for discovery enumeration. (`eval-analyse.ts` / `eval-stamp.ts` do not re-apply ignore filters when analysing or stamping a target.)

The active framework / strategy is read via `plugins/zoto-eval-system/engine/manifest-snapshot.ts#readManifestSnapshot()` (subtask 02). The `static.framework` field selects the static stamper (pytest / vitest / jest); the `llm.strategy` field selects the LLM stamper (`code` or `declarative`).

## Coverage paths

Drift detection considers eval files at:

- Skills: `…/skills/<name>/evals/evals.json` (under configured `skillsRoots`).
- Commands: `plugins/<plugin>/evals/commands/<name>.json` **and** `.cursor/evals/commands/<name>.json`.
- Agents: `plugins/<plugin>/evals/agents/<name>.json` **and** `.cursor/evals/agents/<name>.json`.
- Hooks: `plugins/<plugin>/evals/hooks/<plugin>.json` **and** `.cursor/evals/hooks/hooks.json` (canonical target id **`hook:cursor-workspace`**).

The **preserve user-authored cases** contract applies uniformly: no `_meta`, or `_meta.generated === false` → never overwritten.

## Modes

| Invocation | Interactive? | Writes? |
|------------|--------------|---------|
| `/z-eval-update --check` | no | no — exits 0 or 2 |
| `/z-eval-update` (no args) | no | no — rediscovery dry run |
| `/z-eval-update --apply` | command-owned `askQuestion` per change + resume | yes |
| `/z-eval-update --target <glob>` | no | no — targeted dry run |
| `/z-eval-update --target <glob> --apply` | command-owned `askQuestion` per change + resume | yes |
| `/z-eval-update --no-analyser [--apply]` | as above | yes/no — bypasses LLM, reuses cached payloads |
| Env `CI=true` without `--with-analyser` | same interaction/write semantics as invocation without `--with-analyser` | skips LLM; reuses payloads like `--no-analyser` |
| `/z-eval-update --with-analyser …` | applies to whichever mode you combine | forces fresh `runAnalyser` despite `CI=true` |

## When to Use

- Immediately after `/z-eval-create` (should no-op).
- Whenever a covered target (skill body, agent body, command, hook definition) is edited.
- In CI — the `--check` variant is designed to gate builds.

## Workflow (`--apply`)

### Step 1: Load manifest, config, and snapshot

Read `.zoto/eval-system/config.yml` and `.zoto/eval-system/manifest.yml`. Record `previous_ref = manifest.git_ref`. Compute `current_ref = git rev-parse HEAD`. Call `readManifestSnapshot()` for the active `static.framework` / `llm.strategy` / `llm.codeFramework`.

### Step 2: Rediscover

Run discovery using **`manifest.discovery_config`** for full-catalog modes (`--check`, rediscovery dry/apply with no `--target`). For **`--target …`** invocations, use the current `.zoto/eval-system/config.yml` discovery fields so the narrowed scope matches the live scaffold. Produce a fresh list of targets with `content_hash` values and `public_surface` data.

### Step 3: Classify manifest deltas

- `added` — target present now, absent in manifest.
- `removed` — target present in manifest, absent now.
- `modified` — content hash differs.
- `unchanged` — same hash.

Classify each delta against `config.update.criticalChangeRules`:

| Kind | Critical when |
|------|--------------|
| added | `addedTargetWithoutCoverage` is enabled |
| removed | covered by at least one active generated case AND `removedTargetWithActiveCases` enabled |
| modified (frontmatter name/description) | `skillFrontmatterChange` enabled |
| modified (public surface) | `publicSurfaceChange` enabled |
| modified (comment / whitespace only) | non-critical |

### Step 4: Per-primitive analyser refresh

For each `added` or `modified` target:

- **Default**: call `runAnalyser({ target, invalidate: true })` from ``pnpm run eval:analyse`` — refreshes the per-primitive `_meta.primitive_analysis` payload from the LLM.
- **`--no-analyser`** (or **`CI=true` without `--with-analyser`**): load the cached payload from `.zoto/eval-system/cache/analyser/<source_hash>.json` instead. When `process.env.CI === "true"` in that cached-analysis mode, stderr writes `[CI WARNING] skipping fresh primitive analysis in CI; reusing payloads from .zoto/eval-system/cache/analyser/`. **`--with-analyser`** opts into LLM refreshes even on CI hosts. Optional escalation: `update.failOnNoAnalyserInCI: true` aborts with exit code 5 right after that stderr banner.

### Step 5: Dispatch regeneration

The dispatcher reads the manifest snapshot and routes per-primitive payloads to the framework-specific helpers:

| `static.framework` | helper |
|---|---|
| `pytest` | `regeneratePytest()` → `stampPytestPerPrimitive()` |
| `vitest` | `regenerateVitest()` → `stampVitestPerPrimitive()` |
| `jest` | `regenerateJest()` → `stampJestPerPrimitive()` |

| `llm.strategy` | helper |
|---|---|
| `code` | `regenerateLlmCode()` → `stampLlmCodeStrategy()` |
| `declarative` | `regenerateLlmDeclarative()` → surgical `evals.json` edits via `json-source-map` + `buildDeclarativeStampedCase()` |

**Hard-coded file-level guard** (every `*.test.ts` / `*.test.js` / `*.test.py` overwrite): each helper calls `isGeneratedFile(path)` from `plugins/zoto-eval-system/engine/_user-case-guards.ts`. A file lacking the literal `// _meta.generated: true` (TS) or `# _meta.generated: True` (Python) marker on its first line is **user-authored** — the helper skips the write, records the path under `files_preserved`, and emits a `manual_merge_required` note.

**Hard-coded case-level guard** (every `evals.json` row mutation): `regenerateLlmDeclarative()` parses the file with `json-source-map`, walks the cases array, and per row calls `isGeneratedCase(c)`. User-authored cases (no `_meta`, or `_meta.generated === false`) are preserved byte-identically — only their containing file's generated rows are surgically replaced via per-pointer byte splicing.

### Step 6: Write

For accepted changes:
- Per-framework helpers write per-primitive test files (only when guard passes).
- `regenerateLlmDeclarative()` writes the merged `evals.json` (only when bytes differ).
- Refresh `.zoto/eval-system/manifest.yml` with new `git_ref`, `updated_at`, `generated_by: zoto-update-evals`, and the rediscovered `targets[]` (each carries a fresh `content_hash`).
- APPEND the new manifest snapshot to `.zoto/eval-system/manifest.history.yml` (append-only — never compacted).

### Step 7: Summary

Print a structured JSON summary: `{ mode, regenerated_targets, files_written, files_preserved_user_authored, user_cases_preserved, reports[] }`. Each `report` lists framework + strategy, `files_written`, `files_preserved` (user-authored skips), `cases_replaced`, `cases_added`, `cases_removed`, `user_cases_preserved`, and any `notes[]`.

## Workflow (`--target <glob>`)

Given `<glob>`:

1. Resolve against discovered targets — match either `target.path` or `target.id` against the glob (dot-aware).
2. Filter `current` and only compute deltas for the resolved subset.
3. Apply-mode decisions arrive via command resume — not via skill `askQuestion`.

## Workflow (`--check`)

Non-interactive. The check:

1. Runs `pnpm exec tsx scripts/check-analyser-payload-parity.ts` (TS↔Python `AnalyserPayload` parity gate). Drift surfaces under `parity_drift` in the report.
2. Computes deltas as above.
3. Emits a single JSON summary line plus per-critical-delta JSON-line stderr entries.
4. Exits `0` on clean drift + parity, else `config.update.checkExitCodeOnCriticalDrift` (default `2`).

This mode is wired into subtask 12's orchestrator drift hook; keep `--check` non-interactive at all times.

## Surgical-diff invariants

Enforced by the unit suite at `scripts/__tests__/eval-update-guards.test.ts`:

- A user-authored case in a mixed `evals.json` is byte-identical (canonical JSON) before and after `--apply`.
- A `*.test.ts` lacking the marker is byte-identical before and after `--apply`.
- A `*.test.ts` with the marker is regenerated.
- Cached-analysis CI runs (`CI=true`, without `--with-analyser`, or explicit `--no-analyser`) emit the `[CI WARNING] skipping fresh primitive analysis` stderr line.

## What NOT to Do

- Do not touch user-authored cases. Ever.
- Do not overwrite a `*.test.{ts,js,py}` file lacking the literal first-line `_meta.generated` marker — log `manual_merge_required` instead.
- Do not use the current `config.yml` discovery fields for **full-catalog** rediscovery — always enumerate from `manifest.discovery_config` (**including snapshot `skillsRoots`, `discoveryTargets`, and `ignore`**). Edits to live `config.yml` alone do not change rediscovery unless you re-run `/z-eval-create` or refresh the manifest snapshot. Targeted `--target` flows use live `config.yml`.
- Do not rewrite whole `evals.json` files when a surgical replacement suffices — always go through `surgicallyReplaceGeneratedCases()` for mixed files.
- Do **not** call `askQuestion` from inside the skill — the command owns interactive prompts.
- If a palette-driven or resumed apply flow reaches an undocumented branch, return structured `needs_user_input` (validate against `plugins/zoto-eval-system/templates/schema/needs-user-input.schema.json`) for the command instead of calling `askQuestion` from the skill.
