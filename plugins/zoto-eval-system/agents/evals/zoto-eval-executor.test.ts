// _meta.generated: true
/**
 * LLM `code`-strategy eval for agent `zoto-eval-executor`.
 *
 * Stamped by `scripts/eval-stamp.ts#stampLlmCodeStrategy` from
 * `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl`.
 *
 * The literal first line of this file MUST remain `// _meta.generated: true`.
 * Subtask 03's cleanup engine and subtask 11's overwrite gate both use
 * `evals/_llm/_user-case-guards.ts#isGeneratedFile(path, { strict: true })`
 * to decide whether this file is safe to replace or delete. Edit the
 * template, not this emitted file.
 * Interaction classification: requiresInteraction=true, interactionStyle=subagent-escalated
 * Analyser version: 2026.05.26-1
 * Backend: code-strategy (LLM)
 */
import { describe, it, afterAll, expect } from "vitest";
import { resolveInteractionPlanFromCase } from "../../../../evals/llm/_shared/askquestion-bridge.js";

import type { LlmCaseDefinition } from "../../../../evals/llm/_shared/llm-case.js";
import { defineLlmEval } from "../../../../evals/llm/_shared/run-llm-suite.js";

const CASES: LlmCaseDefinition[] = [
  {
    "id": "static-lane-honours-manifest-config-and-merges-run-rollups",
    "prompt": "I already ran `/z-eval-execute` without `--full`; pick up execution from here. Run whichever static evaluator the repo declares through its `pnpm run eval` entry point, grounding choices in `.zoto/eval-system/config.yml` (`static.framework` and neighbouring fields), then preserve the artefacts judge and compare flows expect beside `evals/_runs/` and finish with whatever post-suite drift bookkeeping the playbook calls for.",
    "assertions": [
      "Operational choices match `static.framework` (and sibling layout choices) spelled out inside `.zoto/eval-system/config.yml`.",
      "Work stays inside the repository’s scripted harness (`pnpm run eval`/`eval:aliases` surfaced there) rather than spawning bespoke bespoke runner CLIs.",
      "Fresh artefacts land under sandbox-relative paths like `evals/_runs/<recent-hour>/`, with `static.yml` materialised and fused into merged `report.yml` for downstream consumers.",
      "After completion the agent invokes `pnpm run eval:update --check` and that pass appends `drift:` notes into that run bundle’s `llm.yml`, leaving prior pass or fail signalling untouched."
    ],
    "assertion_patterns": [
      "static\\.framework",
      "pnpm run eval",
      "evals/_runs/<recent-hour>/",
      "pnpm run eval:update --check"
    ],
    "expected_output": "A concluded static sweep whose newest hourly run bundle includes merged `report.yml` that incorporates static telemetry, aligns with evaluator layout norms, records drift annotations on `llm.yml` via the sanctioned update invocation, and never reaches for ad hoc binaries outside the scripted entry points."
  },
  {
    "id": "full-lane-threads-model-env-wiring-and-honours-llm-config-fields",
    "prompt": "Continue from `/z-eval-execute --full --model sonnet-4` assuming the Cursor credential the runner honours is reachable through the harness (environment or uncommented repo-root `.env`). Execute the bundled static plus LLM sweep, propagate the `--model sonnet-4` choice everywhere the markdown demands, and run the obligatory drift append once both lanes conclude.",
    "assertions": [
      "Invoker never reaches the Cursor LLM runner unless `--full` is active and Cursor API availability matches the markdown’s dual-sources rule.",
      "`llm.strategy` together with conditional `llm.codeFramework`, as read from `.zoto/eval-system/config.yml`, drives whether stamped code versus declarative LLM scaffolding runs.",
      "Model routing lands on spawned processes as `--model sonnet-4` with `ZOTO_EVAL_MODEL` mirrored to that identifier.",
      "Outputs under each fresh run directory include correlated `static.yml`, `llm.yml`, plus merged `report.yml` suitable for later judge/compare steps.",
      "The concluding `pnpm run eval:update --check` enrichment still attaches warn-only drift lines to `llm.yml` despite the fuller lane mix.",
      "`askQuestion` is not emitted anywhere in this flow."
    ],
    "assertion_patterns": [
      "--full",
      "llm\\.strategy",
      "--model sonnet-4",
      "static\\.yml",
      "pnpm run eval:update --check",
      "askQuestion"
    ],
    "expected_output": "A guarded `--full` execution that activates the Cursor LLM path only once prerequisite checks pass, honours `llm.strategy`/`llm.codeFramework` interplay from config, merges both lanes inside `report.yml`, mirrors the forwarded model simultaneously into CLI arguments and exported `ZOTO_EVAL_MODEL`, then appends drift metadata through the update script."
  },
  {
    "id": "ambiguous-cursor-credentials-return-structured-escalation",
    "prompt": "`/z-eval-execute --full` is queued but Cursor API backing is unavailable both in ambient environment variables and uncommented `.env` lines, and `/z-eval-execute` has not narrowed how I want to proceed. Decide what you return so I can restart without hallucinating secret values.",
    "assertions": [
      "Returned payload is structured `needs_user_input` offering explicit abort versus static-only continuation cues rather than forging credentials.",
      "No `askQuestion` tool emission occurs from this agent during the escalation."
    ],
    "assertion_patterns": [
      "needs_user_input",
      "askQuestion"
    ],
    "expected_output": "A structured `needs_user_input` object enumerating downgrade-to-static versus abort narratives that `/z-eval-execute` can parse for resume semantics, authored without interactive assistant prompts inside this delegated agent."
  },
  {
    "id": "llm-invocation-rejected-when-full-prerequisite-missing",
    "prompt": "Skip `--full`, keep `/z-eval-execute`, and coax only the LLM runner because static coverage already succeeded earlier today—tell me exactly how you handle that downgrade request.",
    "assertions": [
      "The plan refuses to invoke the Cursor LLM runner whenever `--full` is absent irrespective of urging to skip static lanes.",
      "Guidance steers rerun through sanctioned `pnpm run eval:*` wrappers rather than hand-rolled substitutes.",
      "If further clarification ships, it comes through documented structured payloads—not `askQuestion`."
    ],
    "assertion_patterns": [
      "--full",
      "pnpm run eval:\\*",
      "askQuestion"
    ],
    "expected_output": "An explicit refusal that blocks partial LLM spurts lacking the sanctioned `--full` pairing, reaffirming rerun via the execute command stack instead of improvised scripts."
  }
];

defineLlmEval({
  targetId: "agent:zoto-eval-executor",
  cases: CASES,
  modelId: process.env.ZOTO_EVAL_MODEL ?? "composer-2.5",
  judgeModel: process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6",
  caseTimeoutMs: 180000,
  describe,
  it,
  afterAll,
  expect,
});
