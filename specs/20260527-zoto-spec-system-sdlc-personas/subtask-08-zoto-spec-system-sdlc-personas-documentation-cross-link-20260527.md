---
persona: zoto-technical-writer
---

# Subtask: Documentation (Cross-link Verification) — verify docs against landed implementation

## Metadata
- **Subtask ID**: 08
- **Feature**: zoto-spec-system-sdlc-personas
- **Persona**: zoto-technical-writer
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 02, 03, 04, 05, 06
- **Created**: 20260527

## Objective

Verify that every cross-link in the structural docs (subtask 07) resolves to
the actual landed agent file, skill, config key, executor/judge/generator
update, and rule line. This subtask exists to convert what was previously a
**soft cross-dependency** ("subtask 07 D04 — sanity-check after 02–06 land")
into a **hard, graph-enforced phase** that the executor can schedule
correctly.

This subtask runs after the persona agents (03), phase skills (02), executor
dispatch (04), generator persona assignment (05), and judge validation (06)
have all landed. It does NOT depend on subtask 09 (evals) or subtask 10
(final validation).

## Deliverables Checklist

- [ ] **D01** — README cross-link verification. For each persona named in
      `plugins/zoto-spec-system/README.md` (SDLC Personas section), confirm:
      1. The matching agent file exists at
         `plugins/zoto-spec-system/agents/<persona>.md`.
      2. The phase skill named in the README row exists at
         `plugins/zoto-spec-system/skills/<phase-skill-name>/SKILL.md`.
      3. The README's "How It Works" persona dispatch flow text matches the
         actual executor agent prose landed in subtask 04 (no contradictions
         on `--role persona-<name>` or schema-validated frontmatter).
      4. The README's pointer to
         `templates/schema/subtask-spec.schema.json` resolves to a real file
         landed by subtask 01.
- [ ] **D02** — `docs/config-schema.md` cross-link verification. Confirm:
      1. Every `subagents.persona-<name>` row maps to a real persona id from
         the canonical list in `plugins/zoto-spec-system/src/personas.ts`
         (subtask 01 D08).
      2. The cross-link to the README's SDLC Personas section resolves
         (anchor exists in README).
- [ ] **D03** — `rules/zoto-spec-system.mdc` cross-link verification.
      Confirm:
      1. The persona dispatch invariants documented in the rule match the
         executor / judge / generator prose actually landed in subtasks 04,
         05, 06.
      2. The TodoWrite-per-role table contains rows (or a `persona-*`
         placeholder row referencing the canonical list) for the 10 Tier 1
         personas.
      3. The pointer to the 5 phase skills resolves to real skill
         directories from subtask 02.
- [ ] **D04** — Tier 2 leakage `rg` sweep. Run:
      ```
      rg -n 'data-engineer|ux-designer|a11y|performance|ml|migration|compliance|finops|release-manager' plugins/zoto-spec-system/
      ```
      The only matches MUST be inside `plugins/zoto-spec-system/README.md`
      (Roadmap section). Any match elsewhere is a critical finding — this
      subtask MUST flag it and either fix-in-place (if the match is a
      stray copy-paste) or surface as a blocker for the relevant subtask
      author to address.
- [ ] **D05** — Run `node scripts/validate-template.mjs` and
      `node scripts/validate-skills.mjs` to confirm the docs / agents /
      skills all still validate after the integration of subtask 07's
      structural changes with the artifacts from subtasks 02–06.
- [ ] **D06** — Capture findings in the work log. If any cross-link
      mismatch is found, document the offending location, the expected
      vs actual value, and which upstream subtask owns the fix.
      Mismatches that require *prose* changes can be fixed in this
      subtask; mismatches that require *implementation* changes must
      block and be routed back to the upstream subtask via the executor's
      adversarial-verification flow.

## Definition of Done
- [ ] All cross-links from subtask 07's structural docs resolve to real
      files / paths / values landed in subtasks 02–06.
- [ ] Tier 2 leakage `rg` sweep is clean (matches only inside the README
      Roadmap section).
- [ ] `node scripts/validate-template.mjs` and
      `node scripts/validate-skills.mjs` both pass.
- [ ] No linter errors in modified files.

## Implementation Notes

- This subtask is the **integration verification step** for the
  documentation work. It exists to prevent stale cross-links shipping to
  consumers when README mentions an agent file or skill that ended up
  named slightly differently (e.g. `zoto-skill-sdlc-implementation` vs
  `zoto-skill-implementation`).
- The cross-link verification is mostly a `grep`/`rg` exercise plus a few
  filesystem `stat` checks — keep it tight and mechanical.
- If a mismatch is purely textual (e.g. a typo in the README that doesn't
  match the actual file name), fix it in place and record the change in
  the work log.
- If a mismatch reflects a real implementation gap (e.g. a persona agent
  file was never created, or the executor prose contradicts the rule
  file), block and route back to the upstream subtask. This is exactly
  the adversarial-verification handoff that the spec-system supports
  natively.
- The Tier 2 grep check is a load-bearing acceptance criterion — a
  single Tier 2 mention outside the README Roadmap must be flagged.

## Testing Strategy

**Do NOT trigger global test suites during parallel execution.** Instead:

- Run `node scripts/validate-template.mjs` and `node scripts/validate-skills.mjs`.
- Run the Tier 2 `rg` sweep documented in D04.
- Run targeted filesystem checks (e.g. `ls plugins/zoto-spec-system/agents/zoto-*.md`)
  to confirm cross-link targets exist.
- Defer the repo-wide `pnpm test` to subtask 10 (final validation).

## Execution Notes
_(to be filled by the executing agent)_

### Agent Session Info
- Agent: [Not yet assigned]
- Started: [Not yet started]
- Completed: [Not yet completed]

### Work Log
[Agent adds notes here during execution]

### Blockers Encountered
[Any blockers or issues]

### Files Modified
[List of files changed]
