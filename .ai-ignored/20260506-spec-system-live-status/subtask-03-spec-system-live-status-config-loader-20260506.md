# Subtask: File-Based Config + Live (mtime) Loader

## Metadata
- **Subtask ID**: 03
- **Feature**: spec-system-live-status
- **Assigned Subagent**: crux-software-engineer
- **Dependencies**: 01, 02
- **Created**: 20260506

## Objective

Implement the **typed, schema-validated config loader** that the executor (subtask 04) and aggregator (subtask 07) use. The loader is mtime-aware so long-running coordinators can call it at the top of every poll iteration and pick up changes **without restarting the agent**. Populate the default config template with the new keys.

## Deliverables Checklist

### Source files
- [ ] `plugins/zoto-spec-system/src/config-loader.ts` — public surface:
  ```ts
  export interface SpecSystemConfig {
    unitOfWork: string;
    specsDir: string;
    workDir: string;
    spec: { maxSubtasks: number; parallelLimit: number; adversarialVerification: boolean };
    subagents: {
      default: { tokenBudget: number; model?: string };
      generator?: { tokenBudget?: number; model?: string };
      executor?: { tokenBudget?: number; model?: string };
      judge?: { tokenBudget?: number; model?: string };
      subtask?: { tokenBudget?: number; model?: string };
    };
    aggregator: {
      enabled: boolean;
      pollIntervalMs: number;
      debounceMs: number;
      outputs: { specStatusMd: string; specStatusYml: string };
    };
    hooks?: Record<string, unknown>;
    extensions?: Record<string, unknown>;
  }

  export interface LoadResult {
    config: SpecSystemConfig;
    mtimeMs: number;
    reloaded: boolean;
    path: string;
  }

  export function loadConfig(repoRoot: string, prevMtimeMs?: number): LoadResult;

  export function resolveSubagentBudget(
    cfg: SpecSystemConfig,
    role: "generator" | "executor" | "judge" | "subtask"
  ): { tokenBudget: number; model: string | undefined };
  ```
  Behaviour:
  - Reads `<repoRoot>/.zoto/spec-system/config.json` synchronously
  - When the file is missing, returns the schema-defined defaults (matches `templates/config.json`) with `mtimeMs = 0` and `reloaded = false`
  - Validates the parsed object against `templates/schema/config.schema.json` (compiled `ajv` instance cached in module scope); on validation failure, throws a `ConfigValidationError` whose `.errors` mirrors `ajv` output
  - Computes `reloaded = mtimeMs !== prevMtimeMs` so the executor can decide whether to log a `config_reloaded` event
  - Performs the resolution from subtask 01: `resolveSubagentBudget(cfg, role) -> { tokenBudget: cfg.subagents[role]?.tokenBudget ?? cfg.subagents.default.tokenBudget, model: cfg.subagents[role]?.model ?? cfg.subagents.default.model }`
- [ ] `plugins/zoto-spec-system/src/config-loader.test.ts` — vitest unit tests:
  - Loads defaults when the file is missing
  - Loads + validates a fully-populated example
  - Throws `ConfigValidationError` on a bad enum / out-of-range value (e.g. `aggregator.pollIntervalMs: 50`)
  - Returns `reloaded: true` when called twice with a different `prevMtimeMs`
  - `resolveSubagentBudget` correctly inherits from `default` when a role is absent
  - `resolveSubagentBudget` correctly overrides `default` when a role-specific value is present
- [ ] `plugins/zoto-spec-system/src/index.ts` (new or extended) — re-exports the loader so other plugin code can `import { loadConfig } from "@zoto-agents/zoto-spec-system"`

### Template / fixtures
- [ ] `plugins/zoto-spec-system/templates/config.json` — extend with the new defaults (preserving existing keys):
  ```json
  {
    "unitOfWork": "spec",
    "specsDir": "specs",
    "workDir": "specs/current",
    "spec": { "maxSubtasks": 99, "parallelLimit": 4, "adversarialVerification": true },
    "subagents": {
      "default": { "tokenBudget": 200000 }
    },
    "aggregator": {
      "enabled": true,
      "pollIntervalMs": 1500,
      "debounceMs": 250,
      "outputs": { "specStatusMd": "status.md", "specStatusYml": "status.yml" }
    }
  }
  ```
- [ ] `plugins/zoto-spec-system/docs/example-config.json` — extend with a more complete example showing per-role overrides (left for subtask 09 to refine if needed; create a minimal copy here so the loader's "fully populated" test fixture stays close to docs)

### Package wiring
- [ ] `plugins/zoto-spec-system/package.json` — add the runtime deps (`ajv@^8`, `ajv-formats@^3`, `yaml@^2`) and the dev dep (`@types/node`); use the latest minor / patch versions and run via `pnpm` (the repo's package manager). Use the `yaml` package (matches `plugins/zoto-eval-system`'s existing usage of `import YAML from "yaml"`); do **not** introduce `js-yaml`. The user's preference is `yarn`, but this plugin already uses `pnpm` per the repo's `pnpm-workspace.yaml` — keep `pnpm` here for consistency and call that out in the work log.
- [ ] `plugins/zoto-spec-system/tsconfig.json` — extend `include` to add `"src/**/*.ts"` so the new loader, integration tests, and downstream subtask 07 modules are typechecked. Current include is `["scripts/**/*.ts", "tests/**/*.ts", "hooks/**/*.ts"]`.
- [ ] Re-export `SpecSystemConfig`, `loadConfig`, `resolveSubagentBudget` from the plugin package's main entry so external scripts can import them.

## Definition of Done
- [ ] `pnpm --filter @zoto-agents/zoto-spec-system test` passes (the new vitest file plus any existing tests)
- [ ] `pnpm --filter @zoto-agents/zoto-spec-system validate` passes (existing structural validation)
- [ ] `templates/config.json` validates against `config.schema.json`
- [ ] An empty `{}` config validates against `config.schema.json` (defaults supply every required field)
- [ ] No linter errors in modified files
- [ ] Loader is the **only** code path that reads `.zoto/spec-system/config.json` — the existing hook (`hooks/zoto-session-start.ts`) is left as-is for now (subtask 09 documents the migration so it can be refactored later)

## Implementation Notes

- The loader is **synchronous** because the executor calls it at the top of every aggregator iteration; an async loader would force the entire poll loop to be async and complicate the testing surface. Use `node:fs.readFileSync` and `node:fs.statSync`.
- Cache the compiled `ajv` validator in module scope (one-time JIT). Do not re-compile on every load.
- Treat any deserialization or validation failure as **fatal**: throw a typed error and let the caller decide whether to fall back to the previous valid config (subtask 04 does this — the executor keeps the last good config in memory and emits an `errors[]` event in `status.yml` rather than crashing).
- `resolveSubagentBudget` is a pure function — easy to unit-test, no I/O.
- Match the eval-system's pattern of `additionalProperties: true` at the root of the loaded config so older / forward-compatible keys don't trigger validation failures.
- Even though the user prefers `yarn`, this monorepo is `pnpm`-based (`pnpm-workspace.yaml`, `pnpm-lock.yaml`). Use `pnpm add` here. Do not introduce a sibling `yarn.lock`. Note this in the work log.

## Testing Strategy

**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Run only the new `vitest` file: `pnpm --filter @zoto-agents/zoto-spec-system test src/config-loader.test.ts`
- Defer the full repo test suite to subtask 08's eval pass.

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
