// _meta.generated: true
/**
 * LLM `code`-strategy eval for skill `zoto-judge-evals`.
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
    "id": "post-run-adjudication-pulls-config-and-merges-judge-notes",
    "prompt": "Cursor just finished wiring the newest LLM eval batch. Pull up the adversarial judge evals guidance, open the freshest `_runs` slice under our configured evals folder, ingest the three YAML aggregates plus the raw case logs, and append a sceptical critique without rerun.",
    "assertions": [
      "Before touching artefacts the agent reads `.zoto/eval-system/config.yml` and honours both `evalsDir` and `judgeModel` when naming the model inside the new `judge` stanza.",
      "The agent chooses the single newest directory under `{evalsDir}/_runs/`, then loads `static.yml`, `llm.yml`, `report.yml`, and each relevant `logs/<case>.log` entry together.",
      "The agent appends a `judge` block where each `findings` item names a concrete case id, restricts `dimension` to verbosity, accuracy, confidence, grader, or assertion, and keeps `severity` within warn or flag.",
      "The agent lists concrete `recommendations` strings such as grader upgrades or updater follow-ups without deleting or rewriting pre-existing `totals` or `aggregates` keys in `llm.yml`.",
      "The agent refrains from launching eval executors or otherwise re-executing cases during the review pass."
    ],
    "assertion_patterns": [
      "\\.zoto/eval-system/config\\.yml",
      "\\{evalsDir\\}/_runs/",
      "judge",
      "recommendations"
    ],
    "expected_output": "The agent cites the resolved run timestamp, summarizes cross-case risks, updates only the trailing judge section in `llm.yml`, leaves prior totals untouched, and never schedules another evaluation pass."
  },
  {
    "id": "empty-run-history-blocks-analysis",
    "prompt": "I need the coverage critic on our eval harness, but this checkout has never written a timestamped folder under `_runs`. Route me through the correct recovery action.",
    "assertions": [
      "The agent states that no eligible timestamped directory exists beneath `{evalsDir}/_runs/` and points the operator toward `/z-eval-execute` before attempting analysis.",
      "The agent does not append a `judge` block or alter `llm.yml` because there is nothing to adjudicate.",
      "The agent avoids inventing sandbox paths outside the declared `evalsDir` hierarchy."
    ],
    "assertion_patterns": [
      "\\{evalsDir\\}/_runs/",
      "judge",
      "evalsDir"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/eval-system/config.yml",
          "content": "evalsDir: evals\njudgeModel: opus-4.6\n"
        },
        {
          "path": "workspace/evals/_runs/.keep",
          "content": "marker only\n"
        }
      ]
    },
    "expected_output": "The agent explains that no recent run directory exists, tells the operator to execute the suite first, and never fabricates `judge` output."
  },
  {
    "id": "heuristic-scan-flags-brittle-graders-and-drifting-metrics",
    "prompt": "Load the adversarial evaluator skill, focus on run `20260201T090000Z`, and tell me whether our graders and soft metrics deserve tightening before release.",
    "assertions": [
      "The agent records at least one `findings` row whose `dimension` equals assertion when eval assertions lack matching grader corroboration for the same case.",
      "The agent records a `findings` row whose `dimension` equals grader when a contains grader depends on fewer than four characters of evidence.",
      "The agent records `findings` tied to verbosity above 2.0, confidence under 0.4, and accuracy under 0.5 when those thresholds appear for any case.",
      "When brittle contains graders are flagged the subsequent `recommendations` steer operators toward richer scorer stacks such as regex matchers or llm-backed judges consistent with the skill playbook.",
      "When durations are interpretable versus the suite mean, anomalies beyond two sigma are surfaced as severity warn or flag instead of silently passing.",
      "The resulting `llm.yml` retains the preceding `totals` and `aggregates` verbatim while nesting the appended `judge` content afterward."
    ],
    "assertion_patterns": [
      "findings",
      "findings",
      "findings",
      "recommendations",
      "llm\\.yml"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/eval-system/config.yml",
          "content": "evalsDir: evals\njudgeModel: opus-4.6\n"
        },
        {
          "path": "workspace/evals/_runs/20260201T090000Z/static.yml",
          "content": "totals:\n  cases: 1\n\n"
        },
        {
          "path": "workspace/evals/_runs/20260201T090000Z/llm.yml",
          "content": "totals:\n  cases: 2\naggregates:\n  mean_duration_ms: 1200\n  stddev_duration_ms: 95\n\ncases:\n  noisy-case:\n    verbosity: 2.9\n    confidence: 0.35\n    accuracy: 0.45\n    duration_ms: 5200\n  brittle-case:\n    graders:\n      - kind: contains\n        matched_token: \"ai\"\n    duration_ms: 1185\nassertions_checked:\n  noisy-case:\n    - id: parity\n      satisfied: false\n"
        },
        {
          "path": "workspace/evals/_runs/20260201T090000Z/report.yml",
          "content": "summary:\n  overall: unstable\n\n"
        },
        {
          "path": "workspace/evals/_runs/20260201T090000Z/logs/noisy-case.log",
          "content": "prompt: reconcile metrics\nresponse: stretched narrative\ngrader_contains: PASS\nassertion_parity: FAIL\n\n"
        }
      ]
    },
    "expected_output": "The agent writes nuanced findings tying log evidence to verbosity, accuracy, confidence, assertion gaps, and feeble graders, obeying merge-only edits on `llm.yml`."
  },
  {
    "id": "updater-coupling-surfaces-through-structured-yaml-only",
    "prompt": "The judge surfaced weak assertions on two skills — prepare the guarded hand-off exactly as documented so `/z-eval-judge` can route the prompts, and do not open interactive questions yourself.",
    "assertions": [
      "The emitted hand-off includes `needs_user_input.reason` plus a `questions` array whose first item uses `id: handoff`, offers labelled `options`, and aligns with updater delegation wording from the workflow.",
      "The agent never invokes `askQuestion` or analogous interactive widgets from inside the judged skill reasoning path.",
      "The narrative names specific downstream skills or eval targets deserving `/z-eval-update`, matching the sceptical findings it already enumerated.",
      "No `plugins/**/evals/evals.json` files nor other eval registrations are rewritten during this step; escalation stays descriptive."
    ],
    "assertion_patterns": [
      "needs_user_input\\.reason",
      "askQuestion",
      "/z-eval-update",
      "plugins/\\*\\*/evals/evals\\.json"
    ],
    "expected_output": "The agent returns a YAML `needs_user_input` fragment with enumerated options covering batch approval, supervised updates, or cancellation, referencing affected skill targets implicitly or explicitly."
  },
  {
    "id": "slash-palette-alignment-still-routes-through-canonical-reads",
    "prompt": "/z-eval-judge is available now — treat that palette entry exactly like the sceptical evaluator skill: reuse the artefacts from the freshest suite run and summarise what still looks fragile.",
    "assertions": [
      "The interaction transcript lists reading `.zoto/eval-system/config.yml` prior to traversing `_runs/`, preserving the documented ordering.",
      "Reported outcomes remain post-hoc: no runner scripts are re-triggered unless the operator explicitly exits this flow to execute something else.",
      "When risk warrants follow-up automation, structured YAML matches the prescribed `needs_user_input` scaffold instead of ad hoc prose questionnaires."
    ],
    "assertion_patterns": [
      "\\.zoto/eval-system/config\\.yml",
      "needs_user_input"
    ],
    "expected_output": "Even when invoked via the palette hook, behaviour matches the textual workflow loads, critiques, merge-only edits, and optional structured hand-off payloads."
  }
];
const TARGET_ID = "skill:zoto-judge-evals";
const MODEL_ID = process.env.ZOTO_EVAL_MODEL ?? "composer-2";
const JUDGE_MODEL = process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6";
const REPO_ROOT = process.cwd();
const SUITE_START = Date.now();
const API_KEY_PRESENT = Boolean(process.env.CURSOR_API_KEY);

describe("skill:zoto-judge-evals", () => {
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
