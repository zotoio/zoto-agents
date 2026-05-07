// _meta.generated: true
/**
 * LLM `code`-strategy eval for command `z-spec-judge`.
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
    "id": "abort-when-spec-system-config-is-absent",
    "prompt": "/z-spec-judge",
    "assertions": [
      "After `/z-spec-judge`, the assistant output contains the exact text: Spec System is not initialised. Run `/z-spec-init` first to create `.zoto/spec-system/config.yml`.",
      "After `/z-spec-judge`, no new `specs/assessment-repo-*.md` file appears and no file matching `specs/*/assessment-*-*.md` is created."
    ],
    "assertion_patterns": [
      "/z-spec-judge",
      "/z-spec-judge"
    ],
    "expected_output": "The run stops before delegation, prints the initialisation error, and leaves specs without a new assessment report."
  },
  {
    "id": "repo-wide-assessment-writes-rubric-backed-report-under-specsdir",
    "prompt": "/z-spec-judge",
    "assertions": [
      "After `/z-spec-judge`, the visible transcript records handing the work to `zoto-spec-judge` with an empty argument list before publishing scores.",
      "After `/z-spec-judge`, a Markdown file matching `specs/assessment-repo-*.md` exists and its sections discuss completeness, feasibility, structure, specificity, risk awareness, and convention compliance of the repository.",
      "That repository assessment names a numeric score and assigns Approve only at 4.0 or above, Conditional between 3.0 and 3.9 inclusive, or Reject below 3.0, consistent with the command table.",
      "After `/z-spec-judge`, the delegated flow references the `zoto-judge-spec` skill name in operator-visible output before the report is finalized."
    ],
    "assertion_patterns": [
      "/z-spec-judge",
      "/z-spec-judge",
      "/z-spec-judge"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/spec-system/config.yml",
          "from": "plugins/zoto-spec-system/templates/init-config.yml"
        }
      ]
    },
    "expected_output": "With Spec System initialised, the command delegates to `zoto-spec-judge`, produces a dated repository health report under `specs/`, and states a score with Approve, Conditional, or Reject per the documented cutoffs."
  },
  {
    "id": "directory-argument-auto-finds-index-and-audits-spec-depth",
    "prompt": "/z-spec-judge specs/20260403-circuit-breaker-api",
    "assertions": [
      "After `/z-spec-judge specs/20260403-circuit-breaker-api`, the transcript shows the spawned `zoto-spec-judge` subagent receives that directory path in its forwarded arguments.",
      "After `/z-spec-judge specs/20260403-circuit-breaker-api`, a Markdown report matching `specs/20260403-circuit-breaker-api/assessment-circuit-breaker-api-*.md` exists in the spec directory.",
      "That spec assessment narrative explicitly discusses dependency graph integrity and the quality of individual subtasks, not only high-level goals.",
      "Before proposing file-editing tool calls against spec sources, the assistant surfaces an explicit offer to apply recommended corrections limited to spec Markdown (index, subtasks, dependency graph materials)."
    ],
    "assertion_patterns": [
      "/z-spec-judge specs/20260403-circuit-breaker-api",
      "/z-spec-judge specs/20260403-circuit-breaker-api"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/spec-system/config.yml",
          "from": "plugins/zoto-spec-system/templates/init-config.yml"
        },
        {
          "path": "workspace/specs/20260403-circuit-breaker-api/spec-circuit-breaker-api-20260403.md",
          "content": "---\ntitle: Circuit breaker HTTP API\nstatus: draft\n---\n\n# Circuit breaker HTTP API\n\n## Objectives\nDeliver a resilient edge proxy that sheds load when upstream latency spikes.\n\n## Deliverables\n- OpenAPI description for the control plane\n- Contract tests for timeout and half-open behaviour\n\n## Dependency graph\n- subtask-01-circuit-breaker-api-scaffold-20260403.md has no upstream dependencies\n\n## Subtasks\n- [subtask-01-circuit-breaker-api-scaffold-20260403.md](subtask-01-circuit-breaker-api-scaffold-20260403.md)\n"
        },
        {
          "path": "workspace/specs/20260403-circuit-breaker-api/subtask-01-circuit-breaker-api-scaffold-20260403.md",
          "content": "---\ntitle: Scaffold service skeleton\n---\n\n# Scaffold service skeleton\n\n## Objective\nEstablish the module layout and configuration loading path.\n\n## Deliverables\n- Runnable entrypoint\n- Configuration schema\n\n## Agent assignment\nPlatform engineer agent\n"
        }
      ]
    },
    "expected_output": "The judge resolves the directory, ingests the `spec-*.md` index and linked subtasks, evaluates the six dimensions in spec context, audits dependencies and subtask quality, and asks before editing spec Markdown."
  },
  {
    "id": "index-file-argument-targets-one-spec-tree",
    "prompt": "/z-spec-judge specs/20260403-circuit-breaker-api/spec-circuit-breaker-api-20260403.md",
    "assertions": [
      "After `/z-spec-judge specs/20260403-circuit-breaker-api/spec-circuit-breaker-api-20260403.md`, the delegated arguments mention that exact index path ending in `spec-circuit-breaker-api-20260403.md`.",
      "After `/z-spec-judge specs/20260403-circuit-breaker-api/spec-circuit-breaker-api-20260403.md`, the assessment Markdown lands under `specs/20260403-circuit-breaker-api/` alongside the index file."
    ],
    "assertion_patterns": [
      "/z-spec-judge specs/20260403-circuit-breaker-api/spec-circuit-breaker-api-20260403\\.md",
      "/z-spec-judge specs/20260403-circuit-breaker-api/spec-circuit-breaker-api-20260403\\.md"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/spec-system/config.yml",
          "from": "plugins/zoto-spec-system/templates/init-config.yml"
        },
        {
          "path": "workspace/specs/20260403-circuit-breaker-api/spec-circuit-breaker-api-20260403.md",
          "content": "---\ntitle: Circuit breaker HTTP API\nstatus: draft\n---\n\n# Circuit breaker HTTP API\n\n## Objectives\nDeliver a resilient edge proxy that sheds load when upstream latency spikes.\n\n## Deliverables\n- OpenAPI description for the control plane\n- Contract tests for timeout and half-open behaviour\n\n## Dependency graph\n- subtask-01-circuit-breaker-api-scaffold-20260403.md has no upstream dependencies\n\n## Subtasks\n- [subtask-01-circuit-breaker-api-scaffold-20260403.md](subtask-01-circuit-breaker-api-scaffold-20260403.md)\n"
        },
        {
          "path": "workspace/specs/20260403-circuit-breaker-api/subtask-01-circuit-breaker-api-scaffold-20260403.md",
          "content": "---\ntitle: Scaffold service skeleton\n---\n\n# Scaffold service skeleton\n\n## Objective\nEstablish the module layout and configuration loading path.\n\n## Deliverables\n- Runnable entrypoint\n- Configuration schema\n\n## Agent assignment\nPlatform engineer agent\n"
        }
      ]
    },
    "expected_output": "The judge consumes the named index path directly and still writes the assessment beside that spec without requiring a separate directory-only invocation."
  },
  {
    "id": "operator-accepts-spec-only-remediation-after-assessment",
    "prompt": "/z-spec-judge specs/20260403-circuit-breaker-api",
    "follow_ups": [
      "Yes—apply the recommended edits only inside this spec folder’s Markdown and refresh the assessment note afterward."
    ],
    "assertions": [
      "After the follow-up approving work, the recorded file-write operations do not touch paths outside `specs/20260403-circuit-breaker-api/`.",
      "After remediation completes, the assessment Markdown in that directory states which spec edits were applied, satisfying the documented post-fix logging expectation."
    ],
    "assertion_patterns": [
      "specs/20260403-circuit-breaker-api/"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/spec-system/config.yml",
          "from": "plugins/zoto-spec-system/templates/init-config.yml"
        },
        {
          "path": "workspace/specs/20260403-circuit-breaker-api/spec-circuit-breaker-api-20260403.md",
          "content": "---\ntitle: Circuit breaker HTTP API\nstatus: draft\n---\n\n# Circuit breaker HTTP API\n\n## Objectives\nDeliver a resilient edge proxy that sheds load when upstream latency spikes.\n\n## Deliverables\n- OpenAPI description for the control plane\n- Contract tests for timeout and half-open behaviour\n\n## Dependency graph\n- subtask-01-circuit-breaker-api-scaffold-20260403.md has no upstream dependencies\n\n## Subtasks\n- [subtask-01-circuit-breaker-api-scaffold-20260403.md](subtask-01-circuit-breaker-api-scaffold-20260403.md)\n"
        },
        {
          "path": "workspace/specs/20260403-circuit-breaker-api/subtask-01-circuit-breaker-api-scaffold-20260403.md",
          "content": "---\ntitle: Scaffold service skeleton\n---\n\n# Scaffold service skeleton\n\n## Objective\nEstablish the module layout and configuration loading path.\n\n## Deliverables\n- Runnable entrypoint\n- Configuration schema\n\n## Agent assignment\nPlatform engineer agent\n"
        }
      ]
    },
    "expected_output": "Following approval, edits remain confined to spec artefacts in the assessed directory and the assessment report records which corrections were applied, without touching paths outside that spec scope."
  }
];
const TARGET_ID = "command:z-spec-judge";
const MODEL_ID = process.env.ZOTO_EVAL_MODEL ?? "composer-2";
const JUDGE_MODEL = process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6";
const REPO_ROOT = process.cwd();
const SUITE_START = Date.now();
const API_KEY_PRESENT = Boolean(process.env.CURSOR_API_KEY);

describe("command:z-spec-judge", () => {
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
