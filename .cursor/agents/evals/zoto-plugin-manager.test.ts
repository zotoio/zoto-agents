// _meta.generated: true
/**
 * LLM eval for agent `zoto-plugin-manager`.
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

import type { LlmCaseDefinition } from "../../../evals/llm/_shared/llm-case.js";
import { defineLlmEval } from "../../../evals/llm/_shared/run-llm-suite.js";

const CASES = [
  {
    "id": 1,
    "prompt": "Walk me through creating a fresh plugin under workspace/plugins/widget-guardrails using zoto-create-plugin end-to-end. After each evaluator-backed artefact lands, spell out exactly how you would run classify with pnpm targeting that component subtree, contrast declarative JSON versus TypeScript stamping based on interaction metadata from the classify output, and tell me how to recover if classify cannot run in this editor session versus when an API credential is unavailable. Finish with concrete local-sync or install tooling I should invoke before I trust the workspace copy.",
    "assertions": [
      "The answer keeps layout aligned with documented plugin anatomy under workspace/plugins/widget-guardrails rather than improvised folder shapes.",
      "The answer instructs rerunning classify per authored primitive using pnpm run eval:analyse with a trailing path beginning at workspace/plugins/widget-guardrails/ and terminating at each component directory.",
      "The answer ties declarative JSON versus TypeScript stamping to requiresInteraction surfaced by classify outputs the way Mode 1 documents.",
      "When classify is blocked immediately, closing guidance cites pnpm run eval:update bundled with classify reruns and marks interim declarative rows using _meta.classification_source naming the documented fallback sentinel.",
      "The wrap-up mentions operator-facing local tooling such as the full-repo sync helper or plugin-scoped install versus uninstall helpers including dry-run support from the documented workflow section."
    ],
    "_meta": {
      "generated": true,
      "source_hash": "002967c9b696c380222c7c6768573de2245a6296e2eed433a43c8721886f5c0b",
      "last_updated": "2026-05-26T03:26:06.356Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "002967c9b696c380222c7c6768573de2245a6296e2eed433a43c8721886f5c0b",
        "analysed_at": "2026-05-26T03:26:06.356Z",
        "analyser_version": "2026.05.26-1",
        "summary": "Maps each operating mode of zoto-plugin-manager—scaffold-via-zoto-create-plugin with classify-and-stamp eval routing, hardened audits across manifest anatomy hooks and MCP, additive component edits with evaluator discipline, marketplace rehearsal, phased renames—and ties in methodology CRUX authoring Spec-awareness validation choreography and local sync—without documenting AskQuestion or structured needs_user_input hand-offs.",
        "requiresInteraction": false,
        "interactionStyle": "none"
      }
    },
    "expected_output": "A sequenced playbook that cites the scaffolding skill first, attaches per-component classify commands anchored under workspace/plugins/widget-guardrails, explains stamping backend routing from interaction flags, covers deferred classify via eval update tooling and interim tagging of classification_source, then lists sync or symlink commands for iterative testing."
  },
  {
    "id": 2,
    "prompt": "Audit workspace/plugins/widget-guardrails like you are enforcing Mode 2. Read plugin.json inventory every agent skill command rule hook and declared MCP routing, sanity-check SKILL bodies against progressive disclosure sizing guidance, confirm each skill evaluator file meets monorepo minimum density, then give me runnable commands covering template validation Agent-Skills-reference validation per-package validation and workspace tests—in that layered order—with errors split from discretionary warnings.",
    "assertions": [
      "The checklist enumerates mandatory plugin manifest fields referenced in the agent table including lowercase kebab name displayName semver description author block and SPDX-style license wording.",
      "The review verifies frontmatter completeness for agents skills commands rules against the anatomy section including optional knobs where cited.",
      "The review verifies hooks.json declares supported lifecycle keys and insists compiled helpers honour JSON stdin and JSON stdout hook contracts described in anatomy.",
      "When mcpServers path entries exist the review verifies those paths resolve toward MCP definitions framed per the Cursor MCP wording in the brief.",
      "The review counts skills and confirms each publishes evals/evals.json bearing at least two graded rows with substantive assertions aligning with evaluator design principles excluding vague pass language.",
      "The closing script block lists node scripts/validate-template.mjs then node scripts/validate-skills.mjs then cwd-scoped pnpm validate beneath the plugin root then workspace root pnpm test.",
      "Findings segregate blocking fixes from optional polish reflecting the audited operating steps numbering style."
    ],
    "_meta": {
      "generated": true,
      "source_hash": "002967c9b696c380222c7c6768573de2245a6296e2eed433a43c8721886f5c0b",
      "last_updated": "2026-05-26T03:26:06.356Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "002967c9b696c380222c7c6768573de2245a6296e2eed433a43c8721886f5c0b",
        "analysed_at": "2026-05-26T03:26:06.356Z",
        "analyser_version": "2026.05.26-1",
        "summary": "Maps each operating mode of zoto-plugin-manager—scaffold-via-zoto-create-plugin with classify-and-stamp eval routing, hardened audits across manifest anatomy hooks and MCP, additive component edits with evaluator discipline, marketplace rehearsal, phased renames—and ties in methodology CRUX authoring Spec-awareness validation choreography and local sync—without documenting AskQuestion or structured needs_user_input hand-offs.",
        "requiresInteraction": false,
        "interactionStyle": "none"
      }
    },
    "expected_output": "Structured audit bullets tied to filesystem checks plus capped warning lists culminating in copying the four validation tiers exactly as prescribed."
  },
  {
    "id": 3,
    "prompt": "workspace/plugins/widget-guardrails ships a brittle operator skill and no matching slash gesture. Following Mode 3 add skills/zoto-guard-scan/SKILL.md with references when detail risk grows keep the SKILL body concise command frontmatter synced commands/zoto-guard-scan.md tighten plugin routing adjust reciprocal agent references populate eval coverage that varies tone and severity run skills-ref oriented validation mentions and summarise how you would iterate with graded comparisons aggregated into benchmarks before tightening assertions.",
    "assertions": [
      "Plans explicitly update `.cursor-plugin/plugin.json` pointers whenever freshly introduced directories reshape manifest routing guidance.",
      "The skill directory basename matches SKILL frontmatter name tokens per Agent Skills parity rules spelled out earlier in the primer.",
      "authored evals/evals.json includes at minimum two heterogeneous prompts with explicit assertions avoiding mushy correctness language reflecting methodology bullets.",
      "The answer references running skills-ref driven validation tooling against the authored skill subtree when asserting readiness.",
      "The answer narrates iterative grading with contrasting with-skill and without-skill runs plus consolidating metrics into benchmark.json before tightening assertions referencing the enumerated workflow bullets."
    ],
    "_meta": {
      "generated": true,
      "source_hash": "002967c9b696c380222c7c6768573de2245a6296e2eed433a43c8721886f5c0b",
      "last_updated": "2026-05-26T03:26:06.356Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "002967c9b696c380222c7c6768573de2245a6296e2eed433a43c8721886f5c0b",
        "analysed_at": "2026-05-26T03:26:06.356Z",
        "analyser_version": "2026.05.26-1",
        "summary": "Maps each operating mode of zoto-plugin-manager—scaffold-via-zoto-create-plugin with classify-and-stamp eval routing, hardened audits across manifest anatomy hooks and MCP, additive component edits with evaluator discipline, marketplace rehearsal, phased renames—and ties in methodology CRUX authoring Spec-awareness validation choreography and local sync—without documenting AskQuestion or structured needs_user_input hand-offs.",
        "requiresInteraction": false,
        "interactionStyle": "none"
      }
    },
    "expected_output": "Additive plan plus file deltas narrative covering SKILL command plugin updates cross citations evaluator authorship validation reruns and benchmark-oriented iteration cues."
  },
  {
    "id": 4,
    "prompt": "Treat workspace/plugins/widget-guardrails like a marketplace drop: run Mode 4 submission prep covering every checklist checkbox name uniqueness logo lineage README thickness LICENSE CHANGELOG evaluator depth validation passes and linkage into .cursor-plugin/marketplace.json with source-relative paths verifying name parity between listing entry and manifest. Highlight any Critical Rules clashes before you pronounce it shippable.",
    "assertions": [
      "Surface lists every numbered submission checkbox from Mode 4 including uniqueness kebab casing marketplace row alignment logo relative path substantive README evaluator counts per skill and scripted validation prerequisites.",
      "The answer explains how `.cursor-plugin/marketplace.json` source entries stay repo-relative while plugin names mirror plugin.json identifiers per registration guidance without inventing undocumented fields.",
      "The answer maps naming table expectations such as workspace/plugins/<plugin>/ paths zoto-prefix usage for artefacts and SKILL.md uniformity when summarizing rename risk.",
      "The answer echoes Critical Rules emphasizing mandatory post-edit validation evergreen evaluator inclusion relative manifest paths disclosure limits and forbidding unchecked checklist shortcuts."
    ],
    "_meta": {
      "generated": true,
      "source_hash": "002967c9b696c380222c7c6768573de2245a6296e2eed433a43c8721886f5c0b",
      "last_updated": "2026-05-26T03:26:06.356Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "002967c9b696c380222c7c6768573de2245a6296e2eed433a43c8721886f5c0b",
        "analysed_at": "2026-05-26T03:26:06.356Z",
        "analyser_version": "2026.05.26-1",
        "summary": "Maps each operating mode of zoto-plugin-manager—scaffold-via-zoto-create-plugin with classify-and-stamp eval routing, hardened audits across manifest anatomy hooks and MCP, additive component edits with evaluator discipline, marketplace rehearsal, phased renames—and ties in methodology CRUX authoring Spec-awareness validation choreography and local sync—without documenting AskQuestion or structured needs_user_input hand-offs.",
        "requiresInteraction": false,
        "interactionStyle": "none"
      }
    },
    "expected_output": "Checklist-aligned readiness memo calling out catalogue wiring validation outcomes and blocker versus polish deltas before a ship call."
  },
  {
    "id": 5,
    "prompt": "We need Mode 5 work: rename workspace/plugins/widget-guardrails skills/zoto-scan-fast/ identifiers and downstream command keys to workspace/plugins/widget-guardrails skills/zoto-guard-fast/ equivalents without orphan references. Outline mapping tables phased ordering file moves before textual edits recap cross-reference hunts and rerun the full scripted validation quartet before sign-off.",
    "assertions": [
      "Begins by enumerating deterministic old-string to new-string tuples covering directories filenames configuration keys identifiers and manifests.",
      "Schedules filesystem renames ahead of textual substitutions following the phased guidance in refactor mode wording.",
      "Enumerates reconciliation passes across hooks commands agents skills rules and MCP hooks to extinguish dangling references.",
      "Closes by mandating the same layered validation choreography used elsewhere before declaring the rename complete reflecting Critical Rules reruns after structural edits settle."
    ],
    "_meta": {
      "generated": true,
      "source_hash": "002967c9b696c380222c7c6768573de2245a6296e2eed433a43c8721886f5c0b",
      "last_updated": "2026-05-26T03:26:06.356Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "002967c9b696c380222c7c6768573de2245a6296e2eed433a43c8721886f5c0b",
        "analysed_at": "2026-05-26T03:26:06.356Z",
        "analyser_version": "2026.05.26-1",
        "summary": "Maps each operating mode of zoto-plugin-manager—scaffold-via-zoto-create-plugin with classify-and-stamp eval routing, hardened audits across manifest anatomy hooks and MCP, additive component edits with evaluator discipline, marketplace rehearsal, phased renames—and ties in methodology CRUX authoring Spec-awareness validation choreography and local sync—without documenting AskQuestion or structured needs_user_input hand-offs.",
        "requiresInteraction": false,
        "interactionStyle": "none"
      }
    },
    "expected_output": "Rename charter with phased sequencing mapping tables exhaustive reference hunt strategy and scripted validation rerun plan."
  },
  {
    "id": 6,
    "prompt": "Craft guidance for authoring a guarded rule Markdown file under workspace/plugins/widget-guardrails/rules/ that participates in CRUX compression: frontmatter knobs directory placement relative referencing inside the snippet and explain when running the slash compressor against that rule aligns with notation blocks table intent without bloating SKILL bodies.",
    "assertions": [
      "Instructions show crux: true appearing in fenced frontmatter style consistent with anatomy examples while clarifying compressor invocation via the documented slash-command token.",
      "The guidance references at least three distinct notation block glyphs from the CRUX notation table tying each to authoring intent matching the Compression section wording.",
      "The guidance restates progressive disclosure urging extra prose into references instead of lengthening SKILL files beyond the capped line posture called out earlier."
    ],
    "_meta": {
      "generated": true,
      "source_hash": "002967c9b696c380222c7c6768573de2245a6296e2eed433a43c8721886f5c0b",
      "last_updated": "2026-05-26T03:26:06.356Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "002967c9b696c380222c7c6768573de2245a6296e2eed433a43c8721886f5c0b",
        "analysed_at": "2026-05-26T03:26:06.356Z",
        "analyser_version": "2026.05.26-1",
        "summary": "Maps each operating mode of zoto-plugin-manager—scaffold-via-zoto-create-plugin with classify-and-stamp eval routing, hardened audits across manifest anatomy hooks and MCP, additive component edits with evaluator discipline, marketplace rehearsal, phased renames—and ties in methodology CRUX authoring Spec-awareness validation choreography and local sync—without documenting AskQuestion or structured needs_user_input hand-offs.",
        "requiresInteraction": false,
        "interactionStyle": "none"
      }
    },
    "expected_output": "Concrete rule-authoring briefing covering CRUX-ready frontmatter hooking the compressor slash and keeping heavy prose out of SKILL files."
  },
  {
    "id": 7,
    "prompt": "Extend workspace/plugins/widget-guardrails coordination so teammates can weave Spec artefacts into delivery: summarise which slash flows matter which specialist agents headline where configuration lands for first-time scaffolding and underline that specs stay ephemeral contrasting them with evergreen plugin knowledge—all aligned with Integration with Spec System.",
    "assertions": [
      "The reply enumerates slash flows named in the Integration section spanning init authoring judge and execute wording without inventing undocumented routes.",
      "The reply cites the specialist agent roster exactly as enumerated for generator executor and judge behaviours.",
      "The reply anchors configuration at `.zoto/spec-system/config.yml` tying initial scaffolding to slash initialization guidance as written in the Integration block.",
      "The reply distinguishes ephemeral specs from durable plugin artefacts using the verbatim contrast from Integration guidance."
    ],
    "_meta": {
      "generated": true,
      "source_hash": "002967c9b696c380222c7c6768573de2245a6296e2eed433a43c8721886f5c0b",
      "last_updated": "2026-05-26T03:26:06.356Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "002967c9b696c380222c7c6768573de2245a6296e2eed433a43c8721886f5c0b",
        "analysed_at": "2026-05-26T03:26:06.356Z",
        "analyser_version": "2026.05.26-1",
        "summary": "Maps each operating mode of zoto-plugin-manager—scaffold-via-zoto-create-plugin with classify-and-stamp eval routing, hardened audits across manifest anatomy hooks and MCP, additive component edits with evaluator discipline, marketplace rehearsal, phased renames—and ties in methodology CRUX authoring Spec-awareness validation choreography and local sync—without documenting AskQuestion or structured needs_user_input hand-offs.",
        "requiresInteraction": false,
        "interactionStyle": "none"
      }
    },
    "expected_output": "Operator-facing synopsis of Spec slash flows specialist agents ephemeral spec posture and canonical config locale for this monorepo pairing."
  },
  {
    "id": 8,
    "prompt": "Teach skill owners how evaluator methodology plugs into day-to-day plugin work referencing the enumerated workflow numbering write cases run graded comparisons summarise aggregation targets and iterative tightening—without implying hidden GUI affordances Cursor lacks. Keep monorepo policy on minimum evaluator rows authoritative.",
    "assertions": [
      "Mirrors sequential workflow numbering from evaluator methodology referencing drafting cases baseline comparisons graded scoring benchmark aggregation loops and rerun cadence terminology consistent with enumerated steps minus internal harness jargon.",
      "Reiterates designing varied prompts stressing edge malformed or ambiguous intents per design principle bullets observable in authoring guidance alone.",
      "Reaffirms monorepo minimum of two evaluator rows per skill with assertion-rich expectations echoing methodology plus Critical Rules overlap."
    ],
    "_meta": {
      "generated": true,
      "source_hash": "002967c9b696c380222c7c6768573de2245a6296e2eed433a43c8721886f5c0b",
      "last_updated": "2026-05-26T03:26:06.356Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "002967c9b696c380222c7c6768573de2245a6296e2eed433a43c8721886f5c0b",
        "analysed_at": "2026-05-26T03:26:06.356Z",
        "analyser_version": "2026.05.26-1",
        "summary": "Maps each operating mode of zoto-plugin-manager—scaffold-via-zoto-create-plugin with classify-and-stamp eval routing, hardened audits across manifest anatomy hooks and MCP, additive component edits with evaluator discipline, marketplace rehearsal, phased renames—and ties in methodology CRUX authoring Spec-awareness validation choreography and local sync—without documenting AskQuestion or structured needs_user_input hand-offs.",
        "requiresInteraction": false,
        "interactionStyle": "none"
      }
    },
    "expected_output": "Straightforward methodological brief mirroring enumerated workflow bullets plus monorepolicy tie-ins suitable for authoring meetings."
  }
] as unknown as LlmCaseDefinition[];

defineLlmEval({
  targetId: "agent:zoto-plugin-manager",
  cases: CASES,
  modelId: process.env.ZOTO_EVAL_MODEL ?? "composer-2.5",
  judgeModel: process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6",
  caseTimeoutMs: 180000,
  describe,
  it,
  afterAll,
  expect,
});
