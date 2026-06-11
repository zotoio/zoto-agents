# Subtask: Integration Verification, Docs Coherence + Release Polish (0.2.0)

## Metadata
- **Subtask ID**: 08
- **Feature**: cursor-top-ux-perf
- **Assigned Subagent**: generalPurpose (model: `claude-fable-5-thinking-max`)
- **Dependencies**: 01, 02, 03, 04, 05, 06, 07
- **Created**: 20260610

## Objective

Close the spec: run every deferred global gate, re-verify the hard constraints end-to-end, produce the final benchmark comparison, audit cross-platform parity of everything that changed, and consolidate docs + version metadata into a coherent 0.2.0 release of the plugin.

## Deliverables Checklist
- [ ] Full test + validation gates green, with outputs captured in the Work Log: `pnpm --filter @zoto-agents/zoto-cursor-top test` (canonical per-package signal), `node scripts/validate-template.mjs`, `node scripts/validate-skills.mjs`, and the monorepo `pnpm test` (if the single parallel invocation flakes on unrelated CLI-integration timeouts, fall back to per-package runs and note it — do not chase unrelated flakes).
- [ ] Eval coherence: `pnpm run eval:update --check` exits 0. If subtasks left critical drift on `skill:zoto-cursor-top-monitor`, `command:zoto-cursor-top`, or `agent:zoto-cursor-top-troubleshooter`, run `pnpm run eval:update --apply --no-analyser` (cached analyser payloads; never `--with-analyser` — it is network-dependent and can hang) and re-check. `skills/zoto-cursor-top-monitor/evals/evals.json` still contains ≥ 2 valid cases.
- [ ] Final benchmark run: execute the full bench suite and append a consolidated **before/after table** (baseline → post-03 → post-07 → final) to `bench/BASELINE.md` covering warm-tick collector latency, fs-op counts, and windowed frame-build cost at tiers S/M/L, summarising the realised gains of subtasks 03 + 07.
- [ ] Hard-constraint re-verification with evidence: (1) `package.json` dependency diff shows **no new runtime dependencies** (and none native anywhere); (2) subtask-01 contract tests pass on the final tree — default `--once`/`--json`/`--demo` outputs stable, `AgentSnapshot` shape backward compatible with all new flags additive; (3) interactive features degrade gracefully in non-TTY contexts (auto-promote to `--once` still intact in `applyNonTtyDefaults`).
- [ ] Cross-platform parity audit: a written checklist (in the Work Log / execution report) walking every changed code path against `darwin` / `linux` / `win32`: `paths.ts` roots, `processes.ts` PowerShell branch + fixtures, terminal-size and resize handling (07), colour/`NO_COLOR` handling (02), BEL emission (05), path rendering (06). Windows-specific parse fixtures updated where new parsing landed.
- [ ] Docs coherence pass: README Features / Usage / Keyboard sections present every new flag (`--theme`, `--density`, `--filter`, `--detail-lines`, `--bell`, plus any cadence flag from 03) and key binding exactly as implemented (cross-check against `HELP` in `src/cli.ts` and `useInput` in `App.tsx`); `commands/zoto-cursor-top.md`, `skills/zoto-cursor-top-monitor/SKILL.md`, `rules/zoto-cursor-top.mdc`, and `agents/zoto-cursor-top-troubleshooter.md` updated consistently (troubleshooter gains the new flags/diagnostics in its playbook).
- [ ] Release metadata: CHANGELOG.md consolidated `[0.2.0]` entry (Added/Changed/Performance subsections); version bumped to `0.2.0` in `plugins/zoto-cursor-top/package.json`, `.cursor-plugin/plugin.json`, and the hard-coded version string in `src/cli.ts` (`zoto-cursor-top 0.1.0`); add a `--version` output assertion to `cli.test.ts` (none exists today) pinned to `zoto-cursor-top 0.2.0`.
- [ ] Execution-report inputs: a per-constraint outcomes summary (no native deps / parity / stable modes / JSON compat / balanced UX-features-performance delivery) with evidence pointers, ready for the executor's execution report.

## Definition of Done
- [ ] All gate commands exit 0 (or documented per-package fallback for known monorepo flake), with outputs recorded
- [ ] `bench/BASELINE.md` final comparison table committed
- [ ] Parity audit checklist written and all items confirmed
- [ ] Version 0.2.0 consistent across package.json, plugin.json, CLI output, and CHANGELOG
- [ ] No linter errors in modified files

## Implementation Notes

- This is the only subtask permitted to run global suites — earlier subtasks deliberately deferred them.
- Use targeted re-runs to bisect any failure before touching code; fixes for issues introduced by earlier subtasks belong here only if mechanical (otherwise flag as a blocker so the executor re-spawns the owning subtask agent per the reviewer non-interference rules).
- `validate-plugin.ts` exists inside the plugin (`scripts/validate-plugin.ts`, exposed as `pnpm --filter @zoto-agents/zoto-cursor-top run validate`) — run it too; it checks plugin manifest consistency.
- The README currently documents data sources and hierarchy building — extend rather than rewrite; keep README > 50 lines (monorepo convention) — trivially satisfied.
- Demo mode is the screenshot surface: verify `--demo` exercises themes, filter, events, and the detail pane convincingly; if the fixture needed tweaks in earlier subtasks, confirm default demo output contracts still hold.
- Confirm no subtask leaked spec-coordination content into runtime docs (specs are ephemeral coordination artifacts, not knowledge).
- Follow the TodoWrite contract: create todos from this checklist and the DoD on spawn.

### Hard constraints (must preserve)
- No native dependencies — final dependency audit is a deliverable here.
- Full macOS/Linux/Windows parity — final audit is a deliverable here.
- `--once`/`--json`/`--demo` stable; JSON snapshot shape backward compatible — final contract verification is a deliverable here.

## Testing Strategy
This is the final verification phase — global suites are in scope **here**:
- `pnpm --filter @zoto-agents/zoto-cursor-top test`, then `pnpm test` at the repo root (per-package fallback on unrelated flake)
- `node scripts/validate-template.mjs` && `node scripts/validate-skills.mjs`
- `pnpm run eval:update --check` (then `--apply --no-analyser` only if critical drift, then re-check)
- `pnpm --filter @zoto-agents/zoto-cursor-top run bench` for the final numbers

## Execution Notes
[To be filled by executing agent]

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
