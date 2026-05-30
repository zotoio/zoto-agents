# Subtask: Documentation and Rule Updates

## Metadata
- **Subtask ID**: 04
- **Feature**: command-prefix-shortening
- **Assigned Subagent**: docs-sync-agent
- **Dependencies**: 02, 03
- **Created**: 20260506

## Objective

Update every prose / documentation reference to slash commands in the repo to use the new canonical short names (`/z-spec-*`, `/z-eval-*`). Each plugin's documentation surface mentions the legacy alias names exactly once — in a "Back-compat aliases" table — so users can find them without cluttering the prose.

This subtask owns READMEs, CHANGELOGs, `AGENTS.md`, plugin-level rules, the `.cursor/rules/*.mdc` integration rules, plugin agent files (body-level command references only), plugin skill `SKILL.md` body text (skill names are out of scope), hook nudge messages, init-config templates, baseline fixtures, the GitHub Pages site under `site/`, and the legacy `docs/zoto-eval-system.md`.

## Deliverables Checklist
- [ ] Update `plugins/zoto-spec-system/README.md` — canonical commands switched to `/z-spec-*`; add a single "Back-compat aliases" subsection listing the four `/zoto-spec-*` legacy names
- [ ] Update `plugins/zoto-eval-system/README.md` — canonical commands switched to `/z-eval-*`; add a single "Back-compat aliases" subsection listing the eight `/zoto-eval-*` legacy names
- [ ] Update `plugins/zoto-spec-system/CHANGELOG.md` — add an "Unreleased" entry: *"Renamed canonical slash commands to `/z-spec-*`. Legacy `/zoto-spec-*` names remain functional via thin alias files."*
- [ ] Update `plugins/zoto-eval-system/CHANGELOG.md` — add an analogous "Unreleased" entry for the eval-system rename
- [ ] Update `AGENTS.md` — replace `/zoto-spec-execute` reference (line ~53) with `/z-spec-execute`; verify no other occurrences
- [ ] Update `.cursor/rules/zoto-plugin-conventions.mdc` — replace any slash-command references with the short form
- [ ] Update `plugins/zoto-spec-system/rules/zoto-spec-system.mdc` — "Available Commands" section, "When to Suggest Planning", configuration section, and any inline references switched to `/z-spec-*`; add a small "Back-compat aliases" line at the end of "Available Commands"
- [ ] Update `plugins/zoto-eval-system/rules/zoto-eval-system.mdc` — "Available Commands" section, "Help-Intent Routing", and any inline references switched to `/z-eval-*`; add the analogous "Back-compat aliases" line
- [ ] Update plugin agent files under `plugins/zoto-spec-system/agents/*.md` (`zoto-spec-generator.md`, `zoto-spec-executor.md`, `zoto-spec-judge.md`) and `plugins/zoto-eval-system/agents/*.md` (`zoto-eval-configurer.md`, `zoto-eval-generator.md`, `zoto-eval-executor.md`, `zoto-eval-judge.md`, `zoto-eval-updater.md`, `zoto-eval-comparer.md`, `zoto-eval-adviser.md`, `zoto-eval-analyser-subagent.md`) — replace body-level slash command references with the new canonical names. Agent identifiers (filenames, frontmatter `name:`) are NOT changed
- [ ] Update plugin skill `SKILL.md` files where they reference slash commands in the body — explicit list:
  - **spec-system**: `zoto-create-spec`, `zoto-execute-spec`, `zoto-judge-spec`
  - **eval-system**: `zoto-help-evals`, `zoto-advise-evals`, `zoto-create-evals`, `zoto-update-evals`, `zoto-execute-evals`, `zoto-judge-evals`, `zoto-compare-evals`, `zoto-configure-evals`, `zoto-eval-tooling`
  Skill identifiers (directory names, frontmatter `name:`) are NOT changed
- [ ] Update `plugins/zoto-spec-system/hooks/zoto-session-start.{ts,mjs}` — replace the default nudge message string `"...running /zoto-spec-create to organize."` with `"...running /z-spec-create to organize."`
- [ ] Update `plugins/zoto-eval-system/hooks/zoto-eval-session-start.{ts,mjs}` — replace any analogous nudge message strings
- [ ] Update `plugins/zoto-eval-system/hooks/hooks.json` if it carries any slash-command literal (verify, update if present)
- [ ] Update `plugins/zoto-spec-system/templates/init-config.yml` and `plugins/zoto-eval-system/templates/init-config.yml` — commented example messages use the new canonical short form
- [ ] Update `.zoto/spec-system/config.yml` (the live workspace config) only if it contains an uncommented override that references the old name; otherwise leave commented defaults alone
- [ ] Update `plugins/zoto-eval-system/templates/baseline-fixtures/.zoto/eval-system/config.yml` — example messages use the new canonical short form
- [ ] Update `plugins/zoto-spec-system/docs/*.md` (`config-schema.md`, `aggregator.md`, `memory-extension-guide.md`, `status-schema.md`, `example-config.yml`) — replace any slash-command references with the new canonical names
- [ ] Update `docs/zoto-eval-system.md` — replace the command list with the new canonical names; **also realign the list to cover all 9 current eval-system commands** (`init`, `configure`, `create`, `update`, `execute`, `judge`, `compare`, `help`, `advise` — the file's existing line 17 list is missing `init` and `advise`, so a mechanical 1:1 swap would preserve that gap); add a single line acknowledging the legacy `/zoto-eval-*` aliases
- [ ] Update GitHub Pages: `site/index.html`, `site/spec-system/index.html`, `site/spec-system/quickstart.html`, `site/spec-system/configuration.html`, `site/spec-system/design.html` — replace any displayed `/zoto-*` slash commands with `/z-*`
- [ ] Update SVG diagrams/mockups that contain slash-command text: `site/images/diagrams/agent-architecture.svg`, `site/images/diagrams/workflow-overview.svg`, `site/images/mockups/create-spec.svg`, `site/images/mockups/execute-progress.svg`, `site/images/mockups/judge-output.svg`. Where in-place text replacement is non-trivial because of styling, add a one-line note in the surrounding HTML page rather than editing the SVG path data
- [ ] Update `.cursor/agents/zoto-plugin-manager.md` — line ~390 references `/zoto-spec-create` etc.; update to canonical short form. **Also include `/z-spec-init` in the rewrite** even though the existing line only lists three commands (`/zoto-spec-create`, `/zoto-spec-judge`, `/zoto-spec-execute`); the file currently omits `/zoto-spec-init` and a mechanical rename would preserve that omission
- [ ] Verify `.cursor-plugin/marketplace.json` is unchanged (it does not list individual commands)
- [ ] Verify root `package.json` is unchanged (no `zoto-*` literal command alias scripts exist)
- [ ] Sanity-confirm root `README.md` still has no `/zoto-spec-*` or `/zoto-eval-*` slash-command literals (verified clean at spec time; this is a guard against accidental drift mid-rename)

## Definition of Done
- [ ] All listed files updated; the new canonical short names are the primary form everywhere
- [ ] Each plugin's README has exactly one "Back-compat aliases" listing for legacy names
- [ ] Each plugin's CHANGELOG has exactly one new "Unreleased" entry describing the rename + alias scheme
- [ ] No agent / skill / plugin-folder identifier was renamed
- [ ] `node scripts/validate-template.mjs` passes
- [ ] `git diff` shows no unintended changes to Out-of-Scope surfaces

## Implementation Notes

- Treat slash-command references as **plain text strings**. Do not refactor surrounding prose unless required to keep the sentence grammatical.
- For SVGs containing `<text>...</text>` with command names: try a clean text-content swap first; if SVG path data or kerning makes the swap unsafe, leave the SVG alone and add a one-line caption in the surrounding `.html` page (e.g. *"Diagram shows the legacy `/zoto-spec-create` name; canonical is now `/z-spec-create`."*) so the page text is up to date even if the diagram lags.
- The CRUX-compressed rule at `.cursor/rules/crux-memories-integration.crux.mdc` is **generated** — do NOT edit it directly. If its source `.cursor/rules/crux-memories-integration.mdc` (or wherever the source lives) contains a slash-command reference, edit the source and let subtask 06 regenerate the CRUX output.
- Spec/exec-report files under `specs/**/` are historical — do NOT touch them.
- `.zoto/eval-system/cache/analyser/**` JSON is regenerated on demand — do NOT touch.
- Eval `manifest.yml` / `manifest.history.yml` under `.zoto/eval-system/` are runtime state — confirm they don't carry hard-coded slash commands; if they do, escalate to subtask 05.
- For plugin agent body text: agent files frequently contain phrases like "the parent command (e.g. `/zoto-spec-execute`) ..." — update those literal command references but keep the agent's `name:` frontmatter, filename, and any internal identifiers (subagent_type slugs) untouched.
- Coordinate with subtask 05 for any change that crosses into structured data (schemas, evals.json) — that subtask owns the structured-data side.

## Testing Strategy

**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Run `node scripts/validate-template.mjs` after batches of edits to catch frontmatter regressions
- Run `node scripts/validate-skills.mjs` to confirm no skill metadata regressed (skill names did not change but body edits should be defensible)
- Defer the full `pnpm test` and end-to-end alias verification to subtask 07

## Execution Notes

_To be filled by executing agent._

### Agent Session Info
- Agent: [Not yet assigned]
- Started: [Not yet started]
- Completed: [Not yet completed]

### Work Log

### Blockers Encountered

### Files Modified
