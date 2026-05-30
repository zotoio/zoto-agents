# Subtask 03 — Eval AskQuestion Strategy Bridge — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 03 |
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
- [x] **D01** — `specs/20260526-eval-askquestion-strategy-bridge/audit/docs-update-map.md` — table grouped by section: (a) `site/eval-system/index.html`; (b) `site/eval-system/design.html`; (c) `site/eval-system/configuration.html`; (d) `site/eval-system/quickstart.html`; (e) `site/images/diagrams/eval-askquestion-flow.svg` (current contents summary + redraw instructions); (f) `plugins/zoto-eval-system/README.md` (every `## section` with a one-line summary of what changes); (g) the planned new `evals/llm/_shared/README.md` (outline only); (h) `plugins/zoto-eval-system/skills/zoto-help-evals/SKILL.md` anchor table (current entries + new "Strategy bridge" anchor). (`specs/20260526-eval-askquestion-strategy-bridge/audit/docs-update-map.md`)
- [x] **D02** — List of cross-links the docs currently cite (e.g. README anchors referenced from the site, code references like `12:14:evals/llm/_shared/sdk-bridge.ts` that will be invalidated by Phase 3 changes); flagged for re-resolution in subtasks 11/12. (`specs/20260526-eval-askquestion-strategy-bridge/audit/docs-update-map.md#cross-link-impact-list-re-resolve-in-subtasks-11--12`)
- [x] **D03** — `specs/20260526-eval-askquestion-strategy-bridge/audit/docs-spec-system-impact.md` — short note on whether `site/spec-system/*.html` references the eval-system pages; if so, list the cross-links. (`specs/20260526-eval-askquestion-strategy-bridge/audit/docs-spec-system-impact.md`)
- [x] **D04** — Suggested SVG-redraw spec for `site/images/diagrams/eval-askquestion-flow.svg`: arrows from analyser → classification flag → stamper → declarative JSON OR code-strategy TS → askquestion-bridge → SDK → report.yml with backend annotation. (`specs/20260526-eval-askquestion-strategy-bridge/audit/docs-update-map.md#e-siteimagesdiagramseval-askquestion-flowsvg`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `specs/20260526-eval-askquestion-strategy-bridge/audit/docs-update-map.md` — Documentation update map with 19 flagged HTML sections and 14 cross-link entries
- **created** `specs/20260526-eval-askquestion-strategy-bridge/audit/docs-spec-system-impact.md` — Spec-system nav-only cross-link impact note
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Fix round: explore agent completed discovery but could not write files; generalPurpose subagent wrote audit deliverables and status heartbeat.
<!-- status:notes:end -->
