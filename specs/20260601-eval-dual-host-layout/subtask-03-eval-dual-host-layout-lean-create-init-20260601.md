# Subtask: Lean Create/Init Flow

## Metadata
- **Subtask ID**: 03
- **Feature**: eval-dual-host-layout
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 01, 02
- **Created**: 20260601

## Objective

Refactor `/z-eval-create` (via `zoto-create-evals` skill and `zoto-eval-generator` agent) and `/z-eval-init` so that the default flow materializes only repo-specific assets. Engine, scripts, and templates are resolved from the plugin at runtime (using the resolution function from S01). Root `package.json` gets eval aliases + minimal devDeps. `/z-eval-init` runs `pnpm install` after writing config.

## Deliverables Checklist
- [x] `/z-eval-init` updated: after writing config.yml, runs `pnpm install` at repo root to install eval devDeps
- [x] `/z-eval-create` flow updated: stamps ONLY config.yml, manifest.yml, evals/ structure, _runs/.gitkeep, cache/.gitkeep, .gitignore — NO src/, engine/, templates/, scripts/, agents/, nested package.json
- [x] Root `package.json` eval script aliases invoke a tiny cross-platform bridge: `tsx scripts/eval-bridge.ts <script-name>` (e.g. `eval:discover` → `tsx scripts/eval-bridge.ts eval-discover`)
- [x] New `scripts/eval-bridge.ts` at repo root (stamped by create flow): imports `resolvePluginRoot()` from plugin `src/paths.ts`, resolves target script under `<pluginRoot>/scripts/<name>.ts`, `exec`s via `tsx` — **no shell interpolation**
- [x] Minimal devDeps added to root `package.json` by create flow: `@cursor/sdk`, `tsx`, `yaml`, `dotenv`, `ajv`, `ajv-formats`, `typescript`, `minimatch`
- [x] `stamp-host-layout.ts` NOT called by `/z-eval-create` in lean mode
- [x] `zoto-create-evals` SKILL.md updated to document lean-mode behaviour
- [x] `z-eval-create.md` command doc updated

## Definition of Done
- [x] Fresh `/z-eval-create` produces lean layout (no vendored runtime)
- [x] eval:* scripts resolve engine/templates from plugin
- [x] `pnpm install` succeeds with lean devDeps
- [x] No linter errors in modified files

## Implementation Notes

### Current flow
1. `/z-eval-init` writes config.yml from template — does NOT install deps
2. `/z-eval-create` spawns `zoto-eval-generator` → calls `stampHostLayout()` which copies src/, templates/, engine/, scripts/, agents/, package.json into `.zoto/eval-system/`
3. Root package.json gets `eval` and `eval:full` aliases pointing to `pnpm -C .zoto/eval-system eval`

### New flow (lean mode)
1. `/z-eval-init` writes config.yml, then runs `pnpm install` at repo root
2. `/z-eval-create` spawns generator which:
   - Creates `.zoto/eval-system/` dirs: just manifest, cache, _runs
   - Stamps `scripts/eval-bridge.ts` at repo root (from plugin template) if missing
   - Merges eval:* script aliases into root package.json — all via `tsx scripts/eval-bridge.ts <script-base-name>`
   - Adds minimal devDeps to root package.json
   - Does NOT call `stampHostLayout()` — that's only for eject
3. Monorepo dogfood MAY keep direct `tsx plugins/zoto-eval-system/scripts/<name>.ts` aliases (precedence level 1 always hits) OR migrate to bridge for parity — prefer bridge for one code path

### Resolution wrapper pattern (committed — KD-8)
Use a single cross-platform bridge stamped into the host repo:

```ts
// scripts/eval-bridge.ts (template: plugins/zoto-eval-system/templates/runner/eval-bridge.ts.tmpl)
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { resolvePluginRoot } from "<dynamic-import-from-plugin-src>";

const scriptBase = process.argv[2];
if (!scriptBase) { console.error("usage: eval-bridge <script-base-name>"); process.exit(1); }
const pluginRoot = resolvePluginRoot();
const scriptPath = join(pluginRoot, "scripts", `${scriptBase}.ts`);
const result = spawnSync("pnpm", ["exec", "tsx", scriptPath, ...process.argv.slice(3)], { stdio: "inherit", shell: false });
process.exit(result.status ?? 1);
```

Root `package.json` aliases become `"eval:discover": "tsx scripts/eval-bridge.ts eval-discover"`, etc. No shell `$(node -e …)` interpolation.

### Key constraint
External repos with marketplace install rely on S01 resolution inside the bridge. Monorepo hits level-1 resolution automatically.

### Files to modify
- `plugins/zoto-eval-system/commands/z-eval-init.md`
- `plugins/zoto-eval-system/commands/z-eval-create.md`
- `plugins/zoto-eval-system/skills/zoto-create-evals/SKILL.md`
- `plugins/zoto-eval-system/agents/zoto-eval-generator.md`
- `plugins/zoto-eval-system/scripts/stamp-host-layout.ts` (remove from default create flow)
- `plugins/zoto-eval-system/scripts/eval-ensure-host.ts` (update for lean)

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Test that lean create produces only expected files (no src/, engine/, etc.)
- Test that eval:* aliases resolve correctly
- Test pnpm install succeeds with lean devDeps
- Verify in a temp directory if possible

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
