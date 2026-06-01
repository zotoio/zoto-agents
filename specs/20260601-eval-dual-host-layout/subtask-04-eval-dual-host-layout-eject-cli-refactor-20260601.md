# Subtask: Eject CLI Refactor

## Metadata
- **Subtask ID**: 04
- **Feature**: eval-dual-host-layout
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 01, 02
- **Created**: 20260601

## Objective

Refactor `stamp-host-layout.ts` to serve as the explicit opt-in eject CLI (`pnpm run eval:stamp-host-layout`). It copies the full runtime (src/, engine/, templates/, scripts/) into `.zoto/eval-system/`, creates the nested `package.json`, and sets `hostLayout: ejected` in config.yml. This is no longer called during normal `/z-eval-create`.

## Deliverables Checklist
- [x] `stamp-host-layout.ts` refactored: uses `resolvePluginRoot()` (from S01) instead of hardcoded `PLUGIN_ROOT` for source resolution
- [x] On eject: writes `hostLayout: ejected` into `.zoto/eval-system/config.yml` (preserving all other config)
- [x] On eject: creates nested `.zoto/eval-system/package.json` with self-contained deps
- [x] On eject: copies src/, engine/, templates/, scripts/ to `.zoto/eval-system/`
- [x] On eject: does NOT copy agents/skills/commands to `.zoto/eval-system/agents/` (that's S05's job — `.cursor/*/eval-sys/`)
- [x] Remove the `ANALYSER_AGENT` copy logic that puts agent into `.zoto/eval-system/agents/`
- [x] Root `package.json` eval aliases updated to point to `.zoto/eval-system/` (self-contained paths) after eject
- [x] `eval:stamp-host-layout` alias added/verified in root package.json template
- [x] Prints clear summary of what was ejected and next steps (run `pnpm install` in `.zoto/eval-system/`)
- [x] `--dry-run` flag continues to work

## Definition of Done
- [x] Eject CLI copies full runtime and sets config marker
- [x] No agent/skill/command files land under `.zoto/eval-system/agents/`
- [x] Tests verify eject produces expected file tree
- [x] No linter errors in modified files

## Implementation Notes

### Current state
- `stamp-host-layout.ts` copies: src/, templates/, engine/ (COPY_DIRS), scripts (HOST_SCRIPT_NAMES), agents/zoto-eval-analyser-subagent.md, package.json, .gitignore, .env.example
- It's called by `/z-eval-create` — this coupling must be broken (S03 handles the create-side)

### Changes needed
1. Remove `const ANALYSER_AGENT` and the agent copy block (lines 185-193)
2. Replace `PLUGIN_ROOT` with `resolvePluginRoot(opts.repoRoot)` for dynamic resolution
3. After copying, patch config.yml to set `hostLayout: ejected` — use YAML parse/patch/stringify to preserve comments
4. Add a call to the primitives stamper (S05) or leave that as a separate step
5. Update the `stampRootEvalAliases()` function to write aliases that point to `.zoto/eval-system/` (self-contained)

### Config patching approach
Use the `yaml` package's `parseDocument()` to preserve comments when adding `hostLayout: ejected`:
```ts
import { parseDocument } from 'yaml';
const doc = parseDocument(readFileSync(configPath, 'utf-8'));
doc.set('hostLayout', 'ejected');
writeFileSync(configPath, doc.toString(), 'utf-8');
```

### Files to modify
- `plugins/zoto-eval-system/scripts/stamp-host-layout.ts`
- Root package.json (ensure `eval:stamp-host-layout` alias exists)

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Test eject in a temp directory with mock plugin structure
- Verify file tree matches expected (no agents/ under .zoto/eval-system/)
- Verify config.yml has `hostLayout: ejected` after eject
- Test --dry-run doesn't write

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
