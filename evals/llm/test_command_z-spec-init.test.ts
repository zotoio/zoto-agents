// _meta.generated: true
/**
 * LLM `code`-strategy eval for command `z-spec-init`.
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
    "id": "first-run-writes-init-template-and-prints-guidance",
    "prompt": "/z-spec-init",
    "assertions": [
      "After `/z-spec-init`, `workspace/.zoto/spec-system/config.yml` exists and matches `plugins/zoto-spec-system/templates/init-config.yml` byte-for-byte.",
      "The sole success line names an absolute path whose suffix is `.zoto/spec-system/config.yml`, reminds that defaults remain commented-out until uncommented, and names `plugins/zoto-spec-system/docs/config-schema.md` for fuller reference.",
      "The process exits with status zero without invoking `/z-spec-create`, `/z-spec-execute`, or `/z-spec-judge` during this step."
    ],
    "assertion_patterns": [
      "/z-spec-init",
      "\\.zoto/spec-system/config\\.yml",
      "/z-spec-create"
    ],
    "expected_filesystem": {
      "created": [
        "workspace/.zoto/spec-system/config.yml"
      ]
    },
    "expected_output": "The command exits successfully, creates `.zoto/spec-system/config.yml` at the resolved repository root with the same bytes as `plugins/zoto-spec-system/templates/init-config.yml`, and prints one line that includes an absolute path to that file, notes that defaults stay commented until overrides are uncommented, and cites `plugins/zoto-spec-system/docs/config-schema.md`. No other Spec System slash command should run."
  },
  {
    "id": "existing-config-stops-a-plain-init",
    "prompt": "/z-spec-init",
    "assertions": [
      "The command exits non-zero and surfaces `.zoto/spec-system/config.yml already exists; pass --force to overwrite` without introducing alternate wording that hides `--force`.",
      "The file `workspace/.zoto/spec-system/config.yml` keeps the line `prior: retained` verbatim, confirming no silent overwrite occurred."
    ],
    "assertion_patterns": [
      "\\.zoto/spec-system/config\\.yml already exists; pass --force to overwrite",
      "workspace/\\.zoto/spec-system/config\\.yml"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/spec-system/config.yml",
          "content": "# operator lock\nprior: retained\n"
        }
      ]
    },
    "expected_output": "The command exits with a failure status without touching the on-disk YAML beyond what was already present, and reports that the configuration path already exists and that `--force` is required to replace it."
  },
  {
    "id": "forced-init-replaces-an-older-file",
    "prompt": "/z-spec-init --force",
    "assertions": [
      "After `/z-spec-init --force`, `workspace/.zoto/spec-system/config.yml` equals `plugins/zoto-spec-system/templates/init-config.yml` exactly, removing the seeded `prior: superseded-by-init` marker.",
      "The success line includes the refreshed absolute destination path plus the reminders about commented defaults and the pointer to `plugins/zoto-spec-system/docs/config-schema.md`.",
      "The process exits with status zero despite the earlier file contents."
    ],
    "assertion_patterns": [
      "/z-spec-init --force",
      "plugins/zoto-spec-system/docs/config-schema\\.md"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/spec-system/config.yml",
          "content": "# stale scaffold\nprior: superseded-by-init\n"
        }
      ]
    },
    "expected_output": "The command exits successfully, restores the bundled init-template contents even though a file existed, and repeats the same confirmation pattern as the first-run scenario."
  },
  {
    "id": "broken-install-without-init-template-yields-explicit-path-failure",
    "prompt": "/z-spec-init",
    "assertions": [
      "Exit status is non-zero when the template cannot be read.",
      "Diagnostics include the substring `templates/init-config.yml not found at ` followed by the concrete resolver path Cursor tried.",
      "No partial `.zoto/spec-system/config.yml` is created when the template read fails before writing."
    ],
    "assertion_patterns": [
      "templates/init-config\\.yml not found at ",
      "\\.zoto/spec-system/config\\.yml"
    ],
    "expected_output": "Because `plugins/zoto-spec-system/templates/init-config.yml` is unreadable, the command aborts immediately with non-zero status and prints that `templates/init-config.yml not found at` alongside the filesystem path Cursor attempted."
  }
];
const TARGET_ID = "command:z-spec-init";
const MODEL_ID = process.env.ZOTO_EVAL_MODEL ?? "composer-2";
const JUDGE_MODEL = process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6";
const REPO_ROOT = process.cwd();
const SUITE_START = Date.now();
const API_KEY_PRESENT = Boolean(process.env.CURSOR_API_KEY);

describe("command:z-spec-init", () => {
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
