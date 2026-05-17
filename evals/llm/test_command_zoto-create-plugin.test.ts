// _meta.generated: true
/**
 * LLM `code`-strategy eval for command `zoto-create-plugin`.
 *
 * Stamped by `scripts/eval-stamp.ts#stampLlmCodeStrategy` from
 * `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl`.
 *
 * The literal first line of this file MUST remain `// _meta.generated: true`.
 * Subtask 03's cleanup engine and subtask 11's overwrite gate both use
 * `evals/_llm/_user-case-guards.ts#isGeneratedFile(path, { strict: true })`
 * to decide whether this file is safe to replace or delete. Edit the
 * template, not this emitted file.
 */
import { describe, it, afterAll, expect } from "vitest";

import type { CodeStrategyCaseDefinition } from "./_shared/code-strategy-case.js";
import { defineLlmCodeEval } from "./_shared/run-code-strategy-suite.js";

const CASES: CodeStrategyCaseDefinition[] = [
  {
    "id": "interactive-guided-creation-with-no-initial-arguments",
    "prompt": "/zoto-create-plugin",
    "follow_ups": [
      "For the plugin purpose, prioritize a small CLI companion that adds lint rules for Markdown frontmatter. Keep the surface area minimal.",
      "Approve the proposed skeleton: one agent, one skill, one command, one rule, and a session hook only if you can justify it from the prior answer."
    ],
    "assertions": [
      "after `/zoto-create-plugin` with no arguments, the spawned zoto-plugin-manager subagent receives an empty argument string while still entering the guided flow",
      "the workflow follows the zoto-create-plugin skill step order while converting answers into concrete filesystem operations",
      "before writing files, the subagent emits askQuestion turns that gather naming, component choices, and integrations consistent with requirements gathering",
      "the workflow inspects sibling plugins to align folder naming, manifest fields, and evaluation layouts before proposing structure",
      "after approval, the sandbox contains a new plugins/<plugin-name>/ directory with .cursor-plugin/plugin.json plus parallel agents/, skills/, commands/, rules/, and optional hooks assets described in the command",
      "each generated skill directory includes evals/evals.json suitable for hooking into the eval harness",
      "generating steps also produce package.json, README.md, LICENSE, and CHANGELOG.md at the plugin root",
      "the authority manifest at .cursor-plugin/marketplace.json gains a new entry pointing at the scaffolded plugin path",
      "the validation pipeline executes and any reported issues are remediated before the final summary",
      "the closing summary lists created paths and recommends running `/sync-plugins` when operators want the bundle mirrored locally"
    ],
    "assertion_patterns": [
      "/zoto-create-plugin",
      "/sync-plugins"
    ],
    "expected_output": "The run asks targeted questions, mirrors existing monorepo plugin conventions, waits for confirmation, then materializes a new tree under plugins with generated docs and runs the validation pass, ending with a concise wrap-up and next actions."
  },
  {
    "id": "quoted-description-scopes-the-scaffold-immediately",
    "prompt": "/zoto-create-plugin \"analytics dashboard\"",
    "assertions": [
      "the delegated agent invocation forwards the literal analytics dashboard string as part of the argument bundle so the description-first path is exercised",
      "the resulting plugin package declares components and copy that reflect the analytics dashboard scope rather than a blank slate",
      "plugins/<plugin-name>/.cursor-plugin/plugin.json exists and describes the scaffolded surface area",
      "at least one skill folder ships with SKILL.md and a populated evals/evals.json file",
      "supporting package.json, README.md, LICENSE, and CHANGELOG.md are created alongside the component folders",
      "`.cursor-plugin/marketplace.json` records the new plugin without clobbering unrelated marketplace entries",
      "a validation pass runs and the transcript ends with remediation notes or an explicit clean bill of health"
    ],
    "assertion_patterns": [
      "\\.cursor-plugin/marketplace\\.json"
    ],
    "expected_output": "The subagent treats the quoted text as the product scope, still confirms risky details if needed, and delivers the full plugin tree, marketplace registration, and validation consistent with that scope."
  },
  {
    "id": "design-document-path-drives-structure-discovery",
    "prompt": "/zoto-create-plugin workspace/docs/plugin-design.md",
    "assertions": [
      "the zoto-plugin-manager subagent loads workspace/docs/plugin-design.md and cites its structure when proposing folders and filenames",
      "generated commands include the refresh-cache surface implied by the brief, and generated rules mention the cache path constraint",
      "skills directory contains cache-hygiene with eval coverage wired through evals/evals.json",
      "hooks/hooks.json is created only when the derived component plan requires hook coverage aligned with the brief",
      "marketplace registration and validation mirror the prior cases, proving file-input mode reaches the same completion criteria as interactive and description modes"
    ],
    "assertion_patterns": [],
    "fixtures": {
      "files": [
        {
          "path": "workspace/docs/plugin-design.md",
          "content": "# Plugin design brief\n\n## Components\n- Command: `/refresh-cache` refreshes a local cache manifest.\n- Skill: `cache-hygiene` documents safe eviction order.\n- Rule: enforce read-before-write when touching `.cache/**`.\n\n## Integrations\nEmit JSON status blocks consumable by CI summaries.\n"
        }
      ]
    },
    "expected_output": "The subagent reads the brief, maps its bullets to concrete agents, skills, commands, and rules, and scaffolds the plugin accordingly with eval rows and marketplace registration."
  }
];

defineLlmCodeEval({
  targetId: "command:zoto-create-plugin",
  cases: CASES,
  modelId: process.env.ZOTO_EVAL_MODEL ?? "composer-2",
  judgeModel: process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6",
  caseTimeoutMs: 180000,
  describe,
  it,
  afterAll,
  expect,
});
