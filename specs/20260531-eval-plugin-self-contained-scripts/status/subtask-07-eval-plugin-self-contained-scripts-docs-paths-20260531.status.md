# Subtask 07 — Eval Plugin Self-Contained Scripts Consolidation — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 07 |
| feature | Eval Plugin Self-Contained Scripts Consolidation |
| assigned_agent | zoto-eval-architect |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-31T22:42:00Z |
| last_heartbeat | 2026-05-31T22:51:39Z |
| completed_at | 2026-05-31T22:51:39Z |
| git_sha | fbfecad15cca5de07f40ec150555f1b8d2fff64c |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — `plugins/zoto-eval-system/README.md` — new or updated section: **Plugin vs host runtime layout** (plugin `scripts/`, `engine/`, `src/` vs stamped `.zoto/eval-system/`) (`plugins/zoto-eval-system/README.md`)
- [x] **D02** — `plugins/zoto-eval-system/CHANGELOG.md` — unreleased entry documenting script consolidation and standalone install fix (`plugins/zoto-eval-system/CHANGELOG.md`)
- [x] **D03** — Update skills referencing root `scripts/eval-*` as canonical: (`plugins/zoto-eval-system/skills/zoto-create-evals/SKILL.md`)
- [x] **D04** — Update commands/agents that cite `plugins/zoto-eval-system/engine/…` vs `scripts/…` inconsistently — prefer stable wording: "plugin package" for authoring, `.zoto/eval-system/` for host operators (`plugins/zoto-eval-system/commands/z-eval-create.md`)
- [x] **D05** — Template comment headers in `templates/static/**` and `templates/llm/**` referencing `scripts/eval-stamp.ts` — update to `plugins/zoto-eval-system/scripts/eval-stamp.ts` or generic "eval-system stamper" wording (`plugins/zoto-eval-system/templates/static/pytest/per-primitive-test.py.tmpl`)
- [x] **D06** — `.cursor/agents/zoto-eval-engineer.md` / `zoto-eval-architect.md` if they prescribe root script paths (`.cursor/agents/zoto-eval-architect.md`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `plugins/zoto-eval-system/README.md` — Plugin vs host runtime layout section
- **modified** `plugins/zoto-eval-system/CHANGELOG.md` — Unreleased Phase 3 consolidation entry
- **modified** `plugins/zoto-eval-system/skills/zoto-create-evals/SKILL.md` — Plugin-relative script paths
- **modified** `plugins/zoto-eval-system/skills/zoto-update-evals/SKILL.md` — Plugin-relative script paths
- **modified** `plugins/zoto-eval-system/skills/zoto-eval-tooling/SKILL.md` — Plugin-relative script paths
- **modified** `plugins/zoto-eval-system/skills/zoto-configure-evals/SKILL.md` — Host script path references
- **modified** `plugins/zoto-eval-system/templates/static/pytest/per-primitive-test.py.tmpl` — Stamper path in template header
- **modified** `plugins/zoto-eval-system/templates/static/pytest/conftest.py.tmpl` — Stamper path in template header
- **modified** `plugins/zoto-eval-system/templates/static/vitest/README.md` — Stamper path references
- **modified** `plugins/zoto-eval-system/templates/static/vitest/vitest.config.ts.tmpl` — Stamper path in template header
- **modified** `plugins/zoto-eval-system/templates/static/vitest/setup.ts.tmpl` — Stamper path in template header
- **modified** `plugins/zoto-eval-system/templates/static/vitest/per-primitive-test.ts.tmpl` — Stamper path in template header
- **modified** `plugins/zoto-eval-system/templates/static/vitest/reporters/zoto-eval-reporter.ts.tmpl` — Stamper path in template header
- **modified** `plugins/zoto-eval-system/templates/static/jest/README.md` — Stamper path references
- **modified** `plugins/zoto-eval-system/templates/static/jest/jest.config.ts.tmpl` — Stamper path in template header
- **modified** `plugins/zoto-eval-system/templates/static/jest/setup.ts.tmpl` — Stamper path in template header
- **modified** `plugins/zoto-eval-system/templates/static/jest/per-primitive-test.ts.tmpl` — Stamper path in template header
- **modified** `plugins/zoto-eval-system/templates/static/jest/reporters/zoto-eval-reporter.ts.tmpl` — Stamper path in template header
- **modified** `plugins/zoto-eval-system/templates/llm/agent-sdk/README.md.tmpl` — Stamper path references
- **modified** `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/jest.config.ts.tmpl` — Stamper path in template header
- **modified** `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/vitest.config.ts.tmpl` — Stamper path in template header
- **modified** `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/sandbox-helpers.ts.tmpl` — Stamper path in template header
- **modified** `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/_shared/case-runner.ts.tmpl` — Stamper path in template header
- **modified** `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/_shared/setup.ts.tmpl` — Stamper path in template header
- **modified** `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/_shared/sdk-bridge.ts.tmpl` — Stamper path in template header
- **modified** `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/_shared/sandbox-helpers.ts.tmpl` — Stamper path in template header
- **modified** `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/_shared/result-yaml-writer.ts.tmpl` — Stamper path in template header
- **modified** `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/_shared/reporters/zoto-llm-reporter.jest.ts.tmpl` — Stamper path in template header
- **modified** `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/_shared/reporters/zoto-llm-reporter.vitest.ts.tmpl` — Stamper path in template header
- **modified** `site/eval-system/design.html` — engine/update.ts as canonical updater
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
D04 and D06 required no edits: plugin commands/agents already use stable "plugin package"
(plugins/zoto-eval-system/engine|scripts/) wording for authoring and .zoto/eval-system/ for
host operators; .cursor/agents/{zoto-eval-engineer,zoto-eval-architect}.md already document the
three-layer model (KD-1) with repo-root scripts/ as CI/migration only. site/eval-system/design.html
line 199 now names engine/update.ts canonical and marks scripts/eval-update.ts as removed/legacy.
Definition of Done greps: scripts/eval-analyse.ts under skills/commands/agents/README.md = 0 bare
repo-root hits; scripts/eval-update.ts under site/eval-system/ describes the script as removed
(not canonical); CHANGELOG [unreleased] v3 section gained a Phase 3 consolidation + standalone
install fix block. Token budget 200000 not exceeded.

<!-- status:notes:end -->
