// _meta.generated: true
/**
 * LLM `code`-strategy eval for command `z-eval-advise`.
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
    "id": "plugin-argument-drives-drill-down-then-mixed-create-and-update-handoffs",
    "prompt": "/z-eval-advise zoto-eval-system",
    "follow_ups": [
      "Drill into trigger-phrase coverage and schema validation coverage only",
      "Accept the listed create recommendation and the listed update recommendation together"
    ],
    "assertions": [
      "Before any scope `askQuestion` or subagent spawn, the command MUST verify `.zoto/eval-system/config.yml` exists at the repository root and MUST NOT synthesize a default config when it is present.",
      "With `zoto-eval-system` on the command line the command MUST resolve `advise_context` to targeted scope with a non-null `target_glob` under that plugin and MUST pass both the config path and `.zoto/eval-system/manifest.yml` into the `zoto-eval-adviser` Task wired to the `zoto-advise-evals` skill.",
      "After the first subagent pause carrying `needs_user_input` for summary drill-down, the command MUST emit `askQuestion` that lists trigger-phrase, schema, regression, citation, and checklist severities as ok, warn, or critical with target counts, then MUST resume the subagent with the operator’s chosen dimensions.",
      "After the second subagent pause carrying `needs_user_input` for actions, the command MUST emit `askQuestion` with numbered recommendations spanning create and update work, then MUST resume with the accepted set.",
      "When accepted recommendations include both `action: create` and `action: update`, the command MUST invoke `/z-eval-create` before any `/z-eval-update --target <glob> --apply` since updates expect existing eval files.",
      "The routed handoff MUST include `adviser_handoff.source` set to `/z-eval-advise`, an `accepted_recommendations` array whose entries carry `id`, `target_id`, `dimension`, and `action`, plus `create_targets` and `update_targets` sections matching the accepted mix."
    ],
    "assertion_patterns": [
      "askQuestion",
      "zoto-eval-system",
      "needs_user_input",
      "needs_user_input",
      "action: create",
      "adviser_handoff\\.source"
    ],
    "expected_output": "The run confirms the workspace eval config, scopes analysis to the zoto-eval-system plugin tree, shows per-dimension severities for trigger phrases, schema checks, regression baselines, citations, and checklists, then after acceptance forwards a structured handoff where `/z-eval-create` runs before `/z-eval-update --target … --apply`."
  },
  {
    "id": "skill-argument-narrows-analysis-to-one-manifest-skill",
    "prompt": "/z-eval-advise zoto-help-evals",
    "assertions": [
      "The command MUST treat `zoto-help-evals` as a single-skill selection, building `advise_context` with targeted scope and a `target_glob` that isolates that skill’s files per the manifest.",
      "The spawned `zoto-eval-adviser` MUST load `zoto-advise-evals`, read `.zoto/eval-system/config.yml` and `.zoto/eval-system/manifest.yml`, and produce an initial summary mentioning trigger-phrase coverage, schema validation coverage, regression baseline coverage, citation verification, and checklist completeness."
    ],
    "assertion_patterns": [
      "zoto-help-evals",
      "zoto-eval-adviser"
    ],
    "expected_output": "The command keeps the eval config check, constrains scanning to the zoto-help-evals skill target, and the adviser still scores all five gap dimensions before any breakpoint."
  },
  {
    "id": "no-argument-chooses-full-manifest-scan-from-the-palette",
    "prompt": "/z-eval-advise",
    "follow_ups": [
      "Full scan — analyse every target listed in the manifest"
    ],
    "assertions": [
      "Because no plugin or skill argument was given, the command MUST first run `askQuestion` offering full-manifest scan, picking a specific detected plugin, and picking a specific manifest skill target before building `advise_context`.",
      "When the operator selects the full-scan option, `advise_context.scope` MUST be `full` and `target_glob` MUST be null before the `zoto-eval-adviser` Task starts."
    ],
    "assertion_patterns": [
      "askQuestion",
      "advise_context\\.scope"
    ],
    "expected_output": "Palette `askQuestion` resolves to a full-manifest scope, `advise_context` marks scope as full with a null `target_glob`, and the adviser run proceeds against every manifest entry."
  },
  {
    "id": "no-argument-picks-one-detected-plugin-from-the-palette-list",
    "prompt": "/z-eval-advise",
    "follow_ups": [
      "Specific plugin — zoto-eval-system"
    ],
    "assertions": [
      "The scope `askQuestion` MUST enumerate detected plugins and, after choosing `zoto-eval-system`, the command MUST set `advise_context` to targeted scope with a glob covering that plugin without requiring a second command invocation."
    ],
    "assertion_patterns": [
      "askQuestion"
    ],
    "expected_output": "The palette narrows analysis to the chosen plugin folder tree while retaining the same adviser tooling and config paths."
  },
  {
    "id": "no-argument-picks-one-manifest-skill-from-the-palette-list",
    "prompt": "/z-eval-advise",
    "follow_ups": [
      "Specific skill — zoto-help-evals"
    ],
    "assertions": [
      "After the operator selects a specific manifest skill, the command MUST mirror the `/z-eval-advise zoto-help-evals` argument path by targeting only that skill’s glob in `advise_context`."
    ],
    "assertion_patterns": [
      "/z-eval-advise zoto-help-evals"
    ],
    "expected_output": "The palette constrains the adviser to a single skill target taken straight from `manifest.yml` entries."
  },
  {
    "id": "breakpoint-one-skips-drill-down-then-breakpoint-two-declines-all-actions",
    "prompt": "/z-eval-advise zoto-eval-system",
    "follow_ups": [
      "Skip straight to action recommendations without deeper dimension drill-down",
      "No action — keep the report only"
    ],
    "assertions": [
      "At breakpoint one the command MUST still offer drill-down choices but MUST honour a skip request by resuming the subagent toward recommendations without insisting on per-dimension follow-ups.",
      "When the operator picks no action at breakpoint two, the command MUST present the final report and MUST NOT spawn `/z-eval-create`, `/z-eval-update`, or emit further handoff `askQuestion` rounds."
    ],
    "assertion_patterns": [
      "/z-eval-create"
    ],
    "expected_output": "The command still surfaces severities once, resumes past breakpoint one without extra dimension passes, and ends after breakpoint two without calling `/z-eval-create` or `/z-eval-update`."
  },
  {
    "id": "breakpoint-two-walks-each-recommendation-before-resuming",
    "prompt": "/z-eval-advise zoto-eval-system",
    "follow_ups": [
      "Walk each recommendation individually",
      "Accept the first proposed action",
      "Skip the second proposed action"
    ],
    "assertions": [
      "Choosing walk-each mode MUST trigger sequential `askQuestion` prompts so every recommendation is accepted or skipped individually before the command resumes `zoto-eval-adviser` with the trimmed list.",
      "The resumed payload MUST exclude skipped recommendations from `accepted_recommendations` while keeping explicit identifiers for those that were approved."
    ],
    "assertion_patterns": [
      "askQuestion",
      "accepted_recommendations"
    ],
    "expected_output": "Each recommendation receives its own accept-or-skip prompt, and the subagent resumes with only the accepted entries in the final list."
  },
  {
    "id": "breakpoint-two-accepts-create-only-recommendations",
    "prompt": "/z-eval-advise zoto-eval-system",
    "follow_ups": [
      "Skip additional drill-down",
      "Create-only — apply scaffolding recommendations but no update passes"
    ],
    "assertions": [
      "After the operator selects create-only handling, the command MUST resume the subagent with only create actions and MUST hand off exclusively to `/z-eval-create` without invoking `/z-eval-update --target … --apply`.",
      "`adviser_handoff.create_targets` MUST list each accepted create `target_id` and `update_targets` MUST be empty or omitted when no update actions were approved."
    ],
    "assertion_patterns": [
      "/z-eval-create",
      "adviser_handoff\\.create_targets"
    ],
    "expected_output": "Accepted work runs solely through `/z-eval-create` with `adviser_handoff` lists that omit update batches."
  },
  {
    "id": "breakpoint-two-accepts-update-only-recommendations",
    "prompt": "/z-eval-advise zoto-eval-system",
    "follow_ups": [
      "Skip additional drill-down",
      "Update-only — strengthen existing evals and skip new scaffolding"
    ],
    "assertions": [
      "After the operator selects update-only handling, the command MUST resume with update actions alone and MUST invoke `/z-eval-update` with `--target` globs plus `--apply` for each accepted update batch.",
      "The command MUST NOT call `/z-eval-create` when every accepted recommendation carries `action: update`, and `adviser_handoff.update_targets` MUST include glob plus reason fields for each batch."
    ],
    "assertion_patterns": [
      "/z-eval-update",
      "/z-eval-create"
    ],
    "expected_output": "Accepted work routes only to `/z-eval-update --target … --apply` while leaving `/z-eval-create` unused."
  }
];
const TARGET_ID = "command:z-eval-advise";
const MODEL_ID = process.env.ZOTO_EVAL_MODEL ?? "composer-2";
const JUDGE_MODEL = process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6";
const REPO_ROOT = process.cwd();
const SUITE_START = Date.now();
const API_KEY_PRESENT = Boolean(process.env.CURSOR_API_KEY);

describe("command:z-eval-advise", () => {
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
