# Migration Audit — 20260527-evals-json-first-migration

- **Generated:** 2026-05-27T17:21:10.986Z
- **Mode:** `--apply`
- **Repo:** `/home/andrewv/git/cursor/zoto-agents`
- **Total discovered:** 38
- **Migrated:** 38
- **Failed:** 0
- **Skipped:** 0

| # | Source (`.test.ts`) | Destination (`.json`) | Target | Cases | Status | Error |
|---|---|---|---|---|---|---|
| 1 | `.cursor/agents/evals/zoto-eval-architect.test.ts` | `.cursor/agents/evals/zoto-eval-architect.json` | `agent:zoto-eval-architect` | 6 | migrated |  |
| 2 | `.cursor/agents/evals/zoto-eval-engineer.test.ts` | `.cursor/agents/evals/zoto-eval-engineer.json` | `agent:zoto-eval-engineer` | 7 | migrated |  |
| 3 | `.cursor/agents/evals/zoto-plugin-manager.test.ts` | `.cursor/agents/evals/zoto-plugin-manager.json` | `agent:zoto-plugin-manager` | 8 | migrated |  |
| 4 | `.cursor/commands/evals/sync-plugins.test.ts` | `.cursor/commands/evals/sync-plugins.json` | `command:sync-plugins` | 2 | migrated |  |
| 5 | `.cursor/commands/evals/zoto-create-plugin.test.ts` | `.cursor/commands/evals/zoto-create-plugin.json` | `command:zoto-create-plugin` | 3 | migrated |  |
| 6 | `.cursor/hooks/evals/hooks.test.ts` | `.cursor/hooks/evals/hooks.json` | `hook:cursor-workspace` | 3 | migrated |  |
| 7 | `plugins/zoto-cursor-top/agents/evals/zoto-cursor-top-troubleshooter.test.ts` | `plugins/zoto-cursor-top/agents/evals/zoto-cursor-top-troubleshooter.json` | `agent:zoto-cursor-top-troubleshooter` | 6 | migrated |  |
| 8 | `plugins/zoto-cursor-top/commands/evals/zoto-cursor-top.test.ts` | `plugins/zoto-cursor-top/commands/evals/zoto-cursor-top.json` | `command:zoto-cursor-top` | 11 | migrated |  |
| 9 | `plugins/zoto-eval-system/agents/evals/zoto-eval-adviser.test.ts` | `plugins/zoto-eval-system/agents/evals/zoto-eval-adviser.json` | `agent:zoto-eval-adviser` | 4 | migrated |  |
| 10 | `plugins/zoto-eval-system/agents/evals/zoto-eval-analyser-subagent.test.ts` | `plugins/zoto-eval-system/agents/evals/zoto-eval-analyser-subagent.json` | `agent:zoto-eval-analyser-subagent` | 6 | migrated |  |
| 11 | `plugins/zoto-eval-system/agents/evals/zoto-eval-comparer.test.ts` | `plugins/zoto-eval-system/agents/evals/zoto-eval-comparer.json` | `agent:zoto-eval-comparer` | 3 | migrated |  |
| 12 | `plugins/zoto-eval-system/agents/evals/zoto-eval-configurer.test.ts` | `plugins/zoto-eval-system/agents/evals/zoto-eval-configurer.json` | `agent:zoto-eval-configurer` | 7 | migrated |  |
| 13 | `plugins/zoto-eval-system/agents/evals/zoto-eval-executor.test.ts` | `plugins/zoto-eval-system/agents/evals/zoto-eval-executor.json` | `agent:zoto-eval-executor` | 4 | migrated |  |
| 14 | `plugins/zoto-eval-system/agents/evals/zoto-eval-generator.test.ts` | `plugins/zoto-eval-system/agents/evals/zoto-eval-generator.json` | `agent:zoto-eval-generator` | 3 | migrated |  |
| 15 | `plugins/zoto-eval-system/agents/evals/zoto-eval-judge.test.ts` | `plugins/zoto-eval-system/agents/evals/zoto-eval-judge.json` | `agent:zoto-eval-judge` | 2 | migrated |  |
| 16 | `plugins/zoto-eval-system/agents/evals/zoto-eval-updater.test.ts` | `plugins/zoto-eval-system/agents/evals/zoto-eval-updater.json` | `agent:zoto-eval-updater` | 8 | migrated |  |
| 17 | `plugins/zoto-eval-system/commands/evals/z-eval-advise.test.ts` | `plugins/zoto-eval-system/commands/evals/z-eval-advise.json` | `command:z-eval-advise` | 10 | migrated |  |
| 18 | `plugins/zoto-eval-system/commands/evals/z-eval-compare.test.ts` | `plugins/zoto-eval-system/commands/evals/z-eval-compare.json` | `command:z-eval-compare` | 4 | migrated |  |
| 19 | `plugins/zoto-eval-system/commands/evals/z-eval-configure.test.ts` | `plugins/zoto-eval-system/commands/evals/z-eval-configure.json` | `command:z-eval-configure` | 9 | migrated |  |
| 20 | `plugins/zoto-eval-system/commands/evals/z-eval-create.test.ts` | `plugins/zoto-eval-system/commands/evals/z-eval-create.json` | `command:z-eval-create` | 3 | migrated |  |
| 21 | `plugins/zoto-eval-system/commands/evals/z-eval-execute.test.ts` | `plugins/zoto-eval-system/commands/evals/z-eval-execute.json` | `command:z-eval-execute` | 6 | migrated |  |
| 22 | `plugins/zoto-eval-system/commands/evals/z-eval-help.test.ts` | `plugins/zoto-eval-system/commands/evals/z-eval-help.json` | `command:z-eval-help` | 7 | migrated |  |
| 23 | `plugins/zoto-eval-system/commands/evals/z-eval-init.test.ts` | `plugins/zoto-eval-system/commands/evals/z-eval-init.json` | `command:z-eval-init` | 5 | migrated |  |
| 24 | `plugins/zoto-eval-system/commands/evals/z-eval-judge.test.ts` | `plugins/zoto-eval-system/commands/evals/z-eval-judge.json` | `command:z-eval-judge` | 3 | migrated |  |
| 25 | `plugins/zoto-eval-system/commands/evals/z-eval-jump.test.ts` | `plugins/zoto-eval-system/commands/evals/z-eval-jump.json` | `command:z-eval-jump` | 3 | migrated |  |
| 26 | `plugins/zoto-eval-system/commands/evals/z-eval-operator.test.ts` | `plugins/zoto-eval-system/commands/evals/z-eval-operator.json` | `command:z-eval-operator` | 3 | migrated |  |
| 27 | `plugins/zoto-eval-system/commands/evals/z-eval-start.test.ts` | `plugins/zoto-eval-system/commands/evals/z-eval-start.json` | `command:z-eval-start` | 4 | migrated |  |
| 28 | `plugins/zoto-eval-system/commands/evals/z-eval-update.test.ts` | `plugins/zoto-eval-system/commands/evals/z-eval-update.json` | `command:z-eval-update` | 9 | migrated |  |
| 29 | `plugins/zoto-eval-system/commands/evals/z-eval-workflow.test.ts` | `plugins/zoto-eval-system/commands/evals/z-eval-workflow.json` | `command:z-eval-workflow` | 11 | migrated |  |
| 30 | `plugins/zoto-eval-system/hooks/evals/hooks.test.ts` | `plugins/zoto-eval-system/hooks/evals/hooks.json` | `hook:zoto-eval-system` | 4 | migrated |  |
| 31 | `plugins/zoto-spec-system/agents/evals/zoto-spec-executor.test.ts` | `plugins/zoto-spec-system/agents/evals/zoto-spec-executor.json` | `agent:zoto-spec-executor` | 9 | migrated |  |
| 32 | `plugins/zoto-spec-system/agents/evals/zoto-spec-generator.test.ts` | `plugins/zoto-spec-system/agents/evals/zoto-spec-generator.json` | `agent:zoto-spec-generator` | 4 | migrated |  |
| 33 | `plugins/zoto-spec-system/agents/evals/zoto-spec-judge.test.ts` | `plugins/zoto-spec-system/agents/evals/zoto-spec-judge.json` | `agent:zoto-spec-judge` | 3 | migrated |  |
| 34 | `plugins/zoto-spec-system/commands/evals/z-spec-create.test.ts` | `plugins/zoto-spec-system/commands/evals/z-spec-create.json` | `command:z-spec-create` | 5 | migrated |  |
| 35 | `plugins/zoto-spec-system/commands/evals/z-spec-execute.test.ts` | `plugins/zoto-spec-system/commands/evals/z-spec-execute.json` | `command:z-spec-execute` | 7 | migrated |  |
| 36 | `plugins/zoto-spec-system/commands/evals/z-spec-init.test.ts` | `plugins/zoto-spec-system/commands/evals/z-spec-init.json` | `command:z-spec-init` | 5 | migrated |  |
| 37 | `plugins/zoto-spec-system/commands/evals/z-spec-judge.test.ts` | `plugins/zoto-spec-system/commands/evals/z-spec-judge.json` | `command:z-spec-judge` | 5 | migrated |  |
| 38 | `plugins/zoto-spec-system/hooks/evals/hooks.test.ts` | `plugins/zoto-spec-system/hooks/evals/hooks.json` | `hook:zoto-spec-system` | 2 | migrated |  |
