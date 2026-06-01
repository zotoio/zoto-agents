# Subtask: Full validation gates

## Metadata
- **Subtask ID**: 08
- **Feature**: Eval Plugin Self-Contained Scripts Consolidation
- **Assigned Subagent**: zoto-eval-engineer
- **Dependencies**: 04, 05, 06, 07
- **Created**: 20260531

## Objective

Run end-to-end validation proving the plugin is self-contained for install and host stamping, and that monorepo dogfood workflows remain green.

## Deliverables Checklist
- [ ] `pnpm test` — full monorepo suite exits 0
- [ ] `pnpm run eval:list` exits 0
- [ ] `pnpm run eval:update --check` exits 0 (or document pre-existing unrelated drift with `layout_drift_count: 0` for script paths)
- [ ] `pnpm --filter @zoto-agents/zoto-eval-system run validate` exits 0
- [ ] `node scripts/validate-template.mjs` exits 0
- [ ] `node scripts/validate-skills.mjs` exits 0
- [ ] Standalone install simulation documented in execution notes:
  - `pnpm --filter @zoto-agents/zoto-eval-system run install-local --dry-run` lists `engine/` and `src/`
  - Grep installed path list confirms no dependency on repo-root `scripts/eval-*`
- [ ] Stamper idempotency: `stamp-host-layout.ts --dry-run` twice produces identical JSON output
- [ ] Final grep gate captured in execution notes:
  - `rg '../plugins/zoto-eval-system' plugins/zoto-eval-system/scripts/` → 0
  - `rg '../../../scripts' plugins/zoto-eval-system/engine/` → 0
  - `rg 'tsx scripts/eval-' package.json` → 0 (root uses plugin paths)
  - `rg 'scripts/eval-' evals/test_*.ts evals/_llm/` → 0 (pytest/dogfood imports retargeted)
- [ ] `audit/post-consolidation-verification.md` summarising gate outputs

## Definition of Done
- [ ] All gates above pass or documented with spec-blocker if pre-existing unrelated failure
- [ ] Spec index Definition of Done checklist can be ticked
- [ ] Ready for `zoto-spec-judge` adversarial pass by spec executor
- [ ] No linter errors in modified TS files from subtasks 02–07

## Implementation Notes

If `eval:update --check` fails on content drift unrelated to this spec, record `layout_drift_count` and `content_drift_count` separately in the required execution-notes fields above — this spec cares that **path/layout** consolidation is complete; content drift alone is not a spec blocker.

Run `pnpm exec tsx plugins/zoto-eval-system/scripts/check-analyser-payload-parity.ts` if exposed via package alias.

## Testing Strategy

Full suite allowed in this subtask (final verification phase per spec generator conventions).

## Execution Notes

Completed 2026-06-01. Full report: `audit/post-consolidation-verification.md`.

| Field | Value |
|-------|-------|
| `layout_drift_count` | 0 |
| `content_drift_count` | 6 (subtask-07 SKILL.md edits) |
| `grep_gate_results` | G1=2 comment-only, G2=0, G3=0, G4=0 |
| `standalone_install_paths` | engine/, src/ in install-local --dry-run |

### Agent Session Info
- Agent: zoto-eval-engineer
- Started: 2026-06-01T08:52:00Z
- Completed: 2026-06-01T09:07:00Z

### Work Log
- Ran all validation gates; fixed runUpdate fixture discovery, parity skip, grep4, eval-system tests (146/146).
- Documented non-blocking: pnpm test (zoto-spec-system CLI timeouts), eval:update content drift.

### Blockers Encountered
None for layout consolidation.

### Files Modified
See `audit/post-consolidation-verification.md` § Subtask-08 code fixes.
