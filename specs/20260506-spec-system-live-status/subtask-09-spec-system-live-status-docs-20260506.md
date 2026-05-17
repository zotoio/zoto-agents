# Subtask: Documentation Sweep + Plugin Version Bump

## Metadata
- **Subtask ID**: 09
- **Feature**: spec-system-live-status
- **Assigned Subagent**: crux-platform-architect
- **Dependencies**: 04, 07
- **Created**: 20260506

## Objective

Land the user-facing documentation for the new contracts so the system is **discoverable without reading the code**. Update every place an end user, agent author, or returning maintainer is likely to look:

- `plugins/zoto-spec-system/README.md` — overview, quickstart, concept block on the no-restart contract and live status aggregation
- `plugins/zoto-spec-system/rules/zoto-spec-system.mdc` — agent-facing routing for the new commands and the contract phrases
- `plugins/zoto-spec-system/docs/config-schema.md` and `docs/example-config.json` — refresh with the new keys and inheritance rules
- `plugins/zoto-spec-system/docs/status-schema.md` (extend the doc subtask 02 created — make it fully end-to-end)
- `plugins/zoto-spec-system/CHANGELOG.md` — entry for the release
- `plugins/zoto-spec-system/.cursor-plugin/plugin.json` — version bump
- Repo-level `AGENTS.md` — clarify that spec-system subtasks are owned by their assigned subagent and live status is the source of truth during execution

## Deliverables Checklist

### Plugin README
- [ ] `plugins/zoto-spec-system/README.md` — add a new top-level section `## Live Status & No-Restart Configuration` between the existing **How It Works** and **Configuration** sections. Required content:
  - Two-paragraph explainer: where status pairs live, how the executor backgrounds `tsx scripts/spec-aggregator.ts --watch` for the spec's lifetime to rebuild the spec-root `status.md` + `status.yml` on every source change, and what the no-restart contract guarantees. Include the canonical phrase verbatim: **Token budget changes apply to the next spawned subagent without restarting the executor.**
  - A small ASCII tree showing the spec dir layout including `status/` and the spec-root `status.{md,yml}` (mirrors the layout block from subtask 05)
  - A subsection `### Editing the Token Budget Without Restarting` with a worked example: edit `.zoto/spec-system/config.json`, save, observe the next spawned subtask's `Token budget:` line in its `.status.yml`
  - A subsection `### Live-Reloadable vs Fresh-Invocation Keys` listing both sets verbatim. The canonical sets (matching the spec index "BU" decision, subtask 01's memo, and subtask 04's executor agent doc) are:
    - **Live-reloadable**: `subagents.*.tokenBudget`, `subagents.*.model`, `aggregator.pollIntervalMs`, `aggregator.debounceMs`, `aggregator.enabled`, `spec.parallelLimit`
    - **Fresh-invocation-required**: `unitOfWork`, `specsDir`, `workDir`, `hooks.*`, `extensions.*`
  - A subsection `### Standalone Aggregator CLI` documenting `spec-aggregator --once | --watch | --validate-only` with three short example commands
  - Cross-links to `docs/config-schema.md`, `docs/status-schema.md`, `docs/aggregator.md`
- [ ] `plugins/zoto-spec-system/README.md` — extend the **Configuration** table with the new keys (`subagents.default.tokenBudget`, `subagents.<role>.tokenBudget`, `subagents.<role>.model`, `aggregator.enabled`, `aggregator.pollIntervalMs`, `aggregator.debounceMs`, `aggregator.outputs.specStatusMd`, `aggregator.outputs.specStatusYml`)
- [ ] `plugins/zoto-spec-system/README.md` — extend the **Components** table with a row for `scripts/spec-status-roundtrip.ts` and a row for `scripts/spec-aggregator.ts`

### Rule
- [ ] `plugins/zoto-spec-system/rules/zoto-spec-system.mdc` — append a new section `## Live Status & Token Budget` that:
  - Tells agents that live execution status lives in `{specsDir}/<spec>/status/*.status.{md,yml}` and the spec-root `status.{md,yml}` (aggregator output)
  - Tells agents that token budgets are configured in `.zoto/spec-system/config.json` and are picked up by the executor on the next spawn (no restart)
  - Routes user questions about "status", "blocker", "progress" of an in-flight spec to read the spec-root `status.md` first
  - Routes user questions about token budgets to point at `.zoto/spec-system/config.json` and the `subagents.*` block
  - Includes the contract phrase: `Token budget changes apply to the next spawned subagent without restarting the executor.`
- [ ] If a corresponding `.crux.mdc` file exists for this rule, **do not edit it**. Per repo policy, edit the source `.mdc`; subtask 09 leaves CRUX regeneration as a follow-up that the `crux-cursor-rule-manager` agent handles separately.

### Repo-wide path convention rule (decision P)
- [ ] `.cursor/rules/zoto-plugin-conventions.mdc` — append a new section `## Workspace-Local Plugin Config Directory` that codifies decision P from the spec index:
  - **Rule**: every zoto plugin that needs workspace-local runtime state (config, caches, manifests, run reports, fixtures pointed at by tests) MUST place that state under `.zoto/<plugin-suffix>/` where `<plugin-suffix>` is the plugin name with the leading `zoto-` stripped.
  - **Examples table** (three rows):
    - `plugins/zoto-spec-system/` → `.zoto/spec-system/`
    - `plugins/zoto-eval-system/` → `.zoto/eval-system/` (migration is a separate spec — current state is the legacy `.zoto/eval-system/`)
    - `plugins/zoto-<future>/` → `.zoto/<future>/`
  - **Rationale paragraph**: keeping all per-plugin runtime state under a single shared `.zoto/` root makes `.gitignore` patterns trivial (one entry: `.zoto/`), simplifies cleanup, and prevents per-plugin top-level-directory pollution as the marketplace grows.
  - **`.gitignore` guidance**: the repo root `.gitignore` should ignore `.zoto/` (or `.zoto/**/cache/`, `.zoto/**/*.local.json`, etc., per plugin discretion). Plugins that ship example/template config under `.zoto/<suffix>/` MUST add a sibling `.gitkeep` and document which sub-paths are tracked.
  - **Validation hook**: a future enhancement may add a `scripts/validate-template.mjs` check that fails CI if any plugin reads from `.zoto-<plugin-name>/` (legacy path) — call this out as a follow-up.
- [ ] Repo root `.gitignore` — add `.zoto/` if not already present (do not remove the existing `.zoto/eval-system/` entry — that legacy directory still exists and the eval-system migration is a separate spec).
- [ ] `plugins/zoto-spec-system/README.md` — extend the **Configuration** section with a one-line callout: "Configuration lives at `.zoto/spec-system/config.json` per the workspace-local plugin config directory convention (`.cursor/rules/zoto-plugin-conventions.mdc`)."
- [ ] Repo-level `AGENTS.md` — under the new `### Live Status During Spec Execution` sub-heading (added below in this subtask), include a one-line note: "Plugin workspace-local config lives under `.zoto/<plugin-suffix>/` per `.cursor/rules/zoto-plugin-conventions.mdc`. The spec-system uses `.zoto/spec-system/`."

### Configuration docs
- [ ] `plugins/zoto-spec-system/docs/config-schema.md` — refresh end-to-end:
  - Replace the legacy free-text key list with a table generated from `templates/schema/config.schema.json` field-by-field (use the same column shape as `plugins/zoto-eval-system/docs/`-style schema docs if present, otherwise: `Key | Type | Default | Description`)
  - Add the `subagents.*` and `aggregator.*` blocks with examples
  - Document the inheritance rule: `subagents.<role>.tokenBudget ?? subagents.default.tokenBudget`
  - Document the no-restart contract (live-reloadable vs fresh-invocation keys) — same sets as the README and the executor agent file
  - Document the `ConfigValidationError` fall-back behaviour from subtask 04
- [ ] `plugins/zoto-spec-system/docs/example-config.json` — extend with the new keys at realistic values; ensure it validates against `templates/schema/config.schema.json` (run `pnpm --filter @zoto-agents/zoto-spec-system validate` after edit)

### Status schema docs
- [ ] `plugins/zoto-spec-system/docs/status-schema.md` (created in subtask 02) — append three new sections:
  - `## End-to-End Example` — full walkthrough from spec creation → subtask spawn → subagent heartbeat → completion → aggregator render → judge `extra.judge` write. Show a small but real fragment of every file at each step.
  - `## CLI Reference` — short reference for `spec-status-roundtrip` (md-from-yml, yml-from-md, scaffold, validate, heartbeat) and `spec-aggregator` (--once, --watch, --validate-only)
  - `## Round-Trip Rules` — explicit precedence rules: yml is authoritative when its mtime is newer than the md; md edits inside block markers win when the md is newer (subtask 05 contract). Include a worked conflict example.

### Aggregator docs cross-link
- [ ] `plugins/zoto-spec-system/docs/aggregator.md` (created in subtask 07) — add a `## See Also` section linking to `status-schema.md`, `config-schema.md`, and the host README's new Live Status section

### CHANGELOG + version bump
- [ ] `plugins/zoto-spec-system/CHANGELOG.md` — add a new entry at the top:
  - Version: minor bump (`x.y+1.0`) — read the current version from `plugin.json` and bump appropriately
  - Date: today (`20260506`)
  - Change blocks: `Added` (per-subtask status pairs, `spec-aggregator` CLI with `--once` / `--watch` / `--validate-only` modes, `spec-spawn-prefix` CLI, `spec-status-roundtrip` helper, `subagents.*` and `aggregator.*` config blocks, two new schemas), `Changed` (config loader is now mtime-aware; `/zoto-spec-execute` backgrounds `spec-aggregator --watch` for the spec's lifetime; per-spawn budget resolution moved into the `spec-spawn-prefix` CLI so the executor LLM is decoupled from the loader implementation), `Documentation` (README, rule, config-schema, status-schema, aggregator docs).
- [ ] `plugins/zoto-spec-system/.cursor-plugin/plugin.json` — bump the `version` field to match the new CHANGELOG entry. Do not touch any other field.

### Repo-level AGENTS.md
- [ ] Repo root `AGENTS.md` — extend the **Spec Execution — Agent Allocation** section (or the table immediately after it) with one new bullet under a new sub-heading `### Live Status During Spec Execution`:
  - "During `/zoto-spec-execute`, every spawned subagent owns its `{specsDir}/<spec>/status/subtask-NN-...status.{md,yml}` pair. The executor's aggregator rebuilds the spec-root `status.{md,yml}` on every change. Read these files before asking about progress."
  - "Token budgets for spec-system subagents live in `.zoto/spec-system/config.json` under `subagents.*.tokenBudget` and reload on the next spawn — no executor restart required."

### Marketplace consistency
- [ ] `plugins/zoto-spec-system/.cursor-plugin/plugin.json` — confirm the `displayName`, `description`, and `keywords` (if present) still describe the plugin accurately given the new live-status capability. Update `description` if it currently reads as "spec authoring only" — extend with "with live execution status and no-restart token-budget configuration".
- [ ] If the repo-root `.cursor-plugin/marketplace.json` carries a description for this plugin, mirror the updated `description` there.

## Definition of Done
- [ ] All five docs (`README.md`, rule, `config-schema.md`, `example-config.json`, `status-schema.md`, `aggregator.md`) reflect the new contracts
- [ ] CHANGELOG entry exists with the bumped version
- [ ] `plugin.json` version matches the CHANGELOG
- [ ] Repo-root `AGENTS.md` has the new live-status guidance and the workspace-local plugin config directory pointer
- [ ] `.cursor/rules/zoto-plugin-conventions.mdc` documents the `.zoto/<plugin-suffix>/` convention (decision P) with examples and rationale
- [ ] Repo root `.gitignore` covers `.zoto/`
- [ ] Automated checks confirm `.zoto/spec-system/` appears across README, rule, `docs/config-schema.md`, executor agent, and repo `AGENTS.md`; legacy dotted-plugin-folder references are absent from those surfaces and this spec directory except historical prose rewritten without the obsolete literal token.
- [ ] Legacy dotted-plugin-folder grep returns zero hits across `plugins/zoto-spec-system`, `AGENTS.md`, and `specs/20260506-spec-system-live-status` after scrubbing checklist prose.
- [ ] `pnpm --filter @zoto-agents/zoto-spec-system validate` passes after all doc edits
- [ ] `docs/example-config.json` validates against `templates/schema/config.schema.json`
- [ ] `rg "Token budget changes apply to the next spawned subagent" plugins/zoto-spec-system AGENTS.md specs/20260506-spec-system-live-status` returns hits in the rule, README, `AGENTS.md`, `agents/zoto-spec-executor.md`, `docs/config-schema.md`, and the spec index (consistent contract phrasing across all six surfaces)
- [ ] No linter errors in modified files
- [ ] All cross-links between docs resolve (no dangling `[link](path)` references)

## Implementation Notes

- **Doc-only subtask** — no code changes. If a contradiction surfaces between code and docs, the docs are wrong; raise a blocker rather than rewriting the code.
- **Single source of truth for the contract phrase** — pick one canonical wording for "no-restart token budget" and reuse it verbatim across README, rule, `AGENTS.md`, `docs/config-schema.md`, and the executor agent file (already added in subtask 04). The grep at the bottom of the Definition of Done enforces this.
- **CRUX rule files**: never edit a `.crux.mdc` directly. Editing the source `.mdc` is fine; CRUX regeneration is out of scope (handled by `crux-cursor-rule-manager` separately).
- **Version bump**: this is a feature release, not a breaking change (existing specs continue to work; status files are additive). A **minor** bump is correct.
- **Marketplace mirror**: if `.cursor-plugin/marketplace.json` does not exist or does not include this plugin, skip the marketplace step and note it in the work log.
- **AGENTS.md location**: the repo-root `AGENTS.md` is a CRUX source file (not generated). Edits go there directly per the always-applied workspace rule.
- **No new dependencies** for documentation. Tables and ASCII trees only.

## Testing Strategy

**IMPORTANT**: This subtask runs **after** subtask 08 in Phase 5 (parallel with subtask 08 if 04 + 07 are both complete). Do not re-run the test suites; rely on subtask 08's coverage. Verify only:
- `pnpm --filter @zoto-agents/zoto-spec-system validate`
- A simple ajv validation of `docs/example-config.json` (one-off `tsx` script under `/tmp/`)
- `rg` checks for the contract phrase across the documented surfaces

## Execution Notes
[To be filled by executing agent]

### Agent Session Info
- Agent: crux-platform-architect
- Started: [Not yet started]
- Completed: [Not yet completed]

### Work Log
[Agent adds notes here during execution]

### Blockers Encountered
[Any blockers or issues]

### Files Modified
[List of files changed]
