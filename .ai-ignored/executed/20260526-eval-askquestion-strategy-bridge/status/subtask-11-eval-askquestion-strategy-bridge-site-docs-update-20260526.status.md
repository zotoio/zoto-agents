# Subtask 11 — Eval AskQuestion Strategy Bridge — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 11 |
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
- [x] **D01** — `site/eval-system/index.html` — overview gains a "Strategy bridge" section explaining declarative-vs-code + the analyser classification, with a link to the design page. (`site/eval-system/index.html#strategy-bridge`)
- [x] **D02** — `site/eval-system/design.html` — full flow described: analyser → classification → stamper → backend → bridge (when interactive) → SDK → report. Reference `_shared/askquestion-bridge.ts` and the `interaction_style` annotation. (`site/eval-system/design.html#strategy-bridge`)
- [x] **D03** — `site/eval-system/configuration.html` — `llm.strategy` documentation refreshed to explain that strategy is per-target (analyser-driven) within a hybrid scaffold; the global `llm.strategy:` knob in `.zoto/eval-system/config.yml` becomes the **fallback default** when classification is unavailable, not the per-target choice. (`site/eval-system/configuration.html#llm-backend`)
- [x] **D04** — `site/eval-system/quickstart.html` — new "What gets stamped where?" callout pointing to the design page. (`site/eval-system/quickstart.html#configure`)
- [x] **D05** — `site/images/diagrams/eval-askquestion-flow.svg` regenerated to show: source primitive → analyser → `{requiresInteraction, interactionStyle}` → stamper → declarative JSON OR code-strategy TS → askquestion-bridge (interactive only) → @cursor/sdk → `report.yml` with `backend: declarative|code`. (`site/images/diagrams/eval-askquestion-flow.svg`)
- [x] **D06** — Cross-link audit performed against `site/spec-system/{index,design,configuration,quickstart}.html` per Subtask 03's `docs-spec-system-impact.md`; broken or stale links fixed. (`specs/20260526-eval-askquestion-strategy-bridge/audit/docs-spec-system-impact.md`)
- [x] **D07** — Markup smoke check: pages render without unclosed tags (use a simple HTML linter or `node --check` on any inline scripts touched).
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `site/eval-system/index.html` — Strategy bridge section and dual-backend updates
- **modified** `site/eval-system/design.html` — Full analyser-to-report pipeline and strategy-bridge subsection
- **modified** `site/eval-system/configuration.html` — llm.strategy reframed as fallback default
- **modified** `site/eval-system/quickstart.html` — What gets stamped where callout and hybrid notes
- **modified** `site/images/diagrams/eval-askquestion-flow.svg` — Regenerated strategy-bridge pipeline diagram
- **modified** `specs/20260526-eval-askquestion-strategy-bridge/audit/docs-update-map.md` — Phase 5 completion checklist ticked
- **modified** `specs/20260526-eval-askquestion-strategy-bridge/audit/docs-spec-system-impact.md` — Subtask 11 cross-link audit result recorded
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Cross-link audit: spec-system nav-only; no HTML edits required. HTML tag-balance smoke check passed.
<!-- status:notes:end -->
