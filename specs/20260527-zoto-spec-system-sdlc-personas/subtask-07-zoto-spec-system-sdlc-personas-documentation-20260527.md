---
persona: zoto-technical-writer
---

# Subtask: Documentation — README, config-schema, integration rule

## Metadata
- **Subtask ID**: 07
- **Feature**: zoto-spec-system-sdlc-personas
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 01
- **Created**: 20260527

## Objective

Document the new persona contract, the 10 personas, the 5 phase skills, and
the Tier 2 roadmap. Update the plugin's integration rule so consuming
projects pick up the new dispatch model automatically.

## Deliverables Checklist

- [ ] **D01** — Updated `plugins/zoto-spec-system/README.md`:
      - New top-level **SDLC Personas** section (after the existing Agents
        section). Lists each Tier 1 persona, its phase skill(s), and a
        one-line responsibility (use the table from the spec index file as
        a starting point).
      - New top-level **Roadmap** section listing the 9 Tier 2 personas as
        future work, each with a one-line description and an explicit "not
        yet shipped" caveat. Tier 2 list:
        `data-engineer`, `ux-designer`, `a11y`, `performance`, `ml`,
        `migration`, `compliance`, `finops`, `release-manager`.
      - Updated **Configuration** key fields table to include
        `subagents.persona-<name>.tokenBudget` and
        `subagents.persona-<name>.model` rows.
      - Brief note in **How It Works** about the persona dispatch flow:
        subtask `persona:` → executor `--role persona-<name>` → config
        budget / model resolution → spawn.
      - One-line pointer to the new
        `templates/schema/subtask-spec.schema.json` as the canonical
        contract for subtask frontmatter (linked from the SDLC Personas
        section).
- [ ] **D02** — Updated `plugins/zoto-spec-system/docs/config-schema.md`:
      - Document the 10 `subagents.persona-<name>` keys with the same
        format as existing `generator|executor|judge|subtask` rows.
      - Note that `subagents.additionalProperties: true` permits these
        without a schema change, and that `default` continues to apply
        when a persona key is omitted.
      - Cross-link to the README's SDLC Personas section.
- [ ] **D03** — Updated `plugins/zoto-spec-system/rules/zoto-spec-system.mdc`:
      - Add a new subsection covering the persona dispatch invariants:
        every subtask MUST declare `persona:` frontmatter; the executor
        fails loudly on missing/invalid values; the judge surfaces missing
        `persona:` as a critical finding.
      - Add a row to the existing TodoWrite-per-role table for each of the
        10 personas (or a single "persona-*" row referencing the canonical
        list).
      - Add a one-line pointer to the 5 phase skills.
- [ ] **D04** — Sanity-check the docs against the actual implementation
      after subtasks 02–06 are complete: ensure persona names, skill
      names, and config keys match exactly. (This subtask depends only on
      01, but the executor will run it after enough siblings have landed
      to make doc text accurate. Encode this expectation in the work log
      rather than as a hard dependency.)
- [ ] **D05** — Update `plugins/zoto-spec-system/CHANGELOG.md` if needed —
      subtask 01 introduced the `1.0.0` entry (framed as the Spec System
      stability milestone); this subtask MAY append a `### Documentation`
      subsection citing the new README sections, config-schema additions,
      and rule-file updates. Do NOT alter the `### Breaking` framing — the
      narrative ordering (stability narrative → Breaking → Added →
      Documentation) is the contract.

## Definition of Done
- [ ] README has SDLC Personas + Roadmap sections.
- [ ] config-schema.md documents the 10 persona keys.
- [ ] Integration rule documents the persona dispatch contract.
- [ ] Tier 2 personas appear ONLY in the README Roadmap (and nowhere else
      in the codebase).
- [ ] No linter errors in modified files.

## Implementation Notes

- Keep the README **concrete and short** — link to skills and agents rather
  than restating their content. The user's "tight and fast" guidance
  applies to docs too.
- The Roadmap section should set explicit expectations: Tier 2 is a
  **future** consideration; no implementation is planned in this release.
  Avoid promising features.
- Cross-link the persona list, the phase skills, and the config keys
  consistently — every README mention of `zoto-backend-engineer` should
  point at both the agent file and its phase skill.
- The integration rule is `alwaysApply: true` and lives in agent context
  for every consuming project — keep additions terse and avoid duplicating
  the README.
- Run `grep -rn "data-engineer\|ux-designer\|a11y\|performance\|ml\|migration\|compliance\|finops\|release-manager" plugins/zoto-spec-system/` after editing the README; the only matches must be inside the README's Roadmap section.

## Testing Strategy

**Do NOT trigger global test suites during parallel execution.** Instead:

- Run `node scripts/validate-template.mjs` and `node scripts/validate-skills.mjs`.
- Run a `grep`/`rg` sweep to confirm Tier 2 personas only appear in the
  README Roadmap.
- Defer the repo-wide `pnpm test` to subtask 09.

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
