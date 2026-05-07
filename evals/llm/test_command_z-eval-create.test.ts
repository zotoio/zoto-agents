// _meta.generated: true
/**
 * LLM `code`-strategy eval for command `z-eval-create`.
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
    "id": "uninitialised-workspace-precondition-blocks-generator-spawn",
    "prompt": "/z-eval-create",
    "assertions": [
      "Before any `askQuestion`, discovery, or `zoto-eval-generator` Task, the assistant verified `.zoto/eval-system/config.yml` at the repository root.",
      "When that file is missing, the assistant returned the exact message: Eval System is not initialised. Run `/z-eval-init` first to create `.zoto/eval-system/config.yml`.",
      "No `zoto-eval-generator` subagent was spawned and `pnpm run eval:discover` was not invoked while the precondition failed."
    ],
    "assertion_patterns": [
      "askQuestion",
      "/z-eval-init",
      "zoto-eval-generator"
    ],
    "expected_output": "The assistant stops immediately with the precise initialisation error, cites `/z-eval-init`, and performs no discovery, checklist, or subagent work."
  },
  {
    "id": "configured-workspace-four-checklists-then-full-generator-pipeline",
    "prompt": "/z-eval-create",
    "assertions": [
      "After confirming `.zoto/eval-system/config.yml`, the command ran `askQuestion` to capture approve-or-prune lists for skills, plugin and workspace commands, plugin and workspace agents, and hook bundles (`hook:cursor` when applicable) before spawning any Task.",
      "Because the config file was already present, the assistant did not prompt a configure-versus-abort choice for a missing eval-system config.",
      "The spawned Task named `zoto-eval-generator` referenced the `zoto-create-evals` skill and included every operator-approved primitive id in its instructions.",
      "Inside the generator flow the assistant invoked `pnpm run eval:discover`, stamped static pytest and LLM `@cursor/sdk` scaffolding, ensured each approved skill gained `evals/evals.json`, and ran `pnpm run eval:stamp -- <target-id>` for every approved command, agent, and hook target.",
      "The assistant reported that `.env.example` already existed and left its contents untouched while still stamping the template when absent in other runs.",
      "The assistant merged `package.json` scripts and devDependencies (including `dotenv`) and reminded the operator to install packages before executing the suite.",
      "Fresh `manifest.yml` content plus an append-only row in `manifest.history.yml` recorded every newly stamped target.",
      "Closing gates ran successfully: `pnpm run eval:list`, `pnpm run eval -- --collect-only`, and `pnpm run eval:update --check` each exited with status 0.",
      "Optional `USER_EVAL_CHECKLISTS.md` creation, when offered, did not block manifest writes or the validation trio if skipped."
    ],
    "assertion_patterns": [
      "\\.zoto/eval-system/config\\.yml",
      "zoto-eval-generator",
      "pnpm run eval:discover",
      "\\.env\\.example",
      "package\\.json",
      "manifest\\.yml",
      "pnpm run eval:list",
      "USER_EVAL_CHECKLISTS\\.md"
    ],
    "fixtures": {
      "files": [
        {
          "path": ".env.example",
          "content": "# overlay: proves non-destructive stamping\nPRECOMMIT_SENTINEL=do-not-clobber\n"
        }
      ]
    },
    "expected_output": "Checklists complete, the generator runs discovery, stamps pytest and LLM suites, updates manifests and package scripts, preserves `.env.example`, and all three validation commands exit zero."
  },
  {
    "id": "generator-needs-clarification-resume-loop-after-askquestion",
    "prompt": "/z-eval-create",
    "follow_ups": [
      "For the paused generator report, answer the outstanding question by approving only `skill:zoto-help-evals` and `command:z-eval-execute` from the lists already shown.",
      "Resume the `zoto-eval-generator` Task with that approval and ask it to continue stamping the remaining approved hook ids without re-prompting me."
    ],
    "assertions": [
      "After the generator returned `needs_user_input`, the command issued a concrete `askQuestion` instead of silently stopping.",
      "The assistant resumed the existing `zoto-eval-generator` Task with the supplied answers rather than spawning a duplicate generator run.",
      "Post-resume stdout or messaging reflected continued stamping progress and ended with the same validation gate trio once work finished."
    ],
    "assertion_patterns": [
      "needs_user_input",
      "zoto-eval-generator"
    ],
    "expected_output": "The assistant surfaces `askQuestion` for the incomplete generator report, records the answers, resumes the same Task, and completes stamping without abandoning prior progress."
  }
];
const TARGET_ID = "command:z-eval-create";
const MODEL_ID = process.env.ZOTO_EVAL_MODEL ?? "composer-2";
const JUDGE_MODEL = process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6";
const REPO_ROOT = process.cwd();
const SUITE_START = Date.now();
const API_KEY_PRESENT = Boolean(process.env.CURSOR_API_KEY);

describe("command:z-eval-create", () => {
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
