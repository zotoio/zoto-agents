# Subtask 04 — command-prefix-shortening — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 04 |
| feature | command-prefix-shortening |
| assigned_agent | docs-sync-agent |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | pending |
| started_at |  |
| last_heartbeat |  |
| completed_at |  |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [ ] **D01** — Update `plugins/zoto-spec-system/README.md` — canonical commands switched to `/z-spec-*`; add a single "Back-compat aliases" subsection listing the four `/zoto-spec-*` legacy names
- [ ] **D02** — Update `plugins/zoto-eval-system/README.md` — canonical commands switched to `/z-eval-*`; add a single "Back-compat aliases" subsection listing the eight `/zoto-eval-*` legacy names
- [ ] **D03** — Update `plugins/zoto-spec-system/CHANGELOG.md` — add an "Unreleased" entry: *"Renamed canonical slash commands to `/z-spec-*`. Legacy `/zoto-spec-*` names remain functional via thin alias files."*
- [ ] **D04** — Update `plugins/zoto-eval-system/CHANGELOG.md` — add an analogous "Unreleased" entry for the eval-system rename
- [ ] **D05** — Update `AGENTS.md` — replace `/zoto-spec-execute` reference (line ~53) with `/z-spec-execute`; verify no other occurrences
- [ ] **D06** — Update `.cursor/rules/zoto-plugin-conventions.mdc` — replace any slash-command references with the short form
- [ ] **D07** — Update `plugins/zoto-spec-system/rules/zoto-spec-system.mdc` — "Available Commands" section, "When to Suggest Planning", configuration section, and any inline references switched to `/z-spec-*`; add a small "Back-compat aliases" line at the end of "Available Commands"
- [ ] **D08** — Update `plugins/zoto-eval-system/rules/zoto-eval-system.mdc` — "Available Commands" section, "Help-Intent Routing", and any inline references switched to `/z-eval-*`; add the analogous "Back-compat aliases" line
- [ ] **D09** — Update plugin agent files under `plugins/zoto-spec-system/agents/*.md` (`zoto-spec-generator.md`, `zoto-spec-executor.md`, `zoto-spec-judge.md`) and `plugins/zoto-eval-system/agents/*.md` (`zoto-eval-configurer.md`, `zoto-eval-generator.md`, `zoto-eval-executor.md`, `zoto-eval-judge.md`, `zoto-eval-updater.md`, `zoto-eval-comparer.md`, `zoto-eval-adviser.md`, `zoto-eval-analyser-subagent.md`) — replace body-level slash command references with the new canonical names. Agent identifiers (filenames, frontmatter `name:`) are NOT changed
- [ ] **D10** — Update plugin skill `SKILL.md` files where they reference slash commands in the body — explicit list:
- [ ] **D11** — Update `plugins/zoto-spec-system/hooks/zoto-session-start.{ts,mjs}` — replace the default nudge message string `"...running /zoto-spec-create to organize."` with `"...running /z-spec-create to organize."`
- [ ] **D12** — Update `plugins/zoto-eval-system/hooks/zoto-eval-session-start.{ts,mjs}` — replace any analogous nudge message strings
- [ ] **D13** — Update `plugins/zoto-eval-system/hooks/hooks.json` if it carries any slash-command literal (verify, update if present)
- [ ] **D14** — Update `plugins/zoto-spec-system/templates/init-config.yml` and `plugins/zoto-eval-system/templates/init-config.yml` — commented example messages use the new canonical short form
- [ ] **D15** — Update `.zoto/spec-system/config.yml` (the live workspace config) only if it contains an uncommented override that references the old name; otherwise leave commented defaults alone
- [ ] **D16** — Update `plugins/zoto-eval-system/templates/baseline-fixtures/.zoto/eval-system/config.yml` — example messages use the new canonical short form
- [ ] **D17** — Update `plugins/zoto-spec-system/docs/*.md` (`config-schema.md`, `aggregator.md`, `memory-extension-guide.md`, `status-schema.md`, `example-config.yml`) — replace any slash-command references with the new canonical names
- [ ] **D18** — Update `docs/zoto-eval-system.md` — replace the command list with the new canonical names; **also realign the list to cover all 9 current eval-system commands** (`init`, `configure`, `create`, `update`, `execute`, `judge`, `compare`, `help`, `advise` — the file's existing line 17 list is missing `init` and `advise`, so a mechanical 1:1 swap would preserve that gap); add a single line acknowledging the legacy `/zoto-eval-*` aliases
- [ ] **D19** — Update GitHub Pages: `site/index.html`, `site/spec-system/index.html`, `site/spec-system/quickstart.html`, `site/spec-system/configuration.html`, `site/spec-system/design.html` — replace any displayed `/zoto-*` slash commands with `/z-*`
- [ ] **D20** — Update SVG diagrams/mockups that contain slash-command text: `site/images/diagrams/agent-architecture.svg`, `site/images/diagrams/workflow-overview.svg`, `site/images/mockups/create-spec.svg`, `site/images/mockups/execute-progress.svg`, `site/images/mockups/judge-output.svg`. Where in-place text replacement is non-trivial because of styling, add a one-line note in the surrounding HTML page rather than editing the SVG path data
- [ ] **D21** — Update `.cursor/agents/zoto-plugin-manager.md` — line ~390 references `/zoto-spec-create` etc.; update to canonical short form. **Also include `/z-spec-init` in the rewrite** even though the existing line only lists three commands (`/zoto-spec-create`, `/zoto-spec-judge`, `/zoto-spec-execute`); the file currently omits `/zoto-spec-init` and a mechanical rename would preserve that omission
- [ ] **D22** — Verify `.cursor-plugin/marketplace.json` is unchanged (it does not list individual commands)
- [ ] **D23** — Verify root `package.json` is unchanged (no `zoto-*` literal command alias scripts exist)
- [ ] **D24** — Sanity-confirm root `README.md` still has no `/zoto-spec-*` or `/zoto-eval-*` slash-command literals (verified clean at spec time; this is a guard against accidental drift mid-rename)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
_None._
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->

<!-- status:notes:end -->
