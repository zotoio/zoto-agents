# Subtask 03 — eval-dual-host-layout — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 03 |
| feature | eval-dual-host-layout |
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
- [x] **D01** — `/z-eval-init` updated: after writing config.yml, runs `pnpm install` at repo root to install eval devDeps (`plugins/zoto-eval-system/commands/z-eval-init.md`)
- [x] **D02** — `/z-eval-create` flow updated: stamps ONLY config.yml, manifest.yml, evals/ structure, _runs/.gitkeep, cache/.gitkeep, .gitignore — NO src/, engine/, templates/, scripts/, agents/, nested package.json (`plugins/zoto-eval-system/scripts/stamp-lean-layout.ts`)
- [x] **D03** — Root `package.json` eval script aliases updated to resolve through plugin: `tsx <resolved-plugin-path>/scripts/<name>.ts` pattern OR wrapper script that calls `resolvePluginRoot()` (`plugins/zoto-eval-system/templates/runner/eval-bridge.ts.tmpl`)
- [x] **D04** — Minimal devDeps added to root `package.json` by create flow: `@cursor/sdk`, `tsx`, `yaml`, `dotenv`, `ajv`, `ajv-formats`, `typescript`, `minimatch` (`plugins/zoto-eval-system/templates/package-scripts/base.json`)
- [x] **D05** — `stamp-host-layout.ts` NOT called by `/z-eval-create` in lean mode (`plugins/zoto-eval-system/skills/zoto-create-evals/SKILL.md`)
- [x] **D06** — `zoto-create-evals` SKILL.md updated to document lean-mode behaviour (`plugins/zoto-eval-system/skills/zoto-create-evals/SKILL.md`)
- [x] **D07** — `z-eval-create.md` command doc updated (`plugins/zoto-eval-system/commands/z-eval-create.md`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `plugins/zoto-eval-system/scripts/stamp-lean-layout.ts` — lean layout stamper
- **created** `plugins/zoto-eval-system/templates/runner/eval-bridge.ts.tmpl` — cross-platform eval script bridge template
- **modified** `plugins/zoto-eval-system/templates/package-scripts/base.json` — eval:* aliases via eval-bridge + minimal devDeps
- **modified** `plugins/zoto-eval-system/scripts/eval-ensure-host.ts` — lean ensure-host updates
- **modified** `plugins/zoto-eval-system/commands/z-eval-init.md` — pnpm install after config write
- **modified** `plugins/zoto-eval-system/commands/z-eval-create.md` — lean create flow documentation
- **modified** `plugins/zoto-eval-system/skills/zoto-create-evals/SKILL.md` — lean-mode behaviour documented
- **modified** `plugins/zoto-eval-system/agents/zoto-eval-generator.md` — generator uses stamp-lean-layout only
- **modified** `plugins/zoto-eval-system/tests/plugin.test.ts` — stampLeanLayout and merger tests
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Bridge smoke-tested: eval-discover via stamped bridge from temp lean host against monorepo plugin resolution.
<!-- status:notes:end -->
