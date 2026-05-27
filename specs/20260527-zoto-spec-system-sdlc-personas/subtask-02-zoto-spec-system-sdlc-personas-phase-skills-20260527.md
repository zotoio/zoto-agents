---
persona: zoto-technical-writer
---

# Subtask: Phase skills (×5) — discovery, design, implementation, quality, operations

## Metadata
- **Subtask ID**: 02
- **Feature**: zoto-spec-system-sdlc-personas
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 01
- **Created**: 20260527

## Objective

Scaffold the **5 shared phase skills** that the persona agents delegate to.
Each phase skill is the canonical owner of checklists, templates, deliverable
formats, and step-by-step workflows for that phase. Persona agent files (in
subtask 03) stay tiny and just point at the relevant phase skill.

The five skills:

| Slug | Owners (read by) | Phase scope |
|---|---|---|
| `zoto-skill-sdlc-discovery` | `zoto-product-analyst` | Requirements elicitation, user stories, acceptance criteria, scope framing |
| `zoto-skill-sdlc-design` | `zoto-software-architect` (primary), `zoto-security-engineer` (threat-model deliverables) | High-level design, ADRs, sequence diagrams, threat models, design reviews |
| `zoto-skill-sdlc-implementation` | `zoto-backend-engineer`, `zoto-frontend-engineer` | Code authoring conventions, dependency hygiene, error handling, framework-agnostic implementation patterns |
| `zoto-skill-sdlc-quality` | `zoto-test-engineer`, `zoto-code-reviewer`, `zoto-security-engineer` (review deliverables) | Test plans, unit/integration/e2e tests, code-review checklists, security reviews |
| `zoto-skill-sdlc-operations` | `zoto-devops-engineer`, `zoto-sre`, `zoto-technical-writer` | CI/CD, deployment, observability, runbooks, public docs, changelog framing |

## Deliverables Checklist

- [ ] **D01** — Created `plugins/zoto-spec-system/skills/zoto-skill-sdlc-discovery/SKILL.md`
      with valid frontmatter (`name: zoto-skill-sdlc-discovery`, descriptive
      `description`), an "Owners" subsection naming `zoto-product-analyst`,
      and step-by-step guidance for: requirements interviews, user-story
      drafting (3-line `As a … I want … so that …` form), acceptance-criteria
      checklists, and scope-creep detection. ≤ 500 lines.
- [ ] **D02** — Created `plugins/zoto-spec-system/skills/zoto-skill-sdlc-discovery/evals/evals.json`
      with **≥ 2 cases** matching `.cursor/rules/zoto-plugin-conventions.mdc`
      (each case has assertions; cases exercise the discovery workflow, not
      just file existence).
- [ ] **D03** — Created `plugins/zoto-spec-system/skills/zoto-skill-sdlc-design/SKILL.md`
      with valid frontmatter, owners section naming `zoto-software-architect`
      and `zoto-security-engineer` (threat-model deliverables), and step-by-step
      guidance for: high-level design docs, ADR template (Context / Decision /
      Status / Consequences), sequence-diagram conventions, threat-model
      framing (STRIDE-lite), and design reviews. ≤ 500 lines.
- [ ] **D04** — Created `plugins/zoto-spec-system/skills/zoto-skill-sdlc-design/evals/evals.json`
      with ≥ 2 cases (e.g. one ADR-style design, one threat-model framing).
- [ ] **D05** — Created `plugins/zoto-spec-system/skills/zoto-skill-sdlc-implementation/SKILL.md`
      with valid frontmatter, owners section naming `zoto-backend-engineer`
      and `zoto-frontend-engineer`, and step-by-step guidance for:
      framework-agnostic implementation patterns (single-responsibility
      module hygiene, error handling, dependency injection / boundary
      placement), local testing of the change before handoff to quality, and
      a "Definition of Implemented" checklist. ≤ 500 lines.
- [ ] **D06** — Created `plugins/zoto-spec-system/skills/zoto-skill-sdlc-implementation/evals/evals.json`
      with ≥ 2 cases (e.g. one backend-shaped task, one frontend-shaped task).
- [ ] **D07** — Created `plugins/zoto-spec-system/skills/zoto-skill-sdlc-quality/SKILL.md`
      with valid frontmatter, owners section naming `zoto-test-engineer`,
      `zoto-code-reviewer`, `zoto-security-engineer` (review deliverables), and
      step-by-step guidance for: test plans (unit/integration/e2e split),
      coverage-target framing, code-review checklist (correctness / clarity /
      security / observability / performance), and security-review prompts.
      ≤ 500 lines.
- [ ] **D08** — Created `plugins/zoto-spec-system/skills/zoto-skill-sdlc-quality/evals/evals.json`
      with ≥ 2 cases (e.g. one test-plan, one review-checklist scenario).
- [ ] **D09** — Created `plugins/zoto-spec-system/skills/zoto-skill-sdlc-operations/SKILL.md`
      with valid frontmatter, owners section naming `zoto-devops-engineer`,
      `zoto-sre`, `zoto-technical-writer`, and step-by-step guidance for:
      CI/CD pipeline conventions, release/changelog framing, runbook
      template (symptom / detection / mitigation / postmortem), public-doc
      structure (README sections, examples-first), and observability hygiene
      (logs / metrics / traces). ≤ 500 lines.
- [ ] **D10** — Created `plugins/zoto-spec-system/skills/zoto-skill-sdlc-operations/evals/evals.json`
      with ≥ 2 cases (e.g. one runbook, one CI workflow framing).

## Definition of Done
- [ ] All 5 skill directories exist with `SKILL.md` and `evals/evals.json`.
- [ ] Skill directory names match the `name` frontmatter field exactly.
- [ ] `node scripts/validate-skills.mjs` passes (or whatever the plugin's
      dedicated skill validator runs; do not run the repo-wide test suite).
- [ ] No linter errors in modified files.

## Implementation Notes

- Reference the existing `plugins/zoto-spec-system/skills/zoto-create-spec/SKILL.md`
  for shape, frontmatter conventions, and length budget.
- Reference the existing `.cursor/rules/zoto-plugin-conventions.mdc` for the
  ≥ 2 eval cases requirement.
- Each `SKILL.md` MUST start with an "Owners" subsection that lists the
  persona ids that delegate to this skill. The persona agent files in
  subtask 03 will reference the skill by name.
- Keep each skill **phase-scoped, not persona-scoped** — the same skill is
  read by multiple personas. Avoid persona-specific branching inside a
  skill; if a deliverable is persona-specific (e.g. threat model vs. design
  doc) it belongs in the same phase skill but as separate sub-sections.
- Phase skills MUST NOT duplicate content. If a checklist already exists in
  another skill (e.g. the existing `zoto-create-spec` Step 5 subagent table),
  link to it; do not copy.
- Eval cases should target the *skill workflow*, not its file existence —
  use prompts that exercise the deliverable (e.g. "draft an ADR for adding a
  cache layer") and assertions that look for canonical sections in the
  output.

## Testing Strategy

**Do NOT trigger global test suites during parallel execution.** Instead:

- Run `node scripts/validate-skills.mjs` from the repo root to check the new
  skill directories.
- Optionally invoke the plugin-scoped test command for any new harness checks
  introduced for the skills.
- Defer the repo-wide `pnpm test` to subtask 09 (final validation).

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
