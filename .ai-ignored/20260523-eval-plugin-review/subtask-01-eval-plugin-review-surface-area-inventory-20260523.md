# Subtask: Plugin Surface-Area Inventory & Taxonomy

## Metadata
- **Subtask ID**: 01
- **Feature**: Eval Plugin Implementation & Application Review
- **Assigned Subagent**: zoto-plugin-manager
- **Dependencies**: None
- **Created**: 20260523

## Objective

Produce a complete inventory and taxonomy of the `zoto-eval-system` plugin's
implementation surface. This is the **shared reference document** that every
Phase-2 subtask cites — without a clean inventory, downstream reviews will
re-do discovery work and lose consistency. The inventory must cover both the
authoritative local copy at `/home/andrewv/.cursor/plugins/local/zoto-eval-system/`
and any deltas observed in `plugins/zoto-eval-system/` in the monorepo.

## Deliverables Checklist

- [x] `findings-01-inventory.md` in this subtask's directory containing:
  - [x] **Component matrix**: for every agent, skill, command, rule, hook — name, file path, line count, frontmatter `name`/`description`, declared dependencies (other agents/skills/commands referenced), and primary purpose (one sentence).
  - [x] **Template inventory**: every directory under `templates/` with role (schema, llm strategy template, static framework template, etc.) and consumer (which skill or script stamps from it).
  - [x] **Schema inventory**: every JSON schema under `templates/schema/` with title, top-level required fields, and which contract it governs.
  - [x] **Hook inventory**: `hooks.json` plus every hook script with trigger event and side effects.
  - [x] **Command call-graph**: which commands invoke which skills/agents, including the four documented "same delegation" aliases (`/z-eval-start`, `/z-eval-jump`, `/z-eval-operator`, `/z-eval-workflow`).
  - [x] **Skill ↔ agent ↔ command triad table**: each lifecycle stage (init, configure, create, update, execute, judge, compare, advise, help, workflow) mapped to its owning command, agent, and skill — gaps highlighted.
  - [x] **Templates ↔ skills cross-reference**: which skill stamps which template subtree.
  - [x] **Counts summary**: total #agents, #skills, #commands, #rules, #hooks, #schemas, #template-subdirs, total LOC.
- [x] **Local-vs-monorepo delta** section listing every file present in the local copy but missing from `plugins/zoto-eval-system/` (informational — full gap analysis is in subtask 02).
- [x] No code, config, or template files modified.

## Definition of Done

- [x] Findings document committed under `specs/20260523-eval-plugin-review/findings-01/`.
- [x] Every entry in the component matrix cites a `start:end:filepath` reference.
- [x] Counts summary present and consistent with detail tables.
- [x] No mutations outside this subtask's directory.

## Implementation Notes

- Read the local copy at `/home/andrewv/.cursor/plugins/local/zoto-eval-system/` as the source of truth for component content. The in-monorepo `plugins/zoto-eval-system/` only contains `node_modules/` + `templates/`.
- Use `Glob`/`Grep` for fast enumeration; use `Read` only on entries you need to characterise (frontmatter, key class/function declarations).
- Do **not** read every line of every file — sample representative content and rely on file size + frontmatter for taxonomy.
- The component matrix is the document downstream subtasks search against; bias toward completeness over commentary.
- Capture line counts via `wc -l` in batched shell calls to keep the inventory cheap.

## Testing Strategy

**IMPORTANT**: This subtask produces analysis only — no executable tests are
authored or run. Do NOT trigger any test suite, eval run, or CI script.
Verification is by self-review against the deliverables checklist.

## Execution Notes

### Agent Session Info
- Agent: zoto-plugin-manager
- Started: 20260523 (session)
- Completed: 20260523 (session)

### Work Log

- Enumerated full tree under `.cursor/plugins/local/zoto-eval-system/` vs monorepo `plugins/zoto-eval-system/` (`find`; `comm`).
- Gathered LOC via `find … | wc -l` (**14,339** total lines across all plugin files locally).
- Read `plugin.json`, `hooks.json`, all seven JSON Schemas front matter, sampled command/agent/skill frontmatter + delegation sections.
- Wrote **`findings-01/findings-01-inventory.md`** with component matrix, template/schema/hook inventories, call-graph + triad + cross-reference, counts summary, 126-path delta list (full list in findings doc), manifest logo path vs missing `assets/` noted.

### Blockers Encountered

- None — engine/scripts are deliberately outside the mirrored plugin folder; surfaced as informational under “external references.”

### Files Modified

1. `specs/20260523-eval-plugin-review/findings-01/findings-01-inventory.md` (created)
2. `specs/20260523-eval-plugin-review/subtask-01-eval-plugin-review-surface-area-inventory-20260523.md` (this file — checklist + execution notes only)
