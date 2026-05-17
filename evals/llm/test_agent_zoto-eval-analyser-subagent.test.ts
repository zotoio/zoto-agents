// _meta.generated: true
/**
 * LLM `code`-strategy eval for agent `zoto-eval-analyser-subagent`.
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
import type { CodeStrategyCaseDefinition } from "./_shared/code-strategy-case.js";


const CASES: CodeStrategyCaseDefinition[] = [
  {
    "id": "json-object-emitted-for-analyse-pipeline",
    "prompt": "Kick off the primitive-analysis pass for `pnpm run eval:analyse` using this subagent with the current envelope; I need the raw analyser response the SDK will parse.",
    "assertions": [
      "The subagent completion parses as a single JSON object whose first non-whitespace character is `{` and whose last non-whitespace character is `}`.",
      "The parsed root object includes schema_version, analyser_version, model_id, target_id, kind, source_path, source_hash, summary, and cases keys only at the top level."
    ],
    "assertion_patterns": [
      "\\{"
    ],
    "expected_output": "The completion is one JSON object that survives extraction and JSON.parse without wrapping prose or markdown fences."
  },
  {
    "id": "envelope-fields-echoed-unmodified",
    "prompt": "Return the AnalyserPayload for `agent:zoto-eval-analyser-subagent` while preserving every canonical envelope field the caller injected.",
    "assertions": [
      "schema_version is the integer 1, not a string.",
      "analyser_version, model_id, target_id, kind, source_path, and source_hash match the prompt envelope strings verbatim including target_id prefix agent:."
    ],
    "assertion_patterns": [],
    "expected_output": "Pinned metadata matches the supplied envelope exactly so downstream re-assertion succeeds."
  },
  {
    "id": "command-kind-slash-prompt-shape",
    "prompt": "Analyse `command:zoto-eval-update` at `plugins/vendor/commands/zoto-eval-update.md` for stamping; emit at least one case that mirrors how an operator launches it from the palette.",
    "assertions": [
      "At least one case prompt begins with `/zoto-eval-update` followed by arguments or whitespace suitable for the command palette.",
      "At least one assertion mentions an observable artefact such as manifest rows, emitted questions before writes, or filesystem outputs tied to that command flow."
    ],
    "assertion_patterns": [
      "/zoto-eval-update"
    ],
    "expected_output": "Generated cases include slash-command style prompts with realistic arguments."
  },
  {
    "id": "skill-upstream-load-message",
    "prompt": "Produce analyser rows for `skill:zoto-execute-evals` so the stamped eval reflects skill loading via upstream chat traffic rather than direct slash invocation.",
    "assertions": [
      "Every emitted case prompt avoids leading `/` command palette syntax reserved for command primitives.",
      "Assertions reference externally visible behaviour such as documented step ordering or read-before-write sequencing described for skills."
    ],
    "assertion_patterns": [
      "/"
    ],
    "expected_output": "Case prompts read like upstream agent messages that would cause the skill to load."
  },
  {
    "id": "hook-lifecycle-event-phrasing",
    "prompt": "Analyse `hook:zoto-eval-session-start` and ensure one scenario explicitly anchors on the Cursor lifecycle event that fires the hook bundle.",
    "assertions": [
      "At least one emitted case prompt states that Cursor's `sessionStart` hook phase runs `node hooks/zoto-eval-session-start.mjs` — the same phase keyed as `hooks.sessionStart` in the plugin `hooks.json` bundle — rather than only describing filesystem preconditions without naming the lifecycle trigger.",
      "Assertions cite observable outcomes like hook exit status 0, JSON-shaped stdout per Cursor hooks contract, or absence of askQuestion emissions from hook binaries."
    ],
    "assertion_patterns": ["sessionStart"],
    "expected_output": "At least one case prompt names the `sessionStart` lifecycle phase that invokes this hook entry so eval readers see which Cursor hook event wires the bundle."
  },
  {
    "id": "rule-constrained-user-request",
    "prompt": "Generate analyser coverage for `rule:zoto-eval-system` where prompts mimic a refactor chat that should activate rule constraints on matched globs.",
    "assertions": [
      "At least one case prompt reads like a user-authored editing request without a leading `/` token.",
      "Assertions mention whether rule enforcement triggers on documented globs or whether assistant replies obey stated constraints."
    ],
    "assertion_patterns": [
      "/"
    ],
    "expected_output": "Cases embed natural-language user intents typical of IDE chat rather than operator palette commands."
  },
  {
    "id": "agent-flow-natural-language-driver",
    "prompt": "When `kind` is agent for `agent:zoto-eval-comparer`, emit prompts phrased as conversational orchestration requests that exercise judge or compare flows.",
    "assertions": [
      "Every emitted `cases[].prompt` for `agent:zoto-eval-comparer` reads as conversational orchestration—delegating, sequencing, or steering `zoto-eval-comparer` via chat-shaped plain English—not as a bare palette one-liner; no prompt may begin with `/z-eval-compare` unless that token is quoted or clearly attributed operator text inside longer prose.",
      "Across emitted cases, compare-mode stakes appear explicitly (for example reconciling multiple `evals/_runs/...` snapshots via `report.yml`, preparing a `/canvas` JSON hand-off, full-path `needs_user_input` disambiguation when operands collide, or honouring the comparer no-`askQuestion` contract in assertions).",
      "Across emitted cases, judge-adjacent stakes appear explicitly (for example `/z-eval-judge` adjudicated rows, judge-tier columns like `accuracy` or `confidence` surviving flattening, or `judgeModel` / eval-system config prerequisites gating compare work)."
    ],
    "assertion_patterns": [],
    "expected_output": "Analyser JSON shows comparer targets driven by orchestration-style prompts that force both compare sequencing and judge-aware reconciliation themes, with assertions that cite structured blockers or observables instead of slash-led invocations."
  },
  {
    "id": "fixture-path-and-justification-pairing",
    "prompt": "If any generated case needs a workspace overlay, show fixtures.files entries using sandbox-relative paths only and pair them with fixture_justifications lines.",
    "assertions": [
      "Every fixtures.files[].path uses sandbox-relative POSIX form without `..` segments and without absolute filesystem prefixes.",
      "Whenever fixtures.files is non-empty, fixture_justifications exists with the same element count as fixtures.files in identical order."
    ],
    "assertion_patterns": [
      "\\.\\."
    ],
    "expected_output": "Fixture sections obey path constraints and justification cardinality rules."
  },
  {
    "id": "omit-fixtures-when-baseline-suffices",
    "prompt": "Analyse `rule:generic-doc-headers` where baseline checkout alone supplies enough context; avoid inventing per-case overlays.",
    "assertions": [
      "No case introduces fixtures.files entries solely to pad payload shape when baseline context is adequate.",
      "If fixtures are omitted entirely, no fixture_justifications array appears without accompanying files."
    ],
    "assertion_patterns": [],
    "expected_output": "Cases omit fixtures or declare fixtures.files as an empty array without speculative overlays."
  },
  {
    "id": "denylist-token-absence-in-case-text",
    "prompt": "Run analyser generation for `plugins/acme/rules/style.mdc` and scrub prompts plus expected_output strings so stale template tokens never ship.",
    "assertions": [
      "The emitted JSON contains none of the forbidden analyser substrings such as angle-bracket TODO markers or angle-bracket command markers.",
      "Each expected_output field remains plain English prose without embedding a full JSON envelope inside the description."
    ],
    "assertion_patterns": [],
    "expected_output": "Serialised case strings exclude angle-bracket template tails and other banned literals from the analyser hard rules."
  },
  {
    "id": "realistic-prompts-and-falsifiable-checks",
    "prompt": "Final review pass: ensure every case prompt could be pasted into Cursor chat or logs and every assertion names a concrete observable.",
    "assertions": [
      "Each assertion names at least one observable target such as manifest.yml contents, hook stdout JSON validity, filesystem paths created, exit codes, or parse success of the analyser JSON.",
      "scenario labels stay short and avoid vague correctness phrases without naming what changed."
    ],
    "assertion_patterns": [],
    "expected_output": "Prompts feel operator-authentic and assertions could be graded against traces or artifacts."
  }
];
const TARGET_ID = "agent:zoto-eval-analyser-subagent";
const MODEL_ID = process.env.ZOTO_EVAL_MODEL ?? "composer-2";
const JUDGE_MODEL = process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6";
const REPO_ROOT = process.cwd();
const SUITE_START = Date.now();
const API_KEY_PRESENT = Boolean(process.env.CURSOR_API_KEY);

describe("agent:zoto-eval-analyser-subagent", () => {
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
