# Stale duplicates — `eval-discover` and `eval-update` (2026-06-01)

## `eval-discover.ts` — root vs plugin fork (KD-3)

| Attribute | **Canonical:** `scripts/eval-discover.ts` | **Stale:** `plugins/zoto-eval-system/scripts/eval-discover.ts` |
|-----------|------------------------------------------|----------------------------------------------------------------|
| Lines | 495 | 292 |
| Last modified | 2026-06-01 | 2026-05-23 |
| `diff -q` | — | **Files differ** |
| Output format | JSON to stdout (`--pretty`) | YAML; `--config` / `--resolve` CLI |
| Config import | `../plugins/zoto-eval-system/src/config-loader.js` (`loadEvalConfig`, `loadEvalPaths`) | `../src/config-loader.js` (`loadEvalConfig` only) |
| Discovery scope | Cursor commands/agents/hooks, plugins, upstream-vendor, ignore globs, namespaced IDs | Narrower host-oriented walk |
| Used by | Root `pnpm run eval:discover` → `tsx scripts/eval-discover.ts` | Plugin `eval-update.ts` imports `./eval-discover.js` only |
| Action | **Move** to `plugins/zoto-eval-system/scripts/` with import rewrites | **Delete** before or immediately after move (do not merge manually) |

### Behavioural drift (high level)

Root copy documents monorepo-specific discovery (cursor/upstream collision rules, `ignored_summary`, JSON manifest shape for create/update skills). Plugin fork is an older host-layout variant still wired into legacy `eval-update.ts`. After consolidation, one discover module under the plugin serves stamped hosts and monorepo dogfood.

### Consumers to update

- `plugins/zoto-eval-system/scripts/eval-update.ts` → remove with script (KD-4).
- `engine/update.ts` — uses its own discovery paths; does not import plugin `eval-discover.ts` today.
- `stamp-host-layout.ts` — copies **root** `eval-discover.ts` into `.zoto/eval-system/scripts/` today.

---

## `eval-update.ts` — plugin script vs `engine/update.ts` (KD-4)

| Attribute | **Canonical:** `plugins/zoto-eval-system/engine/update.ts` | **Stale:** `plugins/zoto-eval-system/scripts/eval-update.ts` |
|-----------|-------------------------------------------------------------|---------------------------------------------------------------|
| Lines | 2347 | 593 |
| Last modified | 2026-06-01 | 2026-05-23 |
| `diff -q` | — | **Files differ** (not a subset) |
| Entry | Root/host `eval:update` → `tsx .../engine/update.ts` | Not referenced in root `package.json` |
| Cross-tree imports | `../../../scripts/eval-analyse.ts`, `../../../scripts/eval-stamp.ts` | `./eval-discover.js`, `../src/`, `../engine/` only |
| Guard contract | `_meta?.generated === true` (grep target for `validate-plugin.ts`) | Same guard comment in header |
| Parity gate | Spawns `scripts/check-analyser-payload-parity.ts` | References parity path in legacy flow |
| Action | Fix imports to `../scripts/` (subtask 03) | **Delete** |

### Why two updaters existed

`eval-update.ts` mirrors an older `templates/llm/agent-sdk/update.ts.tmpl` pattern and depended on the stale plugin `eval-discover.ts`. `engine/update.ts` is the full drift-detection / apply-mode implementation used by `/z-eval-update` and monorepo `eval:update`. Keeping both risks validator and skill docs pointing at the wrong file.

### Validator alignment

`validate-plugin.ts` should continue to grep **`engine/update.ts`** for `_meta?.generated === true` after deleting `scripts/eval-update.ts` (spec KD-4 / KD-10).

---

## Related: three-copy problem (root + plugin + stamped host)

Today the same logical CLI can exist in:

1. Repo-root `scripts/`
2. Partial `plugins/zoto-eval-system/scripts/` forks
3. `.zoto/eval-system/scripts/` after stamp (rewritten imports)

Subtasks 02–05 collapse (1) into the plugin and teach the stamper to copy from (2) only.
