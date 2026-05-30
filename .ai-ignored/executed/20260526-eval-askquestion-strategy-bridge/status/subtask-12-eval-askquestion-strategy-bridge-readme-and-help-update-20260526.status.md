# Subtask 12 — Eval AskQuestion Strategy Bridge — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 12 |
| feature | Eval AskQuestion Strategy Bridge |
| assigned_agent | generalPurpose |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at |  |
| last_heartbeat |  |
| completed_at |  |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — `plugins/zoto-eval-system/README.md` gains a `## Strategy bridge` section (or whichever heading reads naturally given the existing TOC) that covers: declarative vs code; analyser-driven classification; the `_shared/askquestion-bridge.ts` helper; the per-row `backend:` annotation in `report.yml`; the migration story for existing repos. Cite Subtask 09's migration matrix as the example diff readers can review. (`plugins/zoto-eval-system/README.md`)
- [x] **D02** — `plugins/zoto-eval-system/README.md` `## Configuration` section refreshed: `llm.strategy:` is now the fallback default (used only when classification is unavailable), not the per-target choice. Cross-reference `site/eval-system/configuration.html`. (`plugins/zoto-eval-system/README.md`)
- [x] **D03** — `plugins/zoto-eval-system/README.md` `## Plugin scaffolding` (or equivalent) section forward-references the new `/zoto-create-plugin` integration from Subtask 10. (`plugins/zoto-eval-system/README.md`)
- [x] **D04** — `evals/llm/_shared/README.md` (new file) describes every helper currently in `evals/llm/_shared/` (`sdk-bridge`, `code-strategy-case`, `run-code-strategy-suite`, `sandbox-helpers`, `zoto-llm-reporter`, `setup`, `_user-case-guards`, the new `askquestion-bridge`, `graders/*`). Each entry includes: purpose, exported surface table, intended consumers, link back to `plugins/zoto-eval-system/README.md` for the user-facing version. (`evals/llm/_shared/README.md`)
- [x] **D05** — `plugins/zoto-eval-system/skills/zoto-help-evals/SKILL.md` Step 2/Step 3 anchor tables updated so the README's new section is on the help-section menu. Verify the section header matches the README exactly (the skill loads README sections by `## header` literal). (`plugins/zoto-eval-system/skills/zoto-help-evals/SKILL.md`)
- [x] **D06** — Cross-link audit performed: every `start:end:plugins/zoto-eval-system/README.md` reference in the broader codebase still resolves (the section line numbers will shift; update the citing files). (`plugins/zoto-eval-system/skills/zoto-help-evals/SKILL.md`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `plugins/zoto-eval-system/README.md` — Strategy bridge section and Configuration/Plugin scaffolding refresh
- **created** `evals/llm/_shared/README.md` — Module catalogue for code-strategy shared helpers
- **modified** `plugins/zoto-eval-system/skills/zoto-help-evals/SKILL.md` — Step 3 Strategy bridge anchor and citation example update
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Cross-link audit: only SKILL.md carried hard-coded README line citations (20:30 → 34:50 Quick start). No site/eval-system/*.html edits (subtask 11).
<!-- status:notes:end -->
