// _meta.generated: true
/**
 * LLM `code`-strategy eval for command `z-eval-help`.
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
    "id": "abort-when-eval-system-config-missing",
    "prompt": "/z-eval-help configuration",
    "assertions": [
      "after `/z-eval-help`, the run surfaces the exact abort sentence from the command precondition and does not call the zoto-help-evals skill",
      "no `start:end:` README citation block appears because the command stopped before composing a tailored answer"
    ],
    "assertion_patterns": [
      "/z-eval-help",
      "start:end:"
    ],
    "expected_output": "A single error line stating that Eval System is not initialised and naming `/z-eval-init` plus the expected config path, with no skill invocation and no tailored help body."
  },
  {
    "id": "section-chooser-when-topic-omitted",
    "prompt": "/z-eval-help",
    "follow_ups": [
      "2"
    ],
    "assertions": [
      "after `/z-eval-help` with no arguments, the command emits askQuestion whose options correspond to the enumerated `##` sections from `plugins/zoto-eval-system/README.md`",
      "before invoking zoto-help-evals, the command constructs `help_context` with `selected_section` matching the operator choice",
      "after the follow-up selection, the final answer includes at least one `start:end:plugins/zoto-eval-system/README.md` citation covering quoted README lines",
      "the zoto-help-evals skill did not emit askQuestion; any prompts came from the command owner"
    ],
    "assertion_patterns": [
      "/z-eval-help",
      "help_context",
      "start:end:plugins/zoto-eval-system/README\\.md"
    ],
    "expected_output": "First turn shows askQuestion listing numbered README sections derived from `plugins/zoto-eval-system/README.md` headings; after the operator picks an option, the zoto-help-evals skill returns prose grounded in that section with citations."
  },
  {
    "id": "direct-topic-without-extra-section-menu",
    "prompt": "/z-eval-help Quick start",
    "assertions": [
      "after `/z-eval-help Quick start`, the tailored prose names at least one project-specific datum drawn from `.zoto/eval-system/config.yml`, `manifest.yml`, `package.json` scripts, or `evals/_runs/` when that artefact is present in the workspace",
      "the answer cites `plugins/zoto-eval-system/README.md` using `start:end:plugins/zoto-eval-system/README.md` for any quoted README excerpt",
      "the command did not present the numbered full-section menu solely because a single `## Quick start` header uniquely matched the topic",
      "observable behaviour shows zoto-help-evals ran without introducing its own askQuestion calls"
    ],
    "assertion_patterns": [
      "/z-eval-help Quick start",
      "plugins/zoto-eval-system/README\\.md",
      "## Quick start"
    ],
    "expected_output": "The host agent invokes zoto-help-evals with help_context anchored on the Quick start section and returns operator-facing prose that weaves in values read from this workspace plus README citations."
  },
  {
    "id": "disambiguate-topic-matching-multiple-headings",
    "prompt": "/z-eval-help eval",
    "follow_ups": [
      "Pick the Overview heading"
    ],
    "assertions": [
      "after `/z-eval-help eval`, the command emits askQuestion that resolves ambiguity across multiple `##` headers before a final tailored answer is returned",
      "the resumed help_context carries `selected_section` from the clarification answer",
      "the final response includes README citations in `start:end:plugins/zoto-eval-system/README.md` form and incorporates values read from `.zoto/eval-system/config.yml` and other inspected project files rather than generic defaults"
    ],
    "assertion_patterns": [
      "/z-eval-help eval",
      "selected_section",
      "start:end:plugins/zoto-eval-system/README\\.md"
    ],
    "expected_output": "First turn asks which README section to use because several headings overlap the token; after the operator names a section, the skill answers with tailored prose and citations."
  },
  {
    "id": "resume-after-skill-needs-user-input",
    "prompt": "/z-eval-help Overview",
    "follow_ups": [
      "I mean compare two runs side by side"
    ],
    "assertions": [
      "when the skill first returns needs_user_input, the command runs askQuestion before calling zoto-help-evals again with completed fields in help_context",
      "after `/z-eval-help Overview` and the free-form follow-up turn, the final assistant text still honours the citation contract for `plugins/zoto-eval-system/README.md`",
      "the free-form follow-up text is captured on help_context as `user_question` per the documented skill contract"
    ],
    "assertion_patterns": [
      "/z-eval-help Overview",
      "user_question"
    ],
    "expected_output": "When zoto-help-evals returns needs_user_input, the command issues askQuestion to capture the missing detail, then re-invokes the skill with an updated help_context until a final narrative answer is returned."
  },
  {
    "id": "post-answer-navigation-prompt",
    "prompt": "/z-eval-help Configuration",
    "follow_ups": [
      "Jump to the File layout and run outputs section"
    ],
    "assertions": [
      "after the first skill result for Configuration, the command optionally emits askQuestion that offers navigating to another README section versus finishing",
      "after the operator requests another section, zoto-help-evals runs again with `selected_section` updated to the new heading",
      "each delivered section answer cites the README with `start:end:plugins/zoto-eval-system/README.md` and keeps tailoring tied to on-disk config and run artefacts"
    ],
    "assertion_patterns": [
      "selected_section",
      "start:end:plugins/zoto-eval-system/README\\.md"
    ],
    "expected_output": "After the first tailored answer, the command may offer askQuestion for staying or jumping to another README section; choosing another section triggers a second zoto-help-evals call with revised help_context."
  }
];
const TARGET_ID = "command:z-eval-help";
const MODEL_ID = process.env.ZOTO_EVAL_MODEL ?? "composer-2";
const JUDGE_MODEL = process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6";
const REPO_ROOT = process.cwd();
const SUITE_START = Date.now();
const API_KEY_PRESENT = Boolean(process.env.CURSOR_API_KEY);

describe("command:z-eval-help", () => {
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
