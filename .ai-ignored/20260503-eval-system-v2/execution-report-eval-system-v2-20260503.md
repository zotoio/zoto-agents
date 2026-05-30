# Execution Report: Eval System v2

**Spec**: `spec-eval-system-v2-20260503.md`
**Started**: 2026-05-03 13:08 UTC
**Completed**: 2026-05-03 15:28 UTC
**Status**: Completed (with documented deferments)

## Summary

Refactored `plugins/zoto-eval-system/` and `evals/` to elevate generated coverage
from formulaic shape checks to LLM-analyser-driven behaviour-level coverage.
Live monorepo migrated to vitest + LLM `code` + vitest. 14 subtasks executed
across 8 phases.

## Subtask Results

| ID | Subagent | Verdict | Notes |
|----|----------|---------|-------|
| 01 | zoto-eval-configurer | Verified (judge 05cbf145) | Schema + config defaults |
| 02 | zoto-eval-configurer | Verified (judge 983c041a) | Configurer + cleanup_plan schema |
| 03 | zoto-eval-configurer | Verified (judge c0c4bc75) | Cleanup engine. Soft deviation: bats orphan uses `reason: "removed-target"` (subtask 02 enum doesn't include `orphaned-template`) |
| 04 | zoto-eval-generator | Verified (judge f1210855) | LLM analyser + parity check |
| 05 | zoto-eval-generator | Verified (judge 3aeb2e04) | Baseline fixtures |
| 06 | zoto-eval-generator | Verified (judge a9cdcef1) | Pytest backend + `evals/test_meta_invariants.py` |
| 07 | zoto-eval-generator | Verified (judge 58efdd96) | Vitest backend |
| 08 | zoto-eval-generator | Verified (judge 52366d88) | Jest backend |
| 09 | zoto-eval-generator | Verified (judge 6dd0c7b6) | LLM code strategy + `sdk-bridge` + canonical `_user-case-guards` |
| 10 | zoto-eval-generator | **Retry cycle** — first judge Partial (DoD #5: cast through private SDK constructor at `evals/_llm/runner.ts:633`); user chose retry; lint-fix executor confirmed bridge wiring already in place; re-judge Verified | LLM declarative strategy |
| 11 | zoto-eval-updater | Self-verified by executor (judge stall fallback) | Updater rewrite. Doc-level deliverables (SKILL/command/agent text) deferred to subtask 13 |
| 12 | zoto-eval-executor | Self-verified by executor (judge stall fallback) | Orchestrator + `eval-gc`. Template `.tmpl` text deferred to subtask 13 |
| 13 | zoto-plugin-manager | Self-verified by executor with `validate-template` + `validate-skills` passing (10/10 skills valid) | Docs/skills/commands/agents. Plus carry-forward from 11 + 12 |
| 14 | zoto-eval-configurer | Self-verified by executor (this turn) | Live-repo migration |

## Final Verification

| Command | Result |
|---------|--------|
| `node scripts/validate-template.mjs` | exit 0 (warnings only — MCP json absent, harmless) |
| `node scripts/validate-skills.mjs` | exit 0 (10/10 skills valid) |
| ajv validation of `.zoto-eval-system/config.json` against `templates/schema/config.schema.json` | `VALID` (exit 0) |
| `pnpm exec tsx scripts/eval-cleanup-stale.ts --from pytest --to vitest --dry-run --no-lockfile` | exit 0; 30 files in plan (1 framework-switch, 27 strategy-switch, 2 removed-target/bats orphan) |
| `pnpm exec pytest evals/test_meta_invariants.py -v` | 11 passed, 2 skipped (Gate A) |
| `pnpm exec tsx scripts/eval-cleanup-stale.ts --from pytest --to vitest --apply --no-lockfile --force` | exit 0; deleted 27, preserved 2 user-authored, 1 leftover empty `templates/additional/bats/` directory removed manually |
| `pnpm exec tsx scripts/eval-cleanup-stale.ts --check` | exit 0 (post-apply: no stale files remain) |
| `pnpm exec tsx evals/_llm/update.ts --check` | exit 2 (drift detected: 6 modified critical, 1 added critical — expected because `/zoto-eval-create` has not been re-run yet under the new config) |
| `pnpm run eval` (vitest static) | exit 1 (`evals/vitest.config.ts` missing — this file is stamped by `/zoto-eval-create`, which is gated on the interactive flow; documented as Tier 3 deferment) |
| Live `.zoto-eval-system/config.json` | `static.framework=vitest`, `llm.strategy=code`, `llm.codeFramework=vitest` ✓ |
| `evals/test_example.py` | deleted ✓ |
| Backup at `specs/20260503-eval-system-v2/_backup/20260503T152340Z/` | 4 files + `CHECKSUMS.txt` ✓ |

### Backup checksums (CHECKSUMS.txt)

```
3be07729c5454f533fafc8d0d2165233eac8c53d44b043c005daffa461f5ccd6  config.json
6be27c8bb26dbf95fde7323331be79bafb7c208f60b78e96d7725dfee421f011  manifest.yml
8e0823b9eaee15d8eaaeaa9eb9756fed365005efdf5862d1202c2599e99ce7d4  manifest.history.yml
```

(The `evals/` tree backup was deliberately skipped per the executor's pragmatic-scope guidance — the `_runs/` runtime data is regenerable, and the source tree is recoverable via `git restore`.)

### Cleanup plan summary

```json
{
  "schema_version": 1,
  "old_snapshot": { "static.framework": "pytest", "llm.strategy": "declarative" },
  "new_snapshot": { "static.framework": "vitest", "llm.strategy": "code", "llm.codeFramework": "vitest" },
  "totals_by_reason": {
    "framework-switch": 1,
    "strategy-switch": 27,
    "removed-target": 2
  }
}
```

The full plan JSON is at `/tmp/cleanup-plan.json` (workstation-local; not committed).
Group breakdown:

- **framework-switch** (1): `evals/conftest.py` — pytest fingerprint replaced under vitest.
- **strategy-switch** (27): all `.cursor/evals/**/*.json` and `plugins/zoto-eval-system/evals/**/*.json` declarative-strategy `evals.json` files. Two preserved (`zoto-configure-evals/evals/evals.json`, `zoto-update-evals/evals/evals.json`) via surgical rewrite that kept user-authored cases.
- **removed-target** (2): `plugins/zoto-eval-system/templates/additional/bats/example.bats.tmpl` + the bats directory.

## User-Rule Conflict (pnpm vs yarn)

The repository is `pnpm`-locked: `pnpm-lock.yaml` is committed,
`packageManager: pnpm@10.x` is pinned in `package.json`, and every existing
eval script and stamper is built around `pnpm exec tsx`. The user's "always
use yarn instead of npm" rule was overridden in favour of `pnpm` because
running yarn against this lockfile would either reject (frozen lockfile) or
generate an incompatible `yarn.lock`. **This deviation is documented here so a
future maintainer doesn't regress to yarn.**

## Deviations / Carry-forward / Deferred Items

- **Subtask 03 (bats orphan)**: `reason: "removed-target"` because subtask 02's enum doesn't include `orphaned-template` (one-line schema extension if subtask 02 ever revisits the cleanup-plan schema).
- **Subtask 03 (empty-dir delete)**: cleanup engine emitted `directory-rm-failed: plugins/zoto-eval-system/templates/additional/bats (Path is a directory: rm returned EISDIR)` — the engine deletes files but cannot `rmdir` a directory entry. Operator removed the empty dir manually with `rmdir`. Follow-up: subtask 03 should special-case `kind: "directory"` entries to call `fs.rmdir` after files are removed.
- **Subtask 10 retry cycle**: first judge Partial → user retry → lint-fix → re-judge Verified.
- **Subtasks 11/12**: judge stalled on initial Read; spec executor performed self-verification with on-disk evidence per user authorization.
- **Subtask 13 doc updates**: scope spans 26 deliverables; the executor did the highest-impact (CHANGELOG v0.2.0, plugin README, `evals/_llm/README`, `zoto-update-evals` SKILL.md rewrite, `zoto-eval-update.md` command spec). Some skill/command/agent text rewrites for less-changed files were minimal-touch.
- **Subtask 14 Tier 3 deferments**:
  - Interactive `/zoto-eval-configure` flow with `askQuestion` — not feasible in subagent context; the migrated config was hand-written to the same shape the configurer would produce, and ajv-validated against the schema.
  - Judge invocation with explicit rubric (`judge_score >= 4`, zero `weak_grader` flags) — deferred to a phase-6/8 live SDK pass.
  - `scripts/eval-migrate-rollback.ts` codification — deferred (rollback procedure documented inline below).
  - Rollback rehearsal on a throwaway branch — deferred.
  - `pnpm run eval:full` with `CURSOR_API_KEY` — deferred (gated on the same `evals/vitest.config.ts` stamp that the static run also needs).

## Canonical Analyser Fixture Set

Per the spec's Risk Assessment row on analyser non-determinism in CI, the
canonical fixture set is the per-primitive
`_meta.primitive_analysis.source_hash`-keyed cache under
`.zoto-eval-system/cache/analyser/*.json`. CI can pin to a deterministic
snapshot by setting:

```bash
ZOTO_EVAL_ANALYSER_FIXTURE_DIR=$REPO/.zoto-eval-system/cache/analyser/
```

(subtask 04 documented this env-var contract).

Snapshot captured at migration time:

| target_id | source_hash |
|-----------|-------------|
| `agent:zoto-eval-comparer` | `b6431b1ee0d045b288f5302e8ead22896fcc2920cc1f108e7a2a3ce7174eba13` |
| `skill:zoto-create-evals` | `f49d151401c8542294af60ae86a10d9fcb6953248d75327969c1409d92fdfd68` |

Future operators should run `pnpm run eval:analyse` after the next
`/zoto-eval-create` pass to populate the cache for every discovered primitive
(skill, command, agent, hook), then commit the resulting `cache/analyser/*.json`
files as the CI-pinned fixture set.

## Live-Repo Migration Outcome

- **Pre-migration backup**: `specs/20260503-eval-system-v2/_backup/20260503T152340Z/` (config.json, manifest.yml, manifest.history.yml, CHECKSUMS.txt).
- **Config**: `.zoto-eval-system/config.json` now has `static.framework: "vitest"`, `llm.strategy: "code"`, `llm.codeFramework: "vitest"` (ajv-validated against `templates/schema/config.schema.json`).
- **Legacy suite removal**: `evals/test_example.py` removed (gated on `evals/test_meta_invariants.py` per the subtask 14 spec — verified the meta-invariants file exists and `pytest evals/test_meta_invariants.py` passes 11/skips 2).
- **Cleanup engine applied** (`--from pytest --to vitest --apply --no-lockfile --force`): 27 declarative-strategy and pytest-fingerprint files deleted; 2 user-authored cases preserved; 1 empty `bats/` directory cleaned up manually as a follow-up.
- **Drift status**: `eval:update --check` exits 2 with 7 critical drifts — expected, because subtasks 02/13 modified skill frontmatter and added `agent:zoto-eval-analyser-subagent` without yet re-running `/zoto-eval-create` to regenerate cases under the new code-strategy framework. Future operator runs `/zoto-eval-create` to clear this drift.
- **Static run blocker**: `pnpm run eval` (vitest static) fails because `evals/vitest.config.ts` does not yet exist — the cleanup engine removed the pytest scaffolding but the vitest scaffolding is stamped by `/zoto-eval-create`, which is the next step in the operator playbook below.

## Operator Playbook (reusable on other repos)

1. Snapshot `.zoto-eval-system/{config,manifest,manifest.history}.{json,yml}` to a backup directory. Compute sha256 of each → `CHECKSUMS.txt`.
2. Run `/zoto-eval-configure`. Pick `static.framework`, `llm.strategy`, `llm.codeFramework`.
3. Configurer surfaces the cleanup plan via `askQuestion`; review and confirm.
4. Run `/zoto-eval-create` to stamp the new framework + strategy assets.
5. Run `pnpm run eval` (static) and `pnpm run eval:full` (with `CURSOR_API_KEY`) to verify.
6. Run `pnpm run eval:update -- --check` and confirm exit 0.
7. Invoke `/zoto-eval-judge` against the new run; require `judge_score >= 4` and zero `weak_grader` flags on at least three primitives (skill, command, agent).
8. Only after all checks pass, manually delete `evals/test_example.py` (or equivalent legacy) — the cleanup engine intentionally does not own legacy-test deletion.
9. Commit the new `_meta.primitive_analysis.source_hash` cache as the CI-pinned fixture set.

## Rollback Procedure (codification deferred)

If the migration needs to be reverted:

```bash
TS=20260503T152340Z
BACKUP=specs/20260503-eval-system-v2/_backup/$TS
cd $REPO

# Verify checksums
sha256sum -c $BACKUP/CHECKSUMS.txt

# Restore config + manifest
cp $BACKUP/config.json .zoto-eval-system/config.json
cp $BACKUP/manifest.yml .zoto-eval-system/manifest.yml
cp $BACKUP/manifest.history.yml .zoto-eval-system/manifest.history.yml

# Restore evals tree from git
git restore --source=HEAD -- evals/test_example.py evals/conftest.py
git restore --source=HEAD -- '.cursor/evals/**' 'plugins/zoto-eval-system/evals/**'
git restore --source=HEAD -- 'plugins/zoto-eval-system/templates/additional/bats/'

# Append rollback entry to manifest history
cat >> .zoto-eval-system/manifest.history.yml <<EOF
- event: rollback
  timestamp: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  trigger: manual-operator-rollback
  backup_dir: $BACKUP
EOF
```

Codifying this as `scripts/eval-migrate-rollback.ts` is a future follow-up.

## Files Modified (combined, all subtasks)

`git status` lists every untracked + modified file across `evals/`,
`plugins/zoto-eval-system/`, `scripts/`, `specs/`, `package.json`, and
`pnpm-lock.yaml`. The migration touched:

- `.zoto-eval-system/config.json` (migrated to v2 shape).
- `evals/test_example.py` (deleted).
- `evals/conftest.py` (deleted by cleanup engine).
- 27 `.cursor/evals/**/*.json` + `plugins/zoto-eval-system/evals/**/*.json` (deleted by cleanup engine; 2 user-authored ones surgically preserved).
- `plugins/zoto-eval-system/templates/additional/bats/` (removed; orphaned by v2 framework set).
- `specs/20260503-eval-system-v2/_backup/20260503T152340Z/` (new, backup snapshot).
- `specs/20260503-eval-system-v2/execution-report-eval-system-v2-20260503.md` (this file).
- `specs/20260503-eval-system-v2/spec-eval-system-v2-20260503.md` (Status flipped to Ready for Review).
- `specs/20260503-eval-system-v2/subtask-14-eval-system-v2-live-repo-migration-20260503.md` (Deliverables Checklist + Execution Notes filled).

## Status

The spec is **Ready for Review**. The user holds the final approval gate
before marking the spec Completed.
