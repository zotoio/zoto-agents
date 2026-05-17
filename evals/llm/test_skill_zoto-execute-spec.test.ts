// _meta.generated: true
/**
 * LLM `code`-strategy eval for skill `zoto-execute-spec`.
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
    "id": "config-present-defaults-and-missing-file-abort",
    "prompt": "Repo has specs/payments-rail-ledger/ ready for hands-on implementation; orchestrate execution using the zoto spec system and honour whatever limits the repo's spec-system config defines.",
    "assertions": [
      "Before any subagents run, the agent reads `.zoto/spec-system/config.yml` at the repository root and, when the file is missing, aborts with the message: Run `/z-spec-init` first to scaffold `.zoto/spec-system/config.yml`.",
      "When the configuration file contains only comments, the agent still proceeds because that content parses to an empty mapping and every key uses its schema default.",
      "User-visible path substitutions use the configured `specsDir`, and wording uses the configured `unitOfWork` singular term where the skill calls for that vocabulary.",
      "The agent only drives execution for specs under `{specsDir}/` that are Ready for Review unless the operator explicitly asked to run a Draft spec.",
      "The agent states the effective `spec.parallelLimit` (default four when unset) whenever it discusses concurrent subagents for a phase.",
      "The agent describes aggregator behaviour using `aggregator.pollIntervalMs` and `aggregator.debounceMs` defaults (1500 ms and 250 ms) when those details matter to the operator."
    ],
    "assertion_patterns": [
      "\\.zoto/spec-system/config\\.yml",
      "specsDir",
      "\\{specsDir\\}/",
      "spec\\.parallelLimit",
      "aggregator\\.pollIntervalMs"
    ],
    "expected_output": "The agent loads `.zoto/spec-system/config.yml` from the repository root before spawning work; if that file is absent it stops after telling the operator to run `/z-spec-init` first with the exact prescribed sentence. If the file exists but is only comments, it treats that as an empty mapping and continues with documented defaults (including `specsDir` specs, `unitOfWork` spec, parallel limit four, and aggregator timing defaults) in user-facing limits."
  },
  {
    "id": "step-1-manifest-validation-halts-on-inconsistency",
    "prompt": "Under specs/api-throttle-20260201/ there is an index and manifest we want executed; load that spec folder and validate the Subtask Manifest before anyone spawns work.",
    "assertions": [
      "Step 1 locates the spec index file matching `spec-[feature-name]-[yyyymmdd].md` under `{specsDir}/[feature-directory]/` and treats the Subtask Manifest table as the single source of truth for subagent assignment and dependency ordering.",
      "For every manifest row the agent verifies the subtask markdown exists at the File column path and that the Metadata section's subagent and dependencies match the manifest.",
      "The agent rejects manifests where any subtask depends on a higher-numbered subtask id and reports that violation before execution.",
      "The agent builds execution order from the Phase column and does not start Step 3 execution when Step 1 finds missing files, mismatched agents, or dependency violations."
    ],
    "assertion_patterns": [
      "spec-\\[feature-name\\]-\\[yyyymmdd\\]\\.md"
    ],
    "expected_output": "The agent reads the dated spec index markdown under the feature directory, parses the Subtask Manifest table as authoritative, verifies each listed subtask file path exists, cross-checks each subtask's Metadata against the manifest row, rejects any dependency that points to a higher-numbered subtask id, derives phase ordering from the Phase column, and stops with a concrete inconsistency report instead of spawning if anything fails those checks."
  },
  {
    "id": "step-2-approval-recap-and-step-2b-utc-start-timestamp",
    "prompt": "Manifest validation passed for specs/cache-warmup-jan03/; show me the execution summary and wait for my go-ahead before you spawn subagents.",
    "follow_ups": [
      "Yes — start execution now and record the official start time for the report."
    ],
    "assertions": [
      "Step 2 presents `## Execution Summary` with the Spec name, subtask count, phase count, parallel limit taken from configuration (default four), and a markdown table reproducing ID, File, Subagent, Dependencies, and Phase columns from the manifest.",
      "The recap ends by asking the operator to proceed with execution using the Yes or No choice called for in the skill.",
      "Immediately after the operator confirms execution, Step 2b runs `date -u '+%Y-%m-%d %H:%M:%S UTC'` and stores that timestamp for the execution report duration calculation.",
      "The agent does not spawn subtasks for Step 3 until after that confirmation gate completes."
    ],
    "assertion_patterns": [
      "## Execution Summary",
      "date -u '\\+%Y-%m-%d %H:%M:%S UTC'"
    ],
    "expected_output": "The agent renders an execution summary whose headings and bullet labels match the skill template (Spec, Subtasks, Phases, Parallel limit, Subtask Manifest table) filled with real values, substitutes the configured parallel limit, uses the configured unit-of-work wording naturally, asks Proceed with execution with Yes or No options, and only after an affirmative answer runs `date -u '+%Y-%m-%d %H:%M:%S UTC'` and retains that UTC string for later reporting."
  },
  {
    "id": "step-3-phased-execution-checklist-updates-and-progress-rules",
    "prompt": "Approved — run Phase 1 and Phase 2 subtasks for specs/ingest-pipeline-feb14/ under the manifest ordering; keep checklists honest and respect concurrency caps.",
    "assertions": [
      "Before spawning, the agent reads `spec.parallelLimit` from `.zoto/spec-system/config.yml` (default four) and never exceeds that many concurrent subagents within a phase.",
      "Within each phase the agent spawns the Subagent named in the manifest column without substituting a different subagent type.",
      "Each spawned worker receives the complete subtask file content, pertinent spec index context, the status markdown and YAML paths issued via the spawn prefix (per subtask 04), Deliverables checklist ticking instructions, Definition-of-Done ticking instructions, and guidance to record artifacts plus blockers in Execution Notes.",
      "The agent waits for every subtask in the current phase to finish before starting the next phase and batches extra peers when a phase lists more rows than the parallel limit.",
      "The agent updates the spec index after individual subtask completions with status, touched files, blockers, and timing rather than only at the very end.",
      "While subtasks still run in parallel waves, the agent does not kick off the whole-repository test suite, reserving that for Step 5.",
      "During Step 3 the agent keeps automated testing scoped to targeted checks on files each subagent touched rather than the entire repository suite.",
      "If a subtask fails or a dependency fails, the agent stops dependent work and asks the operator whether to retry, skip, or abort instead of silently continuing."
    ],
    "assertion_patterns": [
      "spec\\.parallelLimit"
    ],
    "expected_output": "The agent re-reads `spec.parallelLimit`, runs all Phase 1 subtasks together up to that concurrency cap, batches additional peers inside the same phase when needed, waits for the entire phase to finish before Phase 2, spawns only the manifest-listed subagent types without reassignment, passes each subagent its full subtask markdown plus relevant index context and status paths from the spawn prefix, instructs in-file Deliverables and Definition-of-Done checkbox ticking as work completes, tells subagents to log touched files and blockers in Execution Notes, updates the spec index after subtask completion, and avoids launching the full project test suite while parallel subtasks are still in flight."
  },
  {
    "id": "status-pair-ownership-heartbeat-and-yml-authority",
    "prompt": "For the active subtask under specs/search-index-mar07/status/, spell out how executors and workers coordinate the `.status.yml` and `.status.md` pair during the run.",
    "assertions": [
      "After spawning a subagent the executor stops writing that subtask's `.status.yml`, treating the worker's updates as truth while the aggregator only reads those files.",
      "Workers follow the heartbeat contract: `state: in_progress` with `started_at` and `last_heartbeat` at start, `last_heartbeat` updates after checklist ticks or artifact writes, and final `completed_at` plus terminal `state` when finishing.",
      "Checklist completion is driven by flipping `checklist[].done` in YAML (and optional `evidence_path`), then refreshing the paired `.status.md` through `spec-status-roundtrip md-from-yml` (or the `heartbeat` subcommand via `pnpm --filter @zoto-agents/zoto-spec-system run spec-status-roundtrip -- heartbeat`) rather than editing `.status.md` directly during execution.",
      "Artifacts append with `kind` created, modified, or deleted plus a short note, and structured issues land in `errors[]` with severities `info`, `warn`, or `error`, using `state: blocked` with an error entry when work cannot continue.",
      "Workers refuse to call the subtask Verified or Done unless `state: completed` and every `checklist[].done` is true."
    ],
    "assertion_patterns": [
      "\\.status\\.yml",
      "state: in_progress",
      "checklist\\[\\]\\.done",
      "kind",
      "state: completed"
    ],
    "expected_output": "The agent explains that after spawn the executor never mutates the subtask `.status.yml`, workers follow the heartbeat fields protocol, mutate checklists in YAML (optionally recording evidence paths), refresh markdown only through `spec-status-roundtrip` (preferring the heartbeat subcommand), forbid hand-editing the markdown during execution, record artifacts and structured severities, enforce the completed-state contract, and rely on the aggregator to read without taking ownership of per-subtask YAML."
  },
  {
    "id": "spawn-prefix-budget-line-live-reload-reload-failure-and-legacy-layout",
    "prompt": "Explain how token budgets reach subagents, how live config reload interacts with `spec-aggregator --watch`, and what changes when a spec directory lacks `status/`.",
    "assertions": [
      "Each spawn executes `tsx plugins/zoto-spec-system/scripts/spec-spawn-prefix.ts --role <role> --status-yml <path> --status-md <path>` and the first line of stdout matches the required Token budget sentence with the resolved numeric cap plus instructions to record `token_budget` and to add a warn-level `errors[]` entry when exceeding it.",
      "Changes to `subagents.*.tokenBudget` apply to the next spawned subagent without restarting the executor coordinator.",
      "`spec-aggregator --watch` invokes `loadConfig(repoRoot, prevMtimeMs)` at the beginning of every poll iteration using `aggregator.pollIntervalMs` (default 1500 ms) and honours live updates to `aggregator.debounceMs`, `aggregator.enabled`, `subagents.*.model`, and `spec.parallelLimit` on subsequent ticks or spawns.",
      "When `ConfigValidationError` appears during reload the watcher retains the previous valid configuration, keeps running, and appends an `events[]` record on the spec-root `status.yml` with `severity: error` and `kind: config_reload_failed`.",
      "If `spec-spawn-prefix.ts` exits non-zero the executor reuses the last successfully resolved prefix text and still proceeds with the spawn.",
      "Aggregator passes digest checks combining subtask mtimes with the live-reloadable configuration slice and skips rewriting spec-root `status.md` and `status.yml` when nothing changed.",
      "If `<specDir>/status/` is absent the executor logs `status/ directory absent — running legacy spawn path`, does not launch `spec-aggregator --watch`, does not run `spec-spawn-prefix`, and omits status path hints from subagent prefixes.",
      "The agent distinguishes settings that hot reload (token budgets, models, aggregator timing or enablement, parallel limit) from those that demand a fresh invocation (`unitOfWork`, `specsDir`, `workDir`, `hooks.*`, `extensions.*`)."
    ],
    "assertion_patterns": [
      "tsx plugins/zoto-spec-system/scripts/spec-spawn-prefix\\.ts --role <role> --status-yml <path> --status-md <path>",
      "subagents\\.\\*\\.tokenBudget",
      "spec-aggregator --watch",
      "ConfigValidationError",
      "spec-spawn-prefix\\.ts",
      "status\\.md",
      "<specDir>/status/",
      "unitOfWork"
    ],
    "expected_output": "The agent states that each spawn runs `tsx plugins/zoto-spec-system/scripts/spec-spawn-prefix.ts` with role and status paths so the first stdout line matches the mandated token budget sentence with the resolved integer, that updated per-role token budgets apply on the next spawn without restarting the executor, that the watching aggregator calls `loadConfig` at the start of every poll (1500 ms default) while keeping debounce 250 ms, that failed reloads keep the last valid config and append a spec-root `status.yml` event `{ severity: error, kind: config_reload_failed }`, that a non-zero prefix script exit reuses the last good prefix, that digest-stable aggregator ticks skip rewriting spec-root files, and that missing `<specDir>/status/` triggers the legacy log line, skips aggregator watch, skips `spec-spawn-prefix`, and withholds status paths from prompts."
  },
  {
    "id": "aggregator-cli-modes-and-process-lifecycle",
    "prompt": "We need a one-off dashboard rebuild and a CI validation pass for the same spec root — which `spec-aggregator` invocations apply?",
    "assertions": [
      "The agent backgrounds `spec-aggregator --watch` during normal execution and treats that process as the sole writer of the spec-root `status.md` and `status.yml`, tracking its PID and stopping it with SIGINT or SIGTERM when cancelling.",
      "For ad-hoc rebuilds the agent references `tsx scripts/spec-aggregator.ts --repo-root <repoRoot> --once`.",
      "For CI gates the agent references the same entrypoint with `--validate-only`, expecting a non-zero exit if any subtask source fails validation and no spec-root writes in that mode.",
      "The watch mode continues to reload configuration each polling cycle as documented for aggregator execution."
    ],
    "assertion_patterns": [
      "spec-aggregator --watch",
      "tsx scripts/spec-aggregator\\.ts --repo-root <repoRoot> --once",
      "--validate-only"
    ],
    "expected_output": "The agent instructs running `tsx scripts/spec-aggregator.ts` with `--repo-root`, describes `--watch` as the default long-running mode that reloads configuration each poll, `--once` as a single aggregation pass for dashboards or resume flows, and `--validate-only` as a no-write CI validator that exits non-zero on invalid subtask sources, and notes the executor tracks the watch PID and ends it with SIGINT or SIGTERM on cancellation."
  },
  {
    "id": "step-4-adversarial-verification-non-interference-and-fix-routing",
    "prompt": "First subtask for specs/webhook-hardening-apr22/ just finished its worker; run the mandatory judge pass and outline how Partial verdicts get fixed.",
    "assertions": [
      "After each executing subagent completes Step 3 the coordinator spawns a new `zoto-spec-judge` instance as a background subagent for adversarial verification.",
      "The judge reads Deliverables and Definition-of-Done from the subtask markdown read-only, treats `.status.yml` as live truth, and inspects deliverables on disk including build, lint, and test expectations spelled out in the skill.",
      "The judge reconciles checklist truth only inside the per-subtask `.status.yml` (and derived `.status.md` through round-trips), never mutates subtask deliverables, the subtask brief, the spec index, the execution report, or spec-root `status.{md,yml}` during Mode 1.",
      "For Partial or Failed verdicts the executor surfaces `extra.judge.fix_list`, sets the manifest Status column accordingly, offers the operator the documented choices (re-spawn the assigned subagent with the fix list, accept-as-is and continue, or abort), and re-spawns the originally assigned subagent type only after the operator selects that path—never by editing code itself.",
      "Following a fix-list remediation the executor launches another distinct `zoto-spec-judge` pass before advancing dependencies.",
      "A Verified verdict updates the manifest Status column to `Done` before moving on, while Failed stops downstream dependents until the operator chooses how to proceed."
    ],
    "assertion_patterns": [
      "zoto-spec-judge",
      "\\.status\\.yml",
      "\\.status\\.yml",
      "extra\\.judge\\.fix_list",
      "zoto-spec-judge",
      "Done"
    ],
    "expected_output": "The agent schedules a fresh `zoto-spec-judge` subagent in the background after the executing subagent finishes, ensures the judge reads the markdown brief and the live YAML, cross-checks claimed checklist rows against disk, keeps reviewer edits confined to the per-subtask status pair via YAML-driven markdown refresh, never lets the judge mutate deliverables or spec-root aggregation files, maps Partial or Failed `extra.judge.fix_list` entries back through a re-spawn of the original manifest subagent (never executor-authored patches), and schedules another brand-new judge after the fix cycle."
  },
  {
    "id": "step-5-finish-line-onstop-gate-report-and-completion-handoff",
    "prompt": "All phased subtasks for specs/idempotency-keys-may05/ passed adversarial review; close out final verification, run the mandated consistency CLI, write the execution report, and get my sign-off.",
    "assertions": [
      "Step 5 verifies every manifest entry is `Done`, otherwise it reports Partial or Failed rows and seeks guidance before claiming closure.",
      "The agent walks the spec index `## Definition of Done`, ticks confirmed items in that markdown, and understands those ticks feed `definition_of_done_status` in the spec-root `status.yml` through aggregation.",
      "The agent runs the repository's full automated test suite and performs linter passes on all files touched during execution during Step 5 rather than during parallel Step 3 waves.",
      "The agent spawns a fresh `zoto-spec-judge` subagent for the concise quality audit mandated in Step 5.",
      "Before declaring completion the agent runs `pnpm --filter @zoto-agents/zoto-spec-system exec tsx plugins/zoto-spec-system/scripts/spec-onstop-check.ts --human --repo-root <repoRoot>` and treats exit code 2 as a hard stop until critical inconsistencies are cleared.",
      "The agent references the defence-in-depth `hooks/zoto-onstop-check.mjs` stop hook as sharing that consistency library when explaining why the sweep must pass.",
      "Step 6 captures the ending UTC timestamp using the same `date -u` helper, computes duration from the Step 2b start timestamp, and writes `execution-report-[feature-name]-[yyyymmdd].md` with the Summary, Subtask Results, Verification, Files Modified, Outstanding Items, and Lessons Learned sections described in the skill.",
      "Step 7 presents the templated completion summary with `{specsDir}` replaced by the configured directory and asks for final approval using the prescribed wording.",
      "After approval Step 8 updates the spec index status to `Completed`, fills execution notes, and reports completion to the operator."
    ],
    "assertion_patterns": [
      "Done",
      "## Definition of Done",
      "zoto-spec-judge",
      "pnpm --filter @zoto-agents/zoto-spec-system exec tsx plugins/zoto-spec-system/scripts/spec-onstop-check\\.ts --human --repo-root <repoRoot>",
      "hooks/zoto-onstop-check\\.mjs",
      "date -u",
      "\\{specsDir\\}",
      "Completed"
    ],
    "expected_output": "The agent confirms every manifest row reads `Done`, ticks the spec index Definition-of-Done section against reality, runs the full project test suite and repository linter checks, spawns another `zoto-spec-judge` for the quality audit, updates docs when behaviour changed, runs `pnpm --filter @zoto-agents/zoto-spec-system exec tsx plugins/zoto-spec-system/scripts/spec-onstop-check.ts --human --repo-root <repoRoot>` and refuses to finish if it exits 2, captures a closing UTC timestamp via the same `date -u` pattern, writes `execution-report-[feature]-[yyyymmdd].md` using the skill template sections, presents the final review block with `{specsDir}` substituted, and only after operator approval marks the index `Completed` with closing notes."
  },
  {
    "id": "resume-path-and-hard-prohibitions",
    "prompt": "Session dropped mid-run on specs/otel-tracing-jul11/ after subtask 02 verified; resume without redoing finished work and restate the non-negotiable guardrails.",
    "assertions": [
      "On resume the agent reads the spec index, determines completed subtasks from manifest status, picks the next incomplete node respecting dependencies, and avoids re-running subtasks already marked complete unless verifying regressions.",
      "The agent re-checks that deliverables from previously completed subtasks remain present before proceeding.",
      "The agent refuses to edit application code directly, insisting even minute judge fix-list items return through the manifest-listed subagent.",
      "The agent refuses to let reviewers modify files beyond `<specDir>/status/<subtask>.status.{md,yml}` during Mode 1.",
      "The agent does not skip adversarial `zoto-spec-judge` verification for any subtask and does not advance past failed dependencies without operator direction."
    ],
    "assertion_patterns": [
      "<specDir>/status/<subtask>\\.status\\.\\{md,yml\\}",
      "zoto-spec-judge"
    ],
    "expected_output": "The agent reloads the spec index and dependency graph, resumes at the first incomplete subtask without repeating verified completions, re-validates that earlier deliverables still exist, and explicitly reaffirms that executors never touch code directly (including micro-fixes or judge-identified gaps), that judges never write outside their status pair in Mode 1, that adversarial verification is never skipped, and that full-suite testing waits for Step 5."
  }
];
const TARGET_ID = "skill:zoto-execute-spec";
const MODEL_ID = process.env.ZOTO_EVAL_MODEL ?? "composer-2";
const JUDGE_MODEL = process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6";
const REPO_ROOT = process.cwd();
const SUITE_START = Date.now();
const API_KEY_PRESENT = Boolean(process.env.CURSOR_API_KEY);

describe("skill:zoto-execute-spec", () => {
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
