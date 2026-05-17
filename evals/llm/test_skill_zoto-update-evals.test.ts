// _meta.generated: true
/**
 * LLM `code`-strategy eval for skill `zoto-update-evals`.
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
    "id": "dry-run-reload-uses-manifest-backed-discovery-without-writes",
    "prompt": "We finished editing a SKILL.md under the configured skills root and want only a sanity pass before approving anything. Following zoto-update-evals, spell out exactly what `/z-eval-update` with no extra flags reads first, whether it writes anywhere, which discovery settings it must obey, and why eval-analyse / eval-stamp ignore ignore globs from pnpm eval:discover unless replicated manually.",
    "assertions": [
      "Step one loads `.zoto/eval-system/config.yml` and `.zoto/eval-system/manifest.yml` before snapshot access.",
      "The no-argument invocation is a rediscovery dry run that does not write regenerated eval artifacts.",
      "Rediscovery honours `manifest.discovery_config` for skillsRoots, discoveryTargets, and related knobs rather than resurrecting legacy `config.json.discoveryTargets`.",
      "Optional ignore globs are applied by `pnpm run eval:discover` and manifest snapshots, while analyser stamp paths omit those filters unless the operator reapplies them out of band.",
      "Active static framework and LLM stamping choices come from `readManifestSnapshot()` via `static.framework`, `llm.strategy`, and `llm.codeFramework` fields.",
      "Immediately after `/z-eval-create`, a `/z-eval-update` dry run should surface no unexpected critical drift when every discovered hash still matches the manifest snapshot."
    ],
    "assertion_patterns": [
      "\\.zoto/eval-system/config\\.yml",
      "manifest\\.discovery_config",
      "pnpm run eval:discover",
      "readManifestSnapshot\\(\\)",
      "/z-eval-create"
    ],
    "expected_output": "The reply lists config and manifest reads, cites manifest.discovery_config for discovery, confirms no writes on the bare dry run, distinguishes optional ignore globs as discover-only, and mentions that freshly bootstrapped trees should classify targets as unchanged when hashes align."
  },
  {
    "id": "missing-manifest-aborts-with-fixed-operator-guidance",
    "prompt": "Onboarding checklist: `.zoto/eval-system/config.yml` exists but `.zoto/eval-system/manifest.yml` is absent. According to zoto-update-evals, what single abort message must the updater surface and what prior command should operators run instead?",
    "assertions": [
      "When `.zoto/eval-system/manifest.yml` is missing, the updater aborts quoting the documented string `Run /z-eval-create first.`"
    ],
    "assertion_patterns": [
      "\\.zoto/eval-system/manifest\\.yml"
    ],
    "expected_output": "The assistant states work stops until manifest exists and names the prerequisite create instruction exactly as documented."
  },
  {
    "id": "ci-drift-gate-runs-parity-tooling-then-exits-cleanly-or-with-configured-code",
    "prompt": "We are wiring `/z-eval-update --check` into a headless CI job. Outline every prerequisite script it invokes before delta review, whether it may prompt, how critical drift reaches stderr, and which exit statuses mean parity plus drift cleared versus gated failure defaults.",
    "assertions": [
      "Check mode executes `pnpm exec tsx scripts/check-analyser-payload-parity.ts` before interpreting drift so TS and Python analyser payloads stay aligned.",
      "The mode stays non-interactive with no prompts for operators or subagents.",
      "Stdout prints a JSON summary line and stderr emits per-critical-delta JSON lines when problems exist.",
      "Exit status `0` means clean parity and no blocking drift, while unresolved critical deltas return `config.update.checkExitCodeOnCriticalDrift` defaulting to `2` instead of succeeding silently.",
      "Parity violations surface under the `parity_drift` key inside the emitted report."
    ],
    "assertion_patterns": [
      "pnpm exec tsx scripts/check-analyser-payload-parity\\.ts",
      "0",
      "parity_drift"
    ],
    "expected_output": "The reply cites the parity TypeScript harness, stresses fully non-interactive behaviour, mentions JSON summary emission plus stderr lines for critical deltas, and names exit 0 versus the configurable critical-drift exit defaulting to two."
  },
  {
    "id": "apply-path-refreshes-analyser-payloads-then-dispatches-stampers-safely",
    "prompt": "A covered primitive hash changed upstream. Explain the default `--apply` sequence after classification: where `runAnalyser({ target, invalidate: true })` fires, how pytest versus vitest versus jest stamping is chosen, how `declarative` differs from `code` stamping, how manifest bookkeeping updates, what JSON artefact summarizes the job, and why the Cursor skill binary must remain free of askQuestion calls.",
    "assertions": [
      "Added or modified targets call `pnpm run eval:analyse` through `runAnalyser` unless `--no-analyser` swaps in cached payloads.",
      "`static.framework` routes to `pytest`, `vitest`, or `jest` regeneration helpers ending in per-primitive stampers.",
      "`llm.strategy` toggles between `regenerateLlmCode` stamping and `regenerateLlmDeclarative()` merges that splice generated rows via `json-source-map` plus `buildDeclarativeStampedCase()` instead of rewriting entire mixed `evals.json` files.",
      "Successful writes refresh `.zoto/eval-system/manifest.yml` with renewed `git_ref`, `updated_at`, `generated_by: zoto-update-evals`, and rediscovered `targets` carrying fresh `content_hash` values.",
      "History handling appends a new snapshot to `.zoto/eval-system/manifest.history.yml` without compacting prior entries.",
      "The terminal summary object includes `mode`, `regenerated_targets`, `files_written`, `files_preserved_user_authored`, `user_cases_preserved`, and `reports[]` with per-framework metrics.",
      "Interactive confirmations are owned by the `/z-eval-update` command resume path, not emitted from the skill implementation itself."
    ],
    "assertion_patterns": [
      "pnpm run eval:analyse",
      "static\\.framework",
      "llm\\.strategy",
      "\\.zoto/eval-system/manifest\\.yml",
      "\\.zoto/eval-system/manifest\\.history\\.yml",
      "mode",
      "/z-eval-update"
    ],
    "expected_output": "The narration walks queued primitives through analyser refresh, dispatcher tables, declarative surgical edits versus code regeneration, refreshed manifest sections, appended history, structured summary payload, and defers prompting to the command layer."
  },
  {
    "id": "targeted-glob-scopes-deltas-while-keeping-prompts-command-owned",
    "prompt": "Operators need a narrow refresh: `/z-eval-update --target 'skill:zoto-*' --apply`. Map how the glob matches discovered metadata, which target lists get filtered, and where approval prompts live relative to the skill body.",
    "assertions": [
      "Glob resolution compares the pattern against either `target.path` or `target.id` using dot-aware rules from the manifest inventory.",
      "Only the filtered subset of discovered targets participates in delta classification and stamping.",
      "Apply-mode confirmations remain command-owned resumes rather than skill-level prompts."
    ],
    "assertion_patterns": [
      "target\\.path"
    ],
    "expected_output": "The answer ties glob resolution to path or id fields, limits delta computation to the matched subset, and reminds that apply decisions still flow through the command resume channel."
  },
  {
    "id": "cached-analyser-reuse-surfaces-ci-safeguards",
    "prompt": "`--no-analyser` plus `--apply` just landed in CI for speed. Explain where payloads load from on disk, the stderr banner emitted when `CI=true`, and how `update.failOnNoAnalyserInCI` escalates failures.",
    "assertions": [
      "Bypassing LLM refreshes loads analyser artefacts from deterministic JSON files rooted at `.zoto/eval-system/cache/analyser/` whose filenames derive from each primitive SHA-256 source hash digest.",
      "When `process.env.CI === \"true\"` and cached payloads are reused (explicit `--no-analyser`, or omitting `--with-analyser` so CI defaults to cache reuse), stderr logs `[CI WARNING]` referencing skipped fresh primitive analysis.",
      "Setting `update.failOnNoAnalyserInCI: true` terminates the updater with exit code `5` during those CI cached-analysis runs immediately after emitting the stderr warning."
    ],
    "assertion_patterns": [
      "\\.zoto/eval-system/cache/analyser/",
      "process\\.env\\.CI === \"true\"",
      "update\\.failOnNoAnalyserInCI: true"
    ],
    "expected_output": "The guidance names the hashed cache filenames, cites the stderr warning substring, and documents exit five when escalation is configured."
  },
  {
    "id": "delta-taxonomy-ties-critical-severity-to-configurable-rules",
    "prompt": "Teach QA how zoto-update-evals buckets manifest deltas (`added`, `removed`, `modified`, `unchanged`) and tie each modification subtype to its criticality knobs, including whitespace-only tweaks.",
    "assertions": [
      "Classification recognizes `added`, `removed`, `modified`, and `unchanged` targets between manifest snapshots and freshly discovered inventories.",
      "Criticality for additions depends on `addedTargetWithoutCoverage` when invoked.",
      "Removed targets hinge on coverage by active generated cases gated by `removedTargetWithActiveCases`.",
      "Frontmatter name or description deltas consult `skillFrontmatterChange`, while behavioural surface deltas consult `publicSurfaceChange`.",
      "Comment-only or whitespace churn is explicitly non-critical per the surgical-diff policy."
    ],
    "assertion_patterns": [
      "added",
      "addedTargetWithoutCoverage",
      "removedTargetWithActiveCases",
      "skillFrontmatterChange"
    ],
    "expected_output": "The rundown enumerates the four classifications, aligns each with matching `criticalChangeRules` toggles, and marks whitespace deltas as benign."
  },
  {
    "id": "user-authored-eval-rows-and-tests-survive-regeneration-guards",
    "prompt": "We ship mixed `evals.json` bundles and handwritten Vitest files. Summarize every runtime and compile guard in `evals/_llm/_user-case-guards.ts`, marking rules for `_meta.generated` on cases versus first-line markers on `.test.ts` or `.py` files, and note how helpers record skipped paths versus declarative splice paths.",
    "assertions": [
      "`isGeneratedCase` leaves rows without `_meta` or with `_meta.generated === false` byte-identical while replacing only stamped generated rows.",
      "`isGeneratedFile` refuses overwriting `*.test.ts`, `*.test.js`, or `*.test.py` files lacking the literal first-line `_meta.generated` marker, logging `manual_merge_required` and listing skips under `files_preserved`.",
      "Declarative merges route through parsers like `json-source-map` with `surgicallyReplaceGeneratedCases()` rather than rewriting entire JSON documents when only generated sections change.",
      "Generated TypeScript/JavaScript markers use `// _meta.generated: true` while Python equivalents use `# _meta.generated: True` on line one.",
      "Unit expectations in `scripts/__tests__/eval-update-guards.test.ts` assert user rows stay untouched, unmarked tests survive, marked tests regenerate, and CI cached analyser stderr matches the guarded skips-fresh warning substring."
    ],
    "assertion_patterns": [
      "isGeneratedCase",
      "isGeneratedFile",
      "json-source-map",
      "// _meta\\.generated: true",
      "scripts/__tests__/eval-update-guards\\.test\\.ts"
    ],
    "expected_output": "The explanation distinguishes `isGeneratedCase` protections for mixed JSON arrays from `isGeneratedFile` skips, cites literal marker strings on line one, mentions `manual_merge_required`, and reinforces surgical JSON patching for declarative mixes."
  },
  {
    "id": "coverage-footprint-lists-dual-plugin-and-dot-cursor-layouts",
    "prompt": "Document every filesystem location zoto-update-evals examines for drift, including mirrored plugin and `.cursor` command or agent manifests plus the canonical hook identifier noted in the skill.",
    "assertions": [
      "Skills read coverage from nested `evals/evals.json` files inside each declared skill directory rooted at configured `skillsRoots` paths.",
      "Commands reconcile plugin-scoped JSON under each plugin eval tree alongside sibling copies under `.cursor/evals/commands/` for matching command primitives.",
      "Agents reconcile plugin-scoped JSON under each plugin eval tree alongside sibling copies under `.cursor/evals/agents/` for matching agent primitives.",
      "Hooks reconcile plugin-level hook manifests under each plugin eval hooks folder together with `.cursor/evals/hooks/hooks.json`, treating `hook:cursor-workspace` as the canonical bundled hook target identifier."
    ],
    "assertion_patterns": [
      "evals/evals\\.json",
      "\\.cursor/evals/commands/",
      "\\.cursor/evals/agents/",
      "\\.cursor/evals/hooks/hooks\\.json"
    ],
    "expected_output": "The answer enumerates per-primitive directories for skills, duplicated command and agent paths, hooks files, and cites `hook:cursor-workspace` explicitly."
  }
];
const TARGET_ID = "skill:zoto-update-evals";
const MODEL_ID = process.env.ZOTO_EVAL_MODEL ?? "composer-2";
const JUDGE_MODEL = process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6";
const REPO_ROOT = process.cwd();
const SUITE_START = Date.now();
const API_KEY_PRESENT = Boolean(process.env.CURSOR_API_KEY);

describe("skill:zoto-update-evals", () => {
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
