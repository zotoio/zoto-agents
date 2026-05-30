# Subtask: Documentation & command vs declarative patterns

## Metadata
- **Subtask ID**: 02
- **Feature**: Refactor LLM eval approach
- **Assigned Subagent**: crux-platform-architect
- **Dependencies**: 01
- **Created**: 20260508

## Objective

Update **eval-system documentation** so plugin consumers and monorepo agents understand the **dual-strategy** model and the **command vs simple-check** split. Add or adjust **minimal pointers** in `AGENTS.md` only if eval workflow for agents materially changes (prefer keeping AGENTS delta small—e.g. one paragraph + link to plugin README).

## Deliverables Checklist
- [ ] `plugins/zoto-eval-system/README.md`: section **“LLM eval strategies (declarative + code)”** naming `pnpm run eval:llm:declarative` vs `pnpm run eval:llm:code`, artifact locations (JSON under plugin `evals/`, code under `evals/llm/`), and manifest role (`.zoto/eval-system/`)
- [ ] Same README: **playbook** — *commands* → multi-step Vitest/SDK scenarios; *bulk phrase/skill triggers* → prefer declarative JSON or generated tables; reference **spec prompts** as input to future analyser/updater quality
- [ ] Optional: short `AGENTS.md` addition if agents need to know which script to run for which strategy
- [ ] Cross-check docs against subtask 01 inventory (no wrong paths)
- [ ] **Closing gate:** subtask 06 **Definition of Done** includes a final README pass—do not mark subtask 02 complete until that README confirmation is satisfied (subtask 06 owns the last sync pass)

## Definition of Done
- [ ] README reflects post-refactor truth (coordinate with subtask 05/06 if features land mid-flight—finalize doc pass at end of phase 5; see deliverable above re subtask 06 gate)
- [ ] No CRUX-generated files hand-edited (follow AGENTS.md CRUX rules)

## Implementation Notes
- **Do not** invent new workspace layout; `.zoto/eval-system/` remains per `zoto-plugin-conventions.mdc`.
- If README already has an eval section, **extend** rather than duplicate.
- Capture 1–2 **example spec prompts** (sanitized) that future codegen could mirror—not full test implementations.

## Testing Strategy
- Run `node scripts/validate-template.mjs` if plugin manifest or templates are referenced from README paths (documentation-only subtask; optional sanity check).

## Execution Notes

### Agent Session Info
- Agent: crux-platform-architect
- Started: 2026-05-08T20:15:00+10:00
- Completed: 2026-05-08T20:17:00+10:00

### Work Log

1. Read existing `plugins/zoto-eval-system/README.md` — found extensive eval documentation but no dedicated dual-strategy section or playbook.
2. Read `AGENTS.md` — no existing eval strategy pointers for agents.
3. Read subtask 01 inventory for authoritative path reference.
4. Confirmed package.json scripts: `eval:llm:code` → `vitest run --config evals/llm/vitest.config.ts`, `eval:llm:declarative` → `tsx evals/_llm/runner.ts --full`.
5. Added new section **"LLM eval strategies (declarative + code)"** to README with:
   - Side-by-side comparison table (runner scripts, case storage, validation, best-for, update path, user-authored safety)
   - Artifact locations table (declarative vs code strategy file trees)
   - Switching instructions (`eval:cleanup-stale --apply`)
   - Playbook subsection: when to use `code` vs `declarative`, with two example spec prompts
6. Added one-paragraph **"Eval Strategy for Agents"** subsection to `AGENTS.md` pointing to the README reference.
7. Cross-checked all referenced paths against disk (all confirmed).
8. Ran `node scripts/validate-template.mjs` — passed.

### Blockers Encountered
None.

### Files Modified
- `plugins/zoto-eval-system/README.md` — added ~65-line "LLM eval strategies (declarative + code)" section before "Updating evals when code changes"
- `AGENTS.md` — added 3-line "Eval Strategy for Agents" subsection
