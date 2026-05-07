// _meta.generated: true
/**
 * LLM `code`-strategy eval for agent `zoto-eval-generator`.
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
    "id": "deferral-when-evaluation-configuration-omitted",
    "prompt": "/z-eval-create asked you to scaffold the entire repository, but `.zoto/eval-system/config.yml` is unavailable and no prior configuring command supplied answers yet—report what happens next instead of scaffolding.",
    "assertions": [
      "The agent returns structured `needs_user_input` citing missing configuration and instructing the upstream command (via `reason` plus optional `questions`) to run `/z-eval-configure` first.",
      "Available transcripts show zero `askQuestion` tool emissions from the generator."
    ],
    "assertion_patterns": [
      "needs_user_input",
      "askQuestion"
    ],
    "expected_output": "The agent emits a concise hand-off directing the commanding workflow through `/z-eval-configure` before generation and withholds scaffolding work until configuration exists."
  },
  {
    "id": "generate-mode-finishes-dual-backends-end-to-end",
    "prompt": "You spawned from `/z-eval-create`; the preceding command fused approval lists covering skills, commands, agents, and hooks plus confirmed `.zoto/eval-system/config.yml` parses—materialize sanctioned eval scaffolding, keep history append-only, and exit validations cleanly.",
    "assertions": [
      "Logged operations include `pnpm run eval:discover` executed via the documented explore-assisted route before authoring generated rows.",
      "The workflow proceeds with approvals already fused by `/z-eval-create` without revisiting selective targeting debates.",
      "The agent stamps simultaneous pytest-backed static scaffolding and `@cursor/sdk` oriented LLM evaluators for each approved primitive kind surfaced through discovery approvals.",
      "Every freshly authored eval row declares `_meta.generated` true alongside a normalized sha256 `source_hash`, ISO-8601 `last_updated`, and `generated_by: zoto-create-evals`.",
      "If `.env.example` was absent beforehand, transcripts show stamping from `templates/env/.env.example.tmpl`; otherwise narration documents skipping merges while forbidding edits to `.env` itself.",
      "The generator merges `templates/package-scripts/base.json` into package metadata—including dotenv-related dev tooling—without discarding unrelated package.json fields.",
      "`.zoto/eval-system/manifest.yml` refreshes discovery metadata while `.zoto/eval-system/manifest.history.yml` gains a new trailing entry without rewriting prior records.",
      "Command logs confirm `pnpm run eval:list`, `pnpm run eval -- --collect-only`, and `pnpm run eval:update --check` exited with status zero immediately after scaffolding.",
      "Closing guidance reminds operators to rerun their installer once plus notes when `.env.example` creation was skipped owing to existing files.",
      "After stamping, traces show `zoto-update-evals` proving drift-free regenerated content versus repository state.",
      "Touchpoints with `zoto-configure-evals` occur solely when the commanding payload already conveys answers produced by `/z-eval-configure`.",
      "Repository diffs omit mutations for evaluator rows lacking `_meta` markers or asserting `_meta.generated` false.",
      "Reviewers observe no undocumented assistant tooling or edits beyond sanctioned scaffolding trees, manifests, ancillary templates including optional checklists plus environment templates when newly created only, scripted package merges, discovery outputs, and validation logs.",
      "Across the trajectory the generator never emits `askQuestion`."
    ],
    "assertion_patterns": [
      "pnpm run eval:discover",
      "/z-eval-create",
      "@cursor/sdk",
      "_meta\\.generated",
      "\\.env\\.example",
      "templates/package-scripts/base\\.json",
      "\\.zoto/eval-system/manifest\\.yml",
      "pnpm run eval:list",
      "\\.env\\.example",
      "zoto-update-evals",
      "zoto-configure-evals",
      "_meta",
      "askQuestion"
    ],
    "expected_output": "The agent recounts stamped evaluator trees spanning pytest and `@cursor/sdk`, cites manifest refreshes paired with appended history tails, summarizes `.env.example` merges versus skips alongside installer reminders about devDeps, shows zero-valued exit statuses for evaluator listing, collector dry-run, and update auditing, and underscores untouched authored evaluator rows confined to sanctioned paths."
  },
  {
    "id": "config-knobs-steer-harness-stamping-and-checklist-output",
    "prompt": "Continue `/z-eval-create` approvals; honour every knob in the evaluator configuration embedded for this workspace when deciding harnesses and auxiliary markdown.",
    "assertions": [
      "Static artefacts align with configuration declaring `static.framework` as jest.",
      "`llm.strategy: code` with `llm.codeFramework: vitest` yields vitest-flavoured `@cursor/sdk` scaffolding distinct from declarative-only layouts.",
      "Evaluator files remain rooted beneath the configured `evalsDir`.",
      "Discovery tooling respects declared `skillsRoots` when locating candidate primitives.",
      "Generated README prose references both primary-test-model and adjudicator-test-model per configured narration fields tied to modelling knobs.",
      "`manualChecklists.enabled: true` causes `USER_EVAL_CHECKLISTS.md` to accompany generated collateral."
    ],
    "assertion_patterns": [
      "static\\.framework",
      "llm\\.strategy: code",
      "evalsDir",
      "skillsRoots",
      "manualChecklists\\.enabled: true"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/eval-system/config.yml",
          "content": "static:\n  framework: jest\nllm:\n  strategy: code\n  codeFramework: vitest\n  model:\n    id: primary-test-model\nevalsDir: evals\nskillsRoots:\n  - skills\ndiscoveryTargets:\n  skills: true\n  commands: true\nmanualChecklists:\n  enabled: true\njudgeModel: adjudicator-test-model\n"
        }
      ]
    },
    "expected_output": "Scaffolding lands under evals pairing jest static artefacts with `@cursor/sdk` layers wired for vitest-oriented codegen harnesses while surfaced README segments highlight primary-test-model and adjudicator-test-model plus checklist markdown because stamping stayed enabled."
  },
  {
    "id": "declarative-strategy-picks-non-code-evaluator-layout",
    "prompt": "/z-eval-create finished approvals; honour declarative `llm.strategy` semantics so generated Cursor SDK artefacts avoid code-strategy harness wiring while stamping static vitest tests.",
    "assertions": [
      "Static artefacts adhere to vitest selection while declarative Cursor SDK artefacts differ materially from snapshots produced under `llm.strategy: code` with parallel `llm.codeFramework` stamping.",
      "LLM artefacts reflect `llm.strategy: declarative` by omitting code-strategy-only harness directories or reporter wiring exclusive to codegen flows.",
      "When approvals echo `discoveryTargets` limiting work to agents, generated rows omit counterpart slots for withheld kinds.",
      "`manualChecklists.enabled: false` keeps checklist markdown unstamped unlike enabled scenarios."
    ],
    "assertion_patterns": [
      "llm\\.strategy: code",
      "llm\\.strategy: declarative",
      "discoveryTargets",
      "manualChecklists\\.enabled: false"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/eval-system/config.yml",
          "content": "static:\n  framework: vitest\nllm:\n  strategy: declarative\n  model:\n    id: routing-test-model\nevalsDir: evaluations\nskillsRoots:\n  - library\ndiscoveryTargets:\n  agents: true\nmanualChecklists:\n  enabled: false\njudgeModel: panel-test-model\n"
        }
      ]
    },
    "expected_output": "Repositories show vitest static harnesses anchored under evaluations while LLM artefacts follow declarative layouts without duplicated code-strategy harness bundles produced for strategy-code runs; readme lines cite routing-test-model and panel-test-model; supplemental checklist markdown remains absent despite manifest-history growth behaving append-only."
  },
  {
    "id": "jest-llm-harness-path-under-code-strategy",
    "prompt": "Follow `/z-eval-create` with approvals locked; configuration demands jest-specific `@cursor/sdk` harness layers while static harnessing remains pytest-oriented.",
    "assertions": [
      "`llm.strategy: code` with `llm.codeFramework: jest` produces jest-oriented `@cursor/sdk` harness structures instead of vitest-flavoured codegen wiring.",
      "Static layers still honor `static.framework: pytest` alongside the jest LLM harness pairing."
    ],
    "assertion_patterns": [
      "llm\\.strategy: code",
      "static\\.framework: pytest"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/eval-system/config.yml",
          "content": "static:\n  framework: pytest\nllm:\n  strategy: code\n  codeFramework: jest\n  model:\n    id: runner-test-model\nevalsDir: evals\nskillsRoots:\n  - repo\ndiscoveryTargets:\n  hooks: true\nmanualChecklists:\n  enabled: false\njudgeModel: bench-test-model\n"
        }
      ]
    },
    "expected_output": "Repositories gain pytest static runners plus jest-flavoured `@cursor/sdk` harness trees while omitting checklist markdown and still narrating runner-test-model with bench-test-model inside README fragments."
  }
];
const TARGET_ID = "agent:zoto-eval-generator";
const MODEL_ID = process.env.ZOTO_EVAL_MODEL ?? "composer-2";
const JUDGE_MODEL = process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6";
const REPO_ROOT = process.cwd();
const SUITE_START = Date.now();
const API_KEY_PRESENT = Boolean(process.env.CURSOR_API_KEY);

describe("agent:zoto-eval-generator", () => {
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
