// _meta.generated: true
/**
 * LLM `code`-strategy eval for agent `zoto-eval-adviser`.
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
    "id": "manifest-absent-gate-before-scoring",
    "prompt": "You are running as the zoto-eval-adviser agent. The host just finished `/z-eval-advise` with a full-repository scope in a workspace where `.zoto/eval-system/manifest.yml` was never generated. Perform the opening sequence the adviser defines before reading any targets.",
    "assertions": [
      "The response returns needs_user_input whose explanation names `/z-eval-create` as the prerequisite before analysis continues.",
      "No assistant-authored askQuestion call appears; the command layer is expected to surface questions later.",
      "The agent does not claim to have opened or parsed historical run folders, `llm.yml`, `static.yml`, or `report.yml` under any eval run tree.",
      "The agent does not instruct direct edits to `.zoto/eval-system/config.yml`, `manifest.yml`, or any `evals.json` file."
    ],
    "assertion_patterns": [
      "/z-eval-create",
      "llm\\.yml",
      "\\.zoto/eval-system/config\\.yml"
    ],
    "expected_output": "A structured needs_user_input payload tells the operator to run `/z-eval-create` first, with no target-level scores and no attempt to invent a manifest from memory."
  },
  {
    "id": "unreadable-config-requests-configure-first",
    "prompt": "You are the zoto-eval-adviser agent invoked from `/z-eval-advise` with full scope. The workspace disk shows `.zoto/eval-system/config.yml` exists but its bytes are not parseable discovery YAML. Stop at the documented configuration gate and respond.",
    "assertions": [
      "needs_user_input text tells the operator to fix configuration via `/z-eval-configure` before scoring targets.",
      "The agent does not emit askQuestion tool calls from its own turn.",
      "No `adviser_report` per-target scoring block is asserted as authoritative while configuration is still broken."
    ],
    "assertion_patterns": [
      "/z-eval-configure",
      "adviser_report"
    ],
    "fixtures": {
      "files": [
        {
          "path": ".zoto/eval-system/config.yml",
          "content": "{{{ not valid yaml for discovery\n"
        }
      ]
    },
    "expected_output": "needs_user_input directing the operator through `/z-eval-configure` (or an equivalent explicit repair path) before manifest or target loads are attempted."
  },
  {
    "id": "balanced-advise-pass-breakpoint-one",
    "prompt": "Act as zoto-eval-adviser immediately after `/z-eval-advise` completed with full scan scope against the refreshed manifest in this sandbox. Load `.zoto/eval-system/config.yml`, load the manifest, walk every listed target, score all five gap dimensions from the zoto-advise-evals methodology, and stop at breakpoint one with drill-down options.",
    "assertions": [
      "The visible report names all five gap dimensions and gives each a score or explicit not-applicable rationale tied to the manifest rows.",
      "Findings reference both the skill trigger lines and the eval prompts that miss them (for instance the README-only prompt versus the bundle-the-widget trigger).",
      "Schema validation commentary contrasts the command markdown contract keys with the shallow exit-code-only assertion in `plugins/demo-pack/commands/evals/evals.json`.",
      "Citation coverage calls out that the agent spec demands backtick paths while the bundled eval merely checks for any path mention.",
      "Checklist coverage notes whether eval cases assert the SKILL.md release checklist items.",
      "Hook target `hook:demo-save-hook` is flagged for missing eval coverage because `eval_files` is empty.",
      "The turn ends with needs_user_input suitable for breakpoint one rather than askQuestion tool usage by this agent.",
      "Narration never points the reader to open `evals/_runs` trees, `llm.yml`, `static.yml`, or `report.yml`.",
      "No instructions appear that rewrite `manifest.yml`, `config.yml`, or any `evals.json` artefact.",
      "Each emitted recommendation cleanly maps either to `/z-eval-create` for greenfield gaps or `/z-eval-update --target … --apply` for strengthened coverage, without contradictory dual commands."
    ],
    "assertion_patterns": [
      "plugins/demo-pack/commands/evals/evals\\.json",
      "hook:demo-save-hook",
      "evals/_runs",
      "manifest\\.yml",
      "/z-eval-create"
    ],
    "fixtures": {
      "files": [
        {
          "path": ".zoto/eval-system/manifest.yml",
          "content": "schema_version: 1\ncreated_at: 2026-05-03T07:47:43+00:00\nupdated_at: 2026-05-03T08:38:56.255Z\ngit_ref: 36e26f7e7b8d557f0dd414ca6d63e82b657fe818\ngenerated_by: zoto-create-evals\ndiscovery_config:\n  discoveryTargets:\n    - skill\n    - command\n    - agent\n    - hook\n  skillsRoots:\n    - plugins/*/skills\n  evalsDir: evals\ntargets:\n  - id: skill:demo-widget-skill\n    kind: skill\n    path: plugins/demo-pack/skills/widget/SKILL.md\n    content_hash: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n    eval_files:\n      - plugins/demo-pack/skills/widget/evals/evals.json\n  - id: command:demo-publish-cmd\n    kind: command\n    path: plugins/demo-pack/commands/publish.md\n    content_hash: bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\n    eval_files:\n      - plugins/demo-pack/commands/evals/evals.json\n  - id: agent:demo-review-agent\n    kind: agent\n    path: plugins/demo-pack/agents/review.md\n    content_hash: cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc\n    eval_files:\n      - plugins/demo-pack/agents/evals/evals.json\n  - id: hook:demo-save-hook\n    kind: hook\n    path: plugins/demo-pack/hooks/after-save.md\n    content_hash: dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd\n    eval_files: []\n"
        },
        {
          "path": "plugins/demo-pack/skills/widget/SKILL.md",
          "content": "---\nname: demo-widget-skill\ndescription: Bundles widget assets for release.\n---\n\n## Triggers\n\nPrimary operator phrase: \"bundle the widget for release\".\nSecondary invocation: `/pack-widget`.\n\n## Release checklist\n\n- [ ] Verify checksum manifest\n- [ ] Confirm semver tag\n"
        },
        {
          "path": "plugins/demo-pack/skills/widget/evals/evals.json",
          "content": "{\n  \"cases\": [\n    {\n      \"id\": \"wid-readme-tweak\",\n      \"prompt\": \"Tidy the README wording only.\",\n      \"assertions\": [\n        \"Reply stays under 400 words\"\n      ]\n    }\n  ]\n}\n"
        },
        {
          "path": "plugins/demo-pack/commands/publish.md",
          "content": "---\nname: demo-publish-cmd\ndescription: Publishes an artefact tarball.\n---\n\n## Output contract\n\nFinal assistant message MUST be a JSON object with keys `ok`, `sha256`, and `bytes`.\n"
        },
        {
          "path": "plugins/demo-pack/commands/evals/evals.json",
          "content": "{\n  \"cases\": [\n    {\n      \"id\": \"pub-happy\",\n      \"prompt\": \"/demo-publish-cmd --channel stable\",\n      \"assertions\": [\n        \"Exit status was 0\"\n      ]\n    }\n  ]\n}\n"
        },
        {
          "path": "plugins/demo-pack/agents/review.md",
          "content": "---\nname: demo-review-agent\ndescription: Reviews diffs and cites file paths.\n---\n\n## Citations\n\nEvery finding MUST include a backtick-wrapped repository path.\n"
        },
        {
          "path": "plugins/demo-pack/agents/evals/evals.json",
          "content": "{\n  \"cases\": [\n    {\n      \"id\": \"rev-basic\",\n      \"prompt\": \"Review the latest commit for risky imports.\",\n      \"assertions\": [\n        \"Mentions at least one concrete path\"\n      ]\n    }\n  ]\n}\n"
        },
        {
          "path": "plugins/demo-pack/hooks/after-save.md",
          "content": "---\nname: demo-save-hook\n---\n\nHook runs `afterFileEdit` on documentation paths and MUST print a single JSON line `{\"status\":\"ok\"}` to stdout.\n"
        }
      ]
    },
    "expected_output": "A structured `adviser_report` covering trigger phrases, schema validation, regression baselines, citation checks, and checklist completeness, plus needs_user_input for breakpoint-one drill-down choices."
  },
  {
    "id": "resume-drill-down-breakpoint-two",
    "prompt": "You are zoto-eval-adviser servicing `/z-eval-advise` on the same sandbox manifest and sources as the full-scan pass.",
    "follow_ups": [
      "Operator resumed with drill-down focused strictly on trigger-phrase coverage and schema validation coverage. Expand the per-target findings for only those dimensions, map every gap to a single deterministic command (`/z-eval-create` versus `/z-eval-update --target <glob> --apply`), then pause at breakpoint two for accept or reject prompts that the outer command will show."
    ],
    "assertions": [
      "Detailed findings cite specific trigger phrases versus actual eval prompts for `skill:demo-widget-skill`.",
      "Schema discussion enumerates missing JSON-key assertions against `demo-publish-cmd` output contract headings.",
      "Every recommendation bullet names exactly one of `/z-eval-create` or `/z-eval-update --target … --apply`, never both for the same gap.",
      "The agent returns needs_user_input consistent with breakpoint two while still avoiding askQuestion calls.",
      "The response states that `/z-eval-create`, `/z-eval-update`, and downstream handoffs are owned by the command shell, matching the advisers read-only stance."
    ],
    "assertion_patterns": [
      "skill:demo-widget-skill",
      "demo-publish-cmd",
      "/z-eval-create",
      "/z-eval-create"
    ],
    "fixtures": {
      "files": [
        {
          "path": ".zoto/eval-system/manifest.yml",
          "content": "schema_version: 1\ncreated_at: 2026-05-03T07:47:43+00:00\nupdated_at: 2026-05-03T08:38:56.255Z\ngit_ref: 36e26f7e7b8d557f0dd414ca6d63e82b657fe818\ngenerated_by: zoto-create-evals\ndiscovery_config:\n  discoveryTargets:\n    - skill\n    - command\n    - agent\n    - hook\n  skillsRoots:\n    - plugins/*/skills\n  evalsDir: evals\ntargets:\n  - id: skill:demo-widget-skill\n    kind: skill\n    path: plugins/demo-pack/skills/widget/SKILL.md\n    content_hash: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n    eval_files:\n      - plugins/demo-pack/skills/widget/evals/evals.json\n  - id: command:demo-publish-cmd\n    kind: command\n    path: plugins/demo-pack/commands/publish.md\n    content_hash: bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\n    eval_files:\n      - plugins/demo-pack/commands/evals/evals.json\n  - id: agent:demo-review-agent\n    kind: agent\n    path: plugins/demo-pack/agents/review.md\n    content_hash: cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc\n    eval_files:\n      - plugins/demo-pack/agents/evals/evals.json\n  - id: hook:demo-save-hook\n    kind: hook\n    path: plugins/demo-pack/hooks/after-save.md\n    content_hash: dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd\n    eval_files: []\n"
        },
        {
          "path": "plugins/demo-pack/skills/widget/SKILL.md",
          "content": "---\nname: demo-widget-skill\ndescription: Bundles widget assets for release.\n---\n\n## Triggers\n\nPrimary operator phrase: \"bundle the widget for release\".\nSecondary invocation: `/pack-widget`.\n\n## Release checklist\n\n- [ ] Verify checksum manifest\n- [ ] Confirm semver tag\n"
        },
        {
          "path": "plugins/demo-pack/skills/widget/evals/evals.json",
          "content": "{\n  \"cases\": [\n    {\n      \"id\": \"wid-readme-tweak\",\n      \"prompt\": \"Tidy the README wording only.\",\n      \"assertions\": [\n        \"Reply stays under 400 words\"\n      ]\n    }\n  ]\n}\n"
        },
        {
          "path": "plugins/demo-pack/commands/publish.md",
          "content": "---\nname: demo-publish-cmd\ndescription: Publishes an artefact tarball.\n---\n\n## Output contract\n\nFinal assistant message MUST be a JSON object with keys `ok`, `sha256`, and `bytes`.\n"
        },
        {
          "path": "plugins/demo-pack/commands/evals/evals.json",
          "content": "{\n  \"cases\": [\n    {\n      \"id\": \"pub-happy\",\n      \"prompt\": \"/demo-publish-cmd --channel stable\",\n      \"assertions\": [\n        \"Exit status was 0\"\n      ]\n    }\n  ]\n}\n"
        },
        {
          "path": "plugins/demo-pack/agents/review.md",
          "content": "---\nname: demo-review-agent\ndescription: Reviews diffs and cites file paths.\n---\n\n## Citations\n\nEvery finding MUST include a backtick-wrapped repository path.\n"
        },
        {
          "path": "plugins/demo-pack/agents/evals/evals.json",
          "content": "{\n  \"cases\": [\n    {\n      \"id\": \"rev-basic\",\n      \"prompt\": \"Review the latest commit for risky imports.\",\n      \"assertions\": [\n        \"Mentions at least one concrete path\"\n      ]\n    }\n  ]\n}\n"
        },
        {
          "path": "plugins/demo-pack/hooks/after-save.md",
          "content": "---\nname: demo-save-hook\n---\n\nHook runs `afterFileEdit` on documentation paths and MUST print a single JSON line `{\"status\":\"ok\"}` to stdout.\n"
        }
      ]
    },
    "expected_output": "Deepened paragraphs for trigger phrases and schemas only, each gap tied once to `/z-eval-create` or `/z-eval-update … --apply`, ending with breakpoint-two needs_user_input."
  },
  {
    "id": "resume-accepted-recommendations-final-handoff",
    "prompt": "You are zoto-eval-adviser servicing `/z-eval-advise` on the sandbox manifest bundled with demo-pack targets.",
    "follow_ups": [
      "Operator resumed after drill-down, accepting every previously listed recommendation verbatim with no edits.",
      "Emit the final `adviser_report` summarizing accepted actions for `/z-eval-create` and `/z-eval-update`, explicitly listing globs already supplied so the supervising command can queue work without rerunning discovery."
    ],
    "assertions": [
      "Accepted items explicitly include `/z-eval-create` whenever a target lacked `eval_files` entries.",
      "Accepted tightening work references `/z-eval-update --target plugins/demo-pack/commands/** --apply` (or an equivalent single glob per gap) rather than handing commands directly to hooks inside the adviser.",
      "The summary names zoto-create-evals as the scaffolding destination and zoto-update-evals as the augmentation destination without reversing their roles.",
      "No filesystem write instructions originate from this agent aside from handing control back upward.",
      "There is still zero askQuestion usage inside the advisers own tool stream."
    ],
    "assertion_patterns": [
      "/z-eval-create",
      "/z-eval-update --target plugins/demo-pack/commands/\\*\\* --apply"
    ],
    "fixtures": {
      "files": [
        {
          "path": ".zoto/eval-system/manifest.yml",
          "content": "schema_version: 1\ncreated_at: 2026-05-03T07:47:43+00:00\nupdated_at: 2026-05-03T08:38:56.255Z\ngit_ref: 36e26f7e7b8d557f0dd414ca6d63e82b657fe818\ngenerated_by: zoto-create-evals\ndiscovery_config:\n  discoveryTargets:\n    - skill\n    - command\n    - agent\n    - hook\n  skillsRoots:\n    - plugins/*/skills\n  evalsDir: evals\ntargets:\n  - id: skill:demo-widget-skill\n    kind: skill\n    path: plugins/demo-pack/skills/widget/SKILL.md\n    content_hash: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n    eval_files:\n      - plugins/demo-pack/skills/widget/evals/evals.json\n  - id: command:demo-publish-cmd\n    kind: command\n    path: plugins/demo-pack/commands/publish.md\n    content_hash: bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\n    eval_files:\n      - plugins/demo-pack/commands/evals/evals.json\n  - id: agent:demo-review-agent\n    kind: agent\n    path: plugins/demo-pack/agents/review.md\n    content_hash: cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc\n    eval_files:\n      - plugins/demo-pack/agents/evals/evals.json\n  - id: hook:demo-save-hook\n    kind: hook\n    path: plugins/demo-pack/hooks/after-save.md\n    content_hash: dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd\n    eval_files: []\n"
        },
        {
          "path": "plugins/demo-pack/skills/widget/SKILL.md",
          "content": "---\nname: demo-widget-skill\ndescription: Bundles widget assets for release.\n---\n\n## Triggers\n\nPrimary operator phrase: \"bundle the widget for release\".\nSecondary invocation: `/pack-widget`.\n\n## Release checklist\n\n- [ ] Verify checksum manifest\n- [ ] Confirm semver tag\n"
        },
        {
          "path": "plugins/demo-pack/skills/widget/evals/evals.json",
          "content": "{\n  \"cases\": [\n    {\n      \"id\": \"wid-readme-tweak\",\n      \"prompt\": \"Tidy the README wording only.\",\n      \"assertions\": [\n        \"Reply stays under 400 words\"\n      ]\n    }\n  ]\n}\n"
        },
        {
          "path": "plugins/demo-pack/commands/publish.md",
          "content": "---\nname: demo-publish-cmd\ndescription: Publishes an artefact tarball.\n---\n\n## Output contract\n\nFinal assistant message MUST be a JSON object with keys `ok`, `sha256`, and `bytes`.\n"
        },
        {
          "path": "plugins/demo-pack/commands/evals/evals.json",
          "content": "{\n  \"cases\": [\n    {\n      \"id\": \"pub-happy\",\n      \"prompt\": \"/demo-publish-cmd --channel stable\",\n      \"assertions\": [\n        \"Exit status was 0\"\n      ]\n    }\n  ]\n}\n"
        },
        {
          "path": "plugins/demo-pack/agents/review.md",
          "content": "---\nname: demo-review-agent\ndescription: Reviews diffs and cites file paths.\n---\n\n## Citations\n\nEvery finding MUST include a backtick-wrapped repository path.\n"
        },
        {
          "path": "plugins/demo-pack/agents/evals/evals.json",
          "content": "{\n  \"cases\": [\n    {\n      \"id\": \"rev-basic\",\n      \"prompt\": \"Review the latest commit for risky imports.\",\n      \"assertions\": [\n        \"Mentions at least one concrete path\"\n      ]\n    }\n  ]\n}\n"
        },
        {
          "path": "plugins/demo-pack/hooks/after-save.md",
          "content": "---\nname: demo-save-hook\n---\n\nHook runs `afterFileEdit` on documentation paths and MUST print a single JSON line `{\"status\":\"ok\"}` to stdout.\n"
        }
      ]
    },
    "expected_output": "Closing `adviser_report` duplicates the accepted plan, enumerating `/z-eval-create` jobs for untouched hooks and `/z-eval-update --target … --apply` entries for primitives needing tightened assertions."
  },
  {
    "id": "scoped-glob-filters-manifest-targets",
    "prompt": "You are zoto-eval-adviser servicing `/z-eval-advise --target plugins/demo-pack/skills/widget/**`. Only consider manifest rows matching that glob; ignore other primitives even though they remain listed upstream.",
    "assertions": [
      "Narrative findings reference only `skill:demo-widget-skill` and omit scoring sentences for command, agent, or hook identifiers.",
      "The response still cites all five dimension headings but marks off-scope primitives as intentionally skipped owing to `/z-eval-advise --target …`.",
      "needs_user_input for breakpoint one remains present despite the narrowed scope.",
      "No attempt is made to read run artefacts located under `_runs/` or YAML summaries named `llm.yml`, `static.yml`, or `report.yml`."
    ],
    "assertion_patterns": [
      "skill:demo-widget-skill",
      "/z-eval-advise --target …",
      "_runs/"
    ],
    "fixtures": {
      "files": [
        {
          "path": ".zoto/eval-system/manifest.yml",
          "content": "schema_version: 1\ncreated_at: 2026-05-03T07:47:43+00:00\nupdated_at: 2026-05-03T08:38:56.255Z\ngit_ref: 36e26f7e7b8d557f0dd414ca6d63e82b657fe818\ngenerated_by: zoto-create-evals\ndiscovery_config:\n  discoveryTargets:\n    - skill\n    - command\n    - agent\n    - hook\n  skillsRoots:\n    - plugins/*/skills\n  evalsDir: evals\ntargets:\n  - id: skill:demo-widget-skill\n    kind: skill\n    path: plugins/demo-pack/skills/widget/SKILL.md\n    content_hash: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n    eval_files:\n      - plugins/demo-pack/skills/widget/evals/evals.json\n  - id: command:demo-publish-cmd\n    kind: command\n    path: plugins/demo-pack/commands/publish.md\n    content_hash: bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\n    eval_files:\n      - plugins/demo-pack/commands/evals/evals.json\n  - id: agent:demo-review-agent\n    kind: agent\n    path: plugins/demo-pack/agents/review.md\n    content_hash: cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc\n    eval_files:\n      - plugins/demo-pack/agents/evals/evals.json\n  - id: hook:demo-save-hook\n    kind: hook\n    path: plugins/demo-pack/hooks/after-save.md\n    content_hash: dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd\n    eval_files: []\n"
        },
        {
          "path": "plugins/demo-pack/skills/widget/SKILL.md",
          "content": "---\nname: demo-widget-skill\ndescription: Bundles widget assets for release.\n---\n\n## Triggers\n\nPrimary operator phrase: \"bundle the widget for release\".\nSecondary invocation: `/pack-widget`.\n\n## Release checklist\n\n- [ ] Verify checksum manifest\n- [ ] Confirm semver tag\n"
        },
        {
          "path": "plugins/demo-pack/skills/widget/evals/evals.json",
          "content": "{\n  \"cases\": [\n    {\n      \"id\": \"wid-readme-tweak\",\n      \"prompt\": \"Tidy the README wording only.\",\n      \"assertions\": [\n        \"Reply stays under 400 words\"\n      ]\n    }\n  ]\n}\n"
        },
        {
          "path": "plugins/demo-pack/commands/publish.md",
          "content": "---\nname: demo-publish-cmd\ndescription: Publishes an artefact tarball.\n---\n\n## Output contract\n\nFinal assistant message MUST be a JSON object with keys `ok`, `sha256`, and `bytes`.\n"
        },
        {
          "path": "plugins/demo-pack/commands/evals/evals.json",
          "content": "{\n  \"cases\": [\n    {\n      \"id\": \"pub-happy\",\n      \"prompt\": \"/demo-publish-cmd --channel stable\",\n      \"assertions\": [\n        \"Exit status was 0\"\n      ]\n    }\n  ]\n}\n"
        },
        {
          "path": "plugins/demo-pack/agents/review.md",
          "content": "---\nname: demo-review-agent\ndescription: Reviews diffs and cites file paths.\n---\n\n## Citations\n\nEvery finding MUST include a backtick-wrapped repository path.\n"
        },
        {
          "path": "plugins/demo-pack/agents/evals/evals.json",
          "content": "{\n  \"cases\": [\n    {\n      \"id\": \"rev-basic\",\n      \"prompt\": \"Review the latest commit for risky imports.\",\n      \"assertions\": [\n        \"Mentions at least one concrete path\"\n      ]\n    }\n  ]\n}\n"
        },
        {
          "path": "plugins/demo-pack/hooks/after-save.md",
          "content": "---\nname: demo-save-hook\n---\n\nHook runs `afterFileEdit` on documentation paths and MUST print a single JSON line `{\"status\":\"ok\"}` to stdout.\n"
        }
      ]
    },
    "expected_output": "`adviser_report` paragraphs only discuss `skill:demo-widget-skill`, yet acknowledge the mandate came from `--target plugins/demo-pack/skills/widget/**` before returning breakpoint-one needs_user_input."
  }
];
const TARGET_ID = "agent:zoto-eval-adviser";
const MODEL_ID = process.env.ZOTO_EVAL_MODEL ?? "composer-2";
const JUDGE_MODEL = process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6";
const REPO_ROOT = process.cwd();
const SUITE_START = Date.now();
const API_KEY_PRESENT = Boolean(process.env.CURSOR_API_KEY);

describe("agent:zoto-eval-adviser", () => {
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
