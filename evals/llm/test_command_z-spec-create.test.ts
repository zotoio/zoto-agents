// _meta.generated: true
/**
 * LLM `code`-strategy eval for command `z-spec-create`.
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
    "id": "abort-when-spec-system-configuration-is-missing",
    "prompt": "/z-spec-create",
    "assertions": [
      "After `/z-spec-create`, the visible assistant output MUST present the exact abort text requiring `/z-spec-init` and `.zoto/spec-system/config.yml` without fabricating a default config.",
      "After `/z-spec-create`, no new dated feature directory MUST appear under `specs/` on disk."
    ],
    "assertion_patterns": [
      "/z-spec-create",
      "/z-spec-create"
    ],
    "expected_output": "The assistant refuses immediately, prints the mandated initialisation message, and does not spawn the generator or write specs."
  },
  {
    "id": "guided-creation-with-no-file-or-description-arguments",
    "prompt": "/z-spec-create",
    "assertions": [
      "After `/z-spec-create`, the manifest or transcript MUST show a `zoto-spec-generator` delegation carrying an empty argument list consistent with the no-argument mode.",
      "After `/z-spec-create`, clarifying user prompts MUST appear before any write creating `{specsDir}/[yyyymmdd]-[feature-name]/spec-[feature-name]-[yyyymmdd].md`.",
      "After `/z-spec-create`, the new spec tree MUST include at least one `subtask-NN-` markdown file beside the coordination index inside the dated directory."
    ],
    "assertion_patterns": [
      "/z-spec-create",
      "/z-spec-create",
      "/z-spec-create"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/spec-system/config.yml",
          "content": "specsDir: specs\n"
        }
      ]
    },
    "expected_output": "The assistant routes work through the generator skill path, asks scope questions before locking filenames, and only then drafts the coordination index and subtasks under a new dated folder beneath the configured specs directory."
  },
  {
    "id": "creation-seeded-from-an-attached-design-document-path",
    "prompt": "/z-spec-create @workspace/docs/northstar-brief.md",
    "assertions": [
      "After `/z-spec-create @workspace/docs/northstar-brief.md`, tool activity MUST show the generator read `workspace/docs/northstar-brief.md` before drafting subtasks.",
      "After `/z-spec-create @workspace/docs/northstar-brief.md`, the filesystem MUST contain `{specsDir}/[yyyymmdd]-[feature-name]/spec-[feature-name]-[yyyymmdd].md` and at least one `subtask-NN-[feature]-[name]-[yyyymmdd].md` sibling following the documented naming pattern."
    ],
    "assertion_patterns": [
      "/z-spec-create @workspace/docs/northstar-brief\\.md",
      "/z-spec-create @workspace/docs/northstar-brief\\.md"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/spec-system/config.yml",
          "content": "specsDir: specs\n"
        },
        {
          "path": "workspace/docs/northstar-brief.md",
          "content": "# Northstar brief\n\nDeliver resumable batch export with integrity verification for large workspaces. Non-goals: interactive preview in the first release.\n"
        }
      ]
    },
    "expected_output": "The assistant ingests the brief, aligns phases to its constraints, and materialises a dated specs folder with a coordination file plus numbered subtasks that reference those requirements."
  },
  {
    "id": "creation-driven-by-a-quoted-feature-description",
    "prompt": "/z-spec-create \"Add resilient offline queueing to the ingestion worker\"",
    "assertions": [
      "After `/z-spec-create`, the spawned generator payload MUST preserve the provided quoted description as the scope input rather than substituting an unrelated initiative title before discovery completes.",
      "After `/z-spec-create`, created markdown filenames under the dated directory MUST embed a slug derived from the ingestion worker scope together with the same calendar date stamp used in the parent folder name."
    ],
    "assertion_patterns": [
      "/z-spec-create",
      "/z-spec-create"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/spec-system/config.yml",
          "content": "specsDir: specs\n"
        }
      ]
    },
    "expected_output": "The assistant forwards the quoted initiative text into the generator, derives a slug and date-structured folder, and writes matching coordination and subtask files that stay anchored to that scope."
  },
  {
    "id": "status-scaffolding-review-summary-judge-spawn-and-ready-for-review",
    "prompt": "/z-spec-create",
    "follow_ups": [
      "Approve the printed spec summary and run the quality gate now."
    ],
    "assertions": [
      "Before calling the spec complete, the transcript MUST record `pnpm run spec-status-roundtrip -- scaffold` (or a direct invocation producing the same paired artifacts) creating matching `.status.md` and `.status.yml` files under the dated `status/` directory for each subtask.",
      "After the approval follow-up, the manifest MUST note a `zoto-spec-judge` engagement and the spec status MUST read Ready for Review in the written status artifacts."
    ],
    "assertion_patterns": [
      "pnpm run spec-status-roundtrip -- scaffold",
      "zoto-spec-judge"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/spec-system/config.yml",
          "content": "specsDir: specs\n"
        }
      ]
    },
    "expected_output": "The assistant finishes drafting, runs the status round-trip scaffolder, presents a review summary, honours approval, brings in the judge agent, and marks the bundle Ready for Review."
  }
];
const TARGET_ID = "command:z-spec-create";
const MODEL_ID = process.env.ZOTO_EVAL_MODEL ?? "composer-2";
const JUDGE_MODEL = process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6";
const REPO_ROOT = process.cwd();
const SUITE_START = Date.now();
const API_KEY_PRESENT = Boolean(process.env.CURSOR_API_KEY);

describe("command:z-spec-create", () => {
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
