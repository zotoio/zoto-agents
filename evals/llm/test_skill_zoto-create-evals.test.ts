// _meta.generated: true
/**
 * LLM `code`-strategy eval for skill `zoto-create-evals`.
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
    "id": "dual-backend-scaffold-with-discovery-manifests-validation",
    "prompt": "We already ran `/z-eval-create` and approved every discovered command, agent, and hook target plus the proprietary skills; proceed with the create-evals workflow now so `pnpm run eval:list`, static collection, and LLM harness wiring land together.",
    "assertions": [
      "Before stamping templates, the agent dispatched `pnpm run eval:discover` (via an explore subagent) and reconciled the Task-approved ID list with `config.ignore` minimatches without calling `askQuestion`.",
      "`templates/static/pytest/*` landed under `{evalsDir}/`, `templates/llm/agent-sdk/*` under `{evalsDir}/_llm/`, `templates/runner/test.py.tmpl` became `scripts/test.py`, and `templates/schema/result.schema.json` copied beside the LLM harness.",
      "`static.framework`, `llm.strategy`, and `llm.codeFramework` selections read from `.zoto/eval-system/config.yml` governed which pytest versus Vitest or Jest bundles were emitted without silent framework drift.",
      "Only command, agent, and hook targets received `pnpm run eval:analyse -- …` followed by `pnpm run eval:stamp -- …`; skill targets consumed `templates/skill-evals/evals.json.tmpl` locally without central `eval-stamp.ts` runs.",
      "`pnpm exec tsx scripts/package-json-merger.ts` merged `templates/package-scripts/base.json` without touching unrelated host sources outside the documented allow-list.",
      "`manifest.yml` and the appended `manifest.history.yml` entry share identical YAML payloads including `schema_version`, timestamps, `git_ref`, `generated_by: zoto-create-evals`, and populated `targets[].eval_files`.",
      "No `.env` file was created; if `.env.example` pre-existed the report calls out verifying `CURSOR_API_KEY` coverage instead of rewriting the file.",
      "Optional hygiene instructions mention running `pnpm exec tsx scripts/eval-cleanup-vendored.ts` after tightening `ignore[]` so vendored-only fixtures disappear.",
      "When cleanup tooling encounters mixed authored and generated rows inside the same eval asset, the workflow surfaces `needs_user_input` instead of deleting anything automatically."
    ],
    "assertion_patterns": [
      "pnpm run eval:discover",
      "templates/static/pytest/\\*",
      "static\\.framework",
      "pnpm run eval:analyse -- …",
      "pnpm exec tsx scripts/package-json-merger\\.ts",
      "manifest\\.yml",
      "\\.env",
      "pnpm exec tsx scripts/eval-cleanup-vendored\\.ts",
      "needs_user_input"
    ],
    "expected_output": "Final report lists stamped pytest + agent-sdk `_llm` trees under the configured eval directory, refreshed `package.json` scripts and devDependencies including dotenv, new `.zoto/eval-system/manifest.yml` matching an appended `manifest.history.yml` snapshot, per-command/agent/hook JSON rows under both plugin and `.cursor/evals` roots with `_meta.generated: true`, templated per-skill `evals/evals.json` files from `templates/skill-evals/evals.json.tmpl` for each approved skill directory, explicit passes for `pnpm run eval:list`, `pnpm run eval -- --collect-only`, and `pnpm run eval:update --check`, a reminder to install packages once, and notes that only `hook:cursor-workspace` should be targeted while legacy `hook:cursor` stays deprecated."
  },
  {
    "id": "needs-user-input-when-evaluation-config-missing",
    "prompt": "Spin up the eval suite from `/z-eval-create` immediately—this workspace still lacks `.zoto/eval-system/config.yml`, so finish provisioning via the skill.",
    "assertions": [
      "The response returns `needs_user_input` describing that `.zoto/eval-system/config.yml` must exist before scaffolding.",
      "No `askQuestion` hooks fired from the skill loop.",
      "No writes occurred under `{evalsDir}/`, `.zoto/eval-system/manifest.yml`, or `manifest.history.yml`."
    ],
    "assertion_patterns": [
      "needs_user_input",
      "askQuestion",
      "\\{evalsDir\\}/"
    ],
    "expected_output": "Structured `needs_user_input` tells the operator run `/z-eval-configure` first, explicitly citing the absent config path; no template directories were stamped yet."
  },
  {
    "id": "ignore-minimatches-skip-analyse-stamp-cleanly",
    "prompt": "Approved IDs include `command:upstream-docs` but its canonical Markdown sits under `upstream-vendor/commands/upstream-docs.md` matched by `config.ignore`; run create-evals now.",
    "assertions": [
      "`pnpm run eval:analyse -- command:upstream-docs` (when accidentally invoked) exits reporting `{ ignored: true, matched_glob }` and emits no new JSON under `.cursor/evals/commands/`.",
      "`pnpm run eval:stamp -- command:upstream-docs` likewise refuses writes for ignored sources.",
      "Other approved targets still receive analyse/stamp cycles after filtering."
    ],
    "assertion_patterns": [
      "pnpm run eval:analyse -- command:upstream-docs",
      "pnpm run eval:stamp -- command:upstream-docs"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/eval-system/config.yml",
          "content": "schema_version: 2\nstatic:\n  framework: pytest\nllm:\n  strategy: code\n  codeFramework: vitest\nevalsDir: evals\nignore:\n  - \"upstream-vendor/**\"\nmanualChecklists:\n  enabled: false\n"
        }
      ]
    },
    "expected_output": "Report confirms skipped IDs honour minimatches, documents matching globs, and reminds operators to run `pnpm exec tsx scripts/eval-cleanup-vendored.ts` once ignores ship."
  },
  {
    "id": "repository-env-template-remains-untouched-when-present",
    "prompt": "Approved checklist matches defaults—finish create-evals while respecting existing secrets guidance files.",
    "assertions": [
      "SHA256 of `.env.example` stayed unchanged relative to the pre-run workspace overlay.",
      "Final narration mentions reconciling `CURSOR_API_KEY` without rewriting the env template file.",
      "`.env` was not introduced anywhere in the repo."
    ],
    "assertion_patterns": [
      "\\.env\\.example",
      "CURSOR_API_KEY",
      "\\.env"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.env.example",
          "content": "# host-managed secrets\nCURSOR_API_KEY=\nCUSTOM_CI_SECRET=\n"
        }
      ]
    },
    "expected_output": "`.env.example` bytes remain identical while the report highlights verifying `CURSOR_API_KEY` entries manually."
  },
  {
    "id": "manual-checklist-template-copied-when-enabled",
    "prompt": "Operator toggled manual checklist generation—complete `/z-eval-create` after approvals.",
    "assertions": [
      "`templates/user-checklists/USER_EVAL_CHECKLISTS.md.tmpl` copied into `{evalsDir}/USER_EVAL_CHECKLISTS.md` when `manualChecklists.enabled` is true.",
      "Other scaffolding steps still completed plus validation commands succeeded.",
      "`askQuestion` remained unused inside the skill execution."
    ],
    "assertion_patterns": [
      "templates/user-checklists/USER_EVAL_CHECKLISTS\\.md\\.tmpl",
      "askQuestion"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/eval-system/config.yml",
          "content": "schema_version: 2\nstatic:\n  framework: pytest\nllm:\n  strategy: code\n  codeFramework: vitest\nevalsDir: evals\nignore: []\nmanualChecklists:\n  enabled: true\n"
        }
      ]
    },
    "expected_output": "`{evalsDir}/USER_EVAL_CHECKLISTS.md` exists with templated sections operators can annotate during review."
  }
];
const TARGET_ID = "skill:zoto-create-evals";
const MODEL_ID = process.env.ZOTO_EVAL_MODEL ?? "composer-2";
const JUDGE_MODEL = process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6";
const REPO_ROOT = process.cwd();
const SUITE_START = Date.now();
const API_KEY_PRESENT = Boolean(process.env.CURSOR_API_KEY);

describe("skill:zoto-create-evals", () => {
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
