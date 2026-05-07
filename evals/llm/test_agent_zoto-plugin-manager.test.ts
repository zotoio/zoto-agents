// _meta.generated: true
/**
 * LLM `code`-strategy eval for agent `zoto-plugin-manager`.
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
    "id": "greenfield-plugin-scaffold-via-create-plugin",
    "prompt": "We need a new Cursor plugin packaged under plugins/invoice-linker that ships one skill for reconciling line items with markdown exports. Outline how you would scaffold it here without diverging from monorepo conventions.",
    "assertions": [
      "the agent anchors execution on the zoto-create-plugin skill rather than improvising a nonstandard plugin skeleton",
      "the agent names plugins/invoice-linker/.cursor-plugin/plugin.json as the first manifest surface and enumerates required manifest keys from the documented table",
      "the agent states skill authoring will keep SKILL.md lean and park supporting detail under references/, scripts/, or assets/ per Agent Skills layout guidance"
    ],
    "assertion_patterns": [],
    "expected_output": "The agent ties execution to the zoto-create-plugin skill, lists the plugins/invoice-linker tree it will create, and spells out required plugin.json fields before proposing ancillary assets."
  },
  {
    "id": "pre-merge-audit-with-validation-commands",
    "prompt": "Audit plugins/zoto-eval-system end-to-end before we tag a release: manifest sanity, skill harness coverage, cross-links, and anything validation scripts would reject.",
    "assertions": [
      "the agent inspects plugins/zoto-eval-system/.cursor-plugin/plugin.json for required naming, semver, author, license, and description fields",
      "the agent verifies each skill directory includes evals/evals.json with at least two graded rows and explicit assertions",
      "the agent describes contrasting model outputs with the skill engaged versus a baseline run when iterating harness prompts",
      "the agent plans running node scripts/validate-template.mjs, node scripts/validate-skills.mjs, and cd plugins/zoto-eval-system && pnpm validate plus pnpm test from the repo root",
      "when hooks or MCP entries are declared, the agent checks hooks/hooks.json scripts and any referenced mcp.json paths resolve inside the plugin tree",
      "the closing report splits must-fix defects from optional polish items"
    ],
    "assertion_patterns": [],
    "expected_output": "The agent reads the plugin manifest, inventories agents/skills/commands/rules/hooks, cites eval coverage expectations, compares harness tightening strategies, and sequences template plus per-plugin validation commands with clear error-versus-warning grouping."
  },
  {
    "id": "add-slash-command-with-manifest-wiring",
    "prompt": "Add a new Cursor slash command under plugins/zoto-eval-system that jumps operators into the evaluator workflow, update plugin.json directory pointers if they drift, and leave the tree consistent for CI.",
    "assertions": [
      "the agent creates or extends a commands/*.md file whose frontmatter includes name and description",
      "the agent updates plugins/zoto-eval-system/.cursor-plugin/plugin.json only when the commands directory path or naming no longer matches reality",
      "the agent runs or prescribes pnpm validate inside plugins/zoto-eval-system after the edits settle"
    ],
    "assertion_patterns": [],
    "expected_output": "The agent drafts commands/*.md with compliant frontmatter, adjusts plugin.json command paths when needed, updates any dependent references, and finishes with validation commands."
  },
  {
    "id": "marketplace-submission-alignment",
    "prompt": "Prepare plugins/zoto-eval-system for marketplace publication: confirm marketplace.json registration matches the manifest identity and give a concise preflight checklist tied to this repo's validators.",
    "assertions": [
      "the agent compares plugins/zoto-eval-system/.cursor-plugin/plugin.json name with the matching marketplace.json plugins[].name and plugins[].source tuple",
      "the agent requires node scripts/validate-template.mjs before declaring the bundle marketplace-ready",
      "the checklist explicitly covers README, LICENSE, CHANGELOG, logo path validity, and keyword hygiene"
    ],
    "assertion_patterns": [],
    "expected_output": "The agent compares .cursor-plugin/marketplace.json plugin entries with the manifest name field, highlights mismatches, and lists submission gates including template validation."
  },
  {
    "id": "crux-compression-guidance-for-busy-rules",
    "prompt": "rules/release-guardrails.mdc ballooned past maintainability; walk me through enabling CRUX compression without losing enforceable intent inside Cursor.",
    "assertions": [
      "the agent instructs setting crux: true in rule frontmatter when adopting CRUX compression",
      "the agent references invoking /crux-compress after the rule content stabilizes",
      "the agent warns that compressed notation must still express concrete globs, triggers, and prohibitions observers can verify"
    ],
    "assertion_patterns": [],
    "expected_output": "The agent explains tagging the rule for CRUX processing and outlines how compressed notation preserves obligations while shrinking tokens."
  },
  {
    "id": "local-stale-plugin-copies-after-edits",
    "prompt": "I edited plugin agents locally but the IDE still serves older payloads—what is the supported resynchronization flow for this monorepo?",
    "assertions": [
      "the agent mentions automatic synchronization configured via .cursor/hooks.json firing on session start or relevant file edits",
      "the agent documents running node .cursor/hooks/sync-plugins.mjs --full when operators need an immediate refresh",
      "the agent lists syncable directories such as agents, commands, skills, rules, hooks, docs, templates, and dot-plugin metadata consistent with the agent brief"
    ],
    "assertion_patterns": [],
    "expected_output": "The agent cites hook-driven sync plus the manual full sync command and enumerates which directories copy into the local Cursor plugins mirror."
  }
];
const TARGET_ID = "agent:zoto-plugin-manager";
const MODEL_ID = process.env.ZOTO_EVAL_MODEL ?? "composer-2";
const JUDGE_MODEL = process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6";
const REPO_ROOT = process.cwd();
const SUITE_START = Date.now();
const API_KEY_PRESENT = Boolean(process.env.CURSOR_API_KEY);

describe("agent:zoto-plugin-manager", () => {
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
