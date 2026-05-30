# Subtask: Update analyser cache & re-stamp test files

## Metadata
- **Subtask ID**: 12
- **Feature**: Eval Prompt Realism Audit
- **Assigned Subagent**: generalPurpose
- **Suggested Model**: composer-2.5-fast
- **Dependencies**: 05, 06, 07, 08, 09, 10
- **Created**: 20260525

## Objective

Reflect every Phase 3 and Subtask 10 rewrite into the cached analyser payloads under `.zoto/eval-system/cache/analyser/*.json` so the next `pnpm run eval:update --apply --no-analyser` reuses the curated rewrite (not the stale, internal-mechanic original), then run that command (with `--overwrite` to force re-stamping past the file-level `// _meta.generated: true` guard) so the LLM-strategy code-backend test files under `evals/llm/test_*.test.ts` and any static-vitest stamped files under `evals/test_*.test.ts` actually carry the rewritten `CASES[]` bodies. The cached payloads' envelope fields (`schema_version`, `analyser_version`, `model_id`, `target_id`, `kind`, `source_path`, `source_hash`, `summary`, `fixtures`) MUST be preserved verbatim — only the per-case body (`prompt`, `assertions[]`, `expected_output`, `follow_ups`, `scenario`) changes. This subtask does NOT touch `.zoto/eval-system/manifest.yml` or `manifest.history.yml` — those remain Subtask 11's exclusive responsibility.

## Deliverables Checklist
- [x] For each `(target_id, kind)` in `audit/eval-rewrites.json` whose `preserve` is `false`, locate the matching cached analyser payload at `.zoto/eval-system/cache/analyser/*.json` via target_id match (loader at `plugins/zoto-eval-system/engine/update.ts:1322–1329`) and update its `cases[].prompt`, `cases[].assertions[]`, `cases[].expected_output`, `cases[].follow_ups` (if present), and `cases[].scenario` (if newly named) to mirror the Phase 3 rewrites. Preserve `schema_version`, `analyser_version`, `model_id`, `target_id`, `kind`, `source_path`, `source_hash`, `summary`, and `fixtures` blocks verbatim.
- [x] Run `pnpm run eval:update --apply --no-analyser --overwrite` (the `--overwrite` flag is required to re-stamp test files whose first-line guard already reads `// _meta.generated: true`). Capture stdout + exit code in the status report.
- [x] Verify `git diff --stat evals/llm/test_*.test.ts` shows only `CASES[]` body changes; the first-line `// _meta.generated: true` guard MUST be unchanged on every modified file.
- [x] Verify `git diff --stat evals/test_*.test.ts` shows only embedded-case changes if the static-vitest backend has any stamped files; same first-line guard discipline applies.
- [x] Confirm no file outside `.zoto/eval-system/cache/analyser/`, `evals/llm/`, `evals/` (root test files only) is touched.
- [x] Confirm `.zoto/eval-system/manifest.yml` / `manifest.history.yml` are NOT touched by this subtask (those remain Subtask 11's exclusive responsibility).

## Definition of Done
- [x] Every Phase 3 + Subtask 10 rewrite is reflected in the corresponding test file's `CASES[]`.
- [x] Every cached analyser payload's envelope fields (`schema_version`, `analyser_version`, `model_id`, `target_id`, `kind`, `source_path`, `source_hash`, `summary`, `fixtures`) are unchanged.
- [x] The first-line `// _meta.generated: true` guard is intact on every regenerated test file under `evals/llm/` and `evals/` (verified by `head -n 1` per file).
- [x] No manifest write occurred (`git diff .zoto/eval-system/manifest.yml .zoto/eval-system/manifest.history.yml` is empty after this subtask completes).
- [x] `pnpm run eval:update --apply --no-analyser --overwrite` exited 0.

## Implementation Notes

### Why this subtask exists

Phase 3 + S10 rewrote the per-case bodies inside the central command / agent / hook eval JSONs and (in S07/S08/S09) the per-skill `evals/evals.json` files. Those JSONs are the input contract for the LLM-strategy code-backend stamper (`plugins/zoto-eval-system/engine/update.ts` `applyStamping` path), but the stamper actually reads from the **cached analyser payload** (`.zoto/eval-system/cache/analyser/<target>.json`) when re-emitting `evals/llm/test_*.test.ts` files. If the cache still carries the stale, internal-mechanic case bodies, the next `pnpm run eval:update --apply --no-analyser` will regenerate the test files using the cached (old) text and silently overwrite the Phase 3 / S10 realism work.

This subtask updates the cache to match the rewrites, then forces the stamper to re-emit. Subtask 11 then runs the final validation gates against the now-aligned tree.

### Cache file shape

Each cached payload at `.zoto/eval-system/cache/analyser/<target>.json` validates against `plugins/zoto-eval-system/templates/schema/analyser-payload.schema.json`. The cases inside the cache use the `scenario` slug as the case identifier (not the numeric `id` used in the central eval JSONs). When matching cases across the two sources:

- Central eval JSON `cases[]` is keyed by numeric `id` (1, 2, 3, …).
- Cached analyser payload `cases[]` is keyed by `scenario` slug (e.g. `happy-path-operator-approves-all-defaults`).

The mapping from `id` → `scenario` is preserved in `audit/eval-rewrites.json` per case (the `scenario` key is included where the rewrite renamed it; otherwise the original scenario string is reused). Use that mapping verbatim — do NOT re-derive it.

### Procedure per cached payload

For each entry in `audit/eval-rewrites.json` keyed by a central plugin eval JSON path (not the per-skill files — those have no separate cache; their cases ARE the stamped output):

1. Resolve the `target_id` (carried in `audit/eval-rewrites.json[<path>].target_id`).
2. Locate `.zoto/eval-system/cache/analyser/<file>.json` whose payload's `target_id` field matches. Use the loader at `plugins/zoto-eval-system/engine/update.ts:1322–1329` as the reference implementation; do NOT scan filenames heuristically — the canonical mapping is the payload's `target_id`, not the filename.
3. For each case the rewrites payload marks `preserve: false`:
   - Match the cached payload's case by `scenario` slug.
   - Replace `cases[<slug>].prompt`, `cases[<slug>].assertions[]`, `cases[<slug>].expected_output`, and `cases[<slug>].follow_ups` (when present) with the rewrite values.
   - If the rewrite renames the scenario, update `cases[<slug>].scenario` accordingly AND record the rename in the status report's `notes`.
   - Leave `fixtures` and `fixture_justifications[]` untouched (no Phase 3 subtask edits fixtures).
4. Preserve every envelope field verbatim: `schema_version`, `analyser_version`, `model_id`, `target_id`, `kind`, `source_path`, `source_hash`, `summary`.
5. Write the file back with stable two-space JSON indent + trailing newline.

### Forced re-stamp

```bash
pnpm run eval:update --apply --no-analyser --overwrite 2>&1 | tee /tmp/eval-restamp.log
echo "exit=$?" >> /tmp/eval-restamp.log
```

`--overwrite` is required because the first-line `// _meta.generated: true` guard (defined in `plugins/zoto-eval-system/engine/_user-case-guards.ts`) makes the stamper refuse to overwrite existing test files by default — that guard is what protects user-edited test files from being clobbered. With `--overwrite`, the stamper trusts the cache and re-emits.

### Post-stamp invariants to verify

- `head -n 1 evals/llm/test_*.test.ts | grep -c "_meta.generated: true"` equals the file count (every file's first line is the guard).
- `git diff --name-only .zoto/eval-system/manifest.yml .zoto/eval-system/manifest.history.yml` returns empty (this subtask never touches the manifest).
- `git diff --stat evals/llm/test_*.test.ts evals/test_*.test.ts` shows only `CASES[]` body changes (no first-line / config-block changes).

### Out-of-scope

- Manifest refresh (Subtask 11).
- Append to `manifest.history.yml` (Subtask 11).
- Per-skill `evals/evals.json` updates (those were Subtasks 07/08/09's responsibility; they have no separate cache because the per-skill file IS the stamped output).
- `evals/llm/test_*` files whose target is not in `audit/eval-rewrites.json` (i.e. user-authored test files identified via the absence of the `// _meta.generated: true` line-1 marker) — leave untouched.

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites. Run only:
- `python3 -c "import json,glob; [json.load(open(f)) for f in glob.glob('.zoto/eval-system/cache/analyser/*.json')]"` — cache JSON-parse sweep.
- `head -n 1 evals/llm/test_*.test.ts | grep -c "_meta.generated: true"` (and the equivalent for `evals/test_*.test.ts`) — first-line guard discipline.
- `git diff --name-only .zoto/eval-system/manifest.yml .zoto/eval-system/manifest.history.yml` — expected: empty.

Defer the three validation gates (`eval:list`, `eval -- --collect-only`, `eval:update --check`) to Subtask 11.

## Execution Notes

Judge fix applied: `apply-cache-rewrites.py` case mapping now uses `(prompt, follow_ups)` signatures
and central eval JSON case ids instead of prompt-first dedup. Re-run: 15 cache files / 59 cases
updated; 15 LLM tests re-stamped via `restamp-llm-from-cache.ts`; `/tmp/eval-restamp.log` captured
(eval:update exit=0). Parity verified for `command:z-eval-advise` and
`agent:zoto-eval-analyser-subagent`.

### Agent Session Info
- Agent: [Not yet assigned]
- Started: [Not yet started]
- Completed: [Not yet completed]

### Work Log
[Agent adds notes here during execution]

### Blockers Encountered
[Any blockers or issues]

### Files Modified
[List of files changed]
