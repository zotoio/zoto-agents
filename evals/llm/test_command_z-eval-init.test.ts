// _meta.generated: true
/**
 * LLM `code`-strategy eval for command `z-eval-init`.
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
    "id": "baseline-init-scaffolds-config-and-confirmation-line",
    "prompt": "/z-eval-init",
    "assertions": [
      "After `/z-eval-init`, the repository contains `workspace/.zoto/eval-system/config.yml` with the same structure as `plugins/zoto-eval-system/templates/init-config.yml`, including the banner that every supported key is commented and the inline pointer to `plugins/zoto-eval-system/templates/schema/config.schema.json`.",
      "The parent directory `workspace/.zoto/eval-system/` is created with mkdir-style semantics whenever it was missing before the run.",
      "The visible completion output does not launch the configurer skill, does not open an `askQuestion` interview, and does not chain into `/z-eval-create`, `/z-eval-execute`, `/z-eval-judge`, `/z-eval-update`, `/z-eval-compare`, or `/z-eval-help`."
    ],
    "assertion_patterns": [
      "/z-eval-init",
      "workspace/\\.zoto/eval-system/",
      "askQuestion"
    ],
    "expected_output": "One confirmation line naming the absolute filesystem path of `.zoto/eval-system/config.yml`, clarifying that behaviour stays identical to internal defaults until specific keys are uncommented, naming `plugins/zoto-eval-system/templates/schema/config.schema.json`, and steering people toward `/z-eval-configure` for guided setup."
  },
  {
    "id": "second-init-without-force-stops-with-contract-error",
    "prompt": "/z-eval-init",
    "assertions": [
      "The process or tool invocation ends with a non-zero status or an explicit Cursor failure state.",
      "The error text contains the sentence `.zoto/eval-system/config.yml already exists; pass --force to overwrite`.",
      "The on-disk contents of `workspace/.zoto/eval-system/config.yml` remain the pre-run version with the pinned `runs.retention` value."
    ],
    "assertion_patterns": [
      "\\.zoto/eval-system/config\\.yml already exists; pass --force to overwrite",
      "workspace/\\.zoto/eval-system/config\\.yml"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/eval-system/config.yml",
          "content": "# pinned for idempotency check\nruns:\n  retention: 3\n"
        }
      ]
    },
    "expected_output": "A non-success tool or shell result whose text repeats that `.zoto/eval-system/config.yml already exists` and tells the operator to pass `--force` to overwrite."
  },
  {
    "id": "init-with-force-replaces-a-customised-config",
    "prompt": "/z-eval-init --force",
    "assertions": [
      "After `/z-eval-init --force`, `workspace/.zoto/eval-system/config.yml` no longer enables `manualChecklists` and instead mirrors the commented defaults from `plugins/zoto-eval-system/templates/init-config.yml`.",
      "The command still refrains from spawning the configurer or running any secondary eval-system command during the same turn."
    ],
    "assertion_patterns": [
      "/z-eval-init --force"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/eval-system/config.yml",
          "content": "# stale settings that must be wiped\nmanualChecklists:\n  enabled: true\n"
        }
      ]
    },
    "expected_output": "The same single-line confirmation pattern as a first-time init: absolute path, reminder that defaults remain commented, pointer to `plugins/zoto-eval-system/templates/schema/config.schema.json`, and the `/z-eval-configure` hint."
  },
  {
    "id": "missing-plugin-template-surfaces-precise-path-error",
    "prompt": "/z-eval-init",
    "assertions": [
      "If `plugins/zoto-eval-system/templates/init-config.yml` cannot be read from the active plugin tree, stderr or tool output includes the substring `templates/init-config.yml not found` plus the concrete path that was checked.",
      "No new `config.yml` appears under `workspace/.zoto/eval-system/` when the template read fails."
    ],
    "assertion_patterns": [
      "plugins/zoto-eval-system/templates/init-config\\.yml",
      "config\\.yml"
    ],
    "expected_output": "A hard failure message that names `templates/init-config.yml` and the plugin root path Cursor inspected, with no silent fallback file creation."
  },
  {
    "id": "filesystem-permission-denial-propagates-verbatim",
    "prompt": "/z-eval-init",
    "assertions": [
      "When directory creation or writing `workspace/.zoto/eval-system/config.yml` fails with permission denied, the surfaced text matches the underlying OS error payload instead of a hand-waved summary."
    ],
    "assertion_patterns": [
      "workspace/\\.zoto/eval-system/config\\.yml"
    ],
    "expected_output": "A failure message that preserves the operating-system permission error returned from mkdir or write, without substituting a generic success string."
  }
];
const TARGET_ID = "command:z-eval-init";
const MODEL_ID = process.env.ZOTO_EVAL_MODEL ?? "composer-2";
const JUDGE_MODEL = process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6";
const REPO_ROOT = process.cwd();
const SUITE_START = Date.now();
const API_KEY_PRESENT = Boolean(process.env.CURSOR_API_KEY);

describe("command:z-eval-init", () => {
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
