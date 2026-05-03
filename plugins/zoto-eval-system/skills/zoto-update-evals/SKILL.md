---
name: zoto-update-evals
description: Diff-aware eval updater. Detects drift between covered targets and generated eval cases, classifies changes as critical or non-critical, offers surgical diffs to apply via askQuestion, and preserves user-authored cases verbatim. Supports targeted mode (file/glob), rediscovery mode, and a CI-friendly --check mode (exit 2 on critical drift).
---

# Update Evals

Surgical diff engine that keeps generated eval cases honest. User-authored cases are never mutated — this contract is enforced at runtime and at compile time.

## Configuration

Reads `.zoto-eval-system/config.json` and `.zoto-eval-system/manifest.yml`. Both must exist; if the manifest is missing, the skill aborts with `"Run /zoto-eval-create first."`.

The rediscovery path uses `manifest.discovery_config` — a deep snapshot of the discovery config at the last create or update — rather than the current `config.json`. This prevents edits to `config.json` from masquerading as code drift.

## Modes

| Invocation | Interactive? | Writes? |
|------------|--------------|---------|
| `/zoto-eval-update --check` | no | no — exits 0 or 2 |
| `/zoto-eval-update` (no args) | no | no — rediscovery dry run |
| `/zoto-eval-update --apply` | yes, askQuestion per change | yes |
| `/zoto-eval-update <file-or-glob>` | no | no — targeted dry run |
| `/zoto-eval-update <file-or-glob> --apply` | yes, askQuestion per change | yes |

## When to Use

- Immediately after `/zoto-eval-create` (should no-op).
- Whenever a covered target (skill body, agent body, command, lib export, hook script) is edited.
- In CI — the `--check` variant is designed to gate builds.

## Workflow (rediscovery apply)

### Step 1: Load manifest and config

Read `.zoto-eval-system/config.json` and `.zoto-eval-system/manifest.yml`. Record `previous_ref = manifest.git_ref`. Compute `current_ref = git rev-parse HEAD`.

### Step 2: Rediscover

Run `scripts/eval-discover.ts` using `manifest.discovery_config`. Produce a fresh list of targets with content hashes and public-surface data.

### Step 3: Classify deltas

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

### Step 4: Build surgical diffs

- `added` → propose a brand-new generated case (full `_meta` block with `generated: true`, current source_hash, ISO timestamp, `generated_by: zoto-update-evals`).
- `removed` → mark each covering generated case `orphaned` and offer deletion.
- `modified` → regenerate ONLY cases where `case._meta?.generated === true` AND `case._meta.source_hash === previous.content_hash`. Cases without `_meta`, or with `_meta.generated === false`, are NEVER modified — instead they are flagged as `may need review` in the summary.

### Step 5: askQuestion per change

Present each surgical diff via `askQuestion` with options:
- `accept`
- `reject`
- `edit` (opens the proposed case for user edits before writing)
- `skip-rest`

### Step 6: Write

For accepted changes:
- Write line-level patches into the target `evals.json` files. Preserve the order of unchanged cases — no whole-file rewrites.
- Update `_meta.source_hash` to the new hash and `_meta.last_updated` to now.
- Rewrite `.zoto-eval-system/manifest.yml` (new `git_ref`, new `updated_at`, `generated_by: zoto-update-evals`).
- APPEND the new manifest snapshot to `.zoto-eval-system/manifest.history.yml`.

### Step 7: Summary

Print a table: `{ added, removed, modified-applied, modified-skipped, orphaned, user-authored-flagged }`.

## Workflow (targeted)

Given `<file-or-glob>`:

1. Resolve against the repository (respect `.gitignore`).
2. For each resolved file, call `scripts/eval-discover.ts --resolve <file>` to get the target(s) it represents.
3. Recompute each target's `content_hash`. If no covering `eval_files` exist, propose creating one. If covering `eval_files` exist, regenerate only cases where `_meta?.generated === true`.
4. `askQuestion` per change before writing.

## Workflow (--check)

Non-interactive. Prints structured JSON-line deltas to stdout/stderr. Exits `0` if no critical drift, else exits `config.update.checkExitCodeOnCriticalDrift` (default `2`).

## Surgical-diff invariants

Enforced by `scripts/validate-plugin.ts` and tests:

- Cases without `_meta` (or with `_meta.generated === false`) are immutable to the updater.
- Order of unchanged cases is preserved.
- All generated cases include `_meta` with current `source_hash` and ISO-8601 `last_updated`.
- `manifest.history.yml` is append-only — never rewritten, never compacted.

## What NOT to Do

- Do not touch user-authored cases. Ever.
- Do not use the current `config.json.discoveryTargets` when rediscovering — always use `manifest.discovery_config`.
- Do not rewrite whole `evals.json` files — patch at case granularity.
- Do not skip askQuestion in `--apply` modes.
