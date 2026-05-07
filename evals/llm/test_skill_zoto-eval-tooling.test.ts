// _meta.generated: true
/**
 * LLM `code`-strategy eval for skill `zoto-eval-tooling`.
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
    "id": "discover-emit-manifest-yaml",
    "prompt": "We never touched eval wiring here yet—scan the repo using the eval-system discovery command and print the manifest-shaped YAML to stdout so I can sanity-check skillsRoots and discoveryTargets without editing files.",
    "assertions": [
      "the assistant instructs `pnpm run eval:discover` (not a direct `tsx` path to a script under plugins/)",
      "the assistant describes stdout as YAML matching the manifest shape emitted by discovery",
      "the assistant ties success to exit code 0 and mentions skillsRoots, discoveryTargets, evalsDir, or ignore only as documented config inputs rather than inventing new flags"
    ],
    "assertion_patterns": [
      "pnpm run eval:discover"
    ],
    "expected_output": "The assistant proposes running the discover alias and summarizes that stdout should be YAML in manifest shape reflecting configured roots and targets."
  },
  {
    "id": "discover-resolve-one-path",
    "prompt": "Resolve `workspace/plugins/zoto-eval-system/skills/zoto-eval-tooling/SKILL.md` through discovery only—I want the matching target id lines, nothing else.",
    "assertions": [
      "the assistant uses `pnpm run eval:discover -- --resolve workspace/plugins/zoto-eval-system/skills/zoto-eval-tooling/SKILL.md` or equivalent with args after `--`",
      "the assistant states discovery reads eval-system config fields including skillsRoots, discoveryTargets, evalsDir, and ignore",
      "the assistant does not tell the operator to pass a custom `--config` path because loading is automatic"
    ],
    "assertion_patterns": [
      "pnpm run eval:discover -- --resolve workspace/plugins/zoto-eval-system/skills/zoto-eval-tooling/SKILL\\.md",
      "--config"
    ],
    "expected_output": "The assistant gives a one-shot shell line that forwards `--resolve` after the script delimiter and explains YAML stdout listing resolved target ids."
  },
  {
    "id": "analyse-emit-json-and-cache",
    "prompt": "Kick off primitive analysis for `command:zoto-eval-help` and stream the JSON payload; I need it schema-clean for the stamper.",
    "assertions": [
      "the assistant invokes `pnpm run eval:analyse -- command:zoto-eval-help` or adds `--pretty` or `--dry-run` without contradicting the skill",
      "the assistant notes JSON on stdout must validate against `plugins/zoto-eval-system/templates/schema/analyser-payload.schema.json`",
      "the assistant mentions analyser cache material under `.zoto/eval-system/cache/analyser/`",
      "the assistant references relevant config knobs such as `llm.model.id`, analyser concurrency, analyser max calls per invocation, or ignore lists",
      "the assistant distinguishes exit code 1 for analyser errors from exit code 2 when the per-invocation analyser call budget is exhausted",
      "the assistant notes optional `--target` glob filtering when discussing batched primitive analysis"
    ],
    "assertion_patterns": [
      "pnpm run eval:analyse -- command:zoto-eval-help",
      "plugins/zoto-eval-system/templates/schema/analyser-payload\\.schema\\.json",
      "\\.zoto/eval-system/cache/analyser/",
      "llm\\.model\\.id",
      "--target"
    ],
    "expected_output": "The assistant cites `pnpm run eval:analyse`, stdout JSON per target, cache location under the eval-system cache directory, and validation against the analyser schema path from templates."
  },
  {
    "id": "stamp-generated-tests-non-skill",
    "prompt": "Generate stamped tests from the latest analyser payload for `command:zoto-eval-help`; write real files under the configured evals directory.",
    "assertions": [
      "the assistant uses `pnpm run eval:stamp -- command:zoto-eval-help` and optionally `--dry-run` or `--baseline-only` if the user asked",
      "the assistant expects exit code 0 on success and exit code 1 when payloads or targets are invalid",
      "the assistant explains files land under the configured evals directory rather than beside arbitrary scripts"
    ],
    "assertion_patterns": [
      "pnpm run eval:stamp -- command:zoto-eval-help"
    ],
    "expected_output": "The assistant instructs `pnpm run eval:stamp` with the target id, notes stdout lists written paths, and ties framework choices to static.framework, llm.strategy, llm.codeFramework, and evalsDir."
  },
  {
    "id": "stamp-refuses-skill-target",
    "prompt": "Stamp automated tests straight from the analyser output for `skill:zoto-eval-tooling` itself.",
    "assertions": [
      "the assistant states `pnpm run eval:stamp` refuses `skill:*` targets",
      "the assistant points operators to `plugins/zoto-eval-system/templates/skill-evals/evals.json.tmpl` for skill coverage",
      "the assistant still keeps prior analyser JSON workflow intact for non-skill primitives"
    ],
    "assertion_patterns": [
      "pnpm run eval:stamp",
      "plugins/zoto-eval-system/templates/skill-evals/evals\\.json\\.tmpl"
    ],
    "expected_output": "The assistant refuses `pnpm run eval:stamp` for the skill id and redirects maintenance to the repository skill-evals template JSON instead."
  },
  {
    "id": "cleanup-stale-dry-run-plan",
    "prompt": "Show me what cleanup-stale would delete after our framework flip—dry plan only, JSON on stdout.",
    "assertions": [
      "the assistant invokes `pnpm run eval:cleanup-stale` without prematurely applying deletions",
      "the assistant cites stdout JSON against `plugins/zoto-eval-system/templates/schema/cleanup-plan.schema.json`",
      "the assistant ties behaviour to static.framework, llm.strategy, and llm.codeFramework settings"
    ],
    "assertion_patterns": [
      "pnpm run eval:cleanup-stale",
      "plugins/zoto-eval-system/templates/schema/cleanup-plan\\.schema\\.json"
    ],
    "expected_output": "The assistant runs `pnpm run eval:cleanup-stale` in default dry-run mode and describes JSON stdout validated against the cleanup-plan schema."
  },
  {
    "id": "cleanup-stale-check-exit-two",
    "prompt": "Run cleanup-stale in check mode right before CI merges—I need a failing exit if assets drift.",
    "assertions": [
      "the assistant forwards `--check` through `pnpm run eval:cleanup-stale -- --check`",
      "the assistant explains exit code 2 means drift was detected in check mode",
      "the assistant reminds that apply mode requires an explicit session identifier and token hash when deleting files"
    ],
    "assertion_patterns": [
      "--check"
    ],
    "expected_output": "The assistant uses the check flag pair documented for cleanup-stale and warns that exit code 2 signals drift while stdout stays JSON."
  },
  {
    "id": "update-diff-without-analyser",
    "prompt": "Diff eval cases against the live primitives but skip another analyser spend—use update with `--no-analyser` and report drift only.",
    "assertions": [
      "the assistant uses `pnpm run eval:update -- --no-analyser` plus `--check` or `--apply` consistent with the request",
      "the assistant states exit code 2 on critical drift when running check-oriented flows",
      "the assistant references update.* settings alongside discoveryTargets, skillsRoots, and ignore as documented",
      "the assistant warns that `--apply` mutates the manifest only after the operator confirms acceptable drift"
    ],
    "assertion_patterns": [
      "pnpm run eval:update -- --no-analyser",
      "--apply"
    ],
    "expected_output": "The assistant chooses `pnpm run eval:update` with `--no-analyser`, describes stdout drift reporting, and notes manifest mutation happens only with `--apply`."
  },
  {
    "id": "full-eval-orchestration-run-folder",
    "prompt": "Execute the full eval orchestrator so static and LLM backends both run—leave artifacts under the eval runs directory with timestamps.",
    "assertions": [
      "the assistant invokes `pnpm run eval:full` or `pnpm run eval` with `--full` rather than hand-running disparate scripts",
      "the assistant states outputs land under the configured evals directory inside `_runs/` under a new ISO-like timestamp directory containing static.yml, llm.yml, and report.yml",
      "the assistant mentions relevant knobs such as evalsDir, static.framework, llm.strategy, llm.codeFramework, llm.model.id, and runs.retention",
      "the assistant references `--llm-only` or `--model` switches when the operator wants to constrain backends"
    ],
    "assertion_patterns": [
      "pnpm run eval:full",
      "_runs/",
      "--llm-only"
    ],
    "expected_output": "The assistant schedules `pnpm run eval:full` or `pnpm run eval -- --full`, naming static.yml, llm.yml, and report.yml inside a timestamped folder beneath `_runs`."
  },
  {
    "id": "gc-prune-old-runs-json-plan",
    "prompt": "Preview which dated run folders exceed retention—JSON plan only, no deletes.",
    "assertions": [
      "the assistant uses `pnpm run eval:gc -- --dry-run` when previewing",
      "the assistant describes stdout as a JSON plan listing directories past retention",
      "the assistant notes exit code 0 on success and mentions optional `--apply` plus `--retention N` overrides"
    ],
    "assertion_patterns": [
      "pnpm run eval:gc -- --dry-run",
      "--apply"
    ],
    "expected_output": "The assistant runs `pnpm run eval:gc` with dry-run semantics and ties pruning limits to runs.retention and evalsDir."
  },
  {
    "id": "migration-legacy-eval-dir",
    "prompt": "This checkout still has `.zoto-eval-system/` sitting next to `.zoto/`—will the next eval command migrate automatically?",
    "assertions": [
      "the assistant references automatic migration of legacy `.zoto-eval-system/` content on first eval-system invocation",
      "the assistant avoids instructing the user to pass `--config` solely because two directories exist"
    ],
    "assertion_patterns": [
      "\\.zoto-eval-system/",
      "--config"
    ],
    "expected_output": "The assistant confirms first-run migration from `.zoto-eval-system/` happens transparently without manual config flags."
  },
  {
    "id": "failure-nonzero-and-stderr-json",
    "prompt": "Discovery blew up—rerun eval:discover after I renamed config and paste whatever structured error JSON lands on stderr.",
    "assertions": [
      "the assistant treats non-zero exit codes as hard failures",
      "the assistant instructs parsing stderr for structured JSON errors when the CLI emits them",
      "the assistant does not suggest bypassing failures by calling underlying TypeScript entrypoints directly"
    ],
    "assertion_patterns": [],
    "expected_output": "The assistant reruns `pnpm run eval:discover`, expects exit code 1 for missing config failures, and parses stderr for structured JSON errors when present."
  }
];
const TARGET_ID = "skill:zoto-eval-tooling";
const MODEL_ID = process.env.ZOTO_EVAL_MODEL ?? "composer-2";
const JUDGE_MODEL = process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6";
const REPO_ROOT = process.cwd();
const SUITE_START = Date.now();
const API_KEY_PRESENT = Boolean(process.env.CURSOR_API_KEY);

describe("skill:zoto-eval-tooling", () => {
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
