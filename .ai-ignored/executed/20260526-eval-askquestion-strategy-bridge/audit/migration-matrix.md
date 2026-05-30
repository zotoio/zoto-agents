# Migration matrix — Subtask 09

| target | pre backend | post backend | migration_class | path before | path after | notes |
|--------|-------------|--------------|-----------------|-------------|------------|-------|
| agent:zoto-cursor-top-troubleshooter | none | none | no-eval-yet | — | — | user diff: — |
| agent:zoto-eval-adviser | code | code+bridge | keep-code-bridge-only | evals/llm/test_agent_zoto-eval-adviser.test.ts | evals/llm/test_agent_zoto-eval-adviser.test.ts | bridge ok; deferred: regeneration SyntaxError in declarative merge path |
| agent:zoto-eval-analyser-subagent | code | declarative | migrate-to-declarative | evals/llm/test_agent_zoto-eval-analyser-subagent.test.ts | plugins/zoto-eval-system/evals/agents/zoto-eval-analyser-subagent.json | TS removed |
| agent:zoto-eval-architect | none | none | no-eval-yet | — | — | user diff: — |
| agent:zoto-eval-comparer | code | code+bridge | keep-code-bridge-only | evals/llm/test_agent_zoto-eval-comparer.test.ts | evals/llm/test_agent_zoto-eval-comparer.test.ts | bridge ok |
| agent:zoto-eval-configurer | code | declarative | migrate-to-declarative | evals/llm/test_agent_zoto-eval-configurer.test.ts | plugins/zoto-eval-system/evals/agents/zoto-eval-configurer.json | TS removed |
| agent:zoto-eval-engineer | none | none | no-eval-yet | — | — | user diff: — |
| agent:zoto-eval-executor | code | code+bridge | keep-code-bridge-only | evals/llm/test_agent_zoto-eval-executor.test.ts | evals/llm/test_agent_zoto-eval-executor.test.ts | bridge ok |
| agent:zoto-eval-generator | code | code+bridge | keep-code-bridge-only | evals/llm/test_agent_zoto-eval-generator.test.ts | evals/llm/test_agent_zoto-eval-generator.test.ts | bridge ok |
| agent:zoto-eval-judge | code | code+bridge | keep-code-bridge-only | evals/llm/test_agent_zoto-eval-judge.test.ts | evals/llm/test_agent_zoto-eval-judge.test.ts | bridge ok |
| agent:zoto-eval-updater | code | declarative | migrate-to-declarative | evals/llm/test_agent_zoto-eval-updater.test.ts | plugins/zoto-eval-system/evals/agents/zoto-eval-updater.json | TS removed |
| agent:zoto-plugin-manager | code | declarative | migrate-to-declarative | evals/llm/test_agent_zoto-plugin-manager.test.ts | .cursor/evals/agents/zoto-plugin-manager.json | TS removed |
| agent:zoto-spec-executor | code | code+bridge | keep-code-bridge-only | evals/llm/test_agent_zoto-spec-executor.test.ts | evals/llm/test_agent_zoto-spec-executor.test.ts | bridge ok; dual declarative JSON removed |
| agent:zoto-spec-generator | code | code+bridge | keep-code-bridge-only | evals/llm/test_agent_zoto-spec-generator.test.ts | evals/llm/test_agent_zoto-spec-generator.test.ts | bridge ok; deferred: analyser response_not_json |
| agent:zoto-spec-judge | code | code+bridge | keep-code-bridge-only | evals/llm/test_agent_zoto-spec-judge.test.ts | evals/llm/test_agent_zoto-spec-judge.test.ts | bridge ok |
| command:sync-plugins | code | code+bridge | keep-code-bridge-only | evals/llm/test_command_sync-plugins.test.ts | evals/llm/test_command_sync-plugins.test.ts | bridge ok |
| command:z-eval-advise | code | code+bridge | keep-code-bridge-only | evals/llm/test_command_z-eval-advise.test.ts | evals/llm/test_command_z-eval-advise.test.ts | bridge ok |
| command:z-eval-compare | code | declarative | migrate-to-declarative | evals/llm/test_command_z-eval-compare.test.ts | plugins/zoto-eval-system/evals/commands/z-eval-compare.json | TS removed |
| command:z-eval-configure | code | code+bridge | keep-code-bridge-only | evals/llm/test_command_z-eval-configure.test.ts | evals/llm/test_command_z-eval-configure.test.ts | bridge ok |
| command:z-eval-create | code | code+bridge | keep-code-bridge-only | evals/llm/test_command_z-eval-create.test.ts | evals/llm/test_command_z-eval-create.test.ts | bridge ok |
| command:z-eval-execute | code | code+bridge | keep-code-bridge-only | evals/llm/test_command_z-eval-execute.test.ts | evals/llm/test_command_z-eval-execute.test.ts | bridge ok |
| command:z-eval-help | code | code+bridge | keep-code-bridge-only | evals/llm/test_command_z-eval-help.test.ts | evals/llm/test_command_z-eval-help.test.ts | bridge ok |
| command:z-eval-init | code | declarative | migrate-to-declarative | evals/llm/test_command_z-eval-init.test.ts | plugins/zoto-eval-system/evals/commands/z-eval-init.json | TS removed |
| command:z-eval-judge | code | code+bridge | keep-code-bridge-only | evals/llm/test_command_z-eval-judge.test.ts | evals/llm/test_command_z-eval-judge.test.ts | bridge ok |
| command:z-eval-jump | declarative | none | no-eval-yet | plugins/zoto-eval-system/evals/commands/z-eval-jump.json | plugins/zoto-eval-system/evals/commands/z-eval-jump.json | user diff: .../evals/commands/z-eval-jump.json                | 143 ++++++++++++---------
 1 file changed, 85 insertions(+), 58 deletions(-) |
| command:z-eval-operator | declarative | none | no-eval-yet | plugins/zoto-eval-system/evals/commands/z-eval-operator.json | plugins/zoto-eval-system/evals/commands/z-eval-operator.json | user diff: .../evals/commands/z-eval-operator.json            | 143 ++++++++++++---------
 1 file changed, 85 insertions(+), 58 deletions(-) |
| command:z-eval-start | code | code+bridge | keep-code-bridge-only | evals/llm/test_command_z-eval-start.test.ts | evals/llm/test_command_z-eval-start.test.ts | bridge ok; dual declarative JSON removed |
| command:z-eval-update | code | code+bridge | keep-code-bridge-only | evals/llm/test_command_z-eval-update.test.ts | evals/llm/test_command_z-eval-update.test.ts | bridge ok |
| command:z-eval-workflow | code | code+bridge | keep-code-bridge-only | evals/llm/test_command_z-eval-workflow.test.ts | evals/llm/test_command_z-eval-workflow.test.ts | bridge ok |
| command:z-spec-create | code | code+bridge | keep-code-bridge-only | evals/llm/test_command_z-spec-create.test.ts | evals/llm/test_command_z-spec-create.test.ts | bridge ok |
| command:z-spec-execute | code | code+bridge | keep-code-bridge-only | evals/llm/test_command_z-spec-execute.test.ts | evals/llm/test_command_z-spec-execute.test.ts | bridge ok |
| command:z-spec-init | code | declarative | migrate-to-declarative | evals/llm/test_command_z-spec-init.test.ts | plugins/zoto-spec-system/evals/commands/z-spec-init.json | TS removed |
| command:z-spec-judge | code | code+bridge | keep-code-bridge-only | evals/llm/test_command_z-spec-judge.test.ts | evals/llm/test_command_z-spec-judge.test.ts | bridge ok; deferred: analyser response_not_json |
| command:zoto-create-plugin | code | code+bridge | keep-code-bridge-only | evals/llm/test_command_zoto-create-plugin.test.ts | evals/llm/test_command_zoto-create-plugin.test.ts | bridge ok |
| command:zoto-cursor-top | none | none | no-eval-yet | — | — | user diff: — |
| hook:cursor-workspace | code | declarative | migrate-to-declarative | evals/llm/test_hook_cursor-workspace.test.ts | .cursor/evals/hooks/hooks.json | TS removed |
| hook:zoto-eval-system | code | declarative | migrate-to-declarative | evals/llm/test_hook_zoto-eval-system.test.ts | plugins/zoto-eval-system/evals/hooks/zoto-eval-system.json | TS removed |
| hook:zoto-spec-system | code | declarative | migrate-to-declarative | evals/llm/test_hook_zoto-spec-system.test.ts | plugins/zoto-spec-system/evals/hooks/zoto-spec-system.json | TS removed |
| skill:zoto-advise-evals | declarative | none | user-authored-byte-preserve | plugins/zoto-eval-system/skills/zoto-advise-evals/evals/evals.json | plugins/zoto-eval-system/skills/zoto-advise-evals/evals/evals.json | git diff: (no diff) |
| skill:zoto-compare-evals | code | code+bridge | user-authored-byte-preserve | evals/llm/test_skill_zoto-compare-evals.test.ts | evals/llm/test_skill_zoto-compare-evals.test.ts | git diff: (no diff) |
| skill:zoto-configure-evals | code | code+bridge | user-authored-byte-preserve | evals/llm/test_skill_zoto-configure-evals.test.ts | evals/llm/test_skill_zoto-configure-evals.test.ts | git diff: (no diff) |
| skill:zoto-create-evals | code | code+bridge | user-authored-byte-preserve | evals/llm/test_skill_zoto-create-evals.test.ts | evals/llm/test_skill_zoto-create-evals.test.ts | git diff: (no diff) |
| skill:zoto-create-plugin | declarative | none | user-authored-byte-preserve | .cursor/skills/zoto-create-plugin/evals/evals.json | .cursor/skills/zoto-create-plugin/evals/evals.json | git diff: (no diff) |
| skill:zoto-create-spec | code | code+bridge | user-authored-byte-preserve | evals/llm/test_skill_zoto-create-spec.test.ts | evals/llm/test_skill_zoto-create-spec.test.ts | git diff: (no diff) |
| skill:zoto-cursor-top-monitor | declarative | none | user-authored-byte-preserve | plugins/zoto-cursor-top/skills/zoto-cursor-top-monitor/evals/evals.json | plugins/zoto-cursor-top/skills/zoto-cursor-top-monitor/evals/evals.json | git diff: (no diff) |
| skill:zoto-eval-tooling | code | declarative | migrate-to-declarative | evals/llm/test_skill_zoto-eval-tooling.test.ts | plugins/zoto-eval-system/skills/zoto-eval-tooling/evals/evals.json | TS removed |
| skill:zoto-execute-evals | code | code+bridge | user-authored-byte-preserve | evals/llm/test_skill_zoto-execute-evals.test.ts | evals/llm/test_skill_zoto-execute-evals.test.ts | git diff: (no diff) |
| skill:zoto-execute-spec | code | code+bridge | user-authored-byte-preserve | evals/llm/test_skill_zoto-execute-spec.test.ts | evals/llm/test_skill_zoto-execute-spec.test.ts | git diff: (no diff); HEAD had pre-existing `,]` typo fixed |
| skill:zoto-help-evals | code | code+bridge | user-authored-byte-preserve | evals/llm/test_skill_zoto-help-evals.test.ts | evals/llm/test_skill_zoto-help-evals.test.ts | git diff: (no diff) |
| skill:zoto-judge-evals | code | code+bridge | user-authored-byte-preserve | evals/llm/test_skill_zoto-judge-evals.test.ts | evals/llm/test_skill_zoto-judge-evals.test.ts | git diff: (no diff) |
| skill:zoto-judge-spec | code | code+bridge | user-authored-byte-preserve | evals/llm/test_skill_zoto-judge-spec.test.ts | evals/llm/test_skill_zoto-judge-spec.test.ts | git diff: (no diff) |
| skill:zoto-update-evals | code | code+bridge | user-authored-byte-preserve | evals/llm/test_skill_zoto-update-evals.test.ts | evals/llm/test_skill_zoto-update-evals.test.ts | git diff: (no diff) |

## Counts

- migrate-to-declarative removed TS: 11 / 11
- keep-code-bridge-only with bridge import: 32 / 32
- deferred/partial analyser or regen errors: 11
