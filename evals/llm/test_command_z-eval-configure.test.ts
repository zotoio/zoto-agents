// _meta.generated: true
/**
 * LLM `code`-strategy eval for command `z-eval-configure`.
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
    "id": "aborts-when-eval-system-config-file-is-absent",
    "prompt": "/z-eval-configure",
    "assertions": [
      "After `/z-eval-configure`, the assistant surfaces the exact abort text telling the operator to run `/z-eval-init` first because `.zoto/eval-system/config.yml` is missing.",
      "After `/z-eval-configure`, no Task is spawned for `zoto-eval-configurer` and no new `.zoto/eval-system/config.yml` appears in the workspace snapshot."
    ],
    "assertion_patterns": [
      "/z-eval-configure",
      "/z-eval-configure"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/eval-system/manifest.yml",
          "content": "version: 1\neval_files: []\n"
        }
      ]
    },
    "expected_output": "The run stops immediately with the documented initialisation error and does not spawn the configurer subagent or write a new config file."
  },
  {
    "id": "full-questionnaire-hands-off-to-configurer-when-cleanup-is-empty",
    "prompt": "/z-eval-configure",
    "follow_ups": [
      "Overwrite existing configuration for this workspace.",
      "Store generated evals under `packages/quality/evals`.",
      "Index primitives under `.cursor/skills` and `plugins/*/skills`.",
      "Discover skills, commands, agents, hooks, and CLI entrypoints.",
      "Use pytest for the static runner.",
      "Use the declarative LLM strategy.",
      "Run generated LLM specs with `tsx`.",
      "Use `composer-2` for generation prompts.",
      "Use `opus-4.6` as the judge model.",
      "Enable packaged manual checklists.",
      "Add vitest automation plus bats-backed shell checks.",
      "Keep all five critical-change guard toggles enabled."
    ],
    "assertions": [
      "After `/z-eval-configure`, the operator-visible transcript shows `askQuestion` prompts in the mandated order for overwrite versus show-only, evals directory choice, roots, discovery targets, static framework, LLM strategy, runtime, primary model, judge model, checklist toggle, extra automation, and the five critical-change toggles before any subagent work begins.",
      "Before spawning `zoto-eval-configurer`, the command executor calls `readManifestSnapshot` (via `evals/_llm/manifest-snapshot.ts`) and forwards both the snapshot object and every collected answer in the structured payload.",
      "After the subagent returns with `cleanup_plan.totals.files === 0`, the command MUST skip the cleanup confirmation `askQuestion` and MUST NOT invoke `pnpm run eval:cleanup-stale`.",
      "The written `.zoto/eval-system/config.yml` reflects the operator's custom `packages/quality/evals` directory, pytest, declarative, `tsx`, `composer-2`, `opus-4.6`, checklist-on, vitest-and-bats automation mix, and all-guards-on selections without asking for `preserveUserAuthoredCases` or `writeMetaMarker`."
    ],
    "assertion_patterns": [
      "/z-eval-configure",
      "zoto-eval-configurer",
      "cleanup_plan\\.totals\\.files === 0",
      "\\.zoto/eval-system/config\\.yml"
    ],
    "expected_output": "The assistant finishes every pre-collect prompt in order, reads the manifest snapshot, launches the configurer task once, lands an atomic `config.yml` pointing at the custom evals directory with vitest and bats automation enabled, and skips cleanup confirmation when the emitted plan has zero files."
  },
  {
    "id": "framework-shift-produces-cleanup-plan-then-applies-it",
    "prompt": "/z-eval-configure",
    "follow_ups": [
      "Overwrite existing configuration for this workspace.",
      "Keep the default `evals` directory.",
      "Index `.cursor/skills` only.",
      "Discover skills and commands only.",
      "Switch the static runner to vitest.",
      "Use the code LLM strategy with matching vitest code scaffolding.",
      "Run generated LLM specs with `node`.",
      "Use `sonnet` for generation prompts.",
      "Judge scoring with `opus-4.6`.",
      "Disable manual checklist packaging.",
      "Add vitest automation only.",
      "Turn off every critical-change guard toggle.",
      "When cleanup prompts appear, choose Apply."
    ],
    "assertions": [
      "After `/z-eval-configure`, any change to `static.framework` or `llm.strategy` forces the configurer to stamp `_meta.primitive_analysis.invalidate = true` on each generated manifest row it touches.",
      "When `cleanup_plan.totals.files` is greater than zero, the command MUST render each `cleanup_plan.groups[].summary` plus every listed file path before the final confirmation prompt.",
      "After the operator selects Apply, the command MUST invoke `pnpm run eval:cleanup-stale -- --plan` feeding the validated cleanup plan without altering its schema shape.",
      "The dry-run preview from subtask 03 MUST match the executed plan bytes well enough for schema validation parity described in the command doc."
    ],
    "assertion_patterns": [
      "/z-eval-configure",
      "cleanup_plan\\.totals\\.files",
      "pnpm run eval:cleanup-stale -- --plan"
    ],
    "expected_output": "Changing the static framework and LLM strategy yields a non-empty cleanup plan, the assistant renders grouped paths, and selecting Apply shells the cleanup runner with that plan before continuing."
  },
  {
    "id": "operator-defers-cleanup-after-reviewing-the-plan",
    "prompt": "/z-eval-configure",
    "follow_ups": [
      "Overwrite existing configuration for this workspace.",
      "Keep the default `evals` directory.",
      "Index `.cursor/skills`.",
      "Discover skills only.",
      "Move the static runner from pytest to vitest.",
      "Stay on the declarative LLM strategy.",
      "Run generated LLM specs with `tsx`.",
      "Use `composer-2` for prompts.",
      "Judge scoring with `sonnet`.",
      "Leave manual checklists off.",
      "Skip extra automation bundles.",
      "Leave critical-change guards untouched.",
      "When cleanup prompts appear, choose Skip cleanup."
    ],
    "assertions": [
      "After `/z-eval-configure`, choosing Skip cleanup MUST append a manifest history note that cleanup was deferred while leaving files on disk unchanged.",
      "After `/z-eval-configure`, the command MUST NOT execute `pnpm run eval:cleanup-stale` when Skip cleanup is chosen, even if the cleanup plan listed pending deletions."
    ],
    "assertion_patterns": [
      "/z-eval-configure",
      "/z-eval-configure"
    ],
    "expected_output": "The assistant captures the deferred cleanup decision in manifest history while leaving stale assets untouched until a later configure pass revisits the same drift."
  },
  {
    "id": "operator-restarts-configure-from-the-cleanup-confirmation",
    "prompt": "/z-eval-configure",
    "follow_ups": [
      "Overwrite existing configuration for this workspace.",
      "Keep the default `evals` directory.",
      "Index `.cursor/skills` and `skills`.",
      "Discover skills and hooks.",
      "Keep vitest for static tests.",
      "Switch to the code LLM strategy with vitest scaffolding.",
      "Run generated LLM specs with `tsx`.",
      "Use `opus-4.6` for prompts.",
      "Judge scoring with `composer-2`.",
      "Enable manual checklists.",
      "Add jest automation only.",
      "Keep critical-change guards enabled.",
      "When cleanup prompts appear, choose Re-run `/z-eval-configure` with different choices."
    ],
    "assertions": [
      "After the operator picks the re-run option at cleanup confirmation, the assistant MUST discard the in-progress `config.yml` changes and restart the questionnaire beginning with the existing-config disposition question.",
      "After `/z-eval-configure`, the re-run path MUST NOT call `pnpm run eval:cleanup-stale` for the discarded plan."
    ],
    "assertion_patterns": [
      "config\\.yml",
      "/z-eval-configure"
    ],
    "expected_output": "Selecting the re-run branch abandons the in-flight write, restores the prior on-disk config snapshot if needed, and returns the operator to the first overwrite question without applying cleanup."
  },
  {
    "id": "resume-loop-answers-missing-code-framework-selection",
    "prompt": "/z-eval-configure",
    "follow_ups": [
      "Overwrite existing configuration for this workspace.",
      "Keep the default `evals` directory.",
      "Index `.cursor/skills`.",
      "Discover commands only.",
      "Keep pytest for static suites.",
      "Select the code LLM strategy but withhold the code-framework answer until the follow-up turn.",
      "On the resume turn, specify vitest as the code framework.",
      "Run generated LLM specs with `node`.",
      "Use `sonnet` for prompts.",
      "Judge scoring with `opus-4.6`.",
      "Disable manual checklists.",
      "Skip extra automation bundles.",
      "Leave every critical-change guard on."
    ],
    "assertions": [
      "When `llm.strategy` is `code` but `llm.codeFramework` is absent from the payload, the resumed Task MUST return `needs_user_input` instead of silently inventing a default framework.",
      "After the operator answers the resumed `askQuestion`, the command MUST resume the existing `zoto-eval-configurer` Task with the completed answers until a final report lands without `needs_user_input`.",
      "When the configurer emits a cleanup plan that fails `cleanup-plan.schema.json` validation, the returned report MUST include `needs_user_input`, and the command MUST gather follow-up answers before resuming the same Task until the plan validates."
    ],
    "assertion_patterns": [
      "llm\\.strategy",
      "askQuestion",
      "cleanup-plan\\.schema\\.json"
    ],
    "expected_output": "The subagent's `needs_user_input` payload prompts for the missing vitest versus jest choice, the command issues the extra `askQuestion`, resumes the same Task, and then writes `config.yml`."
  },
  {
    "id": "static-vitest-with-jest-coded-specs-surfaces-mismatch-warnings",
    "prompt": "/z-eval-configure",
    "follow_ups": [
      "Overwrite existing configuration for this workspace.",
      "Keep the default `evals` directory.",
      "Index `.cursor/skills`.",
      "Discover agents and libs.",
      "Pin static tests to vitest.",
      "Use the code LLM strategy with jest-generated harnesses despite vitest static tests.",
      "Run generated LLM specs with `tsx`.",
      "Use `composer-2` for prompts.",
      "Judge scoring with `opus-4.6`.",
      "Enable manual checklists.",
      "Skip extra automation bundles.",
      "Leave critical-change guards on.",
      "Proceed through cleanup confirmation using Apply once warnings are shown."
    ],
    "assertions": [
      "After `/z-eval-configure`, when static vitest is paired with jest-coded LLM specs, the returned `cleanup_plan.warnings[]` MUST include a human-readable drift note before the Apply question.",
      "Even with warnings present, the command MUST still enumerate affected `cleanup_plan.groups[].files[].path` values and MUST obtain explicit Apply versus Skip consent before `pnpm run eval:cleanup-stale` may run."
    ],
    "assertion_patterns": [
      "/z-eval-configure",
      "cleanup_plan\\.groups\\[\\]\\.files\\[\\]\\.path"
    ],
    "expected_output": "The configurer emits cleanup warnings about mismatched TypeScript harnesses, surfaces them ahead of the Apply prompt, and still requires explicit confirmation before deleting orphaned assets."
  },
  {
    "id": "show-only-path-reviews-settings-without-rewriting-config",
    "prompt": "/z-eval-configure",
    "follow_ups": [
      "Open a read-only review of the current `.zoto/eval-system/config.yml` settings without planning an overwrite."
    ],
    "assertions": [
      "After `/z-eval-configure`, selecting the show-only path MUST display the current configuration fields yet MUST NOT spawn `zoto-eval-configurer`.",
      "After `/z-eval-configure`, the `.zoto/eval-system/config.yml` file content stays byte-for-byte unchanged and `pnpm run eval:cleanup-stale` never executes."
    ],
    "assertion_patterns": [
      "/z-eval-configure",
      "/z-eval-configure"
    ],
    "expected_output": "The assistant surfaces the stored eval-system parameters for inspection and ends before invoking writers, subagents, or cleanup runners."
  },
  {
    "id": "cancel-from-first-question-halts-before-deeper-prompts",
    "prompt": "/z-eval-configure",
    "follow_ups": [
      "Cancel the configure session immediately after the first prompt."
    ],
    "assertions": [
      "After `/z-eval-configure`, choosing cancel on the initial existing-config question MUST stop the questionnaire before the evals directory prompt appears.",
      "After `/z-eval-configure`, neither `zoto-eval-configurer` nor `pnpm run eval:cleanup-stale` runs, and no eval-system files are created or modified."
    ],
    "assertion_patterns": [
      "/z-eval-configure",
      "/z-eval-configure"
    ],
    "expected_output": "The assistant acknowledges the cancellation and stops before collecting later fields or mutating eval-system assets."
  }
];
const TARGET_ID = "command:z-eval-configure";
const MODEL_ID = process.env.ZOTO_EVAL_MODEL ?? "composer-2";
const JUDGE_MODEL = process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6";
const REPO_ROOT = process.cwd();
const SUITE_START = Date.now();
const API_KEY_PRESENT = Boolean(process.env.CURSOR_API_KEY);

describe("command:z-eval-configure", () => {
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
