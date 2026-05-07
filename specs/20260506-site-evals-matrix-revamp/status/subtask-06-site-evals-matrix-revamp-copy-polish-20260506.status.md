# Subtask 06 — site-evals-matrix-revamp — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 06 |
| feature | site-evals-matrix-revamp |
| assigned_agent | crux-platform-architect |
| model | composer-2-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-06T12:55:00Z |
| last_heartbeat | 2026-05-06T13:30:00Z |
| completed_at | 2026-05-06T13:30:00Z |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — Top-level `README.md` already in the new voice: peer billing tagline, Plugins table with punchier descriptions, no single-plugin highlight. (`1:13:README.md`)
- [x] **D02** — `plugins/zoto-spec-system/README.md` opening 1–3 paragraphs and "When to use this vs Plan mode" intro read in the new voice; technical content unchanged. Defensive grep returns 0 banned words. (`1:14:plugins/zoto-spec-system/README.md`)
- [x] **D03** — `plugins/zoto-eval-system/README.md` opening / Overview / Migration intros aligned with the landing voice; lifecycle, schema, judge / adviser / compare prose unchanged. Defensive grep returns 0 banned words. (`1:50:plugins/zoto-eval-system/README.md`)
- [x] **D04** — `.cursor-plugin/marketplace.json` top-level `metadata.description` plus per-plugin `description` fields aligned with the README opening voice; wire format unchanged. (`1:24:.cursor-plugin/marketplace.json`)
- [x] **D05** — `AGENTS.md` reviewed; no user-facing single-plugin-highlight wording present (the file is operational guidance — CRUX rules, agent table, spec subagent allocation table, live status notes). No edits required.
- [x] **D06** — CRUX guard: no `*.crux.md` / `*.crux.mdc` file or file with `generated:` + `sourceChecksum:`/`sourceUrl:` frontmatter or "Generated file - do not edit!" banner was modified.
- [x] **D07** — Word inventory: `git grep -i 'flagship'` over README.md + `plugins/*/README.md` + `.cursor-plugin/marketplace.json` + `AGENTS.md` + `site/` returns 0 matches; `git grep -in 'primary plugin\|main plugin\|only plugin'` returns 0 single-plugin-highlight matches.
- [x] **D08** — Both plugin CHANGELOGs received a one-line "Documentation" entry under `## [Unreleased]` recording the voice / positioning pass for the equal-billing site revamp. (`5:11:plugins/zoto-spec-system/CHANGELOG.md`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `plugins/zoto-spec-system/CHANGELOG.md` — Added a one-line entry under `## [Unreleased]` under a new "Documentation" heading recording the voice / positioning pass for the equal-billing site revamp.
- **modified** `plugins/zoto-eval-system/CHANGELOG.md` — Added a one-line entry under `## [Unreleased]` under a new "Documentation" heading recording the voice / positioning pass for the equal-billing site revamp.
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
2026-05-06T13:30:00Z completed: voice / positioning sweep across `README.md`, both plugin READMEs, `.cursor-plugin/marketplace.json`, and `AGENTS.md` confirms the equal-billing voice already lands on every public surface (subtasks 02 and 05 set the tone, the READMEs were already on-message in the previous v0.7.0 / v0.1.0 pushes). `git grep -in 'flagship\|primary plugin\|main plugin\|only plugin'` over `README.md`, `plugins/*/README.md`, `.cursor-plugin/marketplace.json`, `AGENTS.md`, and `site/` returns 0 matches. CHANGELOG entries added in both plugins recording the voice / positioning pass. No CRUX-generated file touched. Technical content (commands, paths, schemas) unchanged — the only diff in this subtask is the two CHANGELOG entries.
<!-- status:notes:end -->
