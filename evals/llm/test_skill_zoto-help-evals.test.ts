// _meta.generated: true
/**
 * LLM `code`-strategy eval for skill `zoto-help-evals`.
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
    "id": "overview-quick-start-tailors-host-signals",
    "prompt": "Upstream task for zoto-help-evals after `/z-eval-help`: `help_context.selected_section` matches the README Overview heading, `follow_up` is done, and `user_question` asks what eval-related files and scripts already exist in this checkout. Answer now.",
    "assertions": [
      "Claims about this repo’s eval-system layout or npm scripts are justified only by attempted reads of those paths or clearly labeled uncertainty when absent.",
      "Plugin-contract statements include at least one README excerpt formatted as a fenced block whose header lists numeric line spans then `plugins/zoto-eval-system/README.md`.",
      "No `askQuestion` tool call originates from this skill turn."
    ],
    "assertion_patterns": [
      "plugins/zoto-eval-system/README\\.md",
      "askQuestion"
    ],
    "expected_output": "Overview-oriented prose citing README lines with fenced numeric line-span references into `plugins/zoto-eval-system/README.md`, combined with tailored remarks after attempting reads of `.zoto/eval-system/config.yml`, `.zoto/eval-system/manifest.yml`, and `package.json` scripts whose names begin with `eval`, explicitly noting anything unread or missing."
  },
  {
    "id": "missing-selected-section-emits-needs-user-input",
    "prompt": "Upstream task for zoto-help-evals: the operator wants Eval System help but the payload lacks `help_context.selected_section` and no uniquely safe README anchor can be inferred. Respond under Step 2.",
    "assertions": [
      "Candidate anchors correspond to distinct README `##` titles rather than generic prose unrelated to the heading menu.",
      "No `askQuestion` invocation occurs from this skill execution path."
    ],
    "assertion_patterns": [
      "##",
      "askQuestion"
    ],
    "expected_output": "A structured `needs_user_input` reply enumerating candidate anchors parsed from `##` headings in `plugins/zoto-eval-system/README.md`, without issuing a fully anchored answer or guessing the section."
  },
  {
    "id": "configuration-row-reads-config-and-schema-template",
    "prompt": "Upstream task for zoto-help-evals: `help_context.selected_section` targets the README Configuration section; `user_question` asks which YAML keys govern backends versus discovery in `.zoto/eval-system/config.yml`.",
    "assertions": [
      "Specific key semantics appear only after attempting those reads; absent files are acknowledged instead of silently invented.",
      "README-derived behaviour claims include fenced numeric line-span citations pointing at `plugins/zoto-eval-system/README.md`.",
      "No skill-emitted `askQuestion` prompts appear in this turn."
    ],
    "assertion_patterns": [
      "plugins/zoto-eval-system/README\\.md",
      "askQuestion"
    ],
    "expected_output": "Configuration-focused guidance that reads `.zoto/eval-system/config.yml` when available, consults `plugins/zoto-eval-system/templates/schema/config.schema.json` for field semantics after opening it, and cites README lines explaining configuration responsibilities."
  },
  {
    "id": "static-backend-row-grounds-framework-and-evalsdir",
    "prompt": "Upstream task for zoto-help-evals: `help_context.selected_section` matches Static backend; `user_question` asks which static test runner is configured and what directories under the configured evals directory matter on disk.",
    "assertions": [
      "Framework and eval-directory facts attributed to this workspace trace to observed `config.json` values plus directory listings, never to guessed defaults.",
      "When README guidance conflicts with observed host configuration, the mismatch is stated plainly while still citing README contract lines with numeric span fences.",
      "No `askQuestion` calls occur from this skill run."
    ],
    "assertion_patterns": [
      "config\\.json",
      "askQuestion"
    ],
    "expected_output": "Answers grounded in eval-system `config.json` fields such as `static.framework` after reading the relevant file per README guidance, followed by a truthful summary of the resolved eval directory contents only after listing that directory, plus README citations describing static backend behaviour."
  },
  {
    "id": "llm-backend-row-env-presence-without-secret-leaks",
    "prompt": "Upstream task for zoto-help-evals: `help_context.selected_section` targets the README LLM backend (`@cursor/sdk`) section; `user_question` asks whether env wiring looks ready for SDK-backed runs.",
    "assertions": [
      "No `.env` secrets, tokens, or private assignment strings appear in the assistant output—only safe existence checks and README-grounded instructions.",
      "Dependency mentions reflect actual `package.json` contents observed via read.",
      "No `askQuestion` usage originates here."
    ],
    "assertion_patterns": [
      "\\.env",
      "package\\.json",
      "askQuestion"
    ],
    "expected_output": "Reads `.env.example` and checks `.env` existence without revealing secret assignments, inspects `package.json` for `@cursor/sdk` and related tooling only after reading it, and cites README LLM-backend guidance with numeric README fences."
  },
  {
    "id": "updating-evals-row-reads-manifest-and-history-tail",
    "prompt": "Upstream task for zoto-help-evals: `help_context.selected_section` matches Updating evals; `user_question` asks how discovery settings relate to current manifest targets and what changed most recently.",
    "assertions": [
      "Manifest target counts or identifiers never appear without a successful manifest read or an explicit missing-file statement.",
      "Recent history claims cite the tail entry only after it was actually read.",
      "README anchors use numeric line-span fences against `plugins/zoto-eval-system/README.md`."
    ],
    "assertion_patterns": [
      "plugins/zoto-eval-system/README\\.md"
    ],
    "expected_output": "Discusses `discovery_config` and `targets[]` only after reading `.zoto/eval-system/manifest.yml` when present, summarizes the latest `.zoto/eval-system/manifest.history.yml` entry only after reading that file, and cites README sections covering manifest updates."
  },
  {
    "id": "result-schema-row-inspects-latest-run-artifacts",
    "prompt": "Upstream task for zoto-help-evals: `help_context.selected_section` is Result schema; `user_question` asks what files describe outputs from the newest stored eval run.",
    "assertions": [
      "Any named latest run identifier follows an explicit `evals/_runs/` listing step or a clear statement that no runs exist yet.",
      "Claims about per-backend YAML artefacts under that run presuppose successful reads or explicitly flag unread paths.",
      "Numeric README citation fences appear for schema explanations tied to plugin documentation."
    ],
    "assertion_patterns": [
      "evals/_runs/"
    ],
    "expected_output": "Determines the newest run under `evals/_runs/` via directory inspection before naming files, then reads `report.yml` under that run when available and mentions companion `static.yml` / `llm.yml` paths only if reads succeed, all paired with README citations about result layout."
  },
  {
    "id": "run-logs-row-lists-runs-before-log-path-claims",
    "prompt": "Upstream task for zoto-help-evals: `help_context.selected_section` matches Run logs; `user_question` asks where to open stderr from the latest eval execution in this workspace.",
    "assertions": [
      "No concrete log file paths are asserted without prior listing or read attempts grounded in actual filesystem state.",
      "README quotations keep the mandated numeric line-span header format referencing `plugins/zoto-eval-system/README.md`.",
      "There is no skill-side `askQuestion`."
    ],
    "assertion_patterns": [
      "plugins/zoto-eval-system/README\\.md",
      "askQuestion"
    ],
    "expected_output": "Lists `evals/_runs/` before referencing a latest run, inspects the chosen run’s `logs/` subtree when present, and cites README guidance on logging with proper numeric fences."
  },
  {
    "id": "comparing-runs-row-contrasts-last-two-directories",
    "prompt": "Upstream task for zoto-help-evals: `help_context.selected_section` is Comparing runs; `user_question` asks what differs between the two newest eval runs saved locally.",
    "assertions": [
      "Both compared run identifiers appear only after showing how they were derived from the runs directory listing.",
      "If fewer than two runs exist, the assistant states that limitation instead of inventing synthetic IDs.",
      "README-backed methodology statements include numeric README fences."
    ],
    "assertion_patterns": [],
    "expected_output": "Uses ordering derived from an `evals/_runs/` listing to pick two newest IDs before contrasting artefacts or summaries, acknowledges fewer than two runs honestly, and cites README comparison guidance with numeric fences."
  },
  {
    "id": "judge-soft-metrics-row-reads-config-and-llm-report",
    "prompt": "Upstream task for zoto-help-evals: `help_context.selected_section` matches Judge & soft metrics; `user_question` asks which grading model is configured and how soft metrics surfaced in the latest LLM report.",
    "assertions": [
      "Grading model statements reflect observed `config.json` contents or explicit read failures without fabrication.",
      "Soft-metric claims cite only YAML fragments actually retrieved from the latest accessible `llm.yml`, or explain why none exists.",
      "No confidential env material appears even if `.env` exists elsewhere in the workspace."
    ],
    "assertion_patterns": [
      "config\\.json",
      "llm\\.yml",
      "\\.env"
    ],
    "expected_output": "Names `judgeModel` from eval-system `config.json` after reading it, inspects the newest `llm.yml` under the latest `evals/_runs/<run-id>/` path after lawful discovery of that run, and ties explanations back to README judge sections with numeric fences."
  },
  {
    "id": "ci-integration-row-checks-workflows-and-scripts",
    "prompt": "Upstream task for zoto-help-evals: `help_context.selected_section` is CI integration; `user_question` asks whether GitHub Actions already invokes this repo’s eval scripts.",
    "assertions": [
      "Statements about CI automation reference concrete workflow filenames only after attempted reads or an explicit missing-folder remark.",
      "Cross-links between workflows and npm scripts reflect observed script names, not guessed commands.",
      "Skill execution emits no `askQuestion`."
    ],
    "assertion_patterns": [
      "askQuestion"
    ],
    "expected_output": "Scans `.github/workflows/` YAML files when that folder exists, correlates any discovered jobs with `package.json` `eval*` scripts after reading them, notes honestly when workflows are absent, and cites README CI guidance via numeric fences."
  },
  {
    "id": "troubleshooting-without-follow-up-returns-needs-user-input",
    "prompt": "Upstream task for zoto-help-evals: `help_context.selected_section` is Troubleshooting, `follow_up` is absent, and `user_question` bundles manifest drift, missing runs, and Cursor SDK failures—each tied to different README anchors. Respond per Step 5.",
    "assertions": [
      "Section choices offered map to separate Troubleshooting-related anchors rather than silently answering everything without navigation consent.",
      "There is no skill-emitted `askQuestion` on this turn."
    ],
    "assertion_patterns": [
      "askQuestion"
    ],
    "expected_output": "`needs_user_input` proposing distinct follow-on README sections instead of silently merging unrelated anchors into one narrative."
  },
  {
    "id": "rule-routed-natural-help-with-overview-context",
    "prompt": "User message routed via `rules/zoto-eval-system.mdc`: \"I’m blocked setting up Zoto evals in this repo—what’s already configured and what should I run first?\" The bundled agent task includes `help_context.selected_section` pinned to Overview after `/z-eval-help` preprocessing. Deliver the skill response.",
    "assertions": [
      "Repo-state sentences mirror attempted reads or clearly admit gaps instead of guessing manifests or scripts.",
      "README excerpts appear inside fenced blocks whose headers pair numeric spans with `plugins/zoto-eval-system/README.md`.",
      "No `askQuestion` calls originate from this skill invocation for routing clarification."
    ],
    "assertion_patterns": [
      "plugins/zoto-eval-system/README\\.md",
      "askQuestion"
    ],
    "expected_output": "Overview-first coaching citing README lines with numeric fences while separating README contracts from live readings of `.zoto/eval-system/config.yml`, `.zoto/eval-system/manifest.yml`, and `eval*` scripts, ending with a README-aligned slash-command recommendation that matches observed readiness."
  }
];
const TARGET_ID = "skill:zoto-help-evals";
const MODEL_ID = process.env.ZOTO_EVAL_MODEL ?? "composer-2";
const JUDGE_MODEL = process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6";
const REPO_ROOT = process.cwd();
const SUITE_START = Date.now();
const API_KEY_PRESENT = Boolean(process.env.CURSOR_API_KEY);

describe("skill:zoto-help-evals", () => {
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
