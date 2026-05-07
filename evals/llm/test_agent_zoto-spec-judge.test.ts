// _meta.generated: true
/**
 * LLM `code`-strategy eval for agent `zoto-spec-judge`.
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
    "id": "mode-1-verified-subtask-after-spec-execute",
    "prompt": "zoto-spec-executor invoked you after subtask 02 closed: read specs/active-feature/subtasks/subtask-02-auth-flow-20260507.md together with specs/active-feature/status/subtask-02-auth-flow-20260507.status.yml, reconcile checklist.done against the workspace, merge extra.judge with verdict verified and an empty fix_list after independent filesystem checks, re-render the paired status markdown using spec-status-roundtrip md-from-yml only, run spec-onstop-check.ts --human for that spec directory and repo root, then report verified back to the executor.",
    "assertions": [
      "After reconciliation, every checklist item marked done in specs/active-feature/status/subtask-02-auth-flow-20260507.status.yml matches evidence found on disk from the Deliverables Checklist and Definition of Done sections.",
      "The agent merged verdict notes and extra.judge.fix_list into specs/active-feature/status/subtask-02-auth-flow-20260507.status.yml and regenerated specs/active-feature/status/subtask-02-auth-flow-20260507.status.md via spec-status-roundtrip md-from-yml rather than hand-editing markdown.",
      "The agent ran plugins/zoto-spec-system/scripts/spec-onstop-check.ts with --human before claiming verified and did not report verified if that process exited with status 2.",
      "No writes occurred outside specs/active-feature/status/ for the subtask pair, and no tools attempted to modify the subtask markdown spec file or any deliverable paths referenced by the checklist."
    ],
    "assertion_patterns": [],
    "expected_output": "Only the subtask status YAML and its round-trip markdown change; extra.judge records verified with empty fix_list; spec-onstop-check exits zero; no edits land on application sources, tests, the subtask markdown spec, the spec index Status column, execution report, or spec-root status files."
  },
  {
    "id": "mode-1-partial-verdict-routes-fix-list-to-subagent",
    "prompt": "Executor handed you subtask 04: specs/active-feature/subtasks/subtask-04-rate-limit-20260507.md plus specs/active-feature/status/subtask-04-rate-limit-20260507.status.yml shows checklist items marked done but the throttle helper file is missing. Stay within Mode 1 reviewer constraints, downgrade reconciliation so unverified items remain false, populate extra.judge with verdict partial, timestamp, notes, and a fix_list entry whose recommended_path names the missing module without editing that path yourself, round-trip the status markdown from YAML, run spec-onstop-check.ts --human, then return partial to the executor.",
    "assertions": [
      "extra.judge.verdict is partial (not verified) while any Deliverables Checklist or Definition of Done item lacks proof, and fix_list entries describe concrete gaps with severity and recommended_path suitable for executor routing.",
      "The agent never patched application code, configs, tests, documentation deliverables, or the subtask markdown spec to remediate the gap — only the status pair files were written.",
      "spec-status-roundtrip md-from-yml was used after YAML edits so markdown mirrors YAML rather than diverging.",
      "If spec-onstop-check exits 2 because verdict or state contradicts open checklist items, the reported verdict and notes acknowledge partial or failed rather than insisting on verified."
    ],
    "assertion_patterns": [],
    "expected_output": "Status YAML shows checklist.done false for items lacking proof; extra.judge.verdict is partial with at least one structured fix_list row carrying severity and recommended_path for routing to the originally assigned subagent; round-trip keeps YAML canonical; onStop reflects the inconsistency if state or verdict disagrees with open items."
  },
  {
    "id": "mode-2-repo-assessment-via-z-spec-judge",
    "prompt": "Run /z-spec-judge with no arguments after loading .zoto/spec-system/config.yml so specsDir resolves correctly. Use the zoto-judge-spec skill to examine the repository structure, perform read-only stack-specific sanity checks, score Completeness Feasibility Structure Specificity Risk Awareness and Convention Compliance, choose an Approve Conditional or Reject verdict using the documented thresholds, and write specs/assessment-repo-20260507.md with those scores and rationale.",
    "assertions": [
      "The agent invoked /z-spec-judge without a trailing spec path and relied on zoto-judge-spec workflow steps covering breadth of the tree plus tailored read-only checks.",
      "The written report includes scores for Completeness, Feasibility, Structure, Specificity, Risk Awareness, and Convention Compliance even when dimensions look healthy.",
      "Filesystem mutations are limited to the assessment markdown under specsDir; no edits touched subtask deliverables or unrelated configuration.",
      "The qualitative verdict (Approve at least 4.0 average, Conditional between 3.0 and 3.9, Reject below 3.0) aligns with the numeric averages stated in the report."
    ],
    "assertion_patterns": [],
    "expected_output": "A repo assessment markdown appears under the configured specs directory using the assessment-repo naming convention with the run date embedded in the filename, listing numeric scores for all six dimensions plus rationale tied to the documented verdict thresholds, without mutating application sources beyond that report."
  },
  {
    "id": "mode-3-spec-assessment-and-user-gated-spec-fixes",
    "prompt": "Run /z-spec-judge targeting specs/active-feature/spec-payment-hooks-20260507.md: load the spec index and subtasks, validate manifest dependencies using zoto-judge-spec, score all six dimensions, write specs/active-feature/assessment-payment-hooks-20260507.md capturing unbiased findings first, then surface actionable recommendations and explicitly ask whether I want spec markdown edits applied.",
    "follow_ups": [
      "Yes — apply the approved wording tweaks only to the spec index and subtask markdown files you identified; skip application code entirely and annotate the assessment report with what changed.",
      "No — leave every spec file byte-for-byte unchanged after publishing the assessment."
    ],
    "assertions": [
      "The agent produced specs/active-feature/assessment-payment-hooks-20260507.md inside the spec directory with complete scoring, manifest review, and dependency commentary prior to offering edits.",
      "Until the user explicitly approves changes, the agent did not modify spec index files, subtask markdown specs, or dependency graph artifacts.",
      "After explicit approval in the follow-up turn, updates touched only spec-facing markdown described in the plan and never altered application sources, configs, or tests owned by subagents.",
      "When the user declines fixes in the follow-up turn, spec documents remained unchanged while the assessment still documents findings and verdict thresholds."
    ],
    "assertion_patterns": [],
    "expected_output": "Before any approval message, the assessment markdown exists with full six-dimension scoring and risk discussion without premature spec edits; after approval the agent may revise only spec-level documents noted in the plan while leaving runtime code alone; after refusal only the assessment file reflects recommendations."
  }
];
const TARGET_ID = "agent:zoto-spec-judge";
const MODEL_ID = process.env.ZOTO_EVAL_MODEL ?? "composer-2";
const JUDGE_MODEL = process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6";
const REPO_ROOT = process.cwd();
const SUITE_START = Date.now();
const API_KEY_PRESENT = Boolean(process.env.CURSOR_API_KEY);

describe("agent:zoto-spec-judge", () => {
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
