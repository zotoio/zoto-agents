# Subtask 09 — evals-json-first-migration — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 09 |
| feature | evals-json-first-migration |
| assigned_agent | generalPurpose |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-27T15:57:54Z |
| last_heartbeat | 2026-05-29T12:00:00Z |
| completed_at | 2026-05-28T02:50:00Z |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — Create the example scenario as a **template** (not a live file in this repo) at `plugins/zoto-eval-system/templates/scenarios/_example-multi-primitive.test.ts.tmpl`: (`plugins/zoto-eval-system/templates/scenarios/_example-multi-primitive.test.ts.tmpl`)
- [x] **D02** — Add a host-repo install hook so `/z-eval-create` copies the template: (`scripts/eval-ensure-host.ts`)
- [x] **D03** — Update `plugins/zoto-eval-system/README.md`: (`plugins/zoto-eval-system/README.md`)
- [x] **D04** — Update `plugins/zoto-eval-system/skills/zoto-help-evals/SKILL.md`: (`plugins/zoto-eval-system/skills/zoto-help-evals/SKILL.md`)
- [x] **D05** — Update `plugins/zoto-eval-system/skills/zoto-help-evals/evals/evals.json`: (`plugins/zoto-eval-system/skills/zoto-help-evals/evals/evals.json`)
- [x] **D06** — Update `plugins/zoto-eval-system/CHANGELOG.md`: (`plugins/zoto-eval-system/CHANGELOG.md`)
- [x] **D07** — Update the repo-root `CHANGELOG.md` with a brief pointer to the eval-system plugin entry. (`CHANGELOG.md`)
- [x] **D08** — Update `AGENTS.md` only if it currently describes the TS-eval convention; otherwise leave untouched. Grep for `\.test\.ts` mentions related to evals.
- [x] **D09** — Update any other plugin README / skill doc that references the TS LLM eval convention:
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `plugins/zoto-eval-system/templates/scenarios/_example-multi-primitive.test.ts.tmpl` — D01 - canonical multi-primitive scenario template (pre-existing; verified intact).
- **modified** `scripts/eval-ensure-host.ts` — D02 - ensureScenarioExample() idempotently stamps evals/scenarios/_example-multi-primitive.test.ts (pre-existing; verified via pnpm exec tsx run).
- **modified** `plugins/zoto-eval-system/README.md` — D03 - added Eval formats, Advanced TS escape hatch, Multi-primitive scenarios, Migration notes; rewrote co-located layout and lifecycle sections to JSON-first.
- **modified** `plugins/zoto-eval-system/skills/zoto-help-evals/SKILL.md` — D04 - JSON-first signal rows + Q&A quick reference for runner/scenarios.
- **modified** `plugins/zoto-eval-system/skills/zoto-help-evals/evals/evals.json` — D05 - added user-authored case id=4 (runner Q&A, 7 assertions).
- **modified** `plugins/zoto-eval-system/CHANGELOG.md` — D06 - [unreleased] 2026-05-27 BREAKING entry; superseded note on 2026-05-26 entry.
- **modified** `CHANGELOG.md` — D07 - cross-plugin 2026-05-27 BREAKING pointer.
- **modified** `plugins/zoto-eval-system/skills/zoto-create-evals/SKILL.md` — D02 + D09 - JSON-first LLM backend + scenario-copy step.
- **modified** `plugins/zoto-eval-system/skills/zoto-update-evals/SKILL.md` — D09 - regenerateLlm targets .json; updated file-level guard prose.
- **modified** `plugins/zoto-eval-system/skills/zoto-eval-tooling/SKILL.md` — D09 - JSON-first cleanup description.
- **modified** `plugins/zoto-eval-system/skills/zoto-configure-evals/SKILL.md` — D09 - JSON-first LLM backend descriptions.
- **modified** `plugins/zoto-eval-system/commands/z-eval-update.md` — D09 - regenerateLlm targets .json.
- **modified** `plugins/zoto-eval-system/commands/z-eval-execute.md` — D09 - eval:full + JSON loader; removed eval:llm reference.
- **modified** `plugins/zoto-eval-system/commands/z-eval-configure.md` — D09 - JSON-first + runner escape hatch description.
- **modified** `plugins/zoto-eval-system/agents/zoto-eval-updater.md` — D09 - regenerateLlm targets .json; updated file-level guard.
- **modified** `plugins/zoto-eval-system/agents/zoto-eval-generator.md` — D09 - JSON-first stamping description.
- **modified** `plugins/zoto-eval-system/agents/zoto-eval-executor.md` — D09 - eval:full + JSON loader description.
- **modified** `plugins/zoto-eval-system/agents/zoto-eval-configurer.md` — D09 - JSON-first discovery + removed-target cleanup.
- **modified** `plugins/zoto-eval-system/agents/zoto-eval-analyser-subagent.md` — D09 - misclassification consequence references .json shape.
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Fix pass 2 (2026-05-29): Prior status claimed completed but disk was missing
all documentation deliverables. This pass implemented them on disk:

- README: Eval formats (line 287), Advanced TS escape hatch (298), Multi-primitive
  scenarios (342), Migration notes (350); co-located layout tree uses .json;
  lifecycle/create/update/execute/troubleshooting sections updated.
- Plugin CHANGELOG: [unreleased] 2026-05-27 BREAKING entry at top; 2026-05-26
  entry marked superseded.
- Repo-root CHANGELOG: 2026-05-27 cross-plugin BREAKING pointer.
- zoto-help-evals: user-authored case id=4 added (17 total cases); SKILL.md
  Q&A + signal rows updated.
- D09: 10 skill/command/agent docs updated from .test.ts LLM convention to
  JSON-first (runner/scenario .test.ts references retained where legitimate).

Verification:
- rg "\.test\.ts" plugins/zoto-eval-system -g '*.md' → 44 matches (all
  legitimate: runner escape hatch, scenarios, migration/historical CHANGELOG,
  static-framework templates, subtask-08-scoped templates/llm/code-cursor-sdk/README.md).
- No remaining evals/<name>.test.ts as primary LLM eval convention outside
  historical CHANGELOG + subtask-08 scope.
- evals.json parses; 17 cases (4 user-authored ids 1..4 + 13 generated).
- pnpm eval:list | grep zoto-help-evals → 17 lines.
- ensureScenarioExample: skipped-existing (file already present).
- ReadLints on modified files: clean.
- AGENTS.md: zero .test.ts matches (D08 no-op).
- Token budget 200000 — within budget.

<!-- status:notes:end -->
