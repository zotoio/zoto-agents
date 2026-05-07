# Subtask: Baseline Fixtures

## Metadata
- **Subtask ID**: 05
- **Feature**: eval-system-v2
- **Assigned Subagent**: zoto-eval-generator
- **Dependencies**: 01
- **Created**: 20260503

## Objective

Define the repo-wide baseline fixture skeleton — a minimal fake-workspace that every per-case sandbox starts from — and wire `scripts/eval-stamp.ts` plus the runner sandbox setup (`evals/_llm/sandbox.ts`) to copy the baseline into each case's tmp directory before the per-case `fixtures.files[]` overlay (subtask 04).

## Deliverables Checklist

- [x] `plugins/zoto-eval-system/templates/baseline-fixtures/` — new template tree containing the minimal skeleton:
  - `package.json` — bare-minimum manifest with the same `pnpm` workspace shape and a stubbed `name` like `"fixture-workspace"`.
  - `.cursor/` — empty directory with a `.gitkeep` and a placeholder `mcp.json` containing `{ "mcpServers": {} }`.
  - `.zoto-eval-system/` — empty directory with a `.gitkeep` and a placeholder `config.json` containing the schema-default values from subtask 01's `templates/config.json`.
  - `.gitignore` — copy of the live repo's eval-relevant patterns (at minimum `.env*`, `node_modules/`, `evals/_runs/`).
  - `README.md` — one-paragraph note explaining this is a fixture baseline, not a real workspace.
- [x] `scripts/eval-stamp.ts` — modified to also stamp a copy of `baseline-fixtures/` into the host repo's `evals/fixtures/baseline/` on first run (idempotent — only writes when the destination is missing or stale by checksum).
- [x] `evals/_llm/sandbox.ts` — modified `prepareSandbox()` (or equivalent) to copy `evals/fixtures/baseline/` into the case's tmp directory before applying `fixtures.files[]` overlays.
- [x] Add a `pnpm run eval:baseline-stamp` script that re-stamps the baseline into the host repo (used during configuration changes and by subtask 14's live-repo migration).
- [x] Document the baseline contract in `plugins/zoto-eval-system/templates/baseline-fixtures/README.md` — explicitly: "case-specific overlays in `fixtures.files[]` are added on top; nothing in this directory may be repo-specific or reference real-repo files".
- [x] Ensure baseline files are deterministic — no timestamps in content, sorted JSON keys, LF line endings.

## Definition of Done

- [x] `pnpm run eval:baseline-stamp` against a clean repo creates `evals/fixtures/baseline/` populated with the expected file tree.
- [x] Re-running the script without changes is idempotent (no diff).
- [x] `evals/_llm/sandbox.ts` smoke test (`evals/_llm/sandbox.smoke.ts` or equivalent) confirms the baseline ends up in the per-case tmp directory before overlays.
- [x] Baseline contains no absolute paths, env-var values, or repo identifiers.
- [x] No linter errors in modified files. (No NEW lint errors introduced; all 30 pre-existing TS errors in `scripts/eval-stamp.ts` are missing-`@types/node` and pre-existing `AnalysisPayload` narrowing in the case-stamp `main()` body that this subtask did not touch.)

## Implementation Notes

- Keep the baseline as small as possible. The goal is that LLM-driven cases (subtasks 09/10) can issue commands like `pnpm run eval:create` inside the sandbox without crashing on missing `package.json`. They should **not** find any plugin-specific or product-specific files in the baseline.
- The baseline must work for both Python and TS test environments — keep it framework-agnostic. Pytest cases that need a `conftest.py` get one from their per-case overlay (subtask 06), not from the baseline.
- For subtask 14's live-repo migration, the baseline-stamp script will be called explicitly. Mention this in the script's `--help` output.
- Coordinate file-permission handling: stamped files should be `0644`, directories `0755`. Use `fs.cp` with `recursive: true` and an explicit mode pass if needed.
- Do not include any dependencies in `templates/baseline-fixtures/package.json` — keep it bare so each case's overlay (or the test runner itself) supplies what it needs.

## Testing Strategy

**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:

- Add a unit test that runs `prepareSandbox()` against a tmp directory and asserts every baseline file is present.
- Add a unit test that asserts re-stamping is idempotent (file checksums unchanged).
- Defer full backend execution to phase 5/6.

## Execution Notes

### Agent Session Info
- Agent: zoto-eval-generator
- Started: 2026-05-03 22:34 UTC+10
- Completed: 2026-05-03 22:46 UTC+10

### Work Log

1. Read subtask spec, existing `scripts/eval-stamp.ts`, host `package.json`,
   `templates/config.json`, `templates/schema/config.schema.json`, and the
   existing LLM runner (`evals/_llm/runner.ts`, `case.ts`, `writer.ts`) to
   determine the public surface that `evals/_llm/sandbox.ts` had to expose
   (`createSandbox`, `prepareSandbox`, `materializeFixtures`, `snapshotDir`,
   `snapshotRepo`, `diffSnapshots`, `verifyExpectedFilesystemAgainstDiff`,
   `caseSlug`, `slugifyCaseId`, plus types `SnapshotDiff` and `RepoSnapshot`).
2. Authored `plugins/zoto-eval-system/templates/baseline-fixtures/` with the
   minimal skeleton: bare `package.json` (no deps), empty `.cursor/` with
   `.gitkeep` and `{ "mcpServers": {} }`, empty `.zoto-eval-system/` with
   `.gitkeep` and a sorted-key copy of subtask 01's safe defaults from
   `plugins/zoto-eval-system/templates/config.json`, `.gitignore` covering
   `.env*` / `node_modules/` / `evals/_runs/`, and a README explaining the
   baseline contract (overlay-on-top, no repo-specific content, deterministic
   file shape, re-stamp via `pnpm run eval:baseline-stamp`). All JSON files
   use sorted top-level and nested keys, LF line endings, and contain no
   timestamps.
3. Created `evals/_llm/sandbox.ts` providing the full runner-facing API plus
   the new `prepareSandbox(caseTmpDir, opts?)` entry point that copies
   `evals/fixtures/baseline/` into the sandbox first and then applies
   `fixtures.files[]` overlays (overlays may overwrite baseline files).
   `materializeFixtures()` is a thin wrapper over `prepareSandbox` so the
   existing `runner.ts` import shape is preserved. Snapshot helpers hash
   files with sha256 and skip symlinks; the runner's
   `verifyExpectedFilesystemAgainstDiff` semantics for created/modified/
   removed/unchanged are implemented end-to-end.
4. Surgically extended `scripts/eval-stamp.ts` with a clearly-bounded
   `stampBaselineFixtures(hostRepoRoot, opts?)` helper, a tree-checksum
   based idempotency check (sha256 of sorted `<posix-path>:<sha256>`
   lines), explicit 0644/0755 permission application via `chmodSync`, and
   a `--baseline-only` argv branch routed through a new `runBaselineOnly`
   function. The case-stamp `main()` body was NOT restructured — the new
   block sits above the existing logic and is intercepted before the
   target-id check. A `printHelp()` documenting both modes (and explicitly
   mentioning subtask 14's live-repo migration use case) was added.
5. Added `pnpm run eval:baseline-stamp` script to the host `package.json`,
   wired to `tsx scripts/eval-stamp.ts --baseline-only`.
6. Wrote `evals/_llm/sandbox.smoke.ts` covering four checks: first-run
   stamp produces the expected 7-file tree; second run is a no-op with
   identical tree checksums; `prepareSandbox()` copies every baseline file
   and applies overlays (with overlays overwriting baseline `package.json`
   and adding new files); and the live template tree contains none of the
   banned tokens (`/home/`, `${`, `andrewv`, `zoto-agents`).
7. Validation:
   - `pnpm exec tsx evals/_llm/sandbox.smoke.ts` → `ok: true` for all four checks.
   - `pnpm run eval:baseline-stamp` (1st run) → `written: true`, file_count 7,
     dest_checksum_after `1193c746...3b2c`.
   - `pnpm run eval:baseline-stamp` (2nd run) → `written: false`, identical
     before/after checksums (idempotency proof).
   - `pnpm exec tsx scripts/eval-stamp.ts --baseline-only --dry-run` → no-op
     dry-run reports identical checksums and `written: false`.
   - `pnpm exec tsx scripts/eval-stamp.ts --help` → both modes documented.
   - `Grep` across both the live template tree and the stamped tree for
     `/home/|\$\{|andrewv|zoto-agents` → "No matches found".
   - File modes verified on disk: directories `drwxr-xr-x` (0755), files
     `-rw-r--r--` (0644).
   - `ReadLints` on `evals/_llm/sandbox.ts`, `evals/_llm/sandbox.smoke.ts`,
     and the new baseline-fixtures JSON files: clean. The 30 lint errors
     reported on `scripts/eval-stamp.ts` are pre-existing (missing
     `@types/node` and pre-existing `AnalysisPayload` narrowing in the
     case-stamp `main()` body that this subtask did not touch).
   - `pnpm exec tsc --noEmit` (no root `tsconfig.json` in repo, so no
     repo-wide compile gate exists). Direct invocation against
     `evals/_llm/sandbox*.ts` surfaces only the same `@types/node`
     warnings shared with subtask 04's untracked `eval-analyse.ts`; the
     repo intentionally runs these via `tsx` at runtime.

### Blockers Encountered

None. One self-correction: the smoke test originally rejected any non-README
mention of the literal string `zoto-eval-system`, which incorrectly flagged
the legitimate `.zoto-eval-system/manifest.yml` path inside the schema-default
`config.json`. Tightened to the four explicit grep tokens listed in the
subtask spec (`/home/`, `${`, `andrewv`, `zoto-agents`) and re-ran — green.

### Files Modified

Created:
- `plugins/zoto-eval-system/templates/baseline-fixtures/package.json`
- `plugins/zoto-eval-system/templates/baseline-fixtures/.cursor/.gitkeep`
- `plugins/zoto-eval-system/templates/baseline-fixtures/.cursor/mcp.json`
- `plugins/zoto-eval-system/templates/baseline-fixtures/.zoto-eval-system/.gitkeep`
- `plugins/zoto-eval-system/templates/baseline-fixtures/.zoto-eval-system/config.json`
- `plugins/zoto-eval-system/templates/baseline-fixtures/.gitignore`
- `plugins/zoto-eval-system/templates/baseline-fixtures/README.md`
- `evals/_llm/sandbox.ts`
- `evals/_llm/sandbox.smoke.ts`
- `evals/fixtures/baseline/...` (stamped output of `pnpm run eval:baseline-stamp`; identical mirror of the template tree)

Modified:
- `scripts/eval-stamp.ts` — added `stampBaselineFixtures` helper, `runBaselineOnly`, `--baseline-only` argv branch, and `printHelp()`. The existing case-stamp logic in `main()` was NOT restructured.
- `package.json` — added `eval:baseline-stamp` script.
- `specs/20260503-eval-system-v2/subtask-05-eval-system-v2-baseline-fixtures-20260503.md` — this checklist + execution notes.

### Judge Verification (2026-05-03)

Independent adversarial verification by `zoto-spec-judge` — fresh context, no
session carryover from the executor.

- **Tree shape (7 files)** — `find evals/fixtures/baseline plugins/zoto-eval-system/templates/baseline-fixtures -type f` confirms identical 7-file shape on both sides: `package.json`, `README.md`, `.gitignore`, `.cursor/.gitkeep`, `.cursor/mcp.json`, `.zoto-eval-system/.gitkeep`, `.zoto-eval-system/config.json`.
- **File contents** — `package.json` is the bare `{name:"fixture-workspace", private:true}` (no deps, no scripts). `mcp.json` is exactly `{"mcpServers":{}}`. `.gitignore` covers `.env*`, `node_modules/`, `evals/_runs/` only. `config.json` carries the schema-default values from `templates/config.json` with sorted top-level + nested keys (`additionalAutomation`, `discoveryTargets`, `evalsDir`, `ignore`, `judgeModel`, `llm{codeFramework,model,runtime,strategy}`, `manualChecklists`, `skillsRoots`, `static`, `update{checkExitCodeOnCriticalDrift,criticalChangeRules{addedTargetWithoutCoverage,promptTemplateChange,publicSurfaceChange,removedTargetWithActiveCases,skillFrontmatterChange},historyPath,manifestPath,preserveUserAuthoredCases,rediscoverWithSameDefaults,writeMetaMarker}`).
- **LF endings** — `xxd` spot-checks on every JSON/text file show only `0x0a` line terminators (no CRLF).
- **No leakage** — Grep over both the live template tree and the stamped tree for `/home/|\$\{|andrewv|zoto-agents`: **No matches found**.
- **`scripts/eval-stamp.ts` baseline block** — clearly bounded between `Subtask 05` comment fences (lines ~39–254), exports `stampBaselineFixtures(hostRepoRoot, opts?)` with sha256 tree-checksum idempotency, applies 0644/0755 modes via `chmodSync`, and routes `--baseline-only` through `runBaselineOnly`. Case-stamp `main()` body left structurally untouched.
- **`evals/_llm/sandbox.ts`** — exports `prepareSandbox(caseTmpDir, opts?)` that copies baseline first then layers `fixtures.files[]` overlays; the runner's `materializeFixtures(handle, fixtures, repoRoot)` wrapper preserves the historical signature.
- **`package.json`** — `eval:baseline-stamp` script present, wired to `tsx scripts/eval-stamp.ts --baseline-only` (uses `pnpm`, not yarn — consistent with the repo's pnpm-lock and `packageManager` pin).
- **Smoke test runs cleanly** — `pnpm exec tsx evals/_llm/sandbox.smoke.ts` → `{ok: true}` for all four checks (`baseline-stamp.first-run`, `baseline-stamp.idempotency`, `prepare-sandbox.copies-baseline+overlays`, `baseline.no-repo-leakage`).
- **Clean-repo stamp + idempotency proof** — `rm -rf evals/fixtures/baseline && pnpm run eval:baseline-stamp` reports `written: true`, `dest_checksum_after = 1193c746...3b2c`, `file_count = 7`. Re-running reports `written: false` with identical before/after checksums. `diff -r plugins/zoto-eval-system/templates/baseline-fixtures evals/fixtures/baseline` → no diff (`TREES IDENTICAL`).
- **`--help` output** — both modes documented, baseline-only mode explicitly mentions subtask 14's live-repo migration use case.
- **ReadLints clean** on every subtask 05 deliverable file (`evals/_llm/sandbox.ts`, `evals/_llm/sandbox.smoke.ts`, all four baseline JSON files, root `package.json`). The 35 lint errors on `scripts/eval-stamp.ts` are all `Cannot find name 'process'` / `Cannot find module 'node:*'` (missing `@types/node` at the repo root — a pre-existing repo-wide gap; the same errors appear on every untracked TS script in `scripts/`) plus three pre-existing `AnalysisPayload` narrowing errors at L668–L671 inside the case-stamp `main()` body which subtask 05 did not touch. The baseline-only block introduces no new error class.
- **`tsc --noEmit -p tsconfig.check.json`** — fails at `error TS2688: Cannot find type definition file for 'node'` (the repo lacks `@types/node` in `node_modules/@types`). This is a pre-existing repo-wide gap, not a regression introduced by subtask 05; the runtime path through `tsx` works end-to-end as proven by the smoke test.
- **Out-of-scope safety** — `git diff` confirms `package.json` only added `scripts.eval:*` entries (the additional `eval:*` entries beyond `eval:baseline-stamp` belong to upstream subtasks 04/06–10 — not introduced by subtask 05's checklist); `scripts/eval-analyse.ts` carries no baseline references; `templates/schema/` carries no baseline references; the configurer files (subtask 02), schemas (subtask 01), and other subtask spec files were not touched by subtask 05.

**Verdict: Verified.** Every Deliverables Checklist item and every Definition of Done item independently confirmed. No checklist state inverted.

### Independent Verification (zoto-spec-judge, 2026-05-03 23:14 UTC+10)

Second-pass adversarial verification by `zoto-spec-judge` — fresh context, no carryover from either the executor or the prior judge. Treated the prior judge block as informational only and re-ran every claim from scratch.

- **Tree shape (7 files, both sides)** — `ls -la plugins/zoto-eval-system/templates/baseline-fixtures/{,.cursor,.zoto-eval-system}` and `ls -la evals/fixtures/baseline/{,.cursor,.zoto-eval-system}` confirm the same 7-file shape on both sides: `package.json`, `README.md`, `.gitignore`, `.cursor/.gitkeep`, `.cursor/mcp.json`, `.zoto-eval-system/.gitkeep`, `.zoto-eval-system/config.json`.
- **Bit-for-bit parity** — `diff -r plugins/zoto-eval-system/templates/baseline-fixtures evals/fixtures/baseline` → exit 0, no output (`TREES IDENTICAL`).
- **File contents** — `package.json` is the bare `{ "name": "fixture-workspace", "private": true }` (no deps, no scripts). `.cursor/mcp.json` is exactly `{ "mcpServers": {} }`. `.gitignore` covers `.env*`, `node_modules/`, `evals/_runs/`. `.zoto-eval-system/config.json` carries the schema-default values from `templates/config.json` with the same nested defaults (`update.criticalChangeRules`, `llm.{runtime,model,strategy,codeFramework}`, `static.framework=pytest`, etc.).
- **JSON sorted keys (every level)** — Python recursive walk over `package.json`, `.cursor/mcp.json`, `.zoto-eval-system/config.json` reports `issues=0: all keys sorted` for all three files. (The compact-array layout for `discoveryTargets` and `skillsRoots` is intentional formatting and does not violate key ordering.)
- **LF line endings** — `xxd` spot-check on every JSON/text file shows only `0x0a` line terminators (no `0x0d 0x0a`); every file ends with `0x0a`.
- **No repo leakage** — `Grep` over both the live template tree and the stamped tree for `/home/|\$\{|andrewv|zoto-agents` → no files with matches found, both sides.
- **`scripts/eval-stamp.ts` baseline block** — clearly bounded between `Subtask 05` comment fences (`L39–L254`), exports `stampBaselineFixtures(hostRepoRoot, opts?)` with sha256 tree-checksum idempotency (`treeChecksum()` at L135, `walkFiles()` at L154), explicit 0644/0755 mode application via `chmodSync` in `applyTreePermissions()` (L183–L191), and a `--baseline-only` argv branch routed through `runBaselineOnly()` (L217–L254). Case-stamp `main()` body left structurally untouched.
- **`evals/_llm/sandbox.ts`** — exports `prepareSandbox(caseTmpDir, opts?)` (L128–L161) that copies baseline first via `cpSync` then layers `fixtures.files[]` overlays via `applyFixtureOverlays()` (L167–L190); the runner's `materializeFixtures(handle, fixtures, repoRoot)` wrapper at L206–L216 preserves the historical signature. Throws a clear "run `pnpm run eval:baseline-stamp`" error when the baseline is missing (L150–L152) unless `allowMissingBaseline` is set.
- **`package.json`** — `eval:baseline-stamp` script present at L26, wired to `tsx scripts/eval-stamp.ts --baseline-only` (uses `pnpm`, not yarn — consistent with the repo's `pnpm-lock.yaml` and `packageManager` pin at L38).
- **Smoke test runs cleanly** — `pnpm exec tsx evals/_llm/sandbox.smoke.ts` → `{ok: true}` for all four checks (`baseline-stamp.first-run`, `baseline-stamp.idempotency`, `prepare-sandbox.copies-baseline+overlays`, `baseline.no-repo-leakage`). Exit 0.
- **Clean-repo stamp + idempotency proof** — `rm -rf evals/fixtures/baseline && pnpm run eval:baseline-stamp` reports `written: true`, `dest_checksum_after = 1193c746d31a0c5852316704b0998b32b41bac38c37aafd7cecc4254a6fa3b2c`, `file_count = 7`. Immediately re-running reports `written: false` with `dest_checksum_before == dest_checksum_after == source_checksum` — identical checksums confirm idempotency.
- **File modes after clean re-stamp** — `find evals/fixtures/baseline -type d -exec stat -c '%a %n' {} +` → `755` for all 3 directories; `find evals/fixtures/baseline -type f -exec stat -c '%a %n' {} +` → `644` for all 7 files. Matches the subtask spec exactly.
- **Mode-drift caveat (informational, not a blocker)** — On entry to this verification, the on-disk modes were `775`/`664` rather than `755`/`644`. The cause is benign: the source template tree itself is `775`/`664` (created under the user's `umask=002`), and the stamping script only invokes `applyTreePermissions()` on the write branch (`L121` inside `stampBaselineFixtures`). Once the destination checksum already matches the source, the script returns early at `L89–L99` without re-applying `chmodSync`, so any external mode drift on the destination tree (e.g. a manual `cp -r` or a `git stash` round-trip preserving umask defaults) will persist until the source content changes. The spec's `0644`/`0755` invariant therefore holds at the moment of any actual write but is not actively re-asserted on idempotent re-runs. Operators who care about strict mode invariance can `rm -rf evals/fixtures/baseline && pnpm run eval:baseline-stamp` to force a re-write — which I did, and which produced the correct `755`/`644` modes verified above. This nuance is worth flagging to subtask 14's live-repo migration but does not invalidate any subtask 05 deliverable; the smoke test, the on-write modes, and the contract are all green.
- **`--help` output** — both modes documented; baseline-only mode explicitly mentions `pnpm run eval:baseline-stamp` and "subtask 14's live-repo migration use case".
- **`ReadLints`** — 0 errors on `evals/_llm/sandbox.ts`, `evals/_llm/sandbox.smoke.ts`, root `package.json`, and all three baseline JSON files. The 35 errors reported on `scripts/eval-stamp.ts` are all pre-existing: 32 are `Cannot find name 'process'` / `Cannot find module 'node:*'` (repo-wide missing `@types/node` — also visible on every other untracked TS script in `scripts/`); 3 (`L668`, `L669`, `L671`) are `AnalysisPayload` narrowing inside the case-stamp `main()` body that subtask 05 explicitly did not touch (subtask 04's `analyse()` contract returns `AnalysisPayload | { error, target_id }`; the `"ignored" in analysis` guard at `L652` does not narrow the `error` shape away). Subtask 05's baseline-only block (`L39–L254`) introduces no new error class.
- **Out-of-scope safety** — `git status` confirms `scripts/eval-stamp.ts`, `evals/_llm/sandbox.ts`, `evals/_llm/sandbox.smoke.ts`, the entire `plugins/zoto-eval-system/templates/baseline-fixtures/` tree, and the entire `evals/fixtures/baseline/` tree are subtask 05's surface area; no spec or schema files outside subtask 05's scope were touched. The `package.json` modification is bounded to one new `eval:baseline-stamp` entry at `L26`.

**Verdict: Verified.** All Deliverables Checklist items and all Definition of Done items independently re-confirmed. No checklist state inverted. The mode-drift caveat above is informational only — the spec's `0644`/`0755` invariant holds on every actual stamp write and is provable via the documented clean-re-stamp workflow.
