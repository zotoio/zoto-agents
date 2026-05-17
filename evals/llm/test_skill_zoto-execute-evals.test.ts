// _meta.generated: true
/**
 * LLM `code`-strategy eval for skill `zoto-execute-evals`.
 *
 * Stamped by `scripts/eval-stamp.ts#stampLlmCodeStrategy` from
 * `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl`.
 *
 * The literal first line of this file MUST remain `// _meta.generated: true`.
 * Subtask 03's cleanup engine and subtask 11's overwrite gate both use
 * `evals/_llm/_user-case-guards.ts#isGeneratedFile(path, { strict: true })`
 * to decide whether this file is safe to replace or delete. Edit the
 * template, not this emitted file.
 *
 * Canonical SDK pattern (routed through `_shared/sdk-bridge.ts`):
 *
 *   const agent = await createAgent({ modelId, cwd });
 *   const run = await sendPrompt(agent, prompt);
 *   const { text, result } = await awaitRun(run);
 *   expect(text).toMatch(/.../);
 */
import { describe, it, afterAll, expect } from "vitest";

import {
  createAgent,
  sendPrompt,
  awaitRun,
  closeAgent,
  resolveTokens,
} from "./_shared/sdk-bridge.js";
import {
  buildSandbox,
  diffSandbox,
  postSnapshot,
  preSnapshot,
} from "./_shared/sandbox-helpers.js";
import { reportCase, reportSuite } from "./_shared/zoto-llm-reporter.js";
import { contains } from "./_shared/graders/contains.js";
import { regex } from "./_shared/graders/regex.js";
import { toolCalled } from "./_shared/graders/tool-called.js";
import { llmJudge } from "./_shared/graders/llm-judge.js";
import type { GraderReport } from "./_shared/graders/common.js";
import type { CodeStrategyCaseDefinition } from "./_shared/code-strategy-case.js";


const CASES: CodeStrategyCaseDefinition[] = [
  {
    "id": "static-tier-streams-logs-then-stamps-drift",
    "prompt": "The palette ran `/z-eval-execute` with no flags. You have the execute-evals skill loaded—run the static suite end-to-end and close with the skill’s wrap-up.",
    "assertions": [
      "Step 1 chose pnpm run eval because neither --full nor an LLM-only path applied",
      "Step 4 used a shell subagent and streamed stdout and stderr during execution rather than hiding output until the command finished",
      "Step 5 ran pnpm run eval:update --check and translated exit code 0 to drift status clean, exit code 2 to critical, and any other code to unknown before appending drift with status, exit_code, and message to the most recent llm.yml as warn-only overlay data",
      "Step 6 summarized totals and aggregates such as tokens, duration, verbosity, accuracy, and confidence together with the drift line and omitted graphical charts",
      "Conventions were respected so artefact paths referenced the eval-system layout static.yml, llm.yml, report.yml, and logs under the timestamped run directory beneath evalsDir",
      "The workflow never called askQuestion and never modified .zoto-eval-system/config.json or .zoto-eval-system/manifest.yml",
      "Execution stayed inside package.json scripts using pnpm run eval and pnpm run eval:update --check rather than invoking harness entrypoints directly"
    ],
    "assertion_patterns": [],
    "expected_output": "The assistant drives a shell run of pnpm run eval, streams combined output as it arrives, runs pnpm run eval:update --check afterward, appends a drift block to the newest llm.yml under the configured evals tree, and finishes with pass or fail counts plus token or timing style aggregates and the drift line, without charts or edits to manifest files."
  },
  {
    "id": "full-tier-forwards-model-on-cli-and-env",
    "prompt": "`/z-eval-execute --full --model opus-4.6` was issued, CURSOR_API_KEY is already available to the executor process, and credentials are settled—carry out the skill.",
    "assertions": [
      "Step 1 selected pnpm run eval:full because --full was present with a usable Cursor API key per Step 3",
      "Step 2 forwarded opus-4.6 through pnpm run eval:full -- --model opus-4.6 and also set ZOTO_EVAL_MODEL=opus-4.6 so downstream precedence rules can observe either channel",
      "The executor refused to start the LLM backend without both --full and a resolved key",
      "After completion Step 5 appended the drift YAML fragment to the freshest llm.yml with warn-only semantics that leave the run verdict unchanged",
      "Step 6 combined backend aggregates with the drift summary and avoided rendering charts"
    ],
    "assertion_patterns": [],
    "expected_output": "pnpm run eval:full runs with opus-4.6 supplied both after -- via --model and through ZOTO_EVAL_MODEL on the same invocation pattern, LLM work only happens alongside --full with a resolved key, drift check runs afterward, and the closing narrative cites merged totals plus drift without charts."
  },
  {
    "id": "missing-api-key-returns-needs-user-input",
    "prompt": "Run `/z-eval-execute --full`. Credential_resolution was not supplied ahead of time, CURSOR_API_KEY is absent from the executor environment, and the repo root `.env` has no uncommented CURSOR_API_KEY line with non-empty trimmed content. Apply zoto-execute-evals.",
    "assertions": [
      "Step 3 concluded the API key was missing under both environment and dotenv checks before any LLM run started",
      "The response packaged needs_user_input with abort versus static-only choices instead of calling askQuestion",
      "No shell invocation began pnpm run eval:full or otherwise executed LLM-tier tests without the key"
    ],
    "assertion_patterns": [],
    "expected_output": "The assistant emits a structured needs_user_input payload that contrasts aborting versus falling back to static-only work, issues no askQuestion prompts, and never launches eval:full or another LLM runner entrypoint."
  },
  {
    "id": "task-credential-resolution-forces-static-tier",
    "prompt": "Task envelope shows `/z-eval-execute --full` yet credential_resolution already selected static-only continuation because the LLM tier cannot start safely. Execute using the loaded execute-evals guidance.",
    "assertions": [
      "Step 1 respected credential_resolution from the task payload so the shell run targeted pnpm run eval rather than pnpm run eval:full",
      "After the static run finished Step 5 still invoked pnpm run eval:update --check and appended drift metadata warn-only to llm.yml",
      "No LLM runner subprocess started because the resolved credential path forbade it"
    ],
    "assertion_patterns": [],
    "expected_output": "Despite the command line mentioning --full, the executor honors the resolved intent by running only pnpm run eval, still performs the post-run drift stamp on llm.yml, and summarizes static outcomes plus drift without attempting LLM execution."
  },
  {
    "id": "honours-evalsdir-from-eval-system-yaml",
    "prompt": "`/z-eval-execute` ran without flags. Config at `.zoto/eval-system/config.yml` sets a non-default evalsDir—follow the skill so reporting paths align with that directory.",
    "assertions": [
      "Configuration handling used config.evalsDir from workspace/.zoto/eval-system/config.yml so the newest run folder resolved under regression_targets/_runs instead of the default evals directory",
      "Step 4 executed pnpm run eval while treating artefact locations relative to the configured evalsDir per the documented layout",
      "Step 5 appended drift to the llm.yml sibling inside the newest regression_targets/_runs timestamp directory"
    ],
    "assertion_patterns": [],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/eval-system/config.yml",
          "content": "schema_version: 2\nevalsDir: regression_targets\n"
        }
      ]
    },
    "expected_output": "Before spawning work the assistant reads workspace/.zoto/eval-system/config.yml, resolves regression_targets as the evalsDir, and anchors references to _runs, static.yml, llm.yml, report.yml, and logs beneath that folder while running pnpm run eval and the drift follow-up."
  },
  {
    "id": "dotenv-line-satisfies-api-key-preflight",
    "prompt": "`/z-eval-execute --full` is requested. process.env.CURSOR_API_KEY is unset, but the repo root `.env` file holds an uncommented CURSOR_API_KEY entry whose trimmed value is non-empty. Proceed per Step 3 and complete the skill.",
    "assertions": [
      "Step 3 counted the repo root .env assignment toward key presence even though process.env lacked CURSOR_API_KEY at launch",
      "Because the key resolved through dotenv, the workflow skipped needs_user_input and proceeded into pnpm run eval:full",
      "Streaming and drift stamping behaved the same as when the key was exported directly"
    ],
    "assertion_patterns": [],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.env",
          "content": "CURSOR_API_KEY=k\n"
        }
      ]
    },
    "expected_output": "The executor treats the key as present via the dotenv branch alone, launches pnpm run eval:full without needs_user_input, streams shell output, applies dual model forwarding when --model is provided elsewhere in the task, runs drift check afterward, and summarizes aggregates plus drift."
  },
  {
    "id": "model-flag-without-full-stays-static",
    "prompt": "`/z-eval-execute --model opus-4.6` executed without --full. With the execute-evals skill active, run what the workflow mandates.",
    "assertions": [
      "Step 1 mapped the invocation to pnpm run eval since --full was absent meaning LLM cases stay inactive",
      "The executor did not invoke pnpm run eval:full solely due to the isolated --model flag",
      "Any model forwarding side-effects stayed compatible with static-only execution per Step 1’s rule that --model affects LLM cases only",
      "Post-run drift handling via pnpm run eval:update --check still ran and updated llm.yml warn-only"
    ],
    "assertion_patterns": [],
    "expected_output": "The assistant selects pnpm run eval because LLM cases are off without --full, ensures opus-4.6 forwarding applies only to LLM-eligible paths so static execution dominates, then completes drift stamping and the textual summary."
  }
];
const TARGET_ID = "skill:zoto-execute-evals";
const MODEL_ID = process.env.ZOTO_EVAL_MODEL ?? "composer-2";
const JUDGE_MODEL = process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6";
const REPO_ROOT = process.cwd();
const SUITE_START = Date.now();
const API_KEY_PRESENT = Boolean(process.env.CURSOR_API_KEY);

describe("skill:zoto-execute-evals", () => {
  afterAll(() => {
    reportSuite({
      target_id: TARGET_ID,
      started_at: new Date(SUITE_START).toISOString(),
      ended_at: new Date().toISOString(),
      model: MODEL_ID,
    });
  });

  for (const c of CASES) {
    const testFn = async (): Promise<void> => {
      const caseStart = Date.now();
      const sandbox = buildSandbox({
        runId: TARGET_ID,
        caseId: c.id,
        repoRoot: REPO_ROOT,
        fixtures: c.fixtures as never,
      });

      const before = preSnapshot(sandbox.rootDir);
      const agent = await createAgent({ modelId: MODEL_ID, cwd: sandbox.rootDir });

      let text = "";
      let tokens = 0;
      let tokenSource = "approximate:chars/4";
      let status: "passed" | "failed" | "errored" = "passed";
      const reports: GraderReport[] = [];
      try {
        const run = await sendPrompt(agent, c.prompt);
        const awaited = await awaitRun(run);
        text = awaited.text;
        const resolved = resolveTokens(awaited.result, c.prompt, text);
        tokens = resolved.tokens;
        tokenSource = resolved.source;

        for (const followUp of c.follow_ups ?? []) {
          const followRun = await sendPrompt(agent, followUp);
          const followAwaited = await awaitRun(followRun);
          text += "\n" + followAwaited.text;
          tokens += resolveTokens(followAwaited.result, followUp, followAwaited.text).tokens;
        }

        for (const g of c.graders ?? []) {
          const gtype = (g as { type?: string }).type;
          if (gtype === "contains") reports.push(contains(g as never, text));
          else if (gtype === "regex") reports.push(regex(g as never, text));
          else if (gtype === "tool-called") reports.push(toolCalled(g as never, []));
          else if (gtype === "llm-judge") {
            reports.push(
              await llmJudge(g as never, text, {
                judge: async ({ prompt }) => {
                  const judgeAgent = await createAgent({ modelId: JUDGE_MODEL, cwd: sandbox.rootDir });
                  try {
                    const jr = await sendPrompt(judgeAgent, prompt);
                    const ja = await awaitRun(jr);
                    return parseJudgeScore(ja.text);
                  } finally {
                    closeAgent(judgeAgent);
                  }
                },
              }),
            );
          }
        }

        /* Enriched assertion list: one rubric-backed judge covers every analyser
         * requirement (avoids loose short `contains` needles on assertion text). */
        if (c.assertions.length > 0) {
          const rubric = [
            "You grade an AI agent's final natural-language reply.",
            "Score how well the RESPONSE semantically satisfies EVERY requirement below; paraphrases count.",
            "Return score 1.0 only when all requirements are clearly satisfied; lower scores when any important requirement is missing or contradicted.",
            "",
            "REQUIREMENTS:",
            ...c.assertions.map((a, i) => `${i + 1}. ${a}`),
          ].join("\n");
          reports.push(
            await llmJudge(
              {
                type: "llm-judge",
                rubric,
                passThreshold: 0.72,
              },
              text,
              {
                judge: async ({ prompt }) => {
                  const judgeAgent = await createAgent({ modelId: JUDGE_MODEL, cwd: sandbox.rootDir });
                  try {
                    const jr = await sendPrompt(judgeAgent, prompt);
                    const ja = await awaitRun(jr);
                    return parseJudgeScore(ja.text);
                  } finally {
                    closeAgent(judgeAgent);
                  }
                },
              },
            ),
          );
        }

        for (const pattern of c.assertion_patterns ?? []) {
          expect(text).toMatch(new RegExp(pattern));
        }

        const failed = reports.some((r) => r.verdict === "fail");
        status = failed ? "failed" : "passed";
      } catch (err) {
        status = "errored";
        reports.push({
          grader: "runtime",
          verdict: "fail",
          detail: (err as Error).message,
        });
        throw err;
      } finally {
        closeAgent(agent);
        const after = postSnapshot(sandbox.rootDir);
        const mutations = diffSandbox(before, after);
        const caseEnd = Date.now();
        reportCase({
          target_id: TARGET_ID,
          case: {
            id: c.id,
            status,
            tokens,
            duration_ms: caseEnd - caseStart,
            verbosity:
              c.prompt.length === 0
                ? 0
                : Math.round((text.length / Math.max(1, c.prompt.length)) * 1000) / 1000,
            accuracy:
              reports.length === 0
                ? 0
                : Math.round(
                    (reports.filter((r) => r.verdict === "pass").length / reports.length) * 1000,
                  ) / 1000,
            confidence:
              reports.length === 0
                ? 0
                : Math.round(
                    (reports.filter((r) => r.verdict !== "fail").length / reports.length) * 1000,
                  ) / 1000,
            grader_reports: reports,
            repo_mutations: mutations,
            token_source: tokenSource,
            expected_output: c.expected_output,
            assertions: c.assertions,
          },
        });
      }
    };

    if (!API_KEY_PRESENT) {
      it.skip(`${c.id} (skipped: CURSOR_API_KEY missing)`, () => {});
    } else {
      it(c.id, testFn, 180000);
    }
  }
});

function parseJudgeScore(raw: string): { score: number; detail: string } {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return { score: 0, detail: `unparseable judge response: ${raw.slice(0, 200)}` };
  try {
    const obj = JSON.parse(match[0]) as { score?: unknown; detail?: unknown };
    const score = typeof obj.score === "number" ? Math.max(0, Math.min(1, obj.score)) : 0;
    const detail = typeof obj.detail === "string" ? obj.detail : "";
    return { score, detail };
  } catch (err) {
    return { score: 0, detail: `judge JSON parse failure: ${(err as Error).message}` };
  }
}
