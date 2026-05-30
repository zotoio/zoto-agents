---
persona: zoto-technical-writer
---

# Subtask: Documentation (Structural) — README, config-schema, integration rule

## Metadata
- **Subtask ID**: 07
- **Feature**: zoto-spec-system-sdlc-personas
- **Persona**: zoto-technical-writer
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 01
- **Created**: 20260527

## Objective

Land the **structural** documentation work — README sections, config-schema
rows, integration-rule additions, CHANGELOG `### Documentation` subsection.
This subtask depends only on the foundation contract (subtask 01) and can
run in parallel with subtasks 02–06.

Cross-link verification (ensuring every reference resolves to the actual
landed agent file / skill / config key / rule line) is **not** in this
subtask — it lives in subtask 08 which depends on subtasks 02, 03, 04, 05,
06 having landed. Splitting the work this way removes the soft cross-
dependency that the dependency graph could not enforce.

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
- [ ] **D04** — Update `plugins/zoto-spec-system/CHANGELOG.md` —
      subtask 01 introduced the `1.0.0` entry (framed as the Spec System
      stability milestone); append a `### Documentation` subsection citing
      the new README sections, config-schema additions, and rule-file
      updates. Do NOT alter the `### Breaking` framing — the narrative
      ordering (stability narrative → Breaking → Added → Documentation)
      is the contract.

> **Note:** Cross-link verification — making sure every README mention of
> a persona, skill, or config key resolves to the actual landed file path
> after subtasks 02–06 ship — has been **moved to subtask 08**. This
> subtask only writes the structural prose; subtask 08 verifies it.

## Definition of Done
- [ ] README has SDLC Personas + Roadmap sections.
- [ ] config-schema.md documents the 10 persona keys.
- [ ] Integration rule documents the persona dispatch contract.
- [ ] CHANGELOG `### Documentation` subsection appended under the `1.0.0`
      entry without disturbing the existing narrative ordering.
- [ ] No linter errors in modified files.

(Tier 2 leakage and cross-link verification are validated in subtask 08.)

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
- This subtask is **structural only** — author the prose against the
  canonical persona / skill / config-key list defined in subtask 01
  (`src/personas.ts` + `subtask-spec.schema.json`). Do not gate writes on
  the actual agent or skill files existing yet (they are still landing in
  parallel subtasks). Subtask 08 does the post-hoc cross-link
  verification.

## Testing Strategy

**Do NOT trigger global test suites during parallel execution.** Instead:

- Run `node scripts/validate-template.mjs` and `node scripts/validate-skills.mjs`.
- Defer Tier 2 leakage `rg` sweep, cross-link checks, and the repo-wide
  `pnpm test` to subtasks 08 and 10.

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
