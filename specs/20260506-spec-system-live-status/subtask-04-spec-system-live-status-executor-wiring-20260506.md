# Subtask: Wire `/zoto-spec-execute` & Executor to the Live Loader

## Metadata
- **Subtask ID**: 04
- **Feature**: spec-system-live-status
- **Assigned Subagent**: crux-software-engineer
- **Dependencies**: 03
- **Created**: 20260506

## Objective

Wire the live loader from subtask 03 into the executor's runtime so:

- The backgrounded `spec-aggregator --watch` process (subtask 07) re-reads `.zoto/spec-system/config.json` at the **top of every aggregator poll iteration**.
- The executor LLM also re-resolves the per-spawn budget by shelling out to a thin `tsx scripts/spec-spawn-prefix.ts --role <role> ...` CLI per spawn — the CLI calls `loadConfig` + `buildSpawnPrefix` internally and prints the resolved prefix to stdout, which the executor injects into the next `Task` agent's prompt. The executor LLM **does not** import the loader directly.
- Each spawned subtask subagent receives its **resolved per-role token budget and model** from the freshly reloaded config — **Token budget changes apply to the next spawned subagent without restarting the executor.**
- The no-restart contract is documented inside the agent / skill / command files so future authors can't regress it.
- Specs without a `status/` directory continue to execute under the legacy spawn path — no aggregator wiring, no prompt prefix, no status pair (additive feature).

## Deliverables Checklist

### Agent / skill / command updates (text-only — no schema or scaffolding work)
- [ ] `plugins/zoto-spec-system/agents/zoto-spec-executor.md` — new section `## Live Configuration` (between `## Load Configuration` and `## Your Expertise`) that:
  - States that the backgrounded `spec-aggregator --watch` process calls `loadConfig(repoRoot, prevMtimeMs)` at the **top of every aggregator poll iteration** (default `aggregator.pollIntervalMs: 1500`), and that the executor LLM also re-resolves the per-spawn budget by shelling out to `tsx plugins/zoto-spec-system/scripts/spec-spawn-prefix.ts --role <role> --status-yml <path> --status-md <path>` per spawn (the CLI internally calls `loadConfig` + `resolveSubagentBudget` + `buildSpawnPrefix` and prints the resolved prefix to stdout)
  - States the canonical contract phrase verbatim: **Token budget changes apply to the next spawned subagent without restarting the executor.**
  - Lists the live-reloadable keys: `subagents.*.tokenBudget`, `subagents.*.model`, `aggregator.pollIntervalMs`, `aggregator.debounceMs`, `aggregator.enabled`, `spec.parallelLimit`
  - Lists the fresh-invocation-required keys: `unitOfWork`, `specsDir`, `workDir`, `hooks.*`, `extensions.*`
  - Specifies the spawn-time resolution invocation: `tsx plugins/zoto-spec-system/scripts/spec-spawn-prefix.ts --role <role>` where `role` is one of `generator | executor | judge | subtask` (the spawn-role mapping is documented in subtask 01's memo)
  - Specifies the spawn-time prompt prefix: every spawned subagent prompt begins with `Token budget: <N>. Stay within this budget; record the resolved value in your status.yml token_budget field; if you exceed it, add a warn-level entry to your status.yml errors[] array.`
- [ ] `plugins/zoto-spec-system/skills/zoto-execute-spec/SKILL.md` — extend the **Configuration** section table with the new keys (`subagents.default.tokenBudget`, `aggregator.pollIntervalMs`, `aggregator.debounceMs`) and add a new sub-section `### Live Reload` that:
  - Documents the mtime-based loader contract: the backgrounded `spec-aggregator --watch` calls `loadConfig` at the top of every poll iteration; the executor LLM also re-resolves the per-spawn budget via `tsx scripts/spec-spawn-prefix.ts` per spawn. Only the live-reloadable keys take effect immediately.
  - States the canonical contract phrase verbatim: **Token budget changes apply to the next spawned subagent without restarting the executor.**
  - Documents the spawn-time prompt prefix (same wording as the agent doc)
  - Specifies that on a `ConfigValidationError`, the watch process **keeps the previous valid config in memory**, appends a `severity: error` entry to the spec-root `status.yml` `events[]` array (`kind: "config_reload_failed"`), and continues running. The user is informed via the next aggregator render of `status.md`. If `spec-spawn-prefix.ts` itself fails (rare — same loader path), the executor LLM falls back to the last successfully-resolved prefix and proceeds with the spawn.
- [ ] `plugins/zoto-spec-system/commands/zoto-spec-execute.md` — extend the **Execution safeguards** table with the row `| Live config reload | Token-budget and aggregator-cadence keys take effect on the next spawn — no executor restart required |`. Add a one-line note under the table that other keys (specsDir, unitOfWork, etc.) require a fresh invocation.

### Executor runtime (subtask 07 ships the standalone watch CLI; this subtask wires the loader call sites the executor LLM consumes)
- [ ] `plugins/zoto-spec-system/src/spawn-prompt.ts` — pure function that builds the prompt prefix:
  ```ts
  export interface SpawnContext {
    role: "generator" | "executor" | "judge" | "subtask";
    tokenBudget: number;
    model: string | undefined;
    statusYmlPath: string;
    statusMdPath: string;
  }
  export function buildSpawnPrefix(ctx: SpawnContext): string;
  ```
  Output (verbatim):
  ```
  Token budget: <N>. Stay within this budget; record the resolved value in your status.yml token_budget field; if you exceed it, add a warn-level entry to your status.yml errors[] array.
  Status files (you own these):
    - <relative path>/subtask-NN-...status.md
    - <relative path>/subtask-NN-...status.yml
  Heartbeat at start, after each checklist tick, and on completion. Final state must be one of: completed | blocked | failed.
  ```
- [ ] `plugins/zoto-spec-system/src/spawn-prompt.test.ts` — vitest:
  - Asserts the prefix contains the resolved budget and both status paths
  - Asserts the budget line wording is verbatim (so downstream evals can grep it)
  - Asserts the role is mapped onto the right resolution call (this test mocks `resolveSubagentBudget`)
- [ ] `plugins/zoto-spec-system/scripts/spec-spawn-prefix.ts` — `tsx` CLI used by the executor LLM per spawn. Args: `--role <generator|executor|judge|subtask> --status-yml <path> --status-md <path>`. Behaviour: reads the repo root from `process.cwd()`, calls `loadConfig`, calls `resolveSubagentBudget(cfg, role)`, calls `buildSpawnPrefix({ role, tokenBudget, model, statusYmlPath, statusMdPath })`, and prints the resolved prefix to stdout. Exit 0 on success; non-zero with a structured `{ error, code }` JSON line on stderr if `loadConfig` throws (e.g. `ConfigValidationError`). The executor LLM treats a non-zero exit as "fall back to last known prefix and emit a `kind: 'config_reload_failed'` event in the spec-root `status.yml` via the next aggregator tick".
- [ ] `plugins/zoto-spec-system/scripts/spec-spawn-prefix.test.ts` — vitest:
  - Prints the verbatim prompt prefix on a valid temp config
  - Exits non-zero with a structured stderr line on a malformed config
  - Forwards the role correctly: `--role subtask` resolves through `subagents.subtask.tokenBudget ?? subagents.default.tokenBudget`
- [ ] **Legacy spec compatibility**: document in the agent / skill that if `<specDir>/status/` does not exist, the executor logs a one-line warning (`"status/ directory absent — running legacy spawn path"`), skips the `spec-aggregator --watch` background, and skips the `spec-spawn-prefix` shell-out (spawned subagents do not receive status-file paths in the prompt prefix). Subtask 08 ships an integration test covering this path. The agent doc must call this out explicitly so future maintainers don't regress legacy specs.

### Documentation cross-links
- [ ] `plugins/zoto-spec-system/docs/config-schema.md` — append a new section `## Live reload` summarising the no-restart contract. The section MUST include the canonical contract phrase verbatim: **Token budget changes apply to the next spawned subagent without restarting the executor.** (Full prose lives in subtask 09's docs sweep — this subtask adds the bare minimum so subtask 04's tests and subtask 09's grep DoD can find the phrase.)

## Definition of Done
- [ ] All three agent / skill / command files include the live-reload section and explicitly list the live-reloadable vs fresh-invocation key sets (matching the canonical lists in the spec index "BU" decision)
- [ ] The canonical contract phrase **Token budget changes apply to the next spawned subagent without restarting the executor.** appears verbatim in the executor agent file, the skill file, and `docs/config-schema.md`
- [ ] `pnpm --filter @zoto-agents/zoto-spec-system test` passes (new prompt-builder test, new spawn-prefix CLI test, plus subtask 03's loader test)
- [ ] `pnpm --filter @zoto-agents/zoto-spec-system validate` passes
- [ ] `rg "Token budget:" plugins/zoto-spec-system` returns the prompt prefix from `spawn-prompt.ts`, the `spec-spawn-prefix.ts` CLI output, and the documentation references — and nothing inconsistent
- [ ] `tsx plugins/zoto-spec-system/scripts/spec-spawn-prefix.ts --role subtask --status-yml /tmp/x.yml --status-md /tmp/x.md` prints the verbatim prefix on a valid temp config (smoke check)
- [ ] Legacy-spec branch is documented in the executor agent file (no `status/` directory ⇒ legacy spawn path)
- [ ] No linter errors in modified files
- [ ] No code path bypasses the loader; the only places `.zoto/spec-system/config.json` is read are `src/config-loader.ts` (subtask 03), the watch CLI in `scripts/spec-aggregator.ts` (subtask 07), and `scripts/spec-spawn-prefix.ts` (this subtask) — all three call into `loadConfig`

## Implementation Notes

- This subtask **does not run the watch loop** — that lives entirely inside subtask 07's `spec-aggregator.ts --watch`. This subtask ships (a) the pure prefix builder, (b) the thin CLI the executor LLM shells out to per spawn, and (c) the doc updates that bind the live-reload contract to the agent / skill / command surfaces.
- Be precise about the prompt prefix wording: subtask 08 ships an eval that greps for the exact "Token budget:" sentence, the "Status files (you own these):" line, and the "Final state must be one of: completed | blocked | failed." line. Any drift in wording breaks the eval and is a regression.
- The executor agent's frontmatter `model:` (`claude-4.6-opus-high-thinking`) stays untouched. Per-role `model` overrides resolved by `resolveSubagentBudget` are **only** passed to the spawned `Task` agents, not to the executor itself.
- The fallback behaviour on `ConfigValidationError` keeps the watch process running with the last good config — this is intentional. A bad config edit must not crash an in-flight execution. The error surfaces in `status.yml` events and the next aggregator render. `spec-spawn-prefix.ts` follows the same pattern but exits non-zero (the executor LLM caches the last valid prefix in its own session state and falls back).

## Testing Strategy

**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Run only the new test files: `pnpm --filter @zoto-agents/zoto-spec-system test src/spawn-prompt.test.ts scripts/spec-spawn-prefix.test.ts`
- Defer the full repo test suite to subtask 08.

## Execution Notes
[To be filled by executing agent]

### Agent Session Info
- Agent: crux-software-engineer
- Started: [Not yet started]
- Completed: [Not yet completed]

### Work Log
[Agent adds notes here during execution]

### Blockers Encountered
[Any blockers or issues]

### Files Modified
[List of files changed]
