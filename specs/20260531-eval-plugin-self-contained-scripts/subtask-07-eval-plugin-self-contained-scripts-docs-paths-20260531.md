# Subtask: Docs and path reference cleanup

## Metadata
- **Subtask ID**: 07
- **Feature**: Eval Plugin Self-Contained Scripts Consolidation
- **Assigned Subagent**: zoto-eval-architect
- **Dependencies**: 04, 05
- **Created**: 20260531

## Objective

Align user-facing documentation with the consolidated layout: plugin package owns runtime CLI; `.zoto/eval-system/` is the stamped host copy; monorepo root `scripts/` holds CI/migration tooling only.

## Deliverables Checklist
- [x] `plugins/zoto-eval-system/README.md` — new or updated section: **Plugin vs host runtime layout** (plugin `scripts/`, `engine/`, `src/` vs stamped `.zoto/eval-system/`)
- [x] `plugins/zoto-eval-system/CHANGELOG.md` — unreleased entry documenting script consolidation and standalone install fix
- [x] Update skills referencing root `scripts/eval-*` as canonical:
  - `zoto-create-evals/SKILL.md` (stamp-host-layout invocation paths)
  - `zoto-update-evals/SKILL.md` (parity check script path)
  - `zoto-eval-tooling/SKILL.md`
- [x] Update commands/agents that cite `plugins/zoto-eval-system/engine/…` vs `scripts/…` inconsistently — prefer stable wording: "plugin package" for authoring, `.zoto/eval-system/` for host operators
- [x] Template comment headers in `templates/static/**` and `templates/llm/**` referencing `scripts/eval-stamp.ts` — update to `plugins/zoto-eval-system/scripts/eval-stamp.ts` or generic "eval-system stamper" wording
- [x] `.cursor/agents/zoto-eval-engineer.md` / `zoto-eval-architect.md` if they prescribe root script paths
- [x] `site/eval-system/design.html` (and related site pages) — update references to repo-root `scripts/eval-update.ts`; describe `engine/update.ts` as canonical updater

## Definition of Done
- [x] README documents three layers (plugin / stamped host / monorepo dogfood) without contradicting KD-1
- [x] Grep `scripts/eval-analyse.ts` under `plugins/zoto-eval-system/{skills,commands,agents,README.md}` — hits are either ".zoto/eval-system/scripts/" (host) or "plugins/zoto-eval-system/scripts/" (authoring), not repo-root `scripts/` as canonical
- [x] Grep `scripts/eval-update.ts` under `site/eval-system/` — zero hits describing repo-root script as canonical updater
- [x] CHANGELOG entry present under `[unreleased]`

## Implementation Notes

Do not edit CRUX generated files. Do not change eval case JSON content.

Keep skill SKILL.md files under 500 lines — surgical edits only.

Cross-reference v3 CHANGELOG Phase 2 entries; extend rather than duplicate.

## Testing Strategy

Documentation-only subtask — no test execution. Optional: run `node scripts/validate-skills.mjs` if skill frontmatter touched.

## Execution Notes

Completed 2026-06-01. Aligned user-facing docs with KD-1 three-layer layout (plugin package / stamped `.zoto/eval-system/` / monorepo dogfood). Prior subtasks had already landed README layout section, CHANGELOG Phase 3, and most template headers; this pass finished migration-note wording, eval JSON template `_template_doc` aliases, command/agent parity paths, `.cursor/agents` KD-1 cross-refs, and `site/eval-system/design.html` updater canonicality note.

### Agent Session Info
- Agent: zoto-eval-architect
- Started: 2026-05-31T22:42:00Z
- Completed: 2026-06-01T00:00:00Z

### Work Log
- Verified README **Plugin vs host runtime layout** and CHANGELOG `[unreleased]` Phase 3 entries (KD-1–KD-6, standalone install fix).
- Clarified monorepo-only `scripts/eval-migrate-ts-to-json.ts` in README migration notes.
- Updated command/agent parity gate paths to `.zoto/eval-system/scripts/check-analyser-payload-parity.ts`.
- Rewrote eval JSON template `_template_doc` to prefer `pnpm run eval:*` aliases.
- Added KD-1 three-layer table to `.cursor/agents/zoto-eval-architect.md` and engineer host-layout preamble.
- Updated `site/eval-system/design.html` to name `engine/update.ts` canonical and note removal of `scripts/eval-update.ts`.

### Blockers Encountered
None.

### Files Modified
See status YAML `artifacts` list.
