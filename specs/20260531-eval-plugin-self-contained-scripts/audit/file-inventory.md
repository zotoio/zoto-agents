# File inventory — move / delete / keep (2026-06-01)

Line counts from `wc -l` on audit date. Last-modified dates from `stat` (local TZ).  
Maps to spec **KD-1** through **KD-9**.

## Move list → `plugins/zoto-eval-system/scripts/` (KD-1, KD-7)

| Source (repo root) | Lines | mtime | Rationale |
|--------------------|------:|-------|-----------|
| `scripts/eval-analyse.ts` | 2063 | 2026-06-01 | Host CLI; imports plugin `src` + `engine` today |
| `scripts/eval-stamp.ts` | 2495 | 2026-06-01 | Host CLI; depends on `eval-analyse` |
| `scripts/eval-orchestrate.ts` | 747 | 2026-06-01 | Host CLI; `eval` / `eval:full` entry |
| `scripts/eval-discover.ts` | 495 | 2026-06-01 | **Canonical** discover (KD-3); supersedes plugin fork |
| `scripts/eval-gc.ts` | 196 | 2026-05-23 | Host GC CLI |
| `scripts/eval-cleanup-vendored.ts` | 282 | 2026-05-23 | Host cleanup |
| `scripts/eval-cleanup-stale.ts` | 1283 | 2026-06-01 | KD-7; referenced by root `package.json` |
| `scripts/check-analyser-payload-parity.ts` | 253 | 2026-05-23 | KD-7; `engine/update.ts --check` + `eval:analyser-parity-check` |
| `scripts/test.py` | (not wc’d) | — | In `HOST_SCRIPT_NAMES`; static eval runner |
| `scripts/eval-ensure-host.ts` | 144 | 2026-06-01 | KD-8; consolidate with `templates/runner/eval-ensure-host.ts.tmpl` |

After move + import rewrite: **delete** repo-root copies (KD-1); retarget `package.json` to `tsx plugins/zoto-eval-system/scripts/...` (KD-6).

## Delete list (stale / superseded)

| Path | Lines | mtime | Rationale |
|------|------:|-------|-----------|
| `plugins/zoto-eval-system/scripts/eval-discover.ts` | 292 | 2026-05-23 | Stale fork; root copy wins (KD-3) |
| `plugins/zoto-eval-system/scripts/eval-update.ts` | 593 | 2026-05-23 | Legacy updater; `engine/update.ts` canonical (KD-4) |
| Repo-root copies of moved files | — | — | After subtasks 02 + 05 retarget |

## Keep at repo root (monorepo-only / non-goals)

| Path | Lines | mtime | Rationale |
|------|------:|-------|-----------|
| `scripts/eval-migrate-ts-to-json.ts` | 910 | 2026-05-30 | One-shot migration (spec non-goal) |
| `scripts/eval-migrate-ts-to-json.test.ts` | 583 | 2026-06-01 | Tests migration script |
| `scripts/eval-relocate-migration.ts` | 1368 | 2026-06-01 | Layout migration tool |
| `scripts/eval-migrate-legacy.ts` | 40 | 2026-05-23 | Legacy layout |
| `scripts/eval-cleanup-sandboxes.ts` | 71 | 2026-05-23 | Sandboxes; not in HOST_SCRIPT_NAMES |
| `scripts/validate-template.mjs` | — | — | CI (spec non-goal) |
| `scripts/validate-skills.mjs` | — | — | CI |

**Note:** `package.json` references `scripts/bootstrap-llm-code-from-cache.ts` for `eval:bootstrap-llm-code`, but **no such file exists** in the tree (broken alias — flag for subtask 05).

## Already under `plugins/zoto-eval-system/scripts/` (keep)

| Path | Lines | mtime | Role |
|------|------:|-------|------|
| `stamp-host-layout.ts` | 335 | 2026-06-01 | Stamper (KD-5) |
| `install-local.ts` | 136 | 2026-05-23 | Marketplace install |
| `uninstall-local.ts` | 111 | 2026-05-23 | Uninstall |
| `validate-plugin.ts` | 501 | 2026-05-23 | Plugin validation |
| `migrate-host-layout-v3.ts` | 176 | 2026-06-01 | Host layout migration |
| `migrate-legacy.ts` | 48 | 2026-05-23 | Plugin copy of legacy migrate |
| `ensure-host-env-and-gitignore.ts` | 205 | 2026-05-26 | Host env |
| `package-json-merger.ts` | 74 | 2026-05-23 | package.json merge helper |

## `HOST_SCRIPT_NAMES` vs host template vs root `package.json`

`stamp-host-layout.ts` `HOST_SCRIPT_NAMES` (L24–32):

- `eval-discover.ts`, `eval-analyse.ts`, `eval-stamp.ts`, `eval-orchestrate.ts`, `eval-gc.ts`, `eval-cleanup-vendored.ts`, `test.py`

**Gaps vs runtime needs (KD-7):**

| Script | Root `package.json` | Host template `package.json` | In `HOST_SCRIPT_NAMES` |
|--------|--------------------|-------------------------------|------------------------|
| `check-analyser-payload-parity.ts` | `eval:analyser-parity-check` | — | **No** — add in subtask 04 |
| `eval-cleanup-stale.ts` | `eval:cleanup-stale` (+ apply) | — | **No** — add in subtask 04 |
| `eval-ensure-host.ts` | `eval:ensure-host` | `eval:ensure-host` | **No** — KD-8 |

Stamper today copies from **`zotoAgentsRoot/scripts/`** (monorepo root), not `PLUGIN_ROOT/scripts/` — see `stamp-host-layout.ts` L22, L139 loop.

## `install-local.ts` `PLUGIN_DIRS` (KD-4 gap)

Current dirs: `.cursor-plugin`, `agents`, `commands`, `docs`, `hooks`, `rules`, `skills`, `templates`, `scripts` — **`engine` and `src` omitted**. Standalone install cannot satisfy skill references to `engine/update.ts` until subtask 04.

## Engine modules (not moved; import fix only)

| Path | Lines | mtime |
|------|------:|-------|
| `plugins/zoto-eval-system/engine/update.ts` | 2347 | 2026-06-01 |
| `plugins/zoto-eval-system/engine/runner.ts` | — | — |
| Other `engine/*.ts` | — | — |

Root `package.json` already dogfoods `engine/update.ts` for `eval:update` (KD-4 aligned).
