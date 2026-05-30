# LLM Template Tree — `@cursor/sdk`

> **Status:** Historic template layout. Stamped output now lives at
> the co-located path `<kind>/evals/<name>.test.ts` adjacent to each
> non-skill primitive, backed by the unified harness at
> [`evals/llm/_shared/run-llm-suite.ts`](../../../../evals/llm/_shared/run-llm-suite.ts).
> The `.tmpl` files in this tree are retained for stamper continuity
> and may be removed in a future cleanup pass. The user-facing
> documentation is the plugin
> [`README.md`](../../../README.md) — refer to that for the
> co-located layout and the [Adding an eval as a plugin author](../../../README.md#adding-an-eval-as-a-plugin-author)
> walkthrough.

## Canonical SDK pattern

Every emitted `*.test.ts` uses the canonical pattern routed through
[`evals/llm/_shared/sdk-bridge.ts`](../../../../evals/llm/_shared/sdk-bridge.ts):

```ts
import { createAgent, sendPrompt, awaitRun, closeAgent, resolveTokens } from "../../../evals/llm/_shared/sdk-bridge";

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

## File-level contract

Every emitted `*.test.ts` MUST carry the literal marker as line 1:

```ts
// _meta.generated: true
```

The eval system's user-case guards
([`evals/llm/_shared/_user-case-guards.ts`](../../../../evals/llm/_shared/_user-case-guards.ts))
use this marker to decide whether a file is safe to delete or
overwrite. A file without this marker is treated as user-authored
and is preserved.

## Token-field pinning

`@cursor/sdk` 1.0.12 (the pinned version) does NOT expose a per-run
token count on `RunResult` — `tokens`, `usage.totalTokens`, and
`run.tokens` are all absent. `resolveTokens(...)` therefore falls back
to a char-based heuristic (`chars / 4`) matching
`evals/_llm/metrics.ts#approximateTokens`. The resolved branch name is
recorded per case in the report as `token_source`. Whenever a new SDK
release exposes a real token count:

1. Re-run `tsx evals/_llm/sdk-bridge.selftest.ts --probe-types`.
2. Update `PINNED_SDK_VERSION` and `TOKEN_RESULT_FIELD` in
   `evals/llm/_shared/sdk-bridge.ts`.
3. Update `resolveTokens(...)` to return the right branch.
4. Update this README's Token-field pinning section.

## Running the suite

The orchestrator (`pnpm run eval:full`) discovers every co-located
`<kind>/evals/<name>.test.ts` through the single repo-rooted Vitest
config at `evals/vitest.config.ts`. When `CURSOR_API_KEY` is missing,
every case skips cleanly with a prefixed `[zoto-eval-llm]` stderr
message. When it is set, the suite writes
`evals/_runs/<run-id>/llm.yml` validating against
[`plugins/zoto-eval-system/templates/schema/result.schema.json`](../../schema/result.schema.json).

## See also

- [plugins/zoto-eval-system/README.md](../../../README.md) — primary user-facing documentation.
- [evals/llm/_shared/README.md](../../../../evals/llm/_shared/README.md) — shared harness module catalogue.
- `cursor-sdk` skill — runtime authority for canonical SDK patterns.
