# Spec Assessment: zoto-spec-system SDLC Personas (Tier 1)

**Target**: `specs/20260527-zoto-spec-system-sdlc-personas/spec-zoto-spec-system-sdlc-personas-20260527.md`
**Assessed**: 2026-05-27
**Verdict**: Approve (4.35 / 5)

## Scores

| Dimension | Score | Notes |
|-----------|-------|-------|
| Completeness | 5/5 | Every user-stated acceptance criterion is covered: 10 personas, 5 phase skills, persona dispatch, generator auto-assignment, judge enforcement, smoke + dispatch + schema-validation evals, README + Roadmap, init-config.yml, lockstep version bump, validation gates. |
| Feasibility | 4/5 | Foundation (subtask 01) is genuinely self-contained. Subtasks 02–07 are largely independent file authoring. Two real risks: subtask 07 D04 has a soft cross-subtask dependency it cannot enforce, and the schema-vs-TS-constants drift detection in subtask 01 D08 is asserted ("the build/test must fail") but no concrete failing-test deliverable is specified. |
| Structure | 4/5 | Dependency graph is correct, phases are logical, no circular deps, mermaid matches manifest. The `Subagent` column in the manifest is now dead weight (every row says `generalPurpose` while every subtask file's `persona:` is the real source of truth) — confusing, not broken. |
| Specificity | 4/5 | Most deliverables cite concrete files, fields, CLI flags. A few are slightly soft: subtask 04 D04 placement ("or the executor entry point if that's where validation lives"), subtask 09 D07 ownership of the spec-index Status field, and the smoke-test ≤ 200-line check (subtask 08 D11) doesn't mirror the "frontmatter included" framing from subtask 03's hard cap. |
| Risk Awareness | 4/5 | Spec calls out the breaking change, "no migration script" stance, Tier 2 leakage `rg` sweep, parallel-test foot-gun, executor/judge/generator drift hazard. Misses: rollback plan, malformed-YAML handling in the new frontmatter parser, schema-vs-constants drift enforcement mechanism, and `subtask-status.schema.json` impact (in practice the existing schema accepts persona ids unchanged — see Risk Summary). |
| Convention Compliance | 5/5 | Excellent fit with the existing plugin layout: `templates/schema/`, `agents/evals/<name>.test.ts` smoke pattern (mirrors the existing executor/generator/judge tests), `tests/integration/` directory pattern, `ajv` + `yaml` already shipped as deps, lockstep version bump in `package.json` + `.cursor-plugin/plugin.json`, subtask file format matches the generator template. |
| **Overall** | **4.35 / 5** | **Approve — ready for `/z-spec-execute` after considering the optional fixes below.** |

## Findings

### Strengths

1. **Schema-anchored contract is the right design.** The new `templates/schema/subtask-spec.schema.json` (subtask 01 D09) plus the shared `validateSubtaskFrontmatter` helper (D10) give a single source of truth that the executor, judge, and `spec-status-roundtrip scaffold` all consume. The "schema is canonical; constants must stay aligned" framing in D08 is the correct invariant.
2. **The spec is self-validating.** All 9 subtask files already carry `persona:` frontmatter from one of the 10 Tier 1 ids — these files are the natural test fixture for subtask 01's schema and subtask 09 D05.1 explicitly validates them. Subtask 09 D05.2 also requires a hand-crafted negative case (`persona: data-engineer`) to verify rejection. Excellent dogfooding.
3. **Disciplined parallelism.** Phase 1 lands the foundation, Phase 2 (subtasks 02–07) is genuinely parallelisable (all depend only on 01), Phase 3 (08) tests tangible artifacts from 02/03/04, Phase 4 (09) runs repo-wide gates. Each subtask explicitly defers global tests to subtask 09 ("Do NOT trigger global test suites during parallel execution") which is exactly the right hygiene.
4. **User constraints honoured precisely.** Tier 2 only in README *Roadmap* (subtask 07 D01 + D02/D03 exclusions + subtask 09 D06.8 `rg` sweep). Persona files capped ≤ 200 lines (subtask 03 D11, requirement #5, smoke-test assertion in subtask 08). Phase skills are *shared* by phase, not one-per-persona (subtask 02 owners table, "phase-scoped, not persona-scoped"). User's "tight and fast" guidance is literally quoted in subtask 03.
5. **Breaking change framed as a stability milestone.** v1.0.0 narrative ordering (stability narrative → `### Breaking` → `### Added` → `### Documentation`) is fixed in subtask 01 D07 and protected in subtask 07 D05. The CHANGELOG entry is constrained enough that the executing agent cannot soften the message.
6. **Belt-and-braces enforcement.** Hard error at parser-level *and* schema-level (subtask 01 D04), executor hard-fails on missing/invalid frontmatter (subtask 04 D01), judge surfaces it as a critical Mode 3 finding (subtask 06 D01), generator can never produce a draft without it (subtask 05 D01). All three reference the same canonical persona list.

### Issues

| # | Severity | Subtask | Finding | Recommendation |
|---|----------|---------|---------|----------------|
| 1 | MEDIUM | spec index | The `Subtask Manifest` `Subagent` column says `generalPurpose` for every row, but every subtask file's `persona:` frontmatter is the actual source of truth. The executor (subtask 04 D01) is told to read `persona:` not the manifest column. The `Subagent` column is now dead weight and contradicts the spec's own contract. | Either (a) add a `Persona` column alongside `Subagent` and populate it with each subtask's actual persona id, or (b) replace `Subagent` with `Persona`. Update the per-subtask `**Assigned Subagent**` Metadata bullet too so the prose and frontmatter agree. |
| 2 | MEDIUM | 09 D07 | `D07 — Update the spec index file's Status from Draft… to Completed`. The spec-index Status field is owned by the executor / spec-aggregator per the existing reviewer non-interference contract, not by the executing subagent of subtask 09. Having subtask 09 directly edit the index Status invites cross-owner writes. | Reframe D07: *"Confirm DoD completion to the executor; the executor and aggregator are responsible for transitioning the spec-index Status field. This subtask MAY append a one-line summary to **Execution Notes** in the index, but MUST NOT edit the manifest or the Status field directly."* |
| 3 | MEDIUM | 07 D04 | `D04 — Sanity-check the docs against the actual implementation after subtasks 02–06 are complete`. Subtask 07 only declares dependency on 01, so the executor will run 07 in parallel with 02–06. The deliverable acknowledges this ("Encode this expectation in the work log rather than as a hard dependency") but the soft-handling will likely produce mid-execution churn or a re-spawn. | Either (a) split 07 into `07a-documentation-structural` (depends on 01, lands README sections / config-schema rows / rule-file additions that don't reference live skill or agent file content) and `07b-documentation-cross-link-verification` (depends on 02..06, runs the cross-link grep + name-equality checks), or (b) add a hard dependency `07 → 02, 03, 04, 05, 06` and accept the serialisation cost. Splitting is preferred because the structural work is independent from the cross-link verification. |
| 4 | MEDIUM | 01 D08 / D10 | "The constants in `src/personas.ts` MUST stay aligned with the `persona` enum in the new `subtask-spec.schema.json` (D09) — the schema is canonical; if the two ever diverge, the build/test must fail." This is the right invariant, but no concrete failing-test deliverable is specified. The drift detection is currently aspirational. | Add a deliverable to D10 (or a new D11): *"Add a unit test (e.g. `src/personas.test.ts` or extend `subtask-spec-validator.test.ts`) that loads `subtask-spec.schema.json` at test time, extracts the `properties.persona.enum` array, and asserts it deep-equals `TIER1_PERSONAS` (length and values). The test MUST fail loudly when the two diverge."* |
| 5 | LOW | 05 D01 / persona | Subtask 05 (`Generator persona assignment`) carries `persona: zoto-product-analyst`. The work is largely updating LLM agent prose and a SKILL.md to teach the generator about persona auto-assignment heuristics — a closer fit for `zoto-technical-writer` (agent/skill prose) or `zoto-software-architect` (designing the predicate / contract). The product-analyst label is plausible but is a useful test of subtask 06 D01 step 2 ("ensure the persona is plausible for the subtask's deliverables — soft finding"). | Optional: leave as-is to exercise the soft-finding path, OR reassign to `zoto-technical-writer`. Either is defensible. |
| 6 | LOW | 01 D04 | The new YAML frontmatter parser has no specified handling for malformed YAML (unclosed `---`, invalid indentation, etc.). The executor would crash mid-run on a malformed subtask file. | Tighten D04: *"Wrap the YAML.parse call in a try/catch and surface a clear error of the form `'Subtask <file> has malformed YAML frontmatter: <cause>'` before exiting non-zero."* |
| 7 | LOW | 04 D04 | "Add a regression check to `plugins/zoto-spec-system/scripts/spec-status-roundtrip.ts validate` (or the executor entry point if that's where validation lives)…" — the parenthetical hedging will produce executor churn. The script does have a `validate` subcommand, but the deliverable doesn't commit to it. | Pick a home: *"Extend `scripts/spec-status-roundtrip.ts` with a `validate-personas` subcommand (or extend the existing `validate` subcommand) that walks every `subtask-*.md` in a given spec directory and runs `validateSubtaskFrontmatter` against each. Exit non-zero with the offending filename and the schema error on first violation."* |
| 8 | LOW | 08 D11 / 03 hard cap | Subtask 03 says "≤ 200 lines (frontmatter included)". Subtask 08 D11 smoke-test phrasing is "File body length ≤ 200 lines". The two should agree. | Clarify subtask 08 D11 step 4 (and the `### Implementation Notes` "≤ 200 lines" assertion) to match subtask 03: *"file length ≤ 200 lines (frontmatter included; matches subtask 03 hard cap)."* |
| 9 | LOW | spec index | No rollback note. v1.0.0 is a breaking change with explicit "no migration script" framing — but downstream consumers may need to revert. | Add a 1–2 line **Rollback** note to the spec index: *"Revert to `0.7.0` via `git revert <merge-commit>`. Subtask spec frontmatter is then ignored by the legacy parser as content; `**Assigned Subagent**` Metadata bullets continue to drive dispatch. No data migration is required."* |
| 10 | LOW | 04 D02 step 4 | Adversarial-verification re-spawn says "reads the same `persona:` value (not the manifest column) when retrying" — but does not require re-validation. A spec edited mid-run could change `persona:` to a non-Tier-1 value between spawns. | Add to D02 step 4: *"Re-validate the subtask file via `validateSubtaskFrontmatter` before each re-spawn. A re-spawn against a now-invalid persona MUST fail with the same hard error as the initial spawn."* |

### Persona Coverage (NEW dimension for this spec)

| ID | Persona (frontmatter) | Plausible for the work? | Notes |
|----|------------------------|--------------------------|-------|
| 01 | `zoto-backend-engineer` | ✅ Excellent | TS code, JSON schema, CLI changes |
| 02 | `zoto-technical-writer` | ✅ Excellent | 5 SKILL.md authors |
| 03 | `zoto-technical-writer` | ✅ Excellent | 10 short agent markdown files |
| 04 | `zoto-backend-engineer` | ✅ Good | LLM agent prose + a TS unit test for budget resolution |
| 05 | `zoto-product-analyst` | ⚠️ Soft mismatch | See issue #5; useful test of judge soft-finding path |
| 06 | `zoto-code-reviewer` | ✅ Excellent | Judge enforcement is review-domain |
| 07 | `zoto-technical-writer` | ✅ Excellent | README + config-schema + rule |
| 08 | `zoto-test-engineer` | ✅ Excellent | 10 smoke tests + 1 integration test |
| 09 | `zoto-test-engineer` | ✅ Excellent | Repo-wide test/validator runner |

All 9 subtasks declare a Tier 1 persona — the spec is its own validation fixture. The schema in subtask 01 D09 should accept all 9 of these as-is and reject the negative case in subtask 09 D05.2.

### Manifest Validity

- ✅ All 9 subtask files exist on disk and match the manifest filenames.
- ✅ Dependencies in the manifest match each subtask's Metadata bullet (`Dependencies: 01` for 02–07; `02, 03, 04` for 08; `02..08` for 09).
- ✅ Phase assignments respect dependencies — every subtask's phase is greater than its dependencies'.
- ✅ No subtask depends on a higher-numbered ID.
- ✅ Mermaid graph edges match the manifest exactly: `S01 → S02..S07`, `S02/S03/S04 → S08`, `S02..S08 → S09`.
- ⚠️ The `Subagent` column is uniformly `generalPurpose` and contradicts the new `persona:` source-of-truth contract (issue #1).

### Dependency Graph

- Topology is correct and matches the mermaid.
- Parallel fan-out is 6 (subtasks 02–07 after 01 lands). With `spec.parallelLimit: 4` (default), 2 will queue. The spec's Phase 2 note ("the executor will queue surplus subtasks and run them as slots free up") is honest about this.
- Subtask 07's soft cross-dependency on 02–06 (issue #3) is a structural smell that the graph does not capture.
- No circular dependencies; no missing edges (each subtask's declared deps cover the artifacts it actually consumes — execpt #3 above).

### Risk Summary

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Schema-vs-constants drift between `subtask-spec.schema.json` and `src/personas.ts` over time | Medium | High (silent contract drift; CI green but executor and schema disagree on which personas are valid) | Land the failing-test deliverable from issue #4. |
| Documentation churn from subtask 07's soft cross-dependency on 02–06 | High | Low–Medium (mid-run re-spawn or stale doc cross-links at merge) | Split 07 into 07a/07b or add hard deps (issue #3). |
| Parallel limit (`4`) bottlenecks Phase 2 (6 subtasks) | High | Low (executor queues; pure wall-clock cost) | Document the expected Phase 2 wall time, or temporarily bump `spec.parallelLimit` to `6` for this spec. |
| Malformed YAML frontmatter crashes the executor mid-run | Low | Medium (loud failure with bad UX rather than clear error) | Tighten subtask 01 D04 with try/catch + clear error message (issue #6). |
| Aggregator / `subtask-status.schema.json` rejects persona ids in `assigned_agent` | Low | Low | Verified: existing schema accepts `assigned_agent` as `type: string, minLength: 1` with no enum constraint, so persona ids flow through unchanged. No spec change required. |
| Cross-owner write: subtask 09 edits spec-index Status (a field owned by the executor / aggregator) | Medium | Medium (precedent for status pair contract violations) | Reframe subtask 09 D07 (issue #2). |
| Auto-assignment heuristic picks wrong persona for multi-faceted subtasks | Medium | Low | Already mitigated: subtask 05 D01 mandates `askQuestion` / `needs_user_input` user override before file writes. |
| Re-spawn after spec edit lands an invalid persona | Low | Medium | Add re-validation to subtask 04 D02 step 4 (issue #10). |
| No rollback path documented for v1.0.0 breaking change | Low | Low | One-line rollback note in the spec index (issue #9). |

## Recommendation

**Approve (4.35 / 5).** The spec is high-quality, internally consistent, and well-aligned with both the user's stated requirements and the existing `plugins/zoto-spec-system/` conventions. The schema-anchored contract is the correct design and the spec is self-validating against the very schema it ships. Three medium-severity issues are worth addressing before execution (issues #1, #2, #3) — they each address structural cleanliness rather than correctness, but they reduce the chance of mid-execution churn or status-pair contract violations. Issue #4 (drift detection) is also worth landing as a small additional deliverable in subtask 01. The remaining six findings are low-severity polish that can be applied in-flight or deferred.

If the user accepts the proposed fixes, the spec should land at ≥ 4.6 / 5 and is ready for `/z-spec-execute` immediately afterwards. If the user declines all fixes, the spec is still safely executable today; the issues will surface as adversarial-verification findings on the relevant subtasks (notably 07 and 09).

## Proposed Fix-List (gated on user approval)

| # | Severity | File(s) | Concrete change |
|---|----------|---------|-----------------|
| 1 | MEDIUM | `spec-zoto-spec-system-sdlc-personas-20260527.md` (manifest) + every `subtask-NN-...md` Metadata block | Add a `Persona` column to the Subtask Manifest populated from each file's `persona:` frontmatter; either drop the `Subagent` column or keep it as informational with a footnote. Update each subtask's `**Assigned Subagent**` Metadata bullet to read `**Persona**: <id>` (or add a sibling `**Persona**` bullet) so prose and frontmatter agree. |
| 2 | MEDIUM | `subtask-09-...-final-validation-20260527.md` D07 | Reframe D07 to: *"Confirm DoD completion to the executor; do NOT edit the spec-index `Status` field directly. The executor / aggregator owns the manifest Status transition. This subtask MAY append a one-line summary to **Execution Notes** in the spec index."* |
| 3 | MEDIUM | spec index + `subtask-07-...-documentation-20260527.md` | Split subtask 07 into 07a (`structural docs` — README sections, config-schema rows, rule-file additions, depends on 01) and 07b (`cross-link verification` — name-equality grep + Tier 2 leakage check, depends on 02, 03, 04, 05, 06). Update the manifest, dep graph, and mermaid. *(Alternative: add a hard dependency `07 → 02, 03, 04, 05, 06` and accept serialisation.)* |
| 4 | MEDIUM | `subtask-01-...-foundation-contract-20260527.md` D08 / D10 | Add an explicit deliverable: *"Unit test in `src/personas.test.ts` (or extend `subtask-spec-validator.test.ts`) that loads `subtask-spec.schema.json`, extracts `properties.persona.enum`, and asserts it deep-equals `TIER1_PERSONAS`. Test MUST fail when the two diverge."* |
| 5 | LOW | `subtask-05-...-generator-persona-assignment-20260527.md` frontmatter | Optional: change `persona: zoto-product-analyst` → `persona: zoto-technical-writer`. Defensible to leave as-is to exercise the judge's soft-finding path. |
| 6 | LOW | `subtask-01-...` D04 | Append: *"Wrap YAML.parse in try/catch; on failure emit `'Subtask <file> has malformed YAML frontmatter: <cause>'` and exit non-zero."* |
| 7 | LOW | `subtask-04-...` D04 | Replace the parenthetical hedge with: *"Extend `scripts/spec-status-roundtrip.ts` with a `validate-personas` subcommand (or fold into the existing `validate` subcommand) that walks every `subtask-*.md` in a spec directory and runs `validateSubtaskFrontmatter` against each."* |
| 8 | LOW | `subtask-08-...` D11 step 4 (and `### Implementation Notes` line 4) | Change phrasing to: *"file length ≤ 200 lines (frontmatter included; matches subtask 03 hard cap)."* |
| 9 | LOW | spec index (after **Definition of Done**) | Add a one-line `## Rollback` section: *"Revert to `0.7.0` via `git revert <merge-commit>`. The legacy `**Assigned Subagent**` parser fallback handles the un-migrated case automatically; no data migration is required."* |
| 10 | LOW | `subtask-04-...` D02 step 4 | Append: *"Re-validate the subtask file via `validateSubtaskFrontmatter` before each re-spawn. A re-spawn against a now-invalid persona MUST fail with the same hard error as the initial spawn."* |

The judge does not apply fixes in this run. Surface this fix-list to the user via the parent agent's `askQuestion` flow; on approval, apply edits in spec-file scope only (manifest, subtask files, dependency graph) per the Mode 3 contract.
