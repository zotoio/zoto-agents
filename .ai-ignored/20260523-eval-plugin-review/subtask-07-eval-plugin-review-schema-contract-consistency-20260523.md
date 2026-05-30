# Subtask: Schema & Contract Consistency Review

## Metadata
- **Subtask ID**: 07
- **Feature**: Eval Plugin Implementation & Application Review
- **Assigned Subagent**: zoto-eval-engineer
- **Dependencies**: 01
- **Created**: 20260523

## Objective

Audit every schema and structural contract the plugin defines for internal
consistency, redundancy, and drift between the schema and the documentation
that describes it. The 7 schemas under `templates/schema/` plus the hard-coded
contract fields in `config.yml` form the typed backbone of the plugin —
inconsistencies here surface as runtime errors users can't easily diagnose.

## Deliverables Checklist

- [x] `findings-07-schemas-contracts.md` covering, for each of the 7 schemas:

  - [x] **`config.schema.json`**:
    - Field-by-field walk vs the shipped init template (`templates/init-config.yml`) — every key present in one must be present (or intentionally absent) in the other.
    - The two **hard-coded `true`** fields (`update.preserveUserAuthoredCases`, `update.writeMetaMarker`): are they marked `const: true` in the schema (so a `false` value would be a validation error), and is that consistent with the rule documentation?
    - `static.framework` ↔ `llm.codeFramework` mutual constraint (when `llm.strategy === "code"`, `llm.codeFramework` must equal `static.framework`): is this expressible in the schema, or only checked imperatively at write-time? If imperative-only, document the validation gap.

  - [x] **`manifest.schema.json`**: required vs optional fields; presence of `discovery_config`, `targets[]`, `eval_files[]`. Does every field referenced by the updater (`manifest.discovery_config`, etc.) exist in the schema?

  - [x] **`result.schema.json`**: backend-specific segments — does the schema cover `static.yml`, `llm.yml`, **and** the merged `report.yml`, or do those have their own schemas? If one schema, are the variant-shaped totals/aggregates captured cleanly?

  - [x] **`case-meta.schema.json`**: `_meta.generated`, `_meta.source_hash`, `_meta.last_updated`, `_meta.generated_by`, `_meta.primitive_analysis`. Confirm every field referenced in the README's `_meta` contract exists in the schema. Verify **semantic agreement** between the schema's `generated` field declaration and the runtime guard `_meta?.generated === true` enforced by `scripts/validate-plugin.ts` — i.e. that the schema's type/default cannot produce a value that the runtime guard would silently misclassify (not a strict type-equality check across layers, but a contract-equivalence check).

  - [x] **`analyser-payload.schema.json`**: `source_hash`, `analyser_version`, `summary` (per CHANGELOG). Compare to actual analyser code — does it emit additional fields not in the schema, or schema fields the code never populates?

  - [x] **`cleanup-plan.schema.json`**: emitted by the configurer when framework/strategy changes. Confirm the configurer code path actually emits a payload that validates against this schema.

  - [x] **`needs-user-input.schema.json`**: `reason`, `questions[]` with `options[]`, `allow_multiple`, `slug`-format ids, ≥ 1 question, ≥ 2 options per question, `additionalProperties: false`. The rule documents these constraints — confirm the schema enforces all of them.

  - [x] **Cross-schema redundancy**: any field appearing in 2+ schemas with subtly different definitions (type, enum values, required-ness).

  - [x] **Schema-vs-doc drift**: every field the README documents should exist in the relevant schema; every field the schema requires should be documented somewhere user-facing.

- [x] **Hard-coded contract review** (separate from schema):
  - [x] `update.preserveUserAuthoredCases: true` — surfaces in config.yml, schema, README, rule. Recommend: keep config-visible (current state) vs remove entirely (since it can't be changed) — with rationale.
  - [x] `update.writeMetaMarker: true` — same analysis.
  - [x] `_meta.generated === true` literal-string compile-time check — confirm presence in `scripts/validate-plugin.ts` (per CHANGELOG claim). **Result: file absent (F‑01 Gap).**

- [x] **Findings ledger** at top: severity, confidence, effort.

- [x] **Schema-merge proposals**: any schemas that should be merged or split.

- [x] No file mutations.

## Definition of Done

- [x] Findings document committed under `specs/20260523-eval-plugin-review/findings-07/`.
- [x] Every schema has a section with explicit "consistent | drift | gap" verdict.
- [x] Every drift claim cites both the schema location and the disagreeing source (README line, code line, etc.).
- [x] No mutations outside this subtask's directory.

## Implementation Notes

- Schemas live at `/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/`.
- The init template lives at `/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/init-config.yml`.
- The applied config lives at `/home/andrewv/git/cursor/zoto-agents/.zoto/eval-system/config.yml`.
- Use a JSON-schema validator only mentally — do not execute against arbitrary inputs in this subtask.
- For each schema, cite `start:end:filepath` for the field declarations under review.

## Testing Strategy

**IMPORTANT**: Static review only. Do NOT run any test or validation script.

## Execution Notes

### Agent Session Info
- Agent: zoto-eval-engineer
- Started: 2026-05-23
- Completed: 2026-05-23

### Work Log

- Read subtask 01 inventory for schema list and citation paths (no re-derivation).
- Loaded all 7 schemas, the shipped init template, the applied repo `config.yml`, the README, the rule, the CHANGELOG, the configurer skill, the analyser subagent agent, and `templates/llm/agent-sdk/case.ts.tmpl` + `update.ts.tmpl`.
- Verified `update.preserveUserAuthoredCases` and `update.writeMetaMarker` carry `const: true` and that the configurer skill step 0 refuses bundled `false` before any read/write — defence-in-depth confirmed (F‑12 info).
- Confirmed semantic agreement between case-meta `generated: boolean` (required) and the runtime guard `_meta?.generated === true`: schema cannot emit `"true"` / `1` / `null` that the guard would silently accept; missing `_meta` makes the guard evaluate to `undefined !== true` so user-authored cases stay immutable.
- Searched local mirror + monorepo for `scripts/validate-plugin.ts` (eval-system flavour); **absent**. The literal-string guard `_meta?.generated === true` is declared inside `update.ts.tmpl` at line 14 but no validator script checks for its presence in the shipped/stamped source. Flagged as F‑01 Gap.
- Field-walked init template vs config schema; found `update.failOnNoAnalyserInCI` in schema but not in init template (F‑02).
- Diffed `_meta` contract across README / case-meta schema / TS interface; found `generated_by` enum drift (F‑03) and undocumented TS-only fields (`primitive_analysis_hash`, `partial`, `primitive_analysis.fixture_justifications`) silently allowed by `additionalProperties: true` (F‑07).
- Compared `kind` / `target_id` enums across the four schemas that carry them; analyser-payload uses `[skill,command,agent,hook,rule]` while manifest/config/cleanup-plan use `[skill,command,agent,hook,cli,lib]` (F‑05).
- Found `static.framework` ↔ `llm.codeFramework` schema description says "must equal" but configurer downgrades to warning + cleanup plan instead of blocking (F‑09).
- Found `cleanup-plan.file.preserve_user_authored` declared as "Hard-coded contract" in description but only `default: true` (no `const: true`) — drift from sibling hard-coded fields (F‑06).
- Reviewed `needs-user-input.schema.json` against the rule's documented constraints; all four invariants are enforced (F‑15 Consistent).
- Reviewed `result.schema.json`; single-schema covers `static.yml`/`llm.yml`/`report.yml` cleanly via `backend` enum + optional `report.{static,llm}` projection (F‑14 Consistent).
- Tally: 3 schemas Consistent (`manifest`, `result`, `needs-user-input`) / 4 schemas Drift (`config`, `case-meta`, `analyser-payload`, `cleanup-plan`) / 0 Hard-Gap schemas (F‑01 is the cross-cutting validator gap, not tied to one schema).

### Blockers Encountered

None. All schema files, the init template, the applied repo config, and the documentation sources were readable in the local mirror. The absence of `scripts/validate-plugin.ts` is documented as F‑01 rather than treated as a blocker — the subtask explicitly asked to note absence as a Gap.

### Files Modified

- `specs/20260523-eval-plugin-review/findings-07/findings-07-schemas-contracts.md` — new findings deliverable.
- `specs/20260523-eval-plugin-review/subtask-07-eval-plugin-review-schema-contract-consistency-20260523.md` — checklist ticks + Execution Notes updates (this section).

No mutations outside `specs/20260523-eval-plugin-review/`.

### Adversarial Verification (zoto-spec-judge)

- **Verdict: Verified.** All 11 Deliverables Checklist items and all 4 Definition of Done items independently confirmed against the file system. Authoritative tick marks above unchanged from executor.
- **F‑01 spot-check pass.** `Glob **/scripts/validate-plugin*` returns 0 hits in both `/home/andrewv/.cursor/plugins/local/zoto-eval-system/` and `/home/andrewv/git/cursor/zoto-agents/plugins/zoto-eval-system/`; the validator pattern only ships in siblings (`zoto-cursor-top`, `zoto-spec-system`). README line 302 and CHANGELOG line 40 confirmed to promise the missing validator verbatim.
- **F‑05 spot-check pass.** `analyser-payload.schema.json` line 42 / target_id pattern line 37 list `[skill,command,agent,hook,rule]` (`rule` exclusive); `manifest.schema.json` line 72, `config.schema.json` line 18, `cleanup-plan.schema.json` line 167 all list `[skill,command,agent,hook,cli,lib]` (`cli`/`lib` exclusive). Three-way drift confirmed.
- **F‑09 spot-check pass.** `config.schema.json` lines 31 and 57 both say "must equal"; configurer skill step 3 (line 121) explicitly says "do not block — emit a `cleanup_plan` group". Mismatch confirmed.
- **Per-schema verdicts: 7/7 present** (`config`, `manifest`, `result`, `case-meta`, `analyser-payload`, `cleanup-plan`, `needs-user-input`).
- **Tally math pass.** 3 Consistent + 4 Drift + 0 Hard-Gap = 7 schemas — matches section 13 of the findings.
- **Citation discipline pass (2/2 sampled).** F‑03 cites case-meta schema lines 23:28 plus README line 297 enum; F‑10 cites cleanup-plan schema line 100 plus configurer skill lines 84-88. Both name schema location AND disagreeing source.
- **Hard-coded contract review pass (3/3).** Section 10 covers `update.preserveUserAuthoredCases` (F‑12), `update.writeMetaMarker` (F‑12), and the `_meta.generated === true` literal-string check (F‑01).
- **Ledger completeness pass.** All 15 findings (F‑01 → F‑15) carry severity, confidence, and effort columns; the three `info` rows (F‑12, F‑14, F‑15) use `—` for effort which is appropriate for no-action informational entries.
- **Scope discipline pass.** `git status` shows the only this-subtask additions are inside `specs/20260523-eval-plugin-review/`. All other modifications listed (`.crux/`, `.cursor/agents/`, `.cursor/skills/`, `AGENTS.md`, `CRUX.md`, etc.) pre-date subtask 07 or belong to sibling subtasks; none are attributable to this subtask's executor.
