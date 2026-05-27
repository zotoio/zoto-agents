// _meta.generated: true
/**
 * LLM `code`-strategy eval for command `z-eval-execute`.
 *
 * Stamped by `scripts/eval-stamp.ts#stampLlmCodeStrategy` from
 * `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl`.
 *
 * The literal first line of this file MUST remain `// _meta.generated: true`.
 * Subtask 03's cleanup engine and subtask 11's overwrite gate both use
 * `evals/_llm/_user-case-guards.ts#isGeneratedFile(path, { strict: true })`
 * to decide whether this file is safe to replace or delete. Edit the
 * template, not this emitted file.
 * Interaction classification: requiresInteraction=true, interactionStyle=command-owned
 * Analyser version: 2026.05.26-1
 * Backend: code-strategy (LLM)
 */
import { describe, it, afterAll, expect } from "vitest";
import { resolveInteractionPlanFromCase } from "../../../../evals/llm/_shared/askquestion-bridge.js";

import type { LlmCaseDefinition } from "../../../../evals/llm/_shared/llm-case.js";
import { defineLlmEval } from "../../../../evals/llm/_shared/run-llm-suite.js";

const CASES: LlmCaseDefinition[] = [
  {
    "id": "blocked-when-zoto-eval-system-config-yml-is-absent-before-spawning-any-task-work",
    "prompt": "/z-eval-execute",
    "assertions": [
      "After `/z-eval-execute`, operator-visible messaging reproduces verbatim Eval System is not initialised. Run `/z-eval-init` first to create `.zoto/eval-system/config.yml`.",
      "Workspace growth under evals/_runs does not acquire a newly stamped directory for this refusal."
    ],
    "assertion_patterns": [
      "/z-eval-execute"
    ],
    "expected_output": "Execution halts with only the initialise-first refusal so no eval runs enqueue."
  },
  {
    "id": "documented-bare-invocation-runs-static-only-suites-through-host-scripts",
    "prompt": "/z-eval-execute",
    "assertions": [
      "Fresh evals/_runs/*/static.yml and sibling report.yml exist with report.yml aligning static telemetry per the sibling-artefact contract.",
      "`/z-eval-execute` streamed shell-driven host package-script output resolves to static posture because `--full` was omitted before delegating workloads.",
      "After script completion tooling shows `pnpm run eval:update --check` succeeding and drift metadata appended on the paired llm.yml for that same timestamp prefix."
    ],
    "assertion_patterns": [
      "/z-eval-execute",
      "pnpm run eval:update --check"
    ],
    "expected_output": "Configured static scripts finish, freshest evals/_runs siblings capture results, streamed totals summarize the static pass, hygiene updates merge drift snippets into llm.yml, aggregates cover both backends shown in merged report artefacts."
  },
  {
    "id": "full-sweep-with-explicit-model-forwards-opus-4-6-into-delegated-executor-instruc",
    "prompt": "/z-eval-execute --full --model opus-4.6",
    "assertions": [
      "Visible delegation text cites opus-4.6 verbatim alongside credential_resolution narration required for `--full` Task prompts.",
      "The newest llm.yml under evals/_runs reflects LLM execution while neighbouring report.yml folds static and llm excerpts per File layout writes.",
      "Final streamed narration lists aggregate summaries plus drift line tied to eval:update --check output."
    ],
    "assertion_patterns": [
      "--full"
    ],
    "expected_output": "With credentials satisfied, opus-4.6 shows up verbatim in delegated copy, `_runs/*/llm.yml` records LLM output, merged report aligns both backends with drift chatter printed at the end."
  },
  {
    "id": "full-sweep-without-cursor-api-credential-surfaces-command-owned-credential-askqu",
    "prompt": "/z-eval-execute --full",
    "follow_ups": [
      "Abort entirely once askQuestion renders; insist credential_resolution encodes cancelling any LLM launch because the Cursor API credential stays unavailable"
    ],
    "assertions": [
      "`/z-eval-execute --full` emitted askQuestion before spawning zoto-eval-executor whenever neither CURSOR_API_KEY is set nor repo-root uncommented CURSOR credential lines populate dotenv ingestion.",
      "askQuestion surfaced guidance about provisioning repo-root `.env`, never fabricating secrets.",
      "After choosing abort credential_resolution resumes without launching host LLM eval scripts evidenced by lacking fresh llm pass rows beneath evals/_runs for that aborted attempt."
    ],
    "assertion_patterns": [
      "/z-eval-execute --full",
      "\\.env"
    ],
    "expected_output": "askQuestion distinguishes abort versus static downgrade, honouring outright cancellation skips substantive LLM pass columns for that attempt."
  },
  {
    "id": "full-credential-gap-resolves-to-delegated-static-downgrade-after-answered-askque",
    "prompt": "/z-eval-execute --full",
    "follow_ups": [
      "Resolve askQuestion toward static-host-only posture; insist credential_resolution encodes cancelling LLM while keeping static suites"
    ],
    "assertions": [
      "Resumed delegation copy documents static downgrade inside credential_resolution per operator answer.",
      "Newest snapshot shows static.yml populated whereas llm.yml avoids fresh llm pass tallies besides drift hygiene fields.",
      "Streamed aggregates report completed static workloads while echoed drift narration references eval:update --check."
    ],
    "assertion_patterns": [],
    "expected_output": "Operator answer records downgrade, delegated instructions embed static posture, refreshed static artefacts land while substantive llm summaries stay dormant yet drift bookkeeping still attaches to llm.yml."
  },
  {
    "id": "resume-continues-after-delegated-needs-user-input-on-credential-ambiguity",
    "prompt": "/z-eval-execute --full --model opus-4.6",
    "follow_ups": [
      "Clarify in the resumed turn that credential_resolution authorises proceeding with opus-4.6 because the stalled prompt is satisfied"
    ],
    "assertions": [
      "When zoto-eval-executor returns credential-oriented needs_user_input, `/z-eval-execute` issues askQuestion and resumes with clarified credential_resolution.",
      "Following resume, freshest llm.yml timestamps align with opus-4.6 full sweep artefacts alongside neighbouring report.yml merges",
      "Once streamed totals finish, no renewed operator credential dialogs appear tied to stalled delegations"
    ],
    "assertion_patterns": [
      "/z-eval-execute"
    ],
    "expected_output": "Structured needs_user_input triggers credential clarification, resumed turn satisfies it, rerun finishes llm artefacts plus merged report totals without another escalation."
  }
];

defineLlmEval({
  targetId: "command:z-eval-execute",
  cases: CASES,
  modelId: process.env.ZOTO_EVAL_MODEL ?? "composer-2.5",
  judgeModel: process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6",
  caseTimeoutMs: 180000,
  describe,
  it,
  afterAll,
  expect,
});
