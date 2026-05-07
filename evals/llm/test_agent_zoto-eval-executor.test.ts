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

interface CaseDefinition {
  id: string;
  prompt: string;
  follow_ups?: string[];
  assertions: string[];
  assertion_patterns?: string[];
  graders?: Array<Record<string, unknown>>;
  fixtures?: { files?: Array<{ path: string; content?: string; from?: string }> };
  expected_filesystem?: {
    created?: string[];
    modified?: string[];
    removed?: string[];
    unchanged?: string[];
  };
  expected_output?: string;
}

const CASES: CaseDefinition[] = [
  {
    "id": "static-harness-emits-judge-ready-run-artifacts",
    "prompt": "Run the configured static eval lane now—the path that behaves like `/z-eval-execute` without `--full`. I need the split `static.yml` output plus the merged `report.yml` populated under today’s fresh `evals/_runs/<timestamp>/` bundle so downstream judge and compare steps can ingest the snapshot. Respect whatever `static.framework`, `llm.strategy`, and `llm.codeFramework` are pinned in `.zoto/eval-system/config.yml`; do not escalate into the LLM backend for this turn. After the orchestrated harness finishes, run the mandated drift bookkeeping pass tied to `zoto-update-evals`.",
    "assertions": [
      "Before launching work, the executor ingested `.zoto/eval-system/config.yml` and carried `static.framework`, `llm.strategy`, and `llm.codeFramework` forward into whichever stamped runner wiring the orchestrator selects instead of hard-coding a framework assumption.",
      "The active skill path behaved like `zoto-execute-evals`, delegating to the host repo’s `pnpm run eval` entrypoint rather than spawning `pytest`, `vitest`, or `jest` CLIs directly.",
      "Working directory artefacts under `evals/_runs/<timestamp>/` include `static.yml` plus merged `report.yml`, preserving the downstream judge and comparer layout contract.",
      "After the orchestrated harness exited, `pnpm run eval:update --check` executed once and appended a `drift:` block beneath the freshest run folder’s `llm.yml`, leaving the originating pass verdict untouched.",
      "The executor surfaced zero `askQuestion` tool interactions while clarifying prerequisites or statuses for this lane."
    ],
    "assertion_patterns": [
      "\\.zoto/eval-system/config\\.yml",
      "zoto-execute-evals",
      "evals/_runs/<timestamp>/",
      "pnpm run eval:update --check",
      "askQuestion"
    ],
    "expected_output": "The executor returns a completion payload describing a finished static-only orchestration rooted in stamped `pnpm run eval` tooling, cites the `_runs` directory timestamp it produced, confirms `static.yml` and merged `report.yml` landed alongside the lane’s `llm.yml`, notes the appended `drift:` section from the post-run update check, and records that no LLM runner was touched so the pass stayed static-only."
  },
  {
    "id": "full-harness-proceeds-once-cursor-credentials-resolve",
    "prompt": "Kick off `/z-eval-execute --full` now. My setup relies on repo-root `.env` auto-loaded through `dotenv/config`, where an uncommented `CURSOR_API_KEY` line satisfies the Cursor API gate even if the terminal never exported it—honour that precedence, gate the LLM backend only after the secret resolves, run the aggregated static-plus-LLM lane, then complete the scripted drift bookkeeping the agent doc describes without falling back to interactive prompts.",
    "assertions": [
      "The executor refused to invoke the LLM runner until `--full` was active and either `CURSOR_API_KEY` was visible in process environment variables or surfaced through uncommented `.env` material read via `dotenv/config`.",
      "The orchestrator launched `pnpm run eval:full` so static and LLM harness layers ran behind the sanctioned package.json router instead of ad hoc binaries.",
      "Run telemetry stayed aligned with both `zoto-execute-evals` orchestration sequencing and `zoto-update-evals`-style hygiene by chaining `pnpm run eval:update --check` afterwards.",
      "The returned payload contains no transcript lines showing `askQuestion` calls while satisfying or declining the Cursor credential precondition."
    ],
    "assertion_patterns": [
      "--full",
      "pnpm run eval:full",
      "zoto-execute-evals",
      "askQuestion"
    ],
    "expected_output": "The completion narrative documents a guarded transition into `pnpm run eval:full`, explains that the Cursor secret was accepted either from exported `process.env.CURSOR_API_KEY` or the repo-root `.env` line the runner loads automatically, summaries that both static and LLM portions finished under the consolidated script, repeats that `pnpm run eval:update --check` appended drift into the same run bundle’s `llm.yml`, and confirms no credential prompts relied on `askQuestion`."
  },
  {
    "id": "forwarded-model-travels-through-cli-flag-and-ambient-export",
    "prompt": "Execute `/z-eval-execute --full --model opus-4-6`; the delegated Task envelope already exposes that model slug. Carry it through precisely as the markdown mandates: propagate the identifier as a `--model` CLI argument to the runner while also exporting `ZOTO_EVAL_MODEL` for the spawned process so tooling that reads env vars stays consistent. Maintain the Cursor credential precondition before any LLM work starts.",
    "assertions": [
      "Documentation-level model forwarding manifested as concurrent `--model` CLI wiring plus a `ZOTO_EVAL_MODEL` environment assignment before the harness executed LLM graders.",
      "The executor still withheld LLM subprocess creation until `--full` stayed engaged and Cursor API credentials remained resolvable exactly as prescribed.",
      "Telemetry references show the honoured command remained `pnpm run eval:full` rather than invoking runner entrypoints bypassing package.json scripts."
    ],
    "assertion_patterns": [
      "--model",
      "--full",
      "pnpm run eval:full"
    ],
    "expected_output": "The summary states the LLM runner launched with both an explicit `--model opus-4-6` argument and a `ZOTO_EVAL_MODEL` environment binding matching the same slug, notes the prior credential gate clearance, mentions completion of both static and LLM portions through `pnpm run eval:full`, and records drift attachment via `pnpm run eval:update --check` without interactive questioning."
  },
  {
    "id": "credential-gap-returns-structured-steerage-without-interactive-tooling",
    "prompt": "Attempt `/z-eval-execute --full` when `CURSOR_API_KEY` is absent from exported environment variables, uncommented `.env at repo root lacks the key`, and upstream `/z-eval-execute never pre-resolved continuation intent`; stop before any LLM runner starts and hand control back cleanly. Surface the mandated `needs_user_input` continuation object that contrasts aborting against switching to static-only continuation—never route that decision through interactive question tooling.",
    "assertions": [
      "Because neither exported `CURSOR_API_KEY` nor repo-root `.env` supplied a usable secret, the executor returned `needs_user_input` with explicit abort versus static-only guidance instead of launching the LLM runner.",
      "No LLM runner process started while the `--full` request lacked a satisfiable Cursor API secret, satisfying the dual gate on full-mode execution.",
      "The interaction log contains no `askQuestion` requests even while explaining the credential shortfall."
    ],
    "assertion_patterns": [
      "CURSOR_API_KEY",
      "--full",
      "askQuestion"
    ],
    "expected_output": "The executor emits a structured `needs_user_input` payload enumerating guarded choices between aborting the full lane and resuming strictly static harness coverage, cites that no Cursor secret was obtainable from environment or `.env`, emphasises zero LLM runner dispatch occurred, and shows transcript silence for `askQuestion`."
  }
];
const TARGET_ID = "agent:zoto-eval-executor";
const MODEL_ID = process.env.ZOTO_EVAL_MODEL ?? "composer-2";
const JUDGE_MODEL = process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6";
const REPO_ROOT = process.cwd();
const SUITE_START = Date.now();
const API_KEY_PRESENT = Boolean(process.env.CURSOR_API_KEY);

describe("agent:zoto-eval-executor", () => {
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
