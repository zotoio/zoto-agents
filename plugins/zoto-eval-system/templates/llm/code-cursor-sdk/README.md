# LLM `code` Strategy — `@cursor/sdk` Template Tree

This template tree is stamped by
`scripts/eval-stamp.ts#stampLlmCodeStrategy` when the host repo's
`.zoto/eval-system/config.yml` sets:

```jsonc
{
  "llm": {
    "strategy": "code",
    "codeFramework": "vitest" // or "jest"
  }
}
```

Every stamped file lands under `evals/llm/` in the host repo. The
strategy is mutually exclusive with the declarative strategy
(subtask 10's `evals/_llm/runner.ts` + `evals.json`); the stamper
refuses to write these files while declarative assets are present.

## Canonical SDK Pattern

Every emitted `*.test.ts` uses the canonical pattern, routed through
`evals/_llm/sdk-bridge.ts` (copied to `evals/llm/_shared/sdk-bridge.ts`
at stamp time):

```ts
import { createAgent, sendPrompt, awaitRun, closeAgent, resolveTokens } from "../_shared/sdk-bridge";

const agent = await createAgent({ modelId, cwd: sandbox.rootDir });
try {
  const run = await sendPrompt(agent, prompt);
  const { text, result } = await awaitRun(run);
  const { tokens, source } = resolveTokens(result, prompt, text);
  expect(text).toMatch(/.../);
} finally {
  closeAgent(agent);
}
```

The bridge is the ONE place that imports `@cursor/sdk`. A future SDK
breaking change needs a single-file patch — not a sweep across every
stamped test. Never import `@cursor/sdk` directly from a stamped file.

## File-Level Contract

Every emitted `*.test.ts` MUST carry the literal marker as line 1:

```ts
// _meta.generated: true
```

Subtasks 03 (cleanup engine) and 11 (updater) both call
`evals/_llm/_user-case-guards.ts#isGeneratedFile(path, { strict: true })`
to decide whether a file is safe to delete or overwrite. A file
without this marker is treated as user-authored and is preserved.

## Token-Field Pinning

`@cursor/sdk` 1.0.12 (the pinned version) does NOT expose a per-run
token count on `RunResult` — `tokens`, `usage.totalTokens`, and
`run.tokens` are all absent. `resolveTokens(...)` therefore falls back
to a char-based heuristic (`chars / 4`) matching
`evals/_llm/metrics.ts#approximateTokens`. The resolved branch name is
recorded per case in the report as `token_source`. Whenever a new SDK
release exposes a real token count:

1. Re-run `tsx evals/_llm/sdk-bridge.selftest.ts --probe-types`.
2. Update `PINNED_SDK_VERSION` and `TOKEN_RESULT_FIELD` in
   `evals/_llm/sdk-bridge.ts`.
3. Update `resolveTokens(...)` to return the right branch.
4. Update this README's Token-Field Pinning section.

## Mutual Exclusion With the Declarative Strategy

`scripts/eval-stamp.ts#stampLlmCodeStrategy` refuses to stamp these
assets if the host repo already has declarative-strategy cases
(detected via `isGeneratedCase` on any `evals/**/evals.json` row plus
presence of `evals/_llm/runner.ts`-style artefacts). Run
`/z-eval-configure` to flip the strategy or
`pnpm run eval:cleanup-stale:apply` to remove the other strategy's
files before re-stamping.

## Framework Selection

The stamper conditionally emits either a vitest or jest test file based
on `llm.codeFramework`:

- **vitest** — uses `vitest`'s globals (`describe`, `it`, `expect`,
  `afterAll`). The test file imports them from `"vitest"`.
- **jest** — uses `@jest/globals` imports. Same shape.

Both frameworks invoke `evals/llm/_shared/setup.ts` via their
`setupFiles` config so `.env` is loaded exactly once and the baseline
fixture tree is verified before any case runs.

## Files Stamped Into `evals/llm/`

```
evals/llm/
├── test_<kind>_<slug>.test.ts         # one per primitive, canonical pattern
├── _shared/
│   ├── sdk-bridge.ts                   # thin wrapper around @cursor/sdk
│   ├── sandbox-helpers.ts              # re-exports evals/_llm/sandbox.ts
│   ├── setup.ts                        # dotenv + CURSOR_API_KEY gate
│   ├── zoto-llm-reporter.ts            # writes evals/_runs/<ts>/llm.yml
│   └── graders/                        # standalone grader copies
│       ├── common.ts
│       ├── contains.ts
│       ├── regex.ts
│       ├── tool-called.ts
│       └── llm-judge.ts
├── vitest.config.ts  (vitest only)
└── jest.config.ts    (jest only)
```

## Running the Suite

The stamper registers (alongside subtask 12's orchestration):

```jsonc
{
  "scripts": {
    "eval:llm:code": "vitest run evals/llm/"
    // OR for jest:
    // "eval:llm:code": "jest --config evals/llm/jest.config.ts"
  }
}
```

When `CURSOR_API_KEY` is missing every case skips cleanly with a
prefixed `[zoto-eval-llm]` stderr message (matching the declarative
runner's `--full` gate UX). When it is set, the suite writes
`evals/_runs/<run-id>/llm.yml` validating against
`plugins/zoto-eval-system/templates/schema/result.schema.json` with
`backend: "llm"`.

## Consumers

- **Subtask 10** (declarative strategy) — shares `sdk-bridge.ts`,
  `_user-case-guards.ts#isGeneratedCase`, and the reporter's YAML shape.
- **Subtask 11** (updater) — uses `_user-case-guards.ts` both helpers
  to gate overwrites and case deletions.
- **Subtask 12** (merged report) — merges this backend's `llm.yml` with
  the static backend's `static.yml` into `evals/_runs/<ts>/report.yml`.
- **`cursor-sdk` skill** — the runtime authority for canonical SDK
  patterns. Keep this README aligned with the skill.
