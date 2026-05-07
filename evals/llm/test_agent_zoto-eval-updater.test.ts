// _meta.generated: true
/**
 * LLM `code`-strategy eval for agent `zoto-eval-updater`.
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
    "id": "check-mode-runs-parity-gate-before-drift",
    "prompt": "Run the eval updater in check-only mode for CI: I need `/z-eval-update --check` to stay fully non-interactive and fail the job when analyser payload parity or critical drift is wrong.",
    "assertions": [
      "The plan runs `pnpm exec tsx scripts/check-analyser-payload-parity.ts` before any drift delta computation so `parity_drift` in the report is trustworthy for subtask 12.",
      "The check-mode plan includes no `askQuestion` calls from the updater agent itself.",
      "On clean parity and drift the workflow targets exit status 0; when critical drift remains it honours `config.update.checkExitCodeOnCriticalDrift` with default non-zero exit code 2."
    ],
    "assertion_patterns": [
      "pnpm exec tsx scripts/check-analyser-payload-parity\\.ts",
      "askQuestion",
      "config\\.update\\.checkExitCodeOnCriticalDrift"
    ],
    "expected_output": "A short execution plan that runs the parity checker first, then summarises drift state and expected exit behaviour without asking interactive questions."
  },
  {
    "id": "dry-run-rediscovery-reports-without-writes",
    "prompt": "Before changing anything, run the standard rediscovery pass in dry-run form only—`/z-eval-update` with no `--apply`—and summarise what would change.",
    "assertions": [
      "The response lists drift deltas but does not instruct `stampPytestPerPrimitive`, `stampVitestPerPrimitive`, `stampJestPerPrimitive`, `stampLlmCodeStrategy`, or declarative `evals.json` writers to execute.",
      "No manifest `git_ref`, `updated_at`, or `targets[].content_hash` updates are applied as part of this dry run."
    ],
    "assertion_patterns": [
      "stampPytestPerPrimitive",
      "git_ref"
    ],
    "expected_output": "A delta report describing added, modified, or removed targets without scheduling filesystem writes or stamper invocations."
  },
  {
    "id": "apply-mode-refreshes-analysis-and-dispatches-stampers",
    "prompt": "We finished `/z-eval-update --apply` in the command palette and accepted the per-change decisions in the Task thread. For each added or modified primitive, refresh analyser output with invalidation, read the active manifest snapshot for frameworks and LLM strategy, regenerate through the matching stamper, then update the manifest metadata and history.",
    "assertions": [
      "Unless `--no-analyser` is in play, the plan calls `runAnalyser({ target, invalidate: true })` driven by `pnpm run eval:analyse` for every added or modified target.",
      "After `readManifestSnapshot()`, static regeneration follows `static.framework` (`pytest` → `regeneratePytest` → `stampPytestPerPrimitive`, `vitest` → `regenerateVitest` → `stampVitestPerPrimitive`, `jest` → `regenerateJest` → `stampJestPerPrimitive`).",
      "LLM strategy work follows `llm.strategy`, using `regenerateLlmCode` → `stampLlmCodeStrategy` when `code`, and `regenerateLlmDeclarative` with surgical `evals.json` edits when `declarative`.",
      "The manifest update refreshes `targets[]` hashes, bumps `git_ref` and `updated_at`, and records a new snapshot entry in `manifest.history.yml`."
    ],
    "assertion_patterns": [
      "--no-analyser",
      "readManifestSnapshot\\(\\)",
      "llm\\.strategy",
      "targets\\[\\]"
    ],
    "expected_output": "A sequenced plan that ties analyser refresh, snapshot-driven framework and strategy dispatch, and manifest bookkeeping together."
  },
  {
    "id": "targeted-glob-scopes-drift-computation",
    "prompt": "Limit the next updater cycle to hook bundles only: use `/z-eval-update --target 'plugins/**/hooks/*.{mjs,ts}'` in dry-run first, then tell me when you would rerun with `--apply` if I approve.",
    "assertions": [
      "Drift computation is described as limited to targets resolved from the `--target` glob rather than the full discovery set.",
      "The initial invocation omits `--apply`, matching the dry-run semantics before a separate apply step."
    ],
    "assertion_patterns": [
      "--target",
      "--apply"
    ],
    "expected_output": "Instructions that restrict delta detection to targets whose `target.path` or `target.id` matches the supplied glob while keeping the initial pass read-only."
  },
  {
    "id": "cached-analyser-path-in-ci",
    "prompt": "On the CI worker with `CI=true`, run the updater using `--no-analyser` so it reuses cached primitive analysis under `.zoto/eval-system/cache/analyser/`. Confirm stderr warns about skipping fresh analysis and note when `update.failOnNoAnalyserInCI: true` should exit 5.",
    "assertions": [
      "When `process.env.CI === \"true\"` and `--no-analyser` is used, the plan requires emitting `[CI WARNING]` about bypassing fresh analyser calls.",
      "If `update.failOnNoAnalyserInCI` is enabled in `.zoto/eval-system/config.yml`, the command path must abort with exit code 5 rather than silently continuing."
    ],
    "assertion_patterns": [
      "process\\.env\\.CI === \"true\"",
      "update\\.failOnNoAnalyserInCI"
    ],
    "expected_output": "A CI-oriented note that expects a `[CI WARNING]` line on stderr and documents the optional hard-fail exit code when that config flag is enabled."
  },
  {
    "id": "missing-eval-coverage-defers-to-create-flow",
    "prompt": "A new primitive was added but its workspace still has no eval file that covers it. As the updater agent, `zoto-update-evals` cannot finish—outline how you hand off to `zoto-create-evals` after I explicitly agree to creation.",
    "assertions": [
      "The response states that missing coverage routes through `zoto-create-evals` instead of improvising ad-hoc eval files.",
      "Creation is contingent on explicit user acceptance, matching the documented handoff guardrail."
    ],
    "assertion_patterns": [
      "zoto-create-evals"
    ],
    "expected_output": "A handoff description that names `zoto-create-evals`, waits for clear user consent, and avoids silently fabricating eval files."
  },
  {
    "id": "non-generated-eval-cases-stay-immutable",
    "prompt": "A maintainer asked you to rewrite an existing eval case whose `_meta.generated` flag is absent. Apply the updater rules and refuse the destructive edit.",
    "assertions": [
      "The plan aborts with an explicit guard failure instead of mutating cases lacking `_meta.generated === true`."
    ],
    "assertion_patterns": [
      "_meta\\.generated === true"
    ],
    "expected_output": "An explanation that `isGeneratedCase` blocks the change and no case body rewrite is proposed."
  },
  {
    "id": "generated-only-file-and-json-surgery-rules",
    "prompt": "Merge regenerated pytest tests and mixed `evals.json` outputs, but skip overwriting any `*.test.py` missing the generated banner and avoid reserialising entire JSON documents—preserve the order of untouched generated rows.",
    "assertions": [
      "Pytest files without `# _meta.generated: True` on line one are skipped with a `manual_merge_required` style warning rather than overwritten.",
      "Mixed `evals.json` edits go through `surgicallyReplaceGeneratedCases()` backed by `json-source-map`, not a full-file rewrite.",
      "Unmodified generated cases keep their prior relative ordering in the emitted JSON."
    ],
    "assertion_patterns": [
      "# _meta\\.generated: True",
      "evals\\.json"
    ],
    "expected_output": "Guidance that honours file-banner checks, routes `evals.json` through surgical replacement, and keeps stable ordering for untouched generated entries."
  },
  {
    "id": "discovery-snapshot-history-and-needs-user-input",
    "prompt": "During a full rediscovery, base enumeration on the stored `manifest.discovery_config` snapshot (not the live `config.json`), append another line to `manifest.history.yml` without rewriting earlier entries, and if the palette flow hits an unexpected branch return structured `needs_user_input` instead of calling `askQuestion` yourself.",
    "assertions": [
      "Target discovery parameters are read from `manifest.discovery_config` rather than a fresh read of root `config.json`.",
      "`manifest.history.yml` updates are append-only with no compaction or rewrite of prior history records.",
      "Unexpected decisions surface as a structured `needs_user_input` payload for the command, and the updater agent does not invoke `askQuestion`."
    ],
    "assertion_patterns": [
      "manifest\\.discovery_config",
      "manifest\\.history\\.yml",
      "needs_user_input"
    ],
    "expected_output": "A governance plan covering discovery snapshot usage, append-only history handling, and structured deferral to the command runner."
  }
];
const TARGET_ID = "agent:zoto-eval-updater";
const MODEL_ID = process.env.ZOTO_EVAL_MODEL ?? "composer-2";
const JUDGE_MODEL = process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6";
const REPO_ROOT = process.cwd();
const SUITE_START = Date.now();
const API_KEY_PRESENT = Boolean(process.env.CURSOR_API_KEY);

describe("agent:zoto-eval-updater", () => {
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
