# Subtask 02 — Rationalise Eval System — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 02 |
| feature | Rationalise Eval System |
| assigned_agent | crux-software-engineer |
| model | composer-2-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-16T12:37:00Z |
| last_heartbeat | 2026-05-16T12:42:00Z |
| completed_at | 2026-05-16T12:42:00Z |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — Replace `evals/_llm/sandbox.ts` with a thin re-export shim **or** delete it and migrate consumers to `#eval-engine/sandbox.js` — pick one approach (the shim is preferred for backward compatibility) and apply it consistently. (`evals/_llm/sandbox.ts`)
- [x] **D02** — Verify `evals/_llm/case.ts` is already a shim (it is); ensure exported types still resolve identically in `evals/llm/_shared/code-strategy-case.ts`. (`evals/_llm/case.ts`)
- [x] **D03** — Verify `evals/_llm/_user-case-guards.ts` is already a shim (it is); ensure consumers in `scripts/eval-*.ts` resolve identically. (`evals/_llm/_user-case-guards.ts`)
- [x] **D04** — Update `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/setup.ts.tmpl` so its `resolveBaselineDir` import points at the chosen path (shim or `#eval-engine/sandbox.js`). Re-stamp `evals/llm/_shared/setup.ts` so it matches. (`plugins/zoto-eval-system/templates/llm/code-cursor-sdk/setup.ts.tmpl`)
- [x] **D05** — Update `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/sandbox-helpers.ts.tmpl` similarly. Re-stamp `evals/llm/_shared/sandbox-helpers.ts`. (`plugins/zoto-eval-system/templates/llm/code-cursor-sdk/sandbox-helpers.ts.tmpl`)
- [x] **D06** — Update `plugins/zoto-eval-system/templates/static/jest/setup.ts.tmpl` so it imports from a stable path that resolves under both Vitest and Jest configs. If `#eval-engine/*` is not available in Jest, the shim path remains correct — document that explicitly in a comment. (`plugins/zoto-eval-system/templates/static/jest/setup.ts.tmpl`)
- [x] **D07** — Update `evals/setup.ts` so its `prepareSandbox` import resolves to the canonical engine module (either via the shim or `#eval-engine/sandbox.js`). (`evals/setup.ts`)
- [x] **D08** — Confirm the `evals/_llm/sandbox.smoke.ts` and `evals/_llm/sandbox.selftest.ts` files still import the right module after the change. They are kept as selftests; their imports may continue to use the local shim path for clarity. (`evals/_llm/sandbox.selftest.ts`)
- [x] **D09** — Update `evals/_llm/README.md` if any of the listed files change. Keep its allow-list aligned with **Decision 2**. (`evals/_llm/README.md`)
- [x] **D10** — Run `ReadLints` on every file touched and resolve any introduced linter errors. Pre-existing errors are acceptable but must not be made worse.
- [x] **D11** — Run `pnpm exec tsx evals/_llm/sandbox.selftest.ts`, `pnpm exec tsx evals/_llm/sandbox.smoke.ts`, and `pnpm exec tsx evals/_llm/sdk-bridge.selftest.ts` to confirm the shim/aliases resolve at runtime.
- [x] **D12** — Append a Work Log entry describing exactly which import paths changed and why. (`specs/20260516-rationalise-eval-system/subtask-02-rationalise-eval-system-consolidate-evals-_llm-20260516.md`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `evals/_llm/sandbox.ts` — 390-line duplicate → 7-line thin re-export shim
- **modified** `evals/_llm/README.md` — Rewritten with allow-list structure
- **modified** `plugins/zoto-eval-system/templates/static/jest/setup.ts.tmpl` — Added comment documenting shim import strategy
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Shim approach chosen for backward compatibility. sandbox.selftest and sandbox.smoke pass. sdk-bridge.selftest has pre-existing failures (withRetry not exported, BRIDGE_SURFACE length drifted) — not introduced by this subtask.
<!-- status:notes:end -->
