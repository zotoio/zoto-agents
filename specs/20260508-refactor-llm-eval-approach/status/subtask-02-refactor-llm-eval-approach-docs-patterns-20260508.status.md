# Subtask 02 — Refactor LLM eval approach — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 02 |
| feature | Refactor LLM eval approach |
| assigned_agent | crux-platform-architect |
| model | composer-2-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-08T20:15:00+10:00 |
| last_heartbeat | 2026-05-08T10:18:31.429Z |
| completed_at | 2026-05-08T20:17:00+10:00 |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — `plugins/zoto-eval-system/README.md`: section **"LLM eval strategies (declarative + code)"** naming `pnpm run eval:llm:declarative` vs `pnpm run eval:llm:code`, artifact locations (JSON under plugin `evals/`, code under `evals/llm/`), and manifest role (`.zoto/eval-system/`) (`plugins/zoto-eval-system/README.md`)
- [x] **D02** — Same README: **playbook** — *commands* → multi-step Vitest/SDK scenarios; *bulk phrase/skill triggers* → prefer declarative JSON or generated tables; reference **spec prompts** as input to future analyser/updater quality (`plugins/zoto-eval-system/README.md`)
- [x] **D03** — Optional: short `AGENTS.md` addition if agents need to know which script to run for which strategy (`AGENTS.md`)
- [x] **D04** — Cross-check docs against subtask 01 inventory (no wrong paths)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `plugins/zoto-eval-system/README.md` — Added 'LLM eval strategies (declarative + code)' section with side-by-side comparison, artifact locations table, switching instructions, and playbook with example spec prompts
- **modified** `AGENTS.md` — Added 'Eval Strategy for Agents' paragraph pointing to README dual-strategy reference
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
All referenced paths cross-checked against subtask 01 inventory and confirmed on disk. validate-template.mjs passes. Closing gate: subtask 06 owns the final README sync pass.
<!-- status:notes:end -->
