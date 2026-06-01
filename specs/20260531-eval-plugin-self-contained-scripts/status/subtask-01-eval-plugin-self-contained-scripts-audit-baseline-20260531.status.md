# Subtask 01 — Eval Plugin Self-Contained Scripts Consolidation — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 01 |
| feature | Eval Plugin Self-Contained Scripts Consolidation |
| assigned_agent | zoto-eval-engineer |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-06-01T00:00:00Z |
| last_heartbeat | 2026-05-31T22:25:05.081Z |
| completed_at | 2026-05-31T22:25:05.081Z |
| git_sha | fbfecad15cca5de07f40ec150555f1b8d2fff64c |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — `audit/import-graph-baseline.md` — table of every `scripts/eval-*` and plugin script with import targets (`../plugins/…`, `../../../scripts/…`, `../src/…`, etc.) (`specs/20260531-eval-plugin-self-contained-scripts/audit/import-graph-baseline.md`)
- [x] **D02** — `audit/file-inventory.md` — move list, delete list, keep-at-root list with line counts and last-modified rationale (`specs/20260531-eval-plugin-self-contained-scripts/audit/file-inventory.md`)
- [x] **D03** — `audit/stale-duplicates.md` — side-by-side note on `eval-discover.ts` and `eval-update.ts` forks vs canonical copies (`specs/20260531-eval-plugin-self-contained-scripts/audit/stale-duplicates.md`)
- [x] **D04** — `audit/test-inventory.md` — which `scripts/__tests__/*` relocate to plugin vs stay at root (`specs/20260531-eval-plugin-self-contained-scripts/audit/test-inventory.md`)
- [x] **D05** — Grep baseline captured in audit: `rg '../plugins/zoto-eval-system' scripts/` and `rg '../../../scripts' plugins/zoto-eval-system/` (`specs/20260531-eval-plugin-self-contained-scripts/audit/import-graph-baseline.md`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `specs/20260531-eval-plugin-self-contained-scripts/audit/import-graph-baseline.md` — Import graph + grep baseline
- **created** `specs/20260531-eval-plugin-self-contained-scripts/audit/file-inventory.md` — Move/delete/keep inventory (KD-1–KD-9)
- **created** `specs/20260531-eval-plugin-self-contained-scripts/audit/stale-duplicates.md` — eval-discover and eval-update fork analysis
- **created** `specs/20260531-eval-plugin-self-contained-scripts/audit/test-inventory.md` — scripts/__tests__ relocation plan
- **created** `specs/20260531-eval-plugin-self-contained-scripts/audit/working-tree-baseline.md` — Dirty-tree snapshot for subtask 02
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Audit run on dirty feat/site-updates @ fbfecad; 53 changed paths. Subtask 02 should stash WIP on overlap paths. Grep: 18 files reference plugins/zoto-eval-system under scripts/; 2 plugin files reference ../../../scripts. Broken package.json alias eval:bootstrap-llm-code (missing script).
<!-- status:notes:end -->
