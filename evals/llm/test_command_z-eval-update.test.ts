// _meta.generated: true
/**
 * LLM `code`-strategy eval for command `z-eval-update`.
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
    "id": "abort-when-eval-system-configuration-file-is-absent",
    "prompt": "/z-eval-update",
    "assertions": [
      "Before any subagent spawn or filesystem mutation, the command MUST surface the exact single-line guidance that Eval System is not initialised and instruct running `/z-eval-init` first to create `.zoto/eval-system/config.yml`.",
      "No regeneration helpers (`regeneratePytest`, `regenerateVitest`, `regenerateJest`, `regenerateLlmCode`, `regenerateLlmDeclarative`) run because execution stops at the precondition gate."
    ],
    "assertion_patterns": [
      "/z-eval-init",
      "regeneratePytest"
    ],
    "expected_output": "The operator sees only the initialisation failure message and no drift summaries or patch proposals."
  },
  {
    "id": "rediscovery-dry-run-without-apply-writes-nothing-pending-confirmation",
    "prompt": "/z-eval-update",
    "assertions": [
      "The flow MUST spawn `zoto-eval-updater` wired to the `zoto-update-evals` skill after confirming `.zoto/eval-system/config.yml` exists.",
      "Running without `--apply` MUST classify deltas against `config.update.criticalChangeRules` but MUST NOT write regenerated files or refresh `.zoto/eval-system/manifest.yml` until the operator accepts changes through `askQuestion`."
    ],
    "assertion_patterns": [
      "zoto-eval-updater",
      "--apply"
    ],
    "expected_output": "The conversation lists drift classifications and proposed updates without committing manifest updates or overwriting guarded generated files."
  },
  {
    "id": "scoped-dry-run-limits-discovery-output-to-targets-matching-glob",
    "prompt": "/z-eval-update --target \"**/plugins/zoto-eval-system/commands/*.md\"",
    "assertions": [
      "Minimatch-style matching MUST evaluate against both `target.path` and `target.id` so only targets whose path or id satisfies the glob appear in the drift scope.",
      "Non-interactive dry-run semantics remain in effect: no `--apply` flag means no confirmed writes even inside the narrowed scope."
    ],
    "assertion_patterns": [
      "target\\.path",
      "--apply"
    ],
    "expected_output": "Only commands whose tracked paths sit under the commands directory show up in the narrowed drift report while unrelated primitives stay omitted."
  },
  {
    "id": "interactive-apply-loops-askquestion-and-resumes-until-completion",
    "prompt": "/z-eval-update --apply",
    "follow_ups": [
      "Answer accept on the first `askQuestion` presenting a critical drift diff.",
      "Answer reject on the next proposed change to prove per-change branching works."
    ],
    "assertions": [
      "Each proposed regeneration MUST be mediated through `askQuestion` (accept, reject, edit, or skip-rest) rather than silent writes.",
      "After each answer the orchestrator MUST resume the subagent with the chosen decision until no further `needs_user_input` payloads remain.",
      "Accepted patches MUST refresh `.zoto/eval-system/manifest.yml`, bump metadata fields such as `git_ref` and `updated_at`, and append `.zoto/eval-system/manifest.history.yml`.",
      "Helpers MUST refuse to overwrite files lacking the generated header and MUST refuse mutating cases flagged as user-authored per `_user-case-guards.ts`."
    ],
    "assertion_patterns": [
      "askQuestion",
      "needs_user_input",
      "\\.zoto/eval-system/manifest\\.yml",
      "_user-case-guards\\.ts"
    ],
    "expected_output": "The closing summary JSON reports `{ mode, regenerated_targets, files_written, files_preserved_user_authored, user_cases_preserved, reports[] }` reflecting accepted versus skipped decisions."
  },
  {
    "id": "targeted-apply-regenerates-only-matched-primitives",
    "prompt": "/z-eval-update --target \"command:z-eval-update\" --apply",
    "follow_ups": [
      "Approve the single scoped regeneration prompt when `askQuestion` appears."
    ],
    "assertions": [
      "`runAnalyser({ invalidate: true })` MUST execute only for primitives matching the glob before dispatching stampers.",
      "Downstream regeneration helpers MUST touch solely frameworks tied to the matched targets; unrelated primitives remain untouched on disk and in `manifest.yml`."
    ],
    "assertion_patterns": [
      "runAnalyser\\(\\{ invalidate: true \\}\\)",
      "manifest\\.yml"
    ],
    "expected_output": "Manifest entries outside the matched command id stay unchanged while the scoped command shows updated analyser metadata if accepted."
  },
  {
    "id": "ci-check-runs-parity-gate-then-exits-with-configured-drift-codes",
    "prompt": "/z-eval-update --check",
    "assertions": [
      "Execution MUST invoke `pnpm exec tsx scripts/check-analyser-payload-parity.ts` before emitting drift findings so `parity_drift` reflects that self-check.",
      "Exit status MUST be `config.update.checkExitCodeOnCriticalDrift` when critical drift exists and zero when only non-critical drift or parity passes.",
      "No `askQuestion` prompts appear because `--check` is fully non-interactive."
    ],
    "assertion_patterns": [
      "pnpm exec tsx scripts/check-analyser-payload-parity\\.ts",
      "config\\.update\\.checkExitCodeOnCriticalDrift",
      "askQuestion"
    ],
    "expected_output": "Stderr or structured logs contain parity results followed by a concise drift verdict matching CI expectations."
  },
  {
    "id": "reuse-cached-analyser-payloads-without-llm-invalidation",
    "prompt": "/z-eval-update --no-analyser --apply",
    "follow_ups": [
      "Confirm proceed when warned about cached payloads unless CI forbids it."
    ],
    "assertions": [
      "The updater MUST skip `runAnalyser({ invalidate: true })` and reuse `_meta.primitive_analysis` blobs from `.zoto/eval-system/cache/analyser/` instead of issuing fresh LLM calls.",
      "When `process.env.CI` equals the literal string `true`, stderr MUST include the documented `[CI WARNING] --no-analyser used in CI; cached analyser payloads may be stale and produce drift` banner.",
      "If `update.failOnNoAnalyserInCI` is enabled while CI is active, the command MUST abort early with exit code 5 instead of regenerating."
    ],
    "assertion_patterns": [
      "runAnalyser\\(\\{ invalidate: true \\}\\)",
      "process\\.env\\.CI",
      "update\\.failOnNoAnalyserInCI"
    ],
    "expected_output": "Generation proceeds from cached analyser JSON without `CURSOR_API_KEY` traffic unless configuration escalates to a failure."
  },
  {
    "id": "abort-when-manifest-yml-is-missing-after-config-loads",
    "prompt": "/z-eval-update",
    "assertions": [
      "After locating `.zoto/eval-system/config.yml`, missing `.zoto/eval-system/manifest.yml` MUST halt before rediscovery with an explicit manifest-absence error surfaced to the operator.",
      "Neither manifest snapshot readers nor regeneration helpers execute once the manifest prerequisite fails."
    ],
    "assertion_patterns": [
      "\\.zoto/eval-system/config\\.yml"
    ],
    "expected_output": "The operator receives a clear failure that the manifest path could not be loaded rather than partial drift analysis."
  }
];
const TARGET_ID = "command:z-eval-update";
const MODEL_ID = process.env.ZOTO_EVAL_MODEL ?? "composer-2";
const JUDGE_MODEL = process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6";
const REPO_ROOT = process.cwd();
const SUITE_START = Date.now();
const API_KEY_PRESENT = Boolean(process.env.CURSOR_API_KEY);

describe("command:z-eval-update", () => {
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
