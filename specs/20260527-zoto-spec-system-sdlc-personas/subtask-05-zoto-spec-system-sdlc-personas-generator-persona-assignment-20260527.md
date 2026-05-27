---
persona: zoto-technical-writer
---

# Subtask: Generator persona assignment — auto-assign + user override

## Metadata
- **Subtask ID**: 05
- **Feature**: zoto-spec-system-sdlc-personas
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 01
- **Created**: 20260527

## Objective

Update `zoto-spec-generator` and the `zoto-create-spec` skill so every drafted
subtask is auto-assigned a persona during `/z-spec-create`, and the user is
prompted to confirm or override the full assignment table before files are
written.

## Deliverables Checklist

- [ ] **D01** — Updated `plugins/zoto-spec-system/agents/zoto-spec-generator.md`:
      - Update the **Subtask File Structure** template to include a top-of-file
        YAML frontmatter block with a `persona:` field, e.g.
        ```
        ---
        persona: zoto-backend-engineer
        ---
        ```
        positioned **above** the existing `# Subtask: …` heading. Cite the
        canonical Tier 1 persona list (or import from
        `src/personas.ts` shared constant from subtask 01).
      - Update the **Subtask Manifest** index template to include a
        `Persona` column alongside (or replacing) the existing
        `Subagent` column. The Subagent column may remain for tooling
        compatibility but is informational; the persona is the source of
        truth.
      - Add a new subsection **Persona auto-assignment heuristics**:
        document the deterministic rules (UI work → frontend; tests-only
        → test-engineer; CI/workflows → devops; threat-model/security
        deliverables → security-engineer; design/ADR → architect;
        runbooks/docs → technical-writer or sre as appropriate;
        observability → sre; review-only → code-reviewer; default →
        backend-engineer). Note that **migration-shaped subtasks are not
        currently supported** by Tier 1 and should be flagged for
        follow-up (Tier 2 roadmap).
      - Add a **Critical Rules** entry: "Every drafted subtask MUST receive
        a `persona:` value before the file is written. Use `askQuestion`
        (interactive) or `needs_user_input` (subagent) to prompt the user
        with the proposed assignments and accept overrides per subtask."
- [ ] **D02** — Updated `plugins/zoto-spec-system/skills/zoto-create-spec/SKILL.md`:
      - **Step 5 (Assign Subagents)** is renamed to **Step 5 (Assign
        Persona + Subagent)**. Replace the 3-row recommendation table with
        a two-stage flow:
        1. Pick a persona from the Tier 1 list using the heuristics above.
        2. Pick the executing subagent (still typically `generalPurpose`
           today; future-proof for persona-specific subagent ids).
        Include a worked example.
      - **Step 6 (Create Spec Files)** gains a new precondition: do not
        write any subtask file until the user has confirmed the proposed
        persona table via `askQuestion` (interactive) or returned
        `USER_ANSWERS:` after `needs_user_input` (subagent).
      - **Step 6 item 3** is updated: subtask files MUST start with YAML
        frontmatter declaring `persona:`.
      - **Step 6.4 (Scaffold status pair)** acknowledges that scaffold now
        reads `persona:` from frontmatter and writes it into
        `assigned_agent`.
- [ ] **D03** — Update the `zoto-create-spec` skill's **What NOT to Do**
      list to include "Do not write subtask files without `persona:`
      frontmatter." and "Do not assign Tier 2 personas — they are roadmap
      items only."
- [ ] **D04** — Update or add eval cases for `zoto-create-spec` in
      `plugins/zoto-spec-system/skills/zoto-create-spec/evals/evals.json`
      that exercise the persona-assignment + user-confirmation flow:
      - one case asserting the generator proposes a persona for every
        subtask;
      - one case asserting frontmatter `persona:` is present in the
        generated subtask files.
- [ ] **D05** — Add a "persona override" example to the generator agent
      file: when the user overrides the auto-assignment, the generator
      records the override in **Key Decisions** of the spec index so the
      audit trail is preserved.

## Definition of Done
- [ ] Generator agent file documents the persona auto-assignment + user
      override workflow.
- [ ] `zoto-create-spec` skill explicitly requires user confirmation before
      file writes.
- [ ] Skill eval cases cover persona assignment.
- [ ] No linter errors in modified files.
- [ ] `node scripts/validate-template.mjs` and `node scripts/validate-skills.mjs`
      both still pass.

## Implementation Notes

- Use the canonical 10-persona list from `src/personas.ts` (subtask 01) as
  the source of truth in the generator agent file too — link to the file
  rather than re-listing inline if the file path is stable.
- The auto-assignment heuristics should be deterministic and transparent
  — the user must be able to see *why* a persona was proposed. Have the
  generator output the reasoning alongside the proposal, e.g.
  "Proposed `zoto-frontend-engineer` because the deliverables list includes
  `*.tsx` files in `src/ui/`."
- Coordinate with subtask 04 (executor dispatch): the executor enforces
  `persona:` at run time; the generator must therefore never produce a
  subtask without it.
- Coordinate with subtask 06 (judge validation): the judge surfaces missing
  `persona:` as a critical finding; the generator must therefore never
  ship a draft that the judge would reject on this basis.
- The user override prompt should batch all proposed assignments into a
  single `askQuestion` block with one option per subtask — not 1 question
  per subtask. The skill already documents `askQuestion` and
  `needs_user_input` as the required mechanism.

## Testing Strategy

**Do NOT trigger global test suites during parallel execution.** Instead:

- Run `node scripts/validate-template.mjs` and `node scripts/validate-skills.mjs`
  to validate frontmatter changes.
- Run the skill-scoped eval suite for `zoto-create-spec` if a runner exists
  (`pnpm --filter @zoto-agents/zoto-spec-system run eval` or similar).
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
