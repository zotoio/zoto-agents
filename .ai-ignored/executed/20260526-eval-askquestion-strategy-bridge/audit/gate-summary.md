# Subtask 13 validation gate summary

Generated: 2026-05-26 (Eval AskQuestion Strategy Bridge) — **post judge fix_list**

## Gate exit codes

| Gate | Command | Exit code | Log |
|------|---------|-----------|-----|
| eval:list | `pnpm run eval:list` | **0** | `audit/gate-eval-list.log` |
| collect-only | `pnpm run eval -- --collect-only` | **0** | `audit/gate-collect-only.log` |
| update check | `pnpm run eval:update --check` | **0** | `audit/gate-update-check.log` |
| LLM smoke (code) | `pnpm exec vitest run evals/llm/test_command_sync-plugins.test.ts --config evals/llm/vitest.config.ts -t "palette-full-sync-relays-hook-stdin-and-summarizes-copied-plugins"` | **0** | `audit/gate-llm-smoke.log` |
| LLM smoke (declarative) | `pnpm exec tsx audit/smoke-hook-one.ts` (hook:cursor-workspace case `1`, ×2) | **1** (deferred) | `audit/gate-llm-smoke.log` |

**Fixes applied (judge fix_list):**

1. **D02** — Added `llm/**` to `evals/vitest.config.ts` `exclude` so static collect-only no longer loads LLM code-strategy suites (missing `#eval-engine` alias).
2. **Plugin test** — Renamed top-level `cases` → `evals` in `plugins/zoto-eval-system/skills/zoto-eval-tooling/evals/evals.json`.

**LLM smoke (D04):**

| Backend | Target | Case id | Result |
|---------|--------|---------|--------|
| **code** | `command:sync-plugins` | `palette-full-sync-relays-hook-stdin-and-summarizes-copied-plugins` | **passed** (exit 0, ~59s) |
| **declarative** | `hook:cursor-workspace` | `1` | **deferred** — LLM judge failed after 2 attempts; `eval:llm:declarative` has no single-case filter so targeted `smoke-hook-one.ts` runner was used |

**CURSOR_API_KEY:** available (repo `.env`).

## Backend distribution (post-migration)

| Backend | Targets / artifacts | Cases (approx.) |
|---------|---------------------|-----------------|
| **code** (`code+bridge` per migration matrix) | 32 `evals/llm/test_*.test.ts` files | 184 LLM code-strategy cases |
| **declarative** (JSON / skill evals.json) | 26 JSON discovery files + skill evals | 174 declarative cases (`eval:llm:declarative -- --list`) |
| **none** (static-only / no LLM eval yet) | 9 targets | — |

Migration matrix tallies: **32** code+bridge, **11** migrate-to-declarative, **9** none/user-preserve.

## Manifest refresh (once)

Compared `audit/manifest-pre-migration.yml` → `.zoto/eval-system/manifest.yml`:

- `updated_at`: `2026-05-25T13:34:51.754Z` → `2026-05-25T17:14:22.925Z`
- `git_ref`: unchanged (`e49961ff5330e60d9adf4aa48727cf8247371d5e`)
- **22 targets** with `eval_files[]` shape changes
- No second manifest refresh in this subtask after `eval:update --apply --no-analyser`

## manifest.history.yml

- Pre-migration backup: **12592** lines / **24** snapshot separators
- Current: **13359** lines / **25** snapshot separators (**+1** appended snapshot)
- Latest snapshot header: `updated_at: 2026-05-25T17:14:22.925Z`, `generated_by: zoto-update-evals`

## Blockers / resolution

1. **D02 collect-only regression** — resolved: exclude `llm/**` from static vitest config.
2. **Plugin eval format** — resolved: `zoto-eval-tooling/evals/evals.json` uses `evals` key.
3. **D04 declarative smoke** — code-strategy cohort passes; declarative hook case deferred after 2 judge failures (prompt/assertion mismatch for sessionStart hook narration, not infra).
