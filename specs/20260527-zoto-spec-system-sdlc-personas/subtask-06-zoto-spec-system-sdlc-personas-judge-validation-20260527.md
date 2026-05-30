---
persona: zoto-code-reviewer
---

# Subtask: Judge validation — fail specs missing `persona:` frontmatter

## Metadata
- **Subtask ID**: 06
- **Feature**: zoto-spec-system-sdlc-personas
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 01
- **Created**: 20260527

## Objective

Update `zoto-spec-judge` and the `zoto-judge-spec` skill so any spec whose
subtasks are missing `persona:` frontmatter (or carrying a non-Tier-1 value)
is flagged as a **critical finding** that blocks an "Approve" verdict in the
Mode 3 spec assessment.

## Deliverables Checklist

- [ ] **D01** — Updated `plugins/zoto-spec-system/agents/zoto-spec-judge.md`:
      - In the **Mode 3 (Spec Assessment)** section, add an explicit
        validation rule: "Every subtask file MUST have YAML frontmatter
        declaring `persona:` from the Tier 1 set. Any deviation is a
        critical finding."
      - In the **Critical Rules** list, add: "If any subtask is missing
        `persona:` or carries a non-Tier-1 value, downgrade the spec
        verdict to at most 3.0 (Conditional) regardless of other quality
        scores."
      - Cross-link to the canonical Tier 1 persona list (subtask 01's
        `src/personas.ts`).
- [ ] **D02** — Updated `plugins/zoto-spec-system/skills/zoto-judge-spec/SKILL.md`:
      - **Step 4 (Validate Subtask Manifest)** gains a new sub-check: parse
        each subtask's YAML frontmatter and validate against
        `templates/schema/subtask-spec.schema.json` (the canonical contract
        from subtask 01 D09) via the shared `validateSubtaskFrontmatter`
        helper. Any schema violation — missing `persona:`, non-Tier-1
        persona, unknown frontmatter key, etc. — is recorded as a `critical`
        finding.
      - **Step 5 (Check Subtask Quality)** gains a new sub-check: ensure
        the persona is plausible for the subtask's deliverables (e.g. a
        UI-shaped subtask should not be assigned `zoto-backend-engineer`).
        This is a **soft** finding — surface it but do not auto-block.
      - **Step 9 (Apply Fixes)** is updated to allow the judge to propose
        persona reassignments when running in fix-application mode (with
        explicit user approval, per the existing approval gate).
      - Update the assessment-output template to include a new "Persona
        coverage" subsection summarising assigned personas and any
        validation failures.
- [ ] **D03** — Update or extend the `zoto-judge-spec` skill eval cases
      (`evals/evals.json`) to cover:
      - one case asserting a spec missing `persona:` is downgraded to
        Conditional;
      - one case asserting a spec with all 10 personas valid passes the
        persona-coverage check.
- [ ] **D04** — Confirm that the judge agent and skill cite the **same**
      canonical persona list as subtask 04 (executor) and subtask 05
      (generator). Drift between these three is a maintenance hazard —
      prefer pointing at `src/personas.ts` from the prose.

## Definition of Done
- [ ] Judge agent file enforces the persona contract in Mode 3.
- [ ] `zoto-judge-spec` skill validates `persona:` frontmatter.
- [ ] Persona-coverage subsection appears in the assessment output template.
- [ ] Skill eval cases cover persona-validation behaviour.
- [ ] No linter errors in modified files.
- [ ] `node scripts/validate-template.mjs` and `node scripts/validate-skills.mjs`
      both still pass.

## Implementation Notes

- The judge runs in a **fresh context** per the existing convention — be
  explicit and self-contained in the agent + skill prose, since it cannot
  rely on parent context.
- Mode 3 already loads all subtask files; the new check piggy-backs on
  that load. No new I/O patterns needed.
- The judge MUST NOT auto-fix persona assignments without explicit user
  approval (per existing skill convention). If the user approves Mode 3
  fixes, the judge can suggest reassignments via the Step 9 fix-list.
- Scoring rule: missing/invalid `persona:` is a hard cap at 3.0; do not
  overload other axes. This keeps the rubric explainable.
- Coordinate with subtasks 04 (executor) and 05 (generator) so the same
  persona predicate / canonical list / error message phrasing is used
  across all three. If `src/personas.ts` exports a single
  `validatePersonaForSubtask(...)` helper, reuse it.

## Testing Strategy

**Do NOT trigger global test suites during parallel execution.** Instead:

- Run `node scripts/validate-template.mjs` and `node scripts/validate-skills.mjs`.
- Run the skill-scoped eval suite for `zoto-judge-spec` if a runner exists.
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
