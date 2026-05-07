// _meta.generated: true
/**
 * LLM `code`-strategy eval for agent `zoto-eval-configurer`.
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
    "id": "manifest-snapshot-happy-path-cleanup-ready",
    "prompt": "Spin up zoto-eval-configurer from /z-eval-configure with overwrite already settled in the task: static.framework vitest, llm.strategy code, llm.codeFramework vitest, preserveUserAuthoredCases true, writeMetaMarker true. The task payload bundles old_snapshot with source manifest reflecting the prior config so you can diff and return the cleanup_plan to the command. Summarise effective settings and steer me toward /z-eval-create unless cleanup totals require confirmation.",
    "assertions": [
      "The terminal agent output contains a cleanup_plan JSON object accepted by cleanup-plan.schema.json with totals.files matching the summed lengths of framework-switch, strategy-switch, or removed-target groups present in this run (zero when switching nothing).",
      "The response states that .zoto/eval-system/config.yml was rewritten atomically and matches templates/schema/config.schema.json without requesting additional clarification.",
      "No inline askQuestion or interactive questionnaire appears anywhere in assistant steps; only the enclosing command owns confirmation UI."
    ],
    "assertion_patterns": [],
    "expected_output": "Structured final report pairing the stamped .zoto/eval-system/config.yml snapshot with a cleanup_plan that satisfies the documented schema naming, echoes accurate totals.files, warns only when warranted, avoids askQuestion prompts, never deletes disks, ends with actionable pointers to execution or stale cleanup flows."
  },
  {
    "id": "filesystem-legacy-no-prior-strategy",
    "prompt": "Re-run configure mode where old_snapshot.source is filesystem (manifest predating subtask-01 inference). Apply static.framework pytest, llm.strategy declarative, honour overwrite already approved in the structured payload. Emit cleanup_plan deltas without inventing historical LLM artefacts.",
    "assertions": [
      "cleanup_plan excludes a strategy-switch group while old_snapshot lacked llm.strategy or llm.codeFramework, aligning with filesystem-mode rules.",
      "static.framework-derived fingerprints reference pytest assets rather than hallucinated manifests.",
      "preserveUserAuthoredCases and writeMetaMarker remain forced true throughout the narration with no solicitation to weaken them."
    ],
    "assertion_patterns": [],
    "expected_output": "Planner narrative plus cleanup_plan acknowledging filesystem inference: prior static fingerprints handled, declarative introduces no bogus strategy-switch files because earlier llm.strategy was unset, declarative-aligned cleanup reasons stay grouped correctly."
  },
  {
    "id": "missing-manifest-first-bootstrap",
    "prompt": "Drive configuration when old_snapshot.source is missing: initialise static.framework jest with llm.strategy declarative, rely on freshly collected answers, and recognise there is zero prior filesystem evidence.",
    "assertions": [
      "cleanup_plan lists no framework-switch, strategy-switch, or removed-target groups yet still sets totals.files to 0.",
      "The narration explicitly references greenfield initialise behaviour instead of pretending prior manifest rows exist."
    ],
    "assertion_patterns": [],
    "expected_output": "Final response writes the first config.yml cleanly and returns a cleanup_plan with groups.length zero while still summarising totals as zero-file operations."
  },
  {
    "id": "framework-switch-invalidates-manifest-rows",
    "prompt": "Use manifest-derived old_snapshot where static.framework flips pytest to vitest without touching llm.strategy, include overwrite rationale in payload, enumerate prior fingerprint outputs for cleanup grouping.",
    "assertions": [
      "cleanup_plan.groups contains framework-switch referencing the departed pytest fingerprints and associated stamped files enumerated in totals.files arithmetic.",
      "The completion message documents _meta.primitive_analysis.invalidate stamped true across generated eval_files[] manifest rows touched by automation while leaving cache blobs intact."
    ],
    "assertion_patterns": [],
    "expected_output": "Returned cleanup_plan includes a framework-switch group covering the departing framework fingerprint and every stamped static test artefact slated for teardown, totals.files summed, warns about cross mismatches only if warranted."
  },
  {
    "id": "strategy-switch-remaps-llm-cases",
    "prompt": "Switch llm.strategy from declarative to code with llm.codeFramework vitest against a manifest-backed old_snapshot highlighting prior declarative suites; keep static.framework vitest; overwrite predetermined.",
    "assertions": [
      "cleanup_plan presents a strategy-switch group listing erstwhile declarative case rows or declarative-derived *.test.ts assets slated for rework."
    ],
    "assertion_patterns": [],
    "expected_output": "Planner details strategy-switch removals or rewrites keyed to declarative artefacts while satisfying config schema pairing code strategy with Vitest scaffolding."
  },
  {
    "id": "narrowed-discovery-removes-eval-json",
    "prompt": "Adjust discoveryTargets ignoring a plugin path manifest already catalogued stale eval_json rows produced by tooling; propagate overwrite flag and diff against canonical manifest snapshot.",
    "assertions": [
      "cleanup_plan includes removed-target documenting each orphan eval JSON keyed to ignored discovery scopes."
    ],
    "assertion_patterns": [],
    "expected_output": "Planner flags removed-target grouping for orphaned generated eval manifests while leaving user-authored safeguards intact."
  },
  {
    "id": "invalid-code-strategy-without-framework",
    "prompt": "Structured payload asserts llm.strategy code but withholds llm.codeFramework intentionally; insist the agent refuses silent defaults.",
    "assertions": [
      "The agent returns needs_user_input with explicit questions referencing missing llm.codeFramework instead of fabricating configs.",
      "Neither askQuestion widgets nor unauthorised config.yml commits appear anywhere in streamed steps."
    ],
    "assertion_patterns": [],
    "expected_output": "needs_user_input payload enumerating precisely which frameworks are permissible and why code strategy cannot proceed unanswered."
  },
  {
    "id": "static-llm-jest-vitest-mismatch-warning",
    "prompt": "Maintain llm.strategy code while setting static.framework vitest alongside llm.codeFramework jest deliberately; insist cleanup_plan captures soft violations while still producing schema-valid artefacts.",
    "assertions": [
      "cleanup_plan.warnings cites the vitest-vs-jest skew as non-blocking telemetry."
    ],
    "assertion_patterns": [],
    "expected_output": "warnings[] entry describing static versus code-framework mismatch plus paired framework-switch coverage for orphaned Vitest artefacts."
  },
  {
    "id": "disallowed-meta-flag-rejection",
    "prompt": "Upstream command mistakenly supplies preserveUserAuthoredCases false in the bundled answers; insist the configured agent rejects that contract breakage before writing configs.",
    "assertions": [
      "Assistant output refuses to honour false preserveUserAuthoredCases requests and reaffirms mandated true stamping."
    ],
    "assertion_patterns": [],
    "expected_output": "Structured refusal explaining both meta flags remain hard-true governance without mutating manifests or emitting cleanup confirmations."
  },
  {
    "id": "audit-append-only-scope",
    "prompt": "Routine configure run after successful manifest diff; insist final narrative reaffirms authorised write paths excluding arbitrary repo edits beyond config.yml manifest.history audit stamping and mandated manifest row invalidations.",
    "assertions": [
      "Assistant transcript contains no prose promising direct rm or workspace-wide rewriting outside .zoto/eval-system config or manifest-history updates plus targeted manifest eval_files[] invalidation markers."
    ],
    "assertion_patterns": [],
    "expected_output": "Explicit confirmation that deletes await pnpm-run cleanup while only permitted writes touch .zoto/eval-system boundaries with manifest-history logging."
  }
];
const TARGET_ID = "agent:zoto-eval-configurer";
const MODEL_ID = process.env.ZOTO_EVAL_MODEL ?? "composer-2";
const JUDGE_MODEL = process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6";
const REPO_ROOT = process.cwd();
const SUITE_START = Date.now();
const API_KEY_PRESENT = Boolean(process.env.CURSOR_API_KEY);

describe("agent:zoto-eval-configurer", () => {
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
