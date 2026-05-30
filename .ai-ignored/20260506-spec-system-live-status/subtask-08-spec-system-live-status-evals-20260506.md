# Subtask: Evals for Live Reload, Status Round-Trip, Aggregation, and Schema Validation

## Metadata
- **Subtask ID**: 08
- **Feature**: spec-system-live-status
- **Assigned Subagent**: crux-software-engineer
- **Dependencies**: 04, 07
- **Created**: 20260506

## Objective

Add the eval coverage that **locks the new contracts in place** so future regressions surface in CI:

1. **No-restart token-budget propagation** — editing `.zoto/spec-system/config.json` between two spawn calls causes the second spawn's prompt prefix to use the new budget without restarting the executor.
2. **Status-pair round-trip** — `spec-status-roundtrip md-from-yml | yml-from-md` is lossless across the schema-bound block markers.
3. **Aggregator surfacing** — a subtask whose `.status.yml` flips to `state: blocked` lands in the spec-root `blockers[]` within one poll interval.
4. **Schema validation** — every shipped template (`templates/status/*.tmpl`, `templates/config.json`, `docs/example-config.json`) validates against its schema in CI.

Coverage spans both the plugin's own vitest suite (unit / integration) and the host repo's eval-system harness (cross-plugin behaviour).

## Deliverables Checklist

### Plugin-level integration tests (vitest)

**File location**: integration tests live under `plugins/zoto-spec-system/tests/integration/` (mirrors the plugin's existing `tests/` directory). Do **not** introduce an `src/__integration__/` subdirectory — no other plugin in the repo uses that pattern.

- [ ] `plugins/zoto-spec-system/tests/integration/no-restart-token-budget.test.ts`:
  - Sets up a temp `.zoto/spec-system/config.json` with `subagents.default.tokenBudget: 100000` and `subagents.subtask.tokenBudget: 100000`
  - Calls `loadConfig(tmpRoot, 0)` then `buildSpawnPrefix({ role: "subtask", tokenBudget, ... })` — asserts the prefix contains `Token budget: 100000`
  - Rewrites the file with `subagents.subtask.tokenBudget: 250000` and bumps mtime
  - Calls `loadConfig(tmpRoot, prevMtimeMs)` again — asserts `reloaded: true`, then `buildSpawnPrefix(...)` returns `Token budget: 250000`
  - Asserts no executor restart was needed (the test holds a single `loadConfig` reference across both calls)
- [ ] `plugins/zoto-spec-system/tests/integration/status-pair-roundtrip.test.ts`:
  - Loads a fixture `subtask-NN-...status.yml` with three checklist items, two artifacts, one error entry
  - Renders it to md via `spec-status-roundtrip md-from-yml`
  - Parses the rendered md back to yml via `spec-status-roundtrip yml-from-md`
  - Asserts the two yml objects are deep-equal (modulo top-level key order which the helper normalises)
  - Asserts every checklist tick survives the round-trip
  - Asserts an unticked checklist item edited inside the md (`- [x]` flipped from `- [ ]`) is reflected in the parsed yml — so hand edits on the md are honoured during round-trips when the yml mtime is older
- [ ] `plugins/zoto-spec-system/tests/integration/aggregator-blocker-surfacing.test.ts`:
  - Builds a fixture spec dir with three subtasks (all `state: in_progress`)
  - Runs `aggregateOnce` once — asserts `blockers[]` is empty
  - Mutates one subtask's yml to `state: blocked` with a `severity: error` entry in `errors[]`
  - Runs `aggregateOnce` again — asserts `blockers[]` contains a single entry pointing at the offending subtask, with `reason` derived from the latest error message
  - Reverts the subtask to `state: in_progress` — runs again, asserts `blockers[]` is empty
- [ ] `plugins/zoto-spec-system/tests/integration/schema-validation.test.ts`:
  - Iterates every file in `templates/status/*.tmpl`, substitutes `{{placeholder}}` slots with sample values, parses, validates against the matching schema
  - Validates `templates/config.json` against `templates/schema/config.schema.json`
  - Validates `docs/example-config.json` against `templates/schema/config.schema.json`
  - Validates that an empty `{}` parses + validates (defaults supply every required field) — protects subtask 03's contract
- [ ] `plugins/zoto-spec-system/tests/integration/heartbeat-completion-guard.test.ts`:
  - Builds a fixture status pair with two checklist items (one ticked, one not)
  - Runs `spec-status-roundtrip heartbeat --in <yml> --state completed`
  - Asserts non-zero exit + actionable error message (subtask 06 contract)
  - Ticks the second checklist item via `heartbeat --tick D02`, then re-runs `heartbeat --state completed` — asserts success and `state: completed` in the resulting yml

### Host-repo eval cases (LLM-graded; lives under the existing eval-system harness)
- [ ] `plugins/zoto-spec-system/skills/zoto-execute-spec/evals/evals.json` — append two cases (do not delete existing cases):
  - **Case `no-restart-budget-prompt`**: prompt the agent to spawn one subtask with the prompt prefix builder, mutate the config file, prompt again. Assertions: the second spawn's prompt prefix references the new budget number.
  - **Case `aggregator-surfaces-blocker`**: prompt the agent to run `spec-aggregator --once --spec-dir <fixture>`, then mutate one source `.status.yml` to `state: blocked`, then re-run. Assertions: the second `--once` output shows the blocker in the spec-root `status.yml`.
- [ ] `plugins/zoto-spec-system/skills/zoto-create-spec/evals/evals.json` — extend the new case from subtask 05 with an additional assertion: `Each scaffolded .status.yml validates against subtask-status.schema.json`. Do **not** add a separate case here — keep the existing one richer.

### CI / package wiring
- [ ] `plugins/zoto-spec-system/package.json` — add a new script `"test:integration": "vitest run tests/integration"` so the integration tests can run in isolation from unit tests.
- [ ] `plugins/zoto-spec-system/package.json` — extend the existing `"test"` script (currently `vitest run`) to cover both unit suites under `src/`, `scripts/`, and `tests/` plus the new integration suite. Confirm the eval system still picks up the right test files.
- [ ] No new runtime deps. Dev deps may be added if strictly required (e.g. `tmp` for temp-dir helpers); prefer Node's built-in `node:fs.mkdtempSync` first.

### Cleanup of stale eval artefacts
- [ ] If subtask 06 introduced a placeholder eval case under `plugins/zoto-spec-system/skills/zoto-execute-spec/evals/evals.json`, leave it alone — this subtask only **adds** to it. Removing existing cases is out of scope.

## Definition of Done
- [ ] `pnpm --filter @zoto-agents/zoto-spec-system test` runs all unit and integration tests cleanly (zero failures)
- [ ] `pnpm --filter @zoto-agents/zoto-spec-system test:integration` runs only the integration suite (smoke check)
- [ ] All four integration tests above exist and pass
- [ ] The two new LLM eval cases exist in the relevant `evals.json` files
- [ ] `pnpm --filter @zoto-agents/zoto-spec-system validate` passes
- [ ] Running the full eval system at the repo root (`pnpm eval` against the host repo) does **not** regress on existing cases — only adds the new ones
- [ ] No linter errors in modified files

## Implementation Notes

- **Test isolation**: every integration test uses its own `node:fs.mkdtempSync` directory under `os.tmpdir()` and cleans up in `afterEach`. Never write to the real `.zoto/spec-system/` of the live repo.
- **Determinism**: the round-trip test must use a fixture with stable checklist IDs (`D01`, `D02`, `D03`) — do not rely on text-derived IDs.
- **No flaky timing**: the `aggregator-blocker-surfacing.test.ts` test calls `aggregateOnce` directly; do **not** use the polling watcher in this test (it would introduce timing flakiness). Watcher behaviour is covered by subtask 07's `aggregator.test.ts`.
- **LLM eval guidance**: the two new LLM cases test agent-visible behaviour (prompt prefix wording, CLI output). Keep grader assertions as `regex` or `contains` matches against deterministic strings — avoid `llm-judge` for these to keep the eval cheap and reproducible.
- **Single source for the budget grep**: the `Token budget:` literal appears in subtask 04's `spawn-prompt.ts`. Reference it via the test, do not hard-code the same string in the test — import the builder and assert against its output. This keeps wording drift impossible.
- **Documentation links** appear in subtask 09's docs sweep — not here. This subtask is purely test code + `evals.json` entries.

## Testing Strategy

**IMPORTANT**: This **is** the testing subtask. Run the full plugin suite at the end of this subtask:
- `pnpm --filter @zoto-agents/zoto-spec-system test`
- `pnpm --filter @zoto-agents/zoto-spec-system test:integration`
- `pnpm --filter @zoto-agents/zoto-spec-system validate`

Do not run the host repo's full eval system in this subtask — defer that to the spec-level Definition of Done. The new LLM eval cases ship inside the plugin and will be picked up automatically the next time the host repo evaluates.

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
