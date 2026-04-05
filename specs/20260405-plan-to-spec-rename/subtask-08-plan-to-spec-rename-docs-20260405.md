# Subtask: Update Documentation Files

## Metadata
- **Subtask ID**: 08
- **Feature**: Plan-to-Spec Rename
- **Assigned Subagent**: generalPurpose
- **Dependencies**: None
- **Created**: 20260405

## Objective
Update all documentation and metadata files across both the plugin and the repository root to use the new identifiers, command names, and agent references.

## Deliverables Checklist
- [x] Update `plugins/zoto-spec-system/README.md`: all references to old skill names, agent names, command names, config keys, artifact patterns
- [x] Update `plugins/zoto-spec-system/CHANGELOG.md`: update references in entries (note: historical entries describe what happened, so some old references may be kept for accuracy — use judgment)
- [x] Update `plugins/zoto-spec-system/docs/memory-extension-guide.md`: command references, workflow references
- [x] Update root `README.md`: plugin description
- [x] Update root `.cursor-plugin/marketplace.json`: plugin description
- [x] Update `.cursor/agents/zoto-plugin-manager.md`: all references to old skill names, agent names, command names in the Integration with Spec System section and Naming Conventions table

## Definition of Done
- [x] Plugin README uses new identifiers throughout
- [x] Plugin README documents three agents: `zoto-spec-generator`, `zoto-spec-executor`, `zoto-spec-judge`
- [x] Plugin README documents three commands: `/zoto-spec-create`, `/zoto-spec-execute`, `/zoto-spec-judge`
- [x] Memory extension guide references `/zoto-spec-create` instead of `/zoto-plan`
- [x] Root README description updated
- [x] Marketplace manifest description updated
- [x] No linter errors in modified files

## Implementation Notes

### Files to modify

1. `plugins/zoto-spec-system/README.md` (~120+ lines)
   - Search-and-replace all identifiers per the rename mapping
   - Document the three-agent architecture: generator, executor, judge
   - Update all command references: `/zoto-spec-create`, `/zoto-spec-execute`, `/zoto-spec-judge`
   - Update usage examples, architecture descriptions, workflow explanations

2. `plugins/zoto-spec-system/CHANGELOG.md`
   - Historical entries: keep old names where describing past state
   - Consider adding a new changelog entry for the rename and executor agent addition

3. `plugins/zoto-spec-system/docs/memory-extension-guide.md`
   - `/zoto-plan` → `/zoto-spec-create`
   - `/zoto-execute` → `/zoto-spec-execute`
   - `/zoto-judge` → `/zoto-spec-judge`
   - Any references to skill names, agent names, config keys

4. Root `README.md`
   - Plugin description: update "plan" references

5. Root `.cursor-plugin/marketplace.json`
   - Plugin description: same change as above

### Rename Mapping (apply throughout)
| Old | New |
|-----|-----|
| `zoto-create-plan` | `zoto-create-spec` |
| `zoto-execute-plan` | `zoto-execute-spec` |
| `zoto-judge-plan` | `zoto-judge-spec` |
| `zoto-spec-planner` | `zoto-spec-generator` |
| `/zoto-plan` | `/zoto-spec-create` |
| `/zoto-execute` | `/zoto-spec-execute` |
| `/zoto-judge` | `/zoto-spec-judge` |
| `plansDir` | `specsDir` |
| `plans` (default dir) | `specs` |
| `plan-[feature]-[date].md` | `spec-[feature]-[date].md` |
| NEW: `zoto-spec-executor` | New agent reference to add |

6. `.cursor/agents/zoto-plugin-manager.md`
   - Integration with Spec System section: `/zoto-plan` → `/zoto-spec-create`, `/zoto-judge` → `/zoto-spec-judge`, `/zoto-execute` → `/zoto-spec-execute`
   - Agent references: `zoto-spec-planner` → `zoto-spec-generator`, add `zoto-spec-executor`
   - Naming Conventions table: update example agent/skill/command/eval filenames

### DO NOT modify files outside of those listed above

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Grep for remaining old identifiers in documentation files
- Verify markdown is well-formed

## Execution Notes

### Agent Session Info
- Agent: generalPurpose
- Started: 2026-04-05
- Completed: 2026-04-05

### Work Log
- Updated `plugins/zoto-spec-system/README.md`: replaced all old identifiers, added Agents section documenting three-agent architecture (generator, executor, judge), updated all command references, config keys (`plansDir` → `specsDir`), artifact patterns, and workflow descriptions
- Updated `plugins/zoto-spec-system/CHANGELOG.md`: added 0.6.0 entry documenting the rename and `zoto-spec-executor` addition; preserved old names in historical 0.1.0 and 0.2.0 entries for accuracy
- Updated `plugins/zoto-spec-system/docs/memory-extension-guide.md`: replaced `/zoto-plan` → `/zoto-spec-create`, `/zoto-judge` → `/zoto-spec-judge`, `/zoto-execute` → `/zoto-spec-execute`, and "plan / judge / execute" → "spec / judge / execute"
- Updated root `README.md`: "plan, judge, and execute" → "create, judge, and execute" in plugin description
- Updated `.cursor-plugin/marketplace.json`: same description update as root README
- Updated `.cursor/agents/zoto-plugin-manager.md`: updated Naming Conventions table examples (agent, skill, command, eval filenames), Integration with Spec System section (commands, agents list with executor added, "Plans" → "Specs")

### Blockers Encountered
None

### Files Modified
- `plugins/zoto-spec-system/README.md`
- `plugins/zoto-spec-system/CHANGELOG.md`
- `plugins/zoto-spec-system/docs/memory-extension-guide.md`
- `README.md`
- `.cursor-plugin/marketplace.json`
- `.cursor/agents/zoto-plugin-manager.md`

### Judge Verification (2026-04-05)
**Verdict: Verified**

All Deliverables Checklist and Definition of Done items independently confirmed:

1. **Plugin README** — Zero old identifiers (`/zoto-plan`, `zoto-create-plan`, `zoto-spec-planner`, `plansDir`, etc.) found. Three agents documented in Agents table (lines 87-89): `zoto-spec-generator`, `zoto-spec-executor`, `zoto-spec-judge`. Three commands documented with dedicated sections (lines 50, 60, 75): `/zoto-spec-create`, `/zoto-spec-execute`, `/zoto-spec-judge`. Config uses `specsDir` throughout. Artifact pattern uses `spec-[feature]-[date].md`.
2. **CHANGELOG** — New 0.6.0 entry (lines 5-16) documents the full rename mapping and `zoto-spec-executor` addition. Historical entries (0.1.0, 0.2.0) correctly preserve old names for accuracy.
3. **Memory extension guide** — All command references updated: `/zoto-spec-create`, `/zoto-spec-judge`, `/zoto-spec-execute` (line 53). Workflow description uses "spec / judge / execute" (line 58). Zero old identifiers found.
4. **Root README** — Plugin description reads "create, judge, and execute" (line 9). No old identifiers.
5. **Marketplace manifest** — Description matches root README: "Structured spec workflow: create, judge, and execute engineering initiatives with adversarial verification" (line 16). No old identifiers.
6. **Plugin manager agent** — Integration section updated with new commands (line 390) and all three agents including `zoto-spec-executor` (line 391). Naming conventions table uses new examples: `zoto-spec-generator.md`, `zoto-create-spec/`, `zoto-spec-create.md` (lines 377-384). Zero old identifiers.
