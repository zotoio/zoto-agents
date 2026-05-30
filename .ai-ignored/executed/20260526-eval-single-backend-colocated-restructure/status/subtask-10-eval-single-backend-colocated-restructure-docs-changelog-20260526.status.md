# Subtask 10 — Eval Single Backend & Co-located Restructure — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 10 |
| feature | Eval Single Backend & Co-located Restructure |
| assigned_agent | zoto-plugin-manager |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | pending |
| started_at |  |
| last_heartbeat |  |
| completed_at |  |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [ ] **D01** — `plugins/zoto-eval-system/README.md` — rewrite the section that describes the eval layout. The new section MUST:
- [ ] **D02** — `plugins/zoto-eval-system/README.md` — add a new "Adding an eval as a plugin author" section. Content:
- [ ] **D03** — `plugins/zoto-eval-system/docs/**/*.md` — audit and update any file that mentions strategy / codeFramework. Common candidates: a config-schema doc, a layout doc. Bring them in line with the new design
- [ ] **D04** — `CHANGELOG.md` at repo root (or `plugins/zoto-eval-system/CHANGELOG.md` per the plugin's existing convention — verify which one this repo uses) — append a single entry under a new release section. Format:
- [ ] **D05** — If the repo has a top-level eval-architecture diagram (mermaid, ASCII, or image), update it to show the co-located layout
- [ ] **D06** — If `plugins/zoto-eval-system/.cursor-plugin/plugin.json` has a `description` mentioning strategy, update it
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
_None._
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->

<!-- status:notes:end -->
