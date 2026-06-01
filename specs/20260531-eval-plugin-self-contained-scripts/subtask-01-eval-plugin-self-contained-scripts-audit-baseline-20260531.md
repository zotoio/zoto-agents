# Subtask: Audit baseline + move inventory

## Metadata
- **Subtask ID**: 01
- **Feature**: Eval Plugin Self-Contained Scripts Consolidation
- **Assigned Subagent**: zoto-eval-engineer
- **Dependencies**: None
- **Created**: 20260531

## Objective

Produce a deterministic audit of the current scripts split: which files live at repo root vs plugin vs stamped host, every cross-boundary import, stale duplicates, and the exact move/delete/retarget list for subtasks 02–08. No production code changes in this subtask — audit artefacts only.

**Precondition:** Run on a **clean working tree** or a dedicated branch. Stash or commit unrelated WIP on overlapping paths (`scripts/`, `plugins/zoto-eval-system/`, `evals/llm/_shared/`) before starting — partial path migrations in flight will produce a misleading baseline.

## Deliverables Checklist
- [ ] `audit/import-graph-baseline.md` — table of every `scripts/eval-*` and plugin script with import targets (`../plugins/…`, `../../../scripts/…`, `../src/…`, etc.)
- [ ] `audit/file-inventory.md` — move list, delete list, keep-at-root list with line counts and last-modified rationale
- [ ] `audit/stale-duplicates.md` — side-by-side note on `eval-discover.ts` and `eval-update.ts` forks vs canonical copies
- [ ] `audit/test-inventory.md` — which `scripts/__tests__/*` relocate to plugin vs stay at root
- [ ] Grep baseline captured in audit: `rg '../plugins/zoto-eval-system' scripts/` and `rg '../../../scripts' plugins/zoto-eval-system/`
- [ ] `audit/working-tree-baseline.md` — note any pre-existing WIP on overlapping paths (file count, branch name, whether stashed before audit)

## Definition of Done
- [ ] Audit files committed under `specs/20260531-eval-plugin-self-contained-scripts/audit/`
- [ ] Move list matches spec KD-1 through KD-9 requirements
- [ ] No code files modified outside the spec directory
- [ ] Subtask 02 executor can proceed without re-discovering imports

## Implementation Notes

Run from repo root:

```bash
rg -l 'plugins/zoto-eval-system' scripts/
rg -l '\.\./\.\./\.\./scripts' plugins/zoto-eval-system/
wc -l scripts/eval-*.ts plugins/zoto-eval-system/scripts/*.ts 2>/dev/null
```

Compare `stamp-host-layout.ts` `HOST_SCRIPT_NAMES` against `templates/host-package/package.json` scripts and root `package.json` eval aliases — note any script referenced by host template but missing from stamper list (e.g. `check-analyser-payload-parity.ts`).

Document `evals/llm/_shared/*` imports of root scripts.

**Do NOT touch:** any file outside `specs/20260531-eval-plugin-self-contained-scripts/`.

## Testing Strategy

Read-only audit — no test execution required. Optionally run greps and capture exit counts in the audit doc.

## Execution Notes

[To be filled by executing agent]

### Agent Session Info
- Agent: [Not yet assigned]
- Started: [Not yet started]
- Completed: [Not yet completed]

### Work Log

### Blockers Encountered

### Files Modified
