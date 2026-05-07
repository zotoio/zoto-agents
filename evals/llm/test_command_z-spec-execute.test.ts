// _meta.generated: true
/**
 * LLM `code`-strategy eval for command `z-spec-execute`.
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
    "id": "refuses-before-any-work-when-spec-system-config-is-missing",
    "prompt": "/z-spec-execute",
    "assertions": [
      "The assistant output contains the exact text: Spec System is not initialised. Run `/z-spec-init` first to create `.zoto/spec-system/config.yml`.",
      "After `/z-spec-execute`, no execution-report markdown is created under any spec directory and no zoto-spec-executor delegation is described as running."
    ],
    "assertion_patterns": [
      "/z-spec-init",
      "/z-spec-execute"
    ],
    "expected_output": "A refusal that quotes the required initialisation message and does not start an executor run."
  },
  {
    "id": "default-invocation-selects-the-newest-spec-directory-under-specsdir",
    "prompt": "/z-spec-execute",
    "assertions": [
      "After `/z-spec-execute` with no extra tokens, the plan identifies a single spec directory under the configured specsDir by latest modification time.",
      "The assistant states it will spawn `zoto-spec-executor` and rely on the `zoto-execute-spec` skill, passing through an empty argument tail."
    ],
    "assertion_patterns": [
      "/z-spec-execute",
      "zoto-spec-executor"
    ],
    "expected_output": "The run targets the most recently modified spec tree, validates its manifest, and proceeds toward confirmation only if `.zoto/spec-system/config.yml` is present."
  },
  {
    "id": "directory-argument-resolves-the-spec-index-without-a-direct-file-path",
    "prompt": "/z-spec-execute specs/20260403-network-retries",
    "assertions": [
      "After `/z-spec-execute specs/20260403-network-retries`, the assistant loads the spec index under that directory and validates manifest entries (files exist, agent names match metadata, dependencies are ordered).",
      "The assistant presents phases, subtask counts, and per-subtask agent assignments from the manifest, then pauses for operator approval before any execution subagents run."
    ],
    "assertion_patterns": [
      "/z-spec-execute specs/20260403-network-retries"
    ],
    "expected_output": "The executor resolves `spec-*.md` inside that directory, validates the manifest structure, and prepares a phase and subtask summary for approval."
  },
  {
    "id": "index-file-path-is-executed-directly-when-provided",
    "prompt": "/z-spec-execute specs/20260403-network-retries/spec-network-retries-20260403.md",
    "assertions": [
      "After `/z-spec-execute` with a path ending in `.md` under the spec directory, the assistant treats that file as the spec index rather than searching for another `spec-*.md` name.",
      "The manifest validation and pre-flight execution summary still occur before subagents begin work."
    ],
    "assertion_patterns": [
      "/z-spec-execute"
    ],
    "expected_output": "Execution uses that markdown file as the spec index and follows the same validation and approval pattern as directory-based runs."
  },
  {
    "id": "resume-flag-continues-from-the-first-incomplete-subtask",
    "prompt": "/z-spec-execute --resume",
    "assertions": [
      "After `/z-spec-execute --resume`, the assistant explains it will read checklist and manifest state to find completed subtasks.",
      "The plan does not reorder dependencies and avoids restarting subtasks already marked complete in the stored manifest."
    ],
    "assertion_patterns": [
      "/z-spec-execute --resume"
    ],
    "expected_output": "The executor reads persisted progress from the spec index manifest, skips finished subtasks, and schedules only remaining work."
  },
  {
    "id": "phased-dispatch-honours-manifest-agents-parallel-cap-and-judge-gate",
    "prompt": "/z-spec-execute specs/20260403-network-retries",
    "follow_ups": [
      "Approve the execution summary — run the manifest as listed."
    ],
    "assertions": [
      "After approval, subagents spawned per subtask match the manifest agent field with no alternate agent substitution.",
      "The assistant states that no more than four subagents run concurrently within a batch and that the next phase waits until the prior phase fully finishes.",
      "After each subtask finishes, the assistant schedules or describes a fresh `zoto-spec-judge` pass that audits Deliverables Checklist and Definition of Done items separately from the executor agent."
    ],
    "assertion_patterns": [
      "zoto-spec-judge"
    ],
    "expected_output": "Phases run serially while up to four subagents from the manifest run in parallel inside a phase; each finished subtask gets an independent zoto-spec-judge verification pass before the phase closes."
  },
  {
    "id": "final-checks-write-execution-report-then-require-approval-to-mark-completed",
    "prompt": "/z-spec-execute specs/20260403-network-retries",
    "follow_ups": [
      "All subtasks and judge results are green — run the final test suite and lint pass now.",
      "I approve the execution report — mark the spec Completed."
    ],
    "assertions": [
      "After all subtasks verify, the assistant runs the project test suite and linter checks focused on touched files before declaring the run done.",
      "A durable `execution-report-` markdown file appears under the same spec directory as the index and records per-subtask outcomes, verification results, test status, lint status, and changed files.",
      "The assistant surfaces that report for review and only marks the spec Completed after explicit user approval of the final summary."
    ],
    "assertion_patterns": [
      "execution-report-"
    ],
    "expected_output": "After judges succeed, tests and lint run once globally; an `execution-report-*-*.md` file lands beside the spec index; the assistant shows it and only then updates status to Completed when the operator agrees."
  },
  {
    "id": "failure-or-failed-judge-outcome-stops-with-retry-skip-abort-choice",
    "prompt": "/z-spec-execute specs/20260403-network-retries",
    "follow_ups": [
      "A subtask failed verification with judge outcome Failed — how should we proceed?"
    ],
    "assertions": [
      "When a subtask or `zoto-spec-judge` result is Failed, the assistant stops forward progress and asks the operator to choose retry, skip, or abort.",
      "The assistant does not mark the spec Completed or write a final success-only report while that Failed branch remains unresolved."
    ],
    "assertion_patterns": [
      "zoto-spec-judge"
    ],
    "expected_output": "The run halts escalation until the operator picks retry, skip, or abort; no silent continuation past a Failed gate."
  },
  {
    "id": "aggregator-watches-digest-live-reload-keys-apply-on-next-spawn",
    "prompt": "/z-spec-execute specs/20260403-network-retries",
    "follow_ups": [
      "During the run, keep spec-root `status.md` and `status.yml` updated from subagent status digests."
    ],
    "assertions": [
      "For an active execution, the assistant describes running `pnpm --filter @zoto-agents/zoto-spec-system exec tsx scripts/spec-aggregator.ts --watch` (or the documented watch mode) for the spec lifetime so spec-root `status.md` and `status.yml` rebuild when digests change.",
      "The assistant notes that `subagents.*.tokenBudget`, `subagents.*.model`, `aggregator.pollIntervalMs`, `aggregator.debounceMs`, `aggregator.enabled`, and `spec.parallelLimit` reload after the next spawn or aggregator tick without restarting the whole executor.",
      "The assistant states that `specsDir`, `unitOfWork`, `workDir`, `hooks.*`, and `extensions.*` changes only apply after a fresh `/z-spec-execute` invocation, not mid-run."
    ],
    "assertion_patterns": [
      "pnpm --filter @zoto-agents/zoto-spec-system exec tsx scripts/spec-aggregator\\.ts --watch",
      "subagents\\.\\*\\.tokenBudget",
      "specsDir"
    ],
    "expected_output": "A long-running aggregator command keeps spec-root status files synchronized, and config edits for token budgets apply on subsequent spawns while specsDir edits still need a brand-new command invocation."
  }
];
const TARGET_ID = "command:z-spec-execute";
const MODEL_ID = process.env.ZOTO_EVAL_MODEL ?? "composer-2";
const JUDGE_MODEL = process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6";
const REPO_ROOT = process.cwd();
const SUITE_START = Date.now();
const API_KEY_PRESENT = Boolean(process.env.CURSOR_API_KEY);

describe("command:z-spec-execute", () => {
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
