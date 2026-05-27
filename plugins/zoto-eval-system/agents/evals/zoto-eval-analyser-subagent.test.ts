// _meta.generated: true
/**
 * LLM eval for agent `zoto-eval-analyser-subagent`.
 *
 * Generated from the legacy declarative JSON eval payload by
 * `scripts/eval-relocate-migration.ts` as part of spec
 * `20260526-eval-single-backend-colocated-restructure` (subtask 08).
 *
 * The literal first line of this file MUST remain `// _meta.generated: true`.
 * The cleanup engine and overwrite gate both use
 * `plugins/zoto-eval-system/engine/_user-case-guards.ts#isGeneratedFile(path, { strict: true })`
 * to decide whether this file is safe to replace or delete. Edit the
 * source primitive and re-run `pnpm run eval:update --apply`, not this
 * emitted file.
 */
import { describe, it, afterAll, expect } from "vitest";

import type { LlmCaseDefinition } from "../../../../evals/llm/_shared/llm-case.js";
import { defineLlmEval } from "../../../../evals/llm/_shared/run-llm-suite.js";

const CASES = [
  {
    "id": 1,
    "prompt": "Our stamp pipeline regenerated `pnpm run eval:analyse`; please replay the Cursor subagent invocation with envelope fields already fixed and analyse `workspace/plugins/repo-tools/skills/verify-release/SKILL.md` as `kind: skill`, `target_id: skill:verify-release`, handing it the hashed frontmatter-plus-body excerpt and digest from the queued job. Treat the eventual assistant reply as the raw stream the extractor will slice.",
    "assertions": [
      "Assistant reply trims to one object whose UTF-8 text begins with `{` and ends with `}` without conversational framing that would break deterministic extraction beyond what the extractor already tolerates.",
      "After parsing, JSON validates successfully against `plugins/zoto-eval-system/templates/schema/analyser-payload.schema.json` including `additionalProperties: false`.",
      "Emitted `schema_version` equals integer 1 and `analyser_version`, `model_id`, `target_id`, `kind`, `source_path`, and `source_hash` duplicate the queued envelope verbatim.",
      "`requiresInteraction` is boolean typed, `interactionStyle` is strictly one of command-owned | subagent-escalated | none consistent with imperative guidance for the analysed primitive itself, mirroring Corpus Subtask baseline labels whenever the Markdown matches signal rows.",
      "The serialized reply omits lexical hygiene violations named in primitive hard-rule 4 (angled editor tokens plus the enumerated banned phrases table).",
      "Whenever `fixtures.files` is non-empty, `fixture_justifications` exists with the same length in order and every `path` stays sandbox-relative without absolute roots or traversal segments escaping the sandbox."
    ],
    "_meta": {
      "generated": true,
      "source_hash": "017cd3b1c4b665329c99f008428de32eafc5433d7b9a2bb61152c26ca7d70a3a",
      "last_updated": "2026-05-26T03:23:44.769Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "017cd3b1c4b665329c99f008428de32eafc5433d7b9a2bb61152c26ca7d70a3a",
        "analysed_at": "2026-05-26T03:23:44.769Z",
        "analyser_version": "2026.05.26-1",
        "summary": "The subagent consumes one primitive envelope and must reply with exactly one analysable AnalyserPayload that honour schema_version 1, verbatim envelope pins, lexical hygiene bans, fixture coupling rules when overlays appear, interaction classification heuristics, and the documented per-kind tailoring table including the comparer-only orchestration block.",
        "requiresInteraction": false,
        "interactionStyle": "none"
      }
    },
    "expected_output": "A single analysable payload for the staged skill covering realistic upstream loading prompts plus behaviour checks the runner can Grade."
  },
  {
    "id": 2,
    "prompt": "Queue `eval:analyse` against `workspace/plugins/repo-tools/commands/z-eval-help.md` as `kind: command`, `target_id: command:z-eval-help`; keep the Cursor model pinned to opus and insist the classifier emit cases an operator could paste verbatim from the command palette alongside realistic flags such as topical help sections.",
    "assertions": [
      "Because the analysed envelope marks `kind: command`, each emitted `cases[].prompt` begins with `/` referencing a Cursor command slug rather than rewriting the flow as unsolicited prose."
    ],
    "_meta": {
      "generated": true,
      "source_hash": "017cd3b1c4b665329c99f008428de32eafc5433d7b9a2bb61152c26ca7d70a3a",
      "last_updated": "2026-05-26T03:23:44.769Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "017cd3b1c4b665329c99f008428de32eafc5433d7b9a2bb61152c26ca7d70a3a",
        "analysed_at": "2026-05-26T03:23:44.769Z",
        "analyser_version": "2026.05.26-1",
        "summary": "The subagent consumes one primitive envelope and must reply with exactly one analysable AnalyserPayload that honour schema_version 1, verbatim envelope pins, lexical hygiene bans, fixture coupling rules when overlays appear, interaction classification heuristics, and the documented per-kind tailoring table including the comparer-only orchestration block.",
        "requiresInteraction": false,
        "interactionStyle": "none"
      }
    },
    "expected_output": "Cases whose analysed prompts obey command-table slash-first styling for the enumerated flows in that Markdown."
  },
  {
    "id": 3,
    "prompt": "Hand the bundled digest for `agent:zoto-release-adviser` at `workspace/plugins/repo-tools/agents/release-adviser.md` after the updater copied it locally; classifications must reflect Markdown instructions describing structured needs_user_input without operator chat flourishes masking the analysed agent behaviours.",
    "assertions": [
      "For this analysed agent kind envelope, emitted `cases[].prompt` sentences read like pasted operator chat coordinating that agent route instead of single-token slash palettes."
    ],
    "_meta": {
      "generated": true,
      "source_hash": "017cd3b1c4b665329c99f008428de32eafc5433d7b9a2bb61152c26ca7d70a3a",
      "last_updated": "2026-05-26T03:23:44.769Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "017cd3b1c4b665329c99f008428de32eafc5433d7b9a2bb61152c26ca7d70a3a",
        "analysed_at": "2026-05-26T03:23:44.769Z",
        "analyser_version": "2026.05.26-1",
        "summary": "The subagent consumes one primitive envelope and must reply with exactly one analysable AnalyserPayload that honour schema_version 1, verbatim envelope pins, lexical hygiene bans, fixture coupling rules when overlays appear, interaction classification heuristics, and the documented per-kind tailoring table including the comparer-only orchestration block.",
        "requiresInteraction": false,
        "interactionStyle": "none"
      }
    },
    "expected_output": "An AnalyserPayload where natural-language analysed prompts mimic real Cursor delegation without slash-led palettes as the dominant voice unless quoted operator breadcrumbs appear inside richer prose per rubric carve-outs."
  },
  {
    "id": 4,
    "prompt": "Target `workspace/plugins/repo-tools/hooks/widget-ci.json` with `kind: hook`, `target_id: hook:widget-ci` so regenerated eval rows cite which Cursor lifecycle stanza invokes the binaries and stresses JSON stdout contracts the hook bundle asserts.",
    "assertions": [
      "Emitted hook analyses describe the Cursor lifecycle invocation (for example staged afterFileSave or analogous documented phase) tying each behavioural assertion to externally visible exit statuses or JSON stdout payloads the hook emits."
    ],
    "_meta": {
      "generated": true,
      "source_hash": "017cd3b1c4b665329c99f008428de32eafc5433d7b9a2bb61152c26ca7d70a3a",
      "last_updated": "2026-05-26T03:23:44.769Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "017cd3b1c4b665329c99f008428de32eafc5433d7b9a2bb61152c26ca7d70a3a",
        "analysed_at": "2026-05-26T03:23:44.769Z",
        "analyser_version": "2026.05.26-1",
        "summary": "The subagent consumes one primitive envelope and must reply with exactly one analysable AnalyserPayload that honour schema_version 1, verbatim envelope pins, lexical hygiene bans, fixture coupling rules when overlays appear, interaction classification heuristics, and the documented per-kind tailoring table including the comparer-only orchestration block.",
        "requiresInteraction": false,
        "interactionStyle": "none"
      }
    },
    "expected_output": "Hooks-oriented cases referencing concrete lifecycle anchors from the analysed bundle rather than conversational IDE chat for unrelated agents."
  },
  {
    "id": 5,
    "prompt": "Analyse `workspace/.cursor/rules/keep-main-fast.crux.mdc` as `rule:keep-main-fast` so downstream rows exercise how assistants must comply with invariants spelled in that constrained Markdown globs narrative.",
    "assertions": [
      "Emitted `cases[].prompt` wording mirrors plausible user editing requests constrained by globs scoped in that rule file instead of repurposing unrelated command palette strings."
    ],
    "_meta": {
      "generated": true,
      "source_hash": "017cd3b1c4b665329c99f008428de32eafc5433d7b9a2bb61152c26ca7d70a3a",
      "last_updated": "2026-05-26T03:23:44.769Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "017cd3b1c4b665329c99f008428de32eafc5433d7b9a2bb61152c26ca7d70a3a",
        "analysed_at": "2026-05-26T03:23:44.769Z",
        "analyser_version": "2026.05.26-1",
        "summary": "The subagent consumes one primitive envelope and must reply with exactly one analysable AnalyserPayload that honour schema_version 1, verbatim envelope pins, lexical hygiene bans, fixture coupling rules when overlays appear, interaction classification heuristics, and the documented per-kind tailoring table including the comparer-only orchestration block.",
        "requiresInteraction": false,
        "interactionStyle": "none"
      }
    },
    "expected_output": "Cases whose analysed prompts imitate user-visible editor requests constrained by rule scope instead of infra-only slash commands unless operator quotes appear inside conversational glue."
  },
  {
    "id": 6,
    "prompt": "Force envelope `kind: agent`, `target_id: agent:zoto-eval-comparer`, `source_path: workspace/plugins/repo-tools/agents/compare-mode.md`, including both compare-mode instructions and adjudication overlays so regenerated rows obey the speciality section rather than shortening to generic agent prose.",
    "assertions": [
      "Emitted comparer-facing prompts weave multi-run reconciliation details (report rollups destined for canvases, symbolic run labels, ambiguity handling) plus judge-tier stakes (confidence style columns surviving flattening, judge prerequisites) within the analysed cases without trimming away either theme."
    ],
    "_meta": {
      "generated": true,
      "source_hash": "017cd3b1c4b665329c99f008428de32eafc5433d7b9a2bb61152c26ca7d70a3a",
      "last_updated": "2026-05-26T03:23:44.769Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "017cd3b1c4b665329c99f008428de32eafc5433d7b9a2bb61152c26ca7d70a3a",
        "analysed_at": "2026-05-26T03:23:44.769Z",
        "analyser_version": "2026.05.26-1",
        "summary": "The subagent consumes one primitive envelope and must reply with exactly one analysable AnalyserPayload that honour schema_version 1, verbatim envelope pins, lexical hygiene bans, fixture coupling rules when overlays appear, interaction classification heuristics, and the documented per-kind tailoring table including the comparer-only orchestration block.",
        "requiresInteraction": false,
        "interactionStyle": "none"
      }
    },
    "expected_output": "Compared-target payload cases whose prompts orchestrate conversational compare-mode hand-offs referencing multi-run rollup folders alongside judge artefacts in one contiguous narrative arc."
  }
] as unknown as LlmCaseDefinition[];

defineLlmEval({
  targetId: "agent:zoto-eval-analyser-subagent",
  cases: CASES,
  modelId: process.env.ZOTO_EVAL_MODEL ?? "composer-2.5",
  judgeModel: process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6",
  caseTimeoutMs: 180000,
  describe,
  it,
  afterAll,
  expect,
});
