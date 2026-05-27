---
persona: zoto-technical-writer
---

# Subtask: Persona agents (×10) — minimal agent files pointing to phase skills

## Metadata
- **Subtask ID**: 03
- **Feature**: zoto-spec-system-sdlc-personas
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 01
- **Created**: 20260527

## Objective

Create the **10 Tier 1 persona agent files** under
`plugins/zoto-spec-system/agents/`. Each file SHOULD aim for ~30–80 lines
(soft target) and MUST stay within a **hard cap of ≤ 200 lines** (frontmatter
included). Files that come out shorter (e.g. 50–80 lines) are fine — the
cap is a ceiling, not a target. The cap exists to give each persona room
for substantive role identity, scope guardrails, deliverable expectations,
and one or two worked examples; anything beyond that belongs in the phase
skill.

Each file consists of:

1. Frontmatter with `name`, `description`, optional `model`.
2. One paragraph of role identity (3–5 sentences max).
3. One paragraph of "stay in lane" guardrails — what this persona explicitly
   does **not** own (delegations to other personas).
4. A pointer to the persona's phase skill(s) by name (no duplication of skill
   content).
5. A short note that all checklists / templates / deliverable formats live in
   the phase skill, not in this file.
6. (Optional) One or two worked examples illustrating the role boundary if
   they help the dispatcher pick the right persona — keep these tight.

The user's verbatim guidance: **"keep agent files small and delegate actions
to new skills. keep things tight and fast."** Honour it — favour delegation
to phase skills over inline content.

## Deliverables Checklist

- [ ] **D01** — `plugins/zoto-spec-system/agents/zoto-product-analyst.md`
      pointing at `zoto-skill-sdlc-discovery`.
- [ ] **D02** — `plugins/zoto-spec-system/agents/zoto-software-architect.md`
      pointing at `zoto-skill-sdlc-design` (primary); explicitly delegates
      threat-model deliverables review to `zoto-security-engineer`.
- [ ] **D03** — `plugins/zoto-spec-system/agents/zoto-backend-engineer.md`
      pointing at `zoto-skill-sdlc-implementation`; delegates frontend work
      to `zoto-frontend-engineer`, infra/CI to `zoto-devops-engineer`, tests
      to `zoto-test-engineer`.
- [ ] **D04** — `plugins/zoto-spec-system/agents/zoto-frontend-engineer.md`
      pointing at `zoto-skill-sdlc-implementation`; delegates backend/API to
      `zoto-backend-engineer` and tests to `zoto-test-engineer`.
- [ ] **D05** — `plugins/zoto-spec-system/agents/zoto-test-engineer.md`
      pointing at `zoto-skill-sdlc-quality`; delegates implementation
      changes to backend/frontend engineers and security review to
      `zoto-security-engineer`.
- [ ] **D06** — `plugins/zoto-spec-system/agents/zoto-devops-engineer.md`
      pointing at `zoto-skill-sdlc-operations`; delegates application code
      to backend/frontend engineers and reliability deep-dives to `zoto-sre`.
- [ ] **D07** — `plugins/zoto-spec-system/agents/zoto-technical-writer.md`
      pointing at `zoto-skill-sdlc-operations`; explicitly does not write
      code or change implementation behaviour.
- [ ] **D08** — `plugins/zoto-spec-system/agents/zoto-security-engineer.md`
      pointing at **both** `zoto-skill-sdlc-design` (threat model) and
      `zoto-skill-sdlc-quality` (security review); delegates code authoring
      to backend/frontend engineers and ops/runbooks to `zoto-sre`.
- [ ] **D09** — `plugins/zoto-spec-system/agents/zoto-sre.md` pointing at
      `zoto-skill-sdlc-operations`; delegates CI/CD pipeline authoring to
      `zoto-devops-engineer` and code authoring to backend/frontend
      engineers.
- [ ] **D10** — `plugins/zoto-spec-system/agents/zoto-code-reviewer.md`
      pointing at `zoto-skill-sdlc-quality`; explicitly read-only —
      reviewer never authors code or tests, never resolves blockers, and
      stops with a fix-list when issues are found (mirrors the existing
      `zoto-spec-judge` non-interference pattern).
- [ ] **D11** — Verify each file is ≤ 200 lines (use `wc -l` on each). Any
      file over 200 lines must be trimmed by moving content into the phase
      skill. Files in the ~30–80 line soft-target range are fine; flag any
      file > 120 lines in the work log so it can be reviewed for delegation
      opportunities even if it stays under the 200-line cap.

## Definition of Done
- [ ] All 10 persona agent files exist with valid frontmatter.
- [ ] All 10 files are ≤ 200 lines each (hard cap); soft target ~30–80.
- [ ] Each file references its phase skill(s) by exact name.
- [ ] Each file explicitly states "no checklists / templates / deliverable
      formats live in this file — see the phase skill".
- [ ] `node scripts/validate-template.mjs` passes (frontmatter validation).
- [ ] No linter errors in modified files.

## Implementation Notes

- The agent file template should be extremely uniform across the 10 personas
  — the only differences are role identity, guardrail delegations, and
  phase-skill pointer. Resist adding persona-specific checklists; those go in
  phase skills.
- Frontmatter shape — match existing `plugins/zoto-spec-system/agents/zoto-spec-generator.md`:
  ```yaml
  ---
  name: zoto-<persona>
  description: <one-sentence persona description that the executor's "Available subagents" table will read>
  ---
  ```
  Do **not** set `model:` unless the persona genuinely needs a different
  default — let `subagents.persona-<name>.model` from config drive it.
- The `description` field is what the LLM dispatcher sees, so make it
  concrete: "Backend implementation specialist. Authors server-side code,
  APIs, and data-layer changes. Delegates UI to zoto-frontend-engineer,
  CI/infra to zoto-devops-engineer, and tests to zoto-test-engineer."
- For the security-engineer agent, list **both** phase skills clearly so
  the executor's spawn prompt picks up the right one based on subtask
  context. The phase-skill pointer can read: "see `zoto-skill-sdlc-design`
  for threat-model deliverables and `zoto-skill-sdlc-quality` for security
  reviews." (subtask 02 owners section will mirror this.)
- The code-reviewer file should explicitly cross-link to `zoto-spec-judge`
  in its "stay in lane" paragraph: judge owns adversarial verification of
  spec deliverables; code-reviewer owns adversarial code-level review. They
  do not overlap.

## Testing Strategy

**Do NOT trigger global test suites during parallel execution.** Instead:

- Run `node scripts/validate-template.mjs` from the repo root to validate
  the new agent files' frontmatter.
- Run `wc -l plugins/zoto-spec-system/agents/zoto-*.md` and confirm every
  persona file is ≤ 200 lines (hard cap); flag any file > 120 lines in the
  work log for delegation review.
- Defer the repo-wide `pnpm test` and persona smoke evals to subtasks 08
  and 09.

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
