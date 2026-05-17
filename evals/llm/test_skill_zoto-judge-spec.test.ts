// _meta.generated: true
/**
 * LLM `code`-strategy eval for skill `zoto-judge-spec`.
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
    "id": "repository-wide-judge-run-writes-dated-assessment-under-specsdir",
    "prompt": "We have not singled out one initiative file. Load the zoto-judge-spec skill and run a full repository assessment: survey the tree with an explore subagent, run read-only quality checks that match what is actually in the repo, score all six dimensions with weighted overall, and write the markdown report under the specs directory from .zoto/spec-system/config.yml using the assessment-repo-YYYYMMDD filename pattern.",
    "assertions": [
      "Before dimension scoring, the agent delegates a broad repository survey to an explore subagent.",
      "The agent performs read-only repository inspection suited to the visible stack (workflows, tests, lint config, docs) before scoring.",
      "The written report includes all six dimensions named in the skill with a 1–5 score each and notes, plus an overall weighted score and Approve, Conditional, or Reject verdict.",
      "The report path matches specsDir from .zoto/spec-system/config.yml and uses the assessment-repo-YYYYMMDD naming pattern.",
      "No subtasks from any spec are executed and no application source, configuration, or test files are modified during the assessment.",
      "The findings are substantive: for any dimension scored below 4, the issues table cites concrete gaps tied to observed repository facts rather than generic praise.",
      "The assistant recommends running this judge workflow in a fresh agent context when it explains how to avoid biased reuse of earlier session details."
    ],
    "assertion_patterns": [],
    "expected_output": "A dated markdown report under the configured specs directory lists all six dimensions with numeric scores, a weighted overall score, verdict label aligned to the documented thresholds, strengths, an issues table with severities, dependency-graph commentary, and a risk summary table."
  },
  {
    "id": "targeted-spec-assessment-validates-manifest-subtasks-graph-and-risks",
    "prompt": "Load zoto-judge-spec and assess only the auth-login initiative whose spec lives at workspace/specs/auth-login relative to the sandbox. Read the index and every subtask, spawn explore to confirm referenced paths, score all dimensions for that initiative, audit the Subtask Manifest rows against files and metadata, run the subtask-quality checklist, compare the mermaid dependency block to the manifest, document blocking and integration risks, then write assessment-auth-login-YYYYMMDD.md beside the spec files without changing any spec content before the assessment is complete.",
    "assertions": [
      "The agent reads the spec index and all subtask bodies before spawning explore for path verification.",
      "An explore subagent run confirms referenced spec paths and repository assumptions before final scores.",
      "Each manifest row is checked against a file that exists and against metadata fields such as dependencies, phase, and subagent assignment without inverted ID dependencies.",
      "Each subtask file is reviewed for single objective, concrete deliverables, dependency correctness, implementation guidance, and testing plans where relevant.",
      "The mermaid dependency diagram is compared to manifest edges and missing or over-serialized edges are called out if present.",
      "The report includes a risk summary distinguishing blocking, scope, integration, and convention risks when applicable.",
      "The output file is workspace/specs/auth-login/assessment-auth-login-YYYYMMDD.md and prior to finishing the assessment the agent does not edit spec-index.md or subtask markdown.",
      "Application source, configuration, and tests outside the spec markdown set remain untouched for the whole case."
    ],
    "assertion_patterns": [],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/spec-system/config.yml",
          "content": "specsDir: specs\n"
        },
        {
          "path": "workspace/specs/auth-login/spec-index.md",
          "content": "# Auth Login Initiative\n\n## Subtask Manifest\n\n| ID | File | Phase | Dependencies | Subagent |\n|----|------|-------|--------------|----------|\n| 01 | subtask-01.md | 1 | — | implementer |\n| 02 | subtask-02.md | 2 | 01 | implementer |\n\n## Dependency graph\n\n```mermaid\ngraph TD\n  T01[T01] --> T02[T02]\n```\n"
        },
        {
          "path": "workspace/specs/auth-login/subtask-01.md",
          "content": "# Subtask 01\n\n## Metadata\n- Phase: 1\n- Dependencies: none\n- Subagent: implementer\n\n## Objective\nIntroduce password-backed login flow.\n\n## Deliverables\n- [ ] Handler implementation with validation\n- [ ] Automated tests covering failure and success paths\n\n## Testing strategy\nRun the project test suite target that covers the new handler.\n"
        },
        {
          "path": "workspace/specs/auth-login/subtask-02.md",
          "content": "# Subtask 02\n\n## Metadata\n- Phase: 2\n- Dependencies: 01\n- Subagent: implementer\n\n## Objective\nWire login UI to the handler from subtask 01.\n\n## Deliverables\n- [ ] Screen flows for sign-in and error states\n\n## Implementation notes\nReuse existing routing conventions from the app shell.\n"
        }
      ]
    },
    "expected_output": "The dated assessment file sits in workspace/specs/auth-login, reports scores for all six dimensions with weighted overall, includes manifest and graph findings, per-subtask quality observations, a risk summary table, and conditional remediation rows."
  },
  {
    "id": "post-report-offer-and-approved-spec-only-remediation",
    "prompt": "Using zoto-judge-spec, assess workspace/specs/auth-login end-to-end and produce the assessment markdown in that directory.",
    "follow_ups": [
      "Yes — apply only the remediations you listed to the spec index and subtask markdown, update the assessment to note what you changed, then give the short bullet summary of touched files."
    ],
    "assertions": [
      "After the report is written the assistant shows the Assessment Complete summary with verdict, weighted score, actionable findings table, and asks whether to apply spec-file fixes.",
      "The user is not asked to approve edits until after that assessment table appears.",
      "Once the user answers affirmatively, changes are limited to spec-index.md, subtask markdown, and the assessment markdown notes; no application directories receive edits.",
      "Manifest, metadata, and mermaid adjustments stay aligned when dependencies or phases change.",
      "The follow-up message lists each modified spec-relative path and states how many fixes were applied.",
      "No subtask execution or production code changes occur in either turn."
    ],
    "assertion_patterns": [],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/spec-system/config.yml",
          "content": "specsDir: specs\n"
        },
        {
          "path": "workspace/specs/auth-login/spec-index.md",
          "content": "# Auth Login Initiative\n\n## Subtask Manifest\n\n| ID | File | Phase | Dependencies | Subagent |\n|----|------|-------|--------------|----------|\n| 01 | subtask-01.md | 1 | — | implementer |\n| 02 | subtask-02.md | 2 | 01 | implementer |\n\n## Dependency graph\n\n```mermaid\ngraph TD\n  T01[T01] --> T02[T02]\n```\n"
        },
        {
          "path": "workspace/specs/auth-login/subtask-01.md",
          "content": "# Subtask 01\n\n## Metadata\n- Phase: 1\n- Dependencies: none\n- Subagent: implementer\n\n## Objective\nIntroduce password-backed login flow.\n\n## Deliverables\n- [ ] Handler implementation with validation\n- [ ] Automated tests covering failure and success paths\n\n## Testing strategy\nRun the project test suite target that covers the new handler.\n"
        },
        {
          "path": "workspace/specs/auth-login/subtask-02.md",
          "content": "# Subtask 02\n\n## Metadata\n- Phase: 2\n- Dependencies: 01\n- Subagent: implementer\n\n## Objective\nWire login UI to the handler from subtask 01.\n\n## Deliverables\n- [ ] Screen flows for sign-in and error states\n\n## Implementation notes\nReuse existing routing conventions from the app shell.\n"
        }
      ]
    },
    "expected_output": "After the first turn, the assistant presents an Assessment Complete block with verdict, weighted score, a numbered findings table including Severity, Subtask, and Fix columns, and an explicit yes-or-no repair question. After approval, only spec markdown changes occur, the assessment file documents applied fixes, and the closing message enumerates modified spec paths."
  },
  {
    "id": "operator-refuses-automated-spec-repairs-after-assessment",
    "prompt": "Follow zoto-judge-spec for the auth-login initiative at workspace/specs/auth-login and write the assessment file there.",
    "follow_ups": [
      "No — do not modify spec-index.md or any subtask files; I will handle fixes manually."
    ],
    "assertions": [
      "The assistant still delivers the Assessment Complete offer with the findings table before reacting to the refusal.",
      "After the user declines, spec-index.md and every subtask markdown under workspace/specs/auth-login are byte-identical to the pre-assessment fixture text.",
      "The assistant does not silently alter the assessment markdown to imply fixes were applied.",
      "After the refusal, no further filesystem edits touch application packages, build configs, or test harnesses outside the spec markdown set."
    ],
    "assertion_patterns": [],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/spec-system/config.yml",
          "content": "specsDir: specs\n"
        },
        {
          "path": "workspace/specs/auth-login/spec-index.md",
          "content": "# Auth Login Initiative\n\n## Subtask Manifest\n\n| ID | File | Phase | Dependencies | Subagent |\n|----|------|-------|--------------|----------|\n| 01 | subtask-01.md | 1 | — | implementer |\n| 02 | subtask-02.md | 2 | 01 | implementer |\n\n## Dependency graph\n\n```mermaid\ngraph TD\n  T01[T01] --> T02[T02]\n```\n"
        },
        {
          "path": "workspace/specs/auth-login/subtask-01.md",
          "content": "# Subtask 01\n\n## Metadata\n- Phase: 1\n- Dependencies: none\n- Subagent: implementer\n\n## Objective\nIntroduce password-backed login flow.\n\n## Deliverables\n- [ ] Handler implementation with validation\n- [ ] Automated tests covering failure and success paths\n\n## Testing strategy\nRun the project test suite target that covers the new handler.\n"
        },
        {
          "path": "workspace/specs/auth-login/subtask-02.md",
          "content": "# Subtask 02\n\n## Metadata\n- Phase: 2\n- Dependencies: 01\n- Subagent: implementer\n\n## Objective\nWire login UI to the handler from subtask 01.\n\n## Deliverables\n- [ ] Screen flows for sign-in and error states\n\n## Implementation notes\nReuse existing routing conventions from the app shell.\n"
        }
      ]
    },
    "expected_output": "The assessment markdown exists under workspace/specs/auth-login with full scoring tables and findings. After the refusal, spec-index.md and subtask files retain their pre-assessment contents while the assistant may restate manual next steps."
  }
];
const TARGET_ID = "skill:zoto-judge-spec";
const MODEL_ID = process.env.ZOTO_EVAL_MODEL ?? "composer-2";
const JUDGE_MODEL = process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6";
const REPO_ROOT = process.cwd();
const SUITE_START = Date.now();
const API_KEY_PRESENT = Boolean(process.env.CURSOR_API_KEY);

describe("skill:zoto-judge-spec", () => {
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
