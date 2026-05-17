# Subtask: End-to-End Verification

## Metadata
- **Subtask ID**: 07
- **Feature**: command-prefix-shortening
- **Assigned Subagent**: integrity-expert
- **Dependencies**: 04, 05, 06
- **Created**: 20260506

## Objective

Run the full validation matrix on the post-rename repository, verify both the canonical short-prefix names and the legacy alias names dispatch to the same workflow, and confirm no Out-of-Scope surface was modified. Surface any inconsistency to the spec's status pair so the executor can fan out a fix-up subagent (per the `Reviewer Non-Interference` HARD RULE — this subtask reports, it does not author fixes).

## Deliverables Checklist
- [ ] Run `node scripts/validate-template.mjs` — must exit 0
- [ ] Run `node scripts/validate-skills.mjs` — must exit 0
- [ ] Run `pnpm test` at the repo root — must exit 0
- [ ] Run plugin-local tests: `pnpm --filter @zoto-agents/zoto-spec-system test` and `pnpm --filter @zoto-agents/zoto-eval-system test` — both must exit 0
- [ ] Confirm `plugins/zoto-spec-system/commands/` contains exactly 8 files: 4 canonical (`z-spec-{create,execute,judge,init}.md`) plus 4 alias (`zoto-spec-{create,execute,judge,init}.md`)
- [ ] Confirm `plugins/zoto-eval-system/commands/` contains exactly **18 files**: 9 canonical (`z-eval-{init,configure,create,update,execute,judge,compare,help,advise}.md`) plus 9 alias (`zoto-eval-{init,configure,create,update,execute,judge,compare,help,advise}.md`)
- [ ] Confirm every alias file's body matches the agreed delegation pattern (no instruction duplication, < 30 lines, mentions canonical name in description). For the `askQuestion`-owning aliases (`/zoto-eval-help`, `/zoto-eval-advise`), confirm the body uses the **"read and follow the canonical file's instructions verbatim"** idiom from subtask 02 rather than spawning a subagent directly
- [ ] Confirm the alias-coverage eval cases added in subtask 05 actually run and pass — at minimum execute the eval suite for `zoto-help-evals`, `zoto-advise-evals`, and one Spec System skill (`zoto-create-spec` recommended)
- [ ] **Out-of-Scope diff guard**: produce a `git diff --name-only` listing and assert that NO file under the following paths was modified:
  - `plugins/zoto-spec-system/skills/*/SKILL.md` frontmatter `name:` field (body edits OK; identifier unchanged) — applies to `zoto-create-spec`, `zoto-execute-spec`, `zoto-judge-spec`
  - `plugins/zoto-eval-system/skills/*/SKILL.md` frontmatter `name:` field (body edits OK; identifier unchanged) — applies to `zoto-help-evals`, `zoto-advise-evals`, `zoto-create-evals`, `zoto-update-evals`, `zoto-execute-evals`, `zoto-judge-evals`, `zoto-compare-evals`, `zoto-configure-evals`, `zoto-eval-tooling`
  - `plugins/zoto-spec-system/agents/*.md` frontmatter `name:` field (body edits OK) — applies to `zoto-spec-generator`, `zoto-spec-executor`, `zoto-spec-judge`
  - `plugins/zoto-eval-system/agents/*.md` frontmatter `name:` field (body edits OK) — applies to `zoto-eval-configurer`, `zoto-eval-generator`, `zoto-eval-executor`, `zoto-eval-judge`, `zoto-eval-updater`, `zoto-eval-comparer`, `zoto-eval-adviser`, `zoto-eval-analyser-subagent`
  - `.cursor-plugin/marketplace.json` `plugins[].name` field
  - `plugins/zoto-spec-system/.cursor-plugin/plugin.json` `name` field
  - `plugins/zoto-eval-system/.cursor-plugin/plugin.json` `name` field
  - Root `package.json` (no changes expected)
  - `.zoto/spec-system/`, `.zoto/eval-system/` directory paths (workspace-local config dirs)
  - `pnpm-lock.yaml`
  - `specs/20260403-zoto-spec-system/`, `specs/20260406-github-pages-site/`, `specs/20260503-eval-system-v2/`, `specs/20260506-eval-adviser/`, `specs/20260506-spec-system-live-status/` (historical specs)
- [ ] Confirm no source rule was edited after subtask 06's CRUX regeneration (no race)
- [ ] Spot-check at least 3 doc surfaces (one README, one rule, one site HTML page) to confirm canonical names are now primary
- [ ] Write a short `verification.md` in the spec directory summarising results, with one section per check above

## Definition of Done
- [ ] All four `pnpm`/`node` validation commands exit 0
- [ ] Out-of-Scope diff guard reports no violations
- [ ] Alias-coverage eval cases pass
- [ ] `verification.md` is checked into the spec directory and lists every command pair (canonical / alias) with a tick or cross
- [ ] If any check fails, the failure is recorded in the subtask status's `errors[]` and surfaced as a `fix_list` item routed back to the originally-assigned subtask owner (per the spec's reviewer non-interference rule). Do NOT author the fix in this subtask.

## Implementation Notes

- This subtask is the **final gate**. Everything must be green before the spec is marked complete.
- The Spec System has an `onStop` consistency check (`plugins/zoto-spec-system/scripts/spec-onstop-check.ts`) — run it as part of verification and fold its findings into `verification.md`.
- For alias dispatch verification, the simplest mechanical check is to confirm each alias file's body invokes the same `subagent_type` and same skill as its canonical counterpart. A more robust check is to actually invoke `/z-spec-create` and `/zoto-spec-create` against a sandbox repo and assert the same workflow is executed; this requires a live Cursor session and may be deferred to manual user verification if it cannot run headlessly.
- Per the `Reviewer Non-Interference` HARD RULE in `plugins/zoto-spec-system/rules/zoto-spec-system.mdc`: **the integrity-expert agent does NOT author fixes**. It produces a `fix_list` in `extra.judge` of this subtask's `.status.yml` (or in `verification.md` if the executor convention prefers). The executor re-spawns the originally-assigned subtask owner with the `fix_list` as input.
- Use `Grep` (not `git grep` or shell `grep`) to search the post-rename repo for any remaining `/zoto-spec-` or `/zoto-eval-` literal that should have moved — most should remain only inside alias files; flag any that survive elsewhere.

## Testing Strategy

This subtask **is** the global testing phase. Run all of the following from the repo root:

```bash
node scripts/validate-template.mjs
node scripts/validate-skills.mjs
pnpm test
pnpm --filter @zoto-agents/zoto-spec-system test
pnpm --filter @zoto-agents/zoto-eval-system test
```

Plus the spec-system on-stop consistency check:

```bash
pnpm --filter @zoto-agents/zoto-spec-system exec tsx \
  plugins/zoto-spec-system/scripts/spec-onstop-check.ts \
  --human --repo-root .
```

Capture each command's exit code in `verification.md`.

## Execution Notes

_To be filled by executing agent._

### Agent Session Info
- Agent: [Not yet assigned]
- Started: [Not yet started]
- Completed: [Not yet completed]

### Work Log

### Blockers Encountered

### Files Modified
