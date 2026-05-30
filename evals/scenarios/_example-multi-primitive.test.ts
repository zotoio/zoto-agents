// _meta.generated: false  (hand-edit this scenario)
/**
 * Example multi-primitive scenario for the zoto-eval-system.
 *
 * ## What is this file?
 *
 * A **scenario** drives a single end-to-end flow that spans more than one
 * primitive (e.g. a command kicks off → an agent answers → a hook fires →
 * the filesystem changes). Per-primitive `.json` evals validate one
 * primitive in isolation; scenarios stitch several primitives together.
 *
 * Scenarios live as plain Vitest TypeScript files under
 * `evals/scenarios/<name>.test.ts`. The unified Vitest config
 * (`evals/vitest.config.ts`) discovers them via the
 * `evals/scenarios/*.test.ts` include glob.
 *
 * ## Why this file ships with an underscore prefix
 *
 * The shipped example is `evals/scenarios/_example-multi-primitive.test.ts`.
 * The leading underscore is matched by an explicit
 * `evals/scenarios/_*` entry in the Vitest `exclude[]` array — Vitest
 * does NOT exclude underscore-prefixed files on its own. The example
 * is therefore **discovered but skipped** until you opt-in by either:
 *
 *   1. Renaming the file to drop the leading underscore (e.g.
 *      `evals/scenarios/example-multi-primitive.test.ts`), OR
 *   2. Copying its contents into a new `evals/scenarios/<your-name>.test.ts`.
 *
 * Either way, drop the `describe.skip` / `xit` markers below before
 * running the suite for real.
 *
 * ## How to drive multiple primitives
 *
 * The recommended pattern, illustrated below, is:
 *
 *   1. **Call command A** via the SDK bridge — kick off the flow that
 *      drives the scenario (e.g. `/z-eval-create` against a sandbox).
 *   2. **Assert agent B's output** — capture the agent's response
 *      text and run grader-style assertions against it.
 *   3. **Check a side-effect** — verify a file landed on disk, a
 *      manifest entry appeared, a hook log line was written, etc.
 *
 * The shared harness in `evals/llm/_shared/` exposes everything you
 * need (the `RunnerContext` interface mirrors what's available); the
 * snippets below use direct imports so you can see every moving part.
 *
 * ## Authoring tips
 *
 *   - Keep one scenario per file. Multiple `describe` blocks in one
 *     file make Vitest reporting harder to read across runs.
 *   - Scenarios are **never** rewritten by the updater (`_meta.generated:
 *     false` on the first line is the file-level guard) — you own
 *     this content forever.
 *   - For deterministic side-effects, build a sandbox with the helpers
 *     under `evals/llm/_shared/sandbox-helpers.ts` so each run starts
 *     from a clean working tree.
 *   - Soft metrics (tokens, duration, accuracy) are recorded by the
 *     shared reporter only when you go through `defineLlmEval` — for
 *     scenarios you typically assert behaviour directly with `expect`
 *     and skip the metric-collection plumbing.
 */
import { describe, xit } from "vitest";

// Import types from the harness so the IDE highlights the contract.
// These mirror what a `runner` case receives in JSON evals.
import type {
  RunnerParams,
  RunnerResult,
} from "../llm/_shared/runner-params.js";
import { defineLlmEval } from "../llm/_shared/run-llm-suite.js";

describe.skip("Example multi-primitive scenario", () => {
  xit(
    "calls command A, asserts agent B's response, then verifies a side-effect",
    async () => {
      /* --------------------------------------------------------------
       * STEP 1 — Call command A.
       *
       * In a real scenario you would either:
       *   - drive the agent directly via `sdk-bridge.createAgent` +
       *     `sdk-bridge.sendPrompt` so you control the prompt and
       *     model id, OR
       *   - reuse `defineLlmEval(...)` if the scenario is essentially
       *     "run this single declarative case but call multiple
       *     downstream primitives during grading".
       *
       * Example pseudocode (commented — real code would import from
       * `../llm/_shared/sdk-bridge.js` and resolve a sandbox cwd):
       *
       *   const agent = await createAgent({
       *     cwd: sandbox.rootDir,
       *     modelId: "composer-2.5",
       *   });
       *   const run = await sendPrompt(
       *     agent,
       *     "/z-eval-create",
       *   );
       *   const { text } = await awaitRun(run);
       * ------------------------------------------------------------ */

      /* --------------------------------------------------------------
       * STEP 2 — Assert agent B's output.
       *
       *   expect(text).toMatch(/Eval system scaffolded/);
       *   expect(text).toContain("manifest.yml");
       * ------------------------------------------------------------ */

      /* --------------------------------------------------------------
       * STEP 3 — Check a side-effect.
       *
       *   const manifestPath = join(sandbox.rootDir, ".zoto/eval-system/manifest.yml");
       *   expect(existsSync(manifestPath)).toBe(true);
       *
       *   const diff = diffSandbox(before, postSnapshot(sandbox.rootDir));
       *   expect(diff.created).toContainEqual(
       *     expect.stringMatching(/^\.zoto\/eval-system\//),
       *   );
       * ------------------------------------------------------------ */
    },
  );
});

/* --------------------------------------------------------------------
 * Type-only no-ops so the imports above are non-dead and the IDE
 * surfaces the contract to scenario authors. Delete or replace once
 * you start filling out the real scenario.
 * ------------------------------------------------------------------ */
type _RunnerParamsRef = RunnerParams;
type _RunnerResultRef = RunnerResult;
type _DefineLlmEvalRef = typeof defineLlmEval;

/* --------------------------------------------------------------------
 * Further reading
 *
 *   - Eval formats overview, including the JSON `runner` escape
 *     hatch and the `RunnerParams` contract:
 *     plugins/zoto-eval-system/README.md → "Eval formats" /
 *     "Advanced TS escape hatch (`runner` cases)" /
 *     "Multi-primitive scenarios" sections.
 *   - Harness internals (graders, sandbox helpers, reporters):
 *     evals/llm/_shared/README.md
 *   - The full `RunnerParams` / `RunnerContext` surface:
 *     evals/llm/_shared/runner-params.ts
 * ------------------------------------------------------------------ */
