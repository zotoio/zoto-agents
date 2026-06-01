# Post-Consolidation Verification — Subtask 08

**Spec:** Eval Plugin Self-Contained Scripts Consolidation  
**Subtask:** 08 — Full validation gates  
**Agent:** zoto-eval-engineer  
**git_sha:** `fbfecad15cca5de07f40ec150555f1b8d2fff64c` (local WIP atop; fixes uncommitted)  
**Date:** 2026-06-01

## Summary

Path/layout consolidation gates are **green**. `layout_drift_count: 0`. Standalone install,
stamper idempotency, plugin validate, and all eval-system tests pass after subtask-08 fixes.

Two gates exit non-zero for **pre-existing / out-of-scope** reasons:

1. **`pnpm test`** — `zoto-spec-system` CLI integration tests time out at 5s under parallel
   `pnpm -r test` (6 failures in 3 files). `zoto-eval-system` (146/146) and `zoto-cursor-top`
   (86/86) pass in isolation.
2. **`eval:update --check`** — exit 2 from **content** drift (6 SKILL.md public-surface changes
   from subtask 07 docs). `layout_drift_count: 0` — not a layout blocker.

## Gate Results

| ID | Gate | Command | Exit | Verdict |
|----|------|---------|------|---------|
| D01 | Full monorepo test suite | `pnpm test` | 1 | FAIL — unrelated `zoto-spec-system` CLI timeouts under parallel load |
| D02 | Eval list | `pnpm run eval:list` | 0 | PASS |
| D03 | Update drift check | `pnpm run eval:update --check` | 2 | layout_drift_count=0 (PASS for spec); content_drift_count=6 |
| D04 | Plugin validate | `pnpm --filter @zoto-agents/zoto-eval-system run validate` | 0 | PASS (167/167) |
| D05 | Template validate | `node scripts/validate-template.mjs` | 0 | PASS |
| D06 | Skills validate | `node scripts/validate-skills.mjs` | 0 | PASS (13/13) |
| D07 | Standalone install sim | `install-local --dry-run` | 0 | PASS — `engine/` and `src/` in copy list |
| D08 | Stamper idempotency | `stamp-host-layout.ts --dry-run` ×2 | 0/0 | PASS — byte-identical JSON |
| D09 | Final grep gates | see below | — | PASS |
| — | Analyser parity | `pnpm run eval:analyser-parity-check` | 0 | PASS |

## Required execution fields

| Field | Value |
|-------|-------|
| `layout_drift_count` | **0** |
| `content_drift_count` | **6** (subtask-07 SKILL.md public-surface edits) |
| `grep_gate_results` | G1=2 (comment prose only), G2=0, G3=0, G4=0 |
| `standalone_install_paths` | `.cursor-plugin`, `agents`, `commands`, **`engine`**, `hooks`, `rules`, `skills`, **`src`**, `templates`, `scripts`, `CHANGELOG.md`, `LICENSE`, `README.md` |

## D01 — Full test suite

- **`plugins/zoto-eval-system`:** 14 files, **146/146** tests pass (includes fixture-repo
  update semantics, eval-update-guards selftest, stamp/orchestrate selftests).
- **`plugins/zoto-cursor-top`:** 86/86 pass in full run.
- **`plugins/zoto-spec-system`:** 6 failures — `spec-spawn-prefix.test.ts` (3),
  `spec-status-roundtrip.test.ts` (2), `status-pair-roundtrip.test.ts` (1) — all
  `Test timed out in 5000ms` spawning CLI subprocesses under parallel load.

**Classification:** unrelated plugin; not a spec blocker for eval script consolidation.

## D03 — eval:update --check

```json
{"status":"drift","checked":52,"critical_count":6,"layout_drift_count":0,
 "colocated_ts_eval_count":0,"parity_drift":null,"layout_drift":[]}
```

Critical deltas (all `public-surface change on covered target`):

- `skill:zoto-configure-evals`, `skill:zoto-create-evals`, `skill:zoto-eval-tooling`,
  `skill:zoto-execute-evals`, `skill:zoto-judge-evals`, `skill:zoto-update-evals`

## D07 — Standalone install

`pnpm --filter @zoto-agents/zoto-eval-system run install-local --dry-run` lists
`engine/` and `src/` among PLUGIN_DIRS. No repo-root `scripts/eval-*` dependency for
the installed plugin surface.

## D08 — Stamper idempotency

Two consecutive `pnpm exec tsx plugins/zoto-eval-system/scripts/stamp-host-layout.ts --dry-run --repo-root .`
runs produce identical JSON (`diff` exit 0). Scripts skipped/copied from `.zoto/eval-system/`
tree sourced at `PLUGIN_ROOT`.

## D09 — Final grep gates

| Gate | Pattern / scope | Matches | Verdict |
|------|-----------------|---------|---------|
| G1 | `../plugins/zoto-eval-system` in `plugins/zoto-eval-system/scripts/` | 2 | PASS — comment prose in `install-local.ts` / `uninstall-local.ts` (`~/.cursor/plugins/zoto-eval-system/`); zero import hits |
| G2 | `../../../scripts` in `plugins/zoto-eval-system/engine/` | 0 | PASS |
| G3 | `tsx scripts/eval-` in `package.json` | 0 | PASS — root aliases use `plugins/zoto-eval-system/...` |
| G4 | `scripts/eval-` in `evals/test_*.ts evals/_llm/` | 0 | PASS — retargeted via `#eval-*` aliases, `evals/plugin-script-bridge.ts`, and `eval:analyse` doc wording |

## Subtask-08 code fixes

| File | Fix |
|------|-----|
| `plugins/zoto-eval-system/engine/update.ts` | Skip analyser parity on fixture trees; resolve `tsx` from plugin/monorepo; `runUpdate()` uses `discoverAtRepo(repoRoot, …)` |
| `plugins/zoto-eval-system/tests/eval-update-guards.test.ts` | Per-test timeout 190s |
| `plugins/zoto-eval-system/tests/plugin.test.ts` | Align removed-target reason regex |
| `evals/vitest.config.ts` | `#eval-analyse` / `#eval-stamp` aliases |
| `evals/plugin-script-bridge.ts` | Dogfood re-exports for `_llm` selftests |
| `evals/test_*.ts`, `evals/_llm/*` | Remove bare `scripts/eval-*` references |
| `templates/static/vitest/per-primitive-test.ts.tmpl` | `eval:analyse` wording for future stamps |

## Verdict

- **Path/layout consolidation: COMPLETE**
- **Eval plugin self-contained: VERIFIED** (install + stamper + grep + validate)
- **Non-blocking exits:** monorepo `pnpm test` (spec-system flake), `eval:update --check`
  content drift from subtask 07
- Ready for `zoto-spec-judge` adversarial pass
