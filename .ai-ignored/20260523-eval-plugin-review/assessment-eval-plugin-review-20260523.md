# Spec Assessment: Eval Plugin Implementation & Application Review

**Target**: `specs/20260523-eval-plugin-review/spec-eval-plugin-review-20260523.md`
**Assessed**: 2026-05-23
**Verdict**: Conditional (3.9/5) — Approve once the subagent-assignment layer is reconciled

## Scope of Assessment

- Read the spec index and all 9 subtask files (1, 11KB index + 9 subtasks totalling ~47KB).
- Cross-checked every quantitative claim against the actual repo state:
  - Local plugin copy: `/home/andrewv/.cursor/plugins/local/zoto-eval-system/` — verified counts (8 agents, 13 commands, 9 skills, 1 rule, 7 schemas, 500-line README, 62-line CHANGELOG).
  - In-monorepo copy: `plugins/zoto-eval-system/` — confirmed only `node_modules/` + `templates/` present (source-of-truth gap is real).
  - Applied state: `.zoto/eval-system/config.yml` — confirmed every key is commented out; no `manifest.yml`/`manifest.history.yml`; `cache/` exists.
  - `evals/_runs/` — confirmed **336** directories (matches spec's claim).
  - `evals/llm/` — confirmed only `node_modules/` (no stamped runner; matches subtask 02 claim).
  - `.cursor-plugin/marketplace.json` — confirmed `zoto-eval-system` is **not** listed.
  - Validation scripts at `scripts/validate-template.mjs` and `scripts/validate-skills.mjs` — confirmed present and executable.
- Verified `.zoto-spec-system/config.json` presence — **absent** (executor falls back to defaults).
- Cross-checked subagent assignments against `.cursor/agents/` and the spec-executor's documented "Available Subagents" table.

## Scores

| Dimension | Score | Notes |
|-----------|-------|-------|
| Completeness | 4.5/5 | All 9 user-stated requirements (implementation review, application review, redundancy/simplification, ergonomics, token+quality, publish-readiness) have dedicated subtask coverage. Every subtask has a multi-bullet deliverables checklist and explicit DoD. |
| Feasibility | 2.5/5 | **Critical issue**: 9/9 subtasks are assigned to subagent types (`crux-platform-architect`, `crux-software-engineer`, `integrity-expert`) that are **not registered** in the spec-executor's Available Subagents table and **have no `.cursor/agents/<name>.md` definitions** in this repo. The executor will either fail to spawn them or silently fall back to `generalPurpose`, violating the spec's own "no generalPurpose" Key Decision (line 55). |
| Structure | 4.5/5 | Dependency graph matches manifest; IDs respect dependency order; phases align. Two minor redundancies in subtask 09's declared deps (01, 02 already transitively required via 03–08, 06). |
| Specificity | 4.5/5 | Deliverables are concrete (cite specific file paths, line ranges, schema names, numerical caps like `analyser.maxCallsPerInvocation: 50`). Subtask 06 even provides example token-magnitude assumptions, setting a quantification precedent. Two minor citation-fuzz points (subtask 08 "line ~7", subtask 07 type-vs-string conflation). |
| Risk Awareness | 4.0/5 | Excellent "Execution Defaults" section pre-authorises the five contentious calls so execution doesn't stall on open questions. "Analysis only, no mutations" is consistently restated. Minor gap: no explicit guard against an executing agent silently copying the local plugin into the monorepo path during execution. |
| Convention Compliance | 3.0/5 | Spec naming and structure follow the spec-system templates; CRUX-agent routing per AGENTS.md is honoured **on paper**. Penalty applied because the spec faithfully follows an **upstream-broken convention** (AGENTS.md lists CRUX agents that don't exist in `.cursor/agents/`) without flagging the gap. |
| **Overall** | **3.9/5** | **Conditional** |

**Weighted calculation**: 4.5×0.25 + 2.5×0.20 + 4.5×0.20 + 4.5×0.15 + 4.0×0.10 + 3.0×0.10 = 1.125 + 0.50 + 0.90 + 0.675 + 0.40 + 0.30 = **3.90**

## Findings

### Strengths

- **End-to-end coverage of the user's stated review surface**: implementation (03, 05, 07), application (02), redundancy/simplification (03, 04), ergonomics (04), token + quality reliability (06), documentation/DX (08), publish-readiness (09). No requirement is orphaned.
- **Empirically grounded**: every spec-cited number checks out — 8 agents, 13 commands, 9 skills, 7 schemas, 500-line README, 336 `_runs/` directories, marketplace absence, in-monorepo emptiness, `.zoto/eval-system/config.yml` fully-commented state. The spec author did real reconnaissance before writing.
- **Execution Defaults section** (index lines 143–154) is a model template for review specs — pre-authorises the five contentious decisions so execution proceeds deterministically.
- **"Analysis only, no fixes" constraint** is repeated in **every** subtask (DoD + Implementation Notes + Testing Strategy + Files Modified footer) — consistency reduces drift risk.
- **Per-subtask findings ledger** (severity / confidence / effort columns) ensures aggregation into subtask 09's roadmap is structurally clean.
- **Quantification-first stance** in subtask 06 (require either a cite or an order-of-magnitude estimate with stated assumptions) discourages vibes-based analysis.
- **Source-of-truth gap is owned by a specific subtask** (02 quantifies, 09 plans resolution) instead of being silently fixed.
- **Strategy-deprecation gate** in subtask 03 has explicit rubric criteria (cost-of-maintenance, prompt-size, user reach, regression risk), preventing "let's just delete it" hedging.

### Issues

| # | Severity | Subtask | Finding | Recommendation |
|---|----------|---------|---------|----------------|
| 1 | HIGH | All (01–09) | `crux-platform-architect` (used by 01, 03, 04, 06, 08), `crux-software-engineer` (02, 05, 07), and `integrity-expert` (09) are listed in `AGENTS.md` but **have no `.cursor/agents/<name>.md` definitions** in this repo (only `crux-cursor-memory-manager`, `crux-cursor-rule-manager`, `zoto-plugin-manager` exist). The `zoto-spec-executor`'s own "Available Subagents" table lists only `generalPurpose`, `zoto-spec-judge`, `explore`, `shell`. Spawning will either fail or silently fall back to `generalPurpose`, violating Key Decision in index line 55–58 ("No subtask uses `generalPurpose`"). | Before execution, either (a) create the three missing agent definitions in `.cursor/agents/`, OR (b) amend the Subtask Manifest + Phase tables to use available subagent types (e.g. `generalPurpose` with explicit role-prompts injected per subtask) and acknowledge the constraint relaxation in Key Decisions. |
| 2 | MEDIUM | 09 | Subtask 09's `Dependencies: 01, 02, 03, 04, 05, 06, 07, 08` is redundant — dependencies 01 and 02 are transitively required via 03–08 (01) and 06 (02). Mermaid graph also draws explicit `S01 → S09` and `S02 → S09` edges. Cosmetic but inflates the visible dependency surface. | Drop 01 and 02 from subtask 09's explicit Dependencies column and remove the `S01 → S09` and `S02 → S09` edges from the mermaid graph. Phase assignments are unchanged. |
| 3 | MEDIUM | 02, 09 | Subtask 02 deliverable line 29 ("characterise the consequence (plugin never publishes via the marketplace flow)") and subtask 09 line 28 ("**currently missing** (per subtask 02). Severity: blocker") **pre-declare the finding's severity** inside the deliverables checklists. This pre-judges what an independent reviewer should empirically confirm and slightly biases the consolidation. | Soften both lines to "expected blocker — confirm via subtask 02 audit". Let the subtask 09 ledger derive severity from subtask 02's evidence rather than the checklist asserting it. |
| 4 | MEDIUM | — (index) | `.zoto-spec-system/config.json` does **not** exist in the repo. The executor and judge will fall back to defaults (`specsDir: specs`, `unitOfWork: spec`, etc.), which happens to match this spec's directory structure — but the dependency on defaults is undocumented. | Add a one-line note in the spec's Overview or Key Decisions stating "Spec-system config defaults are in effect (`specsDir: specs`); no `.zoto-spec-system/config.json` is present in this repo." |
| 5 | LOW | 05 | Subtask 05 authorises running `node scripts/validate-template.mjs` and `node scripts/validate-skills.mjs` (line 71–73) within an otherwise read-only Testing Strategy. The "Files Modified" footer correctly says only findings deliverables should be touched. The two are consistent (the scripts are read-only), but the mixed signal could trip a strict executor. | Add a one-line acknowledgement: "These two validation scripts are read-only and are explicitly pre-authorised — they do not violate the no-mutation guarantee." |
| 6 | LOW | 06 | Subtask 06 depends on `01, 02` — correctly modelled — but its own deliverables (per-path token-cost map) reuse most inventory data from 01 and only need *one* numeric input from 02 (run-folder count + manifest absence). Phase 2 still serializes 06 behind both, which is correct, but the dependency could be marked "soft" if the executor supports it. | No structural change required. Optional: note in Implementation Notes that the only 02-derived input is "current repo state for cold-start cost estimation". |
| 7 | LOW | 07 | Subtask 07 line 31 asks the reviewer to "confirm the literal `_meta?.generated === true` guard the validator enforces matches the schema's `generated` field type". `case-meta.schema.json` defines `generated` as `boolean`, but the literal check in TS source is a string-equality test on AST or YAML text. This is a cross-layer comparison that may not be apples-to-apples. | Reword to: "confirm the runtime guard semantically agrees with the schema field (boolean `true` ↔ AST literal `true`)" rather than implying type equality. |
| 8 | LOW | 08 | Subtask 08 line 22 cites the README footnote "at line ~7" — approximate. Other subtasks consistently demand `start:end:filepath` precision. | Replace `line ~7` with the exact line. (Confirmed: the footnote is at line 7 of `/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md` — `~` can be dropped.) |
| 9 | INFO | — (index) | The `docs-sync-agent` CRUX agent listed in `AGENTS.md` is **not used** by the spec — documentation review routes to `crux-platform-architect` (subtask 08) instead. Reasonable for a review-only spec, but worth a sentence. | Add to Key Decisions: "Documentation review routes to `crux-platform-architect` rather than `docs-sync-agent` because this is a review (not a sync) initiative." |
| 10 | INFO | 09 | DoD line 81 ("at least the blockers and majors enumerated; minors and infos may be sampled") permits the roadmap to elide patterns visible only across many minor findings. Trade-off is reasonable for a v1 readiness roadmap. | Optional: require at least a "Minor findings: total count + top-3 by frequency" subsection in 09's deliverable. |
| 11 | INFO | All | No subtask explicitly forbids executing agents from "fixing" the in-monorepo plugin gap (e.g. by `cp -r` the local copy in). Key Decision 3 (index line 50) and 09's DoD (line 86) implicitly forbid it. | Optional: elevate to an explicit Definition-of-Done line in subtask 02 and 09: "No files copied into `plugins/zoto-eval-system/` during this spec." |

### Dependency Graph

- **Correct edges**: every declared dependency in the manifest corresponds to a graph edge. No missing forward edges. No circular dependencies.
- **Phase numbering**: consistent — 01/02 are Phase 1, 03–08 are Phase 2 (all gated on 01, with 06 also on 02), 09 is Phase 3. Lower IDs do not depend on higher IDs.
- **Redundant edges**: `S01 → S09` and `S02 → S09` are transitively implied by `S0{3..8} → S09`. Cosmetic only.
- **Parallelism**: Phase 1 runs 01+02 in parallel (good). Phase 2 runs 03–08 in parallel (good). Phase 3 is single-subtask consolidation. No artificial serialization detected.

### Risk Summary

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Subagent assignments silently fall back to `generalPurpose` | High | High | Resolve issue #1 above before `/zoto-spec-execute`. |
| Executing agent forgets the no-mutation rule and edits plugin source | Low | High | Already mitigated in every subtask's Testing Strategy + DoD. Consider explicit "no copy into `plugins/zoto-eval-system/`" guard. |
| Phase 2 subtasks duplicate enumeration work because 01's inventory isn't structured for easy citation | Medium | Medium | Subtask 01 deliverables already require a "component matrix" with `start:end:filepath` cites — sufficient if executed faithfully. |
| Subtask 06 cold-start cost estimate triggers a real LLM call | Low | Low | Testing Strategy explicitly forbids LLM invocation in 06. Strong guard. |
| Subtask 09 consolidation deferred to a single fresh-context agent loses context | Medium | Medium | Mitigated by per-subtask findings ledgers (severity/confidence/effort). Subtask 09's job is aggregation, not re-derivation. |
| Subtask 03's "deprecate one strategy" recommendation is taken as an action item in execution | Low | High | Index Key Decision 2 explicitly scopes deprecation to a recommendation; subtask 09 owns roadmap, not implementation. |

## Recommendation

The spec is **substantively strong** — coverage is complete, deliverables are concrete, and the analysis-only constraint is consistently enforced. The single dominant risk is the agent-assignment layer: every subtask routes to a subagent type that does not exist in this repo, and the spec executor will either fail or silently substitute `generalPurpose`, breaking the spec's own "no generalPurpose" Key Decision. Resolve issue #1 (either create the three missing agent definitions or relax the assignments), apply the four other actionable fixes (issues #2, #3, #4, #5), and the spec moves from **Conditional (3.9)** to **Approve (~4.5)** without any structural rework.
