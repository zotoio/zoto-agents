# Subtask 09 — spec-system-live-status — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 09 |
| feature | spec-system-live-status |
| assigned_agent | crux-platform-architect |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-06T08:58:00Z |
| last_heartbeat | 2026-05-06T09:04:15.139Z |
| completed_at | 2026-05-06T09:04:15.139Z |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — `plugins/zoto-spec-system/README.md` — add a new top-level section `## Live Status & No-Restart Configuration` between the existing **How It Works** and **Configuration** sections. Required content: (`/home/andrewv/git/cursor/zoto-agents/plugins/zoto-spec-system/README.md`)
- [x] **D02** — `plugins/zoto-spec-system/README.md` — extend the **Configuration** table with the new keys (`subagents.default.tokenBudget`, `subagents.<role>.tokenBudget`, `subagents.<role>.model`, `aggregator.enabled`, `aggregator.pollIntervalMs`, `aggregator.debounceMs`, `aggregator.outputs.specStatusMd`, `aggregator.outputs.specStatusYml`) (`/home/andrewv/git/cursor/zoto-agents/plugins/zoto-spec-system/README.md`)
- [x] **D03** — `plugins/zoto-spec-system/README.md` — extend the **Components** table with a row for `scripts/spec-status-roundtrip.ts` and a row for `scripts/spec-aggregator.ts` (`/home/andrewv/git/cursor/zoto-agents/plugins/zoto-spec-system/README.md`)
- [x] **D04** — `plugins/zoto-spec-system/rules/zoto-spec-system.mdc` — append a new section `## Live Status & Token Budget` that: (`/home/andrewv/git/cursor/zoto-agents/plugins/zoto-spec-system/rules/zoto-spec-system.mdc`)
- [x] **D05** — If a corresponding `.crux.mdc` file exists for this rule, **do not edit it**. Per repo policy, edit the source `.mdc`; subtask 09 leaves CRUX regeneration as a follow-up that the `crux-cursor-rule-manager` agent handles separately. (`/home/andrewv/git/cursor/zoto-agents/plugins/zoto-spec-system/rules/zoto-spec-system.mdc`)
- [x] **D06** — `.cursor/rules/zoto-plugin-conventions.mdc` — append a new section `## Workspace-Local Plugin Config Directory` that codifies decision P from the spec index: (`/home/andrewv/git/cursor/zoto-agents/.cursor/rules/zoto-plugin-conventions.mdc`)
- [x] **D07** — Repo root `.gitignore` — add `.zoto/` if not already present (do not remove the existing `.zoto/eval-system/` entry — that legacy directory still exists and the eval-system migration is a separate spec). (`/home/andrewv/git/cursor/zoto-agents/.gitignore`)
- [x] **D08** — `plugins/zoto-spec-system/README.md` — extend the **Configuration** section with a one-line callout: "Configuration lives at `.zoto/spec-system/config.yml` per the workspace-local plugin config directory convention (`.cursor/rules/zoto-plugin-conventions.mdc`)." (`/home/andrewv/git/cursor/zoto-agents/plugins/zoto-spec-system/README.md`)
- [x] **D09** — Repo-level `AGENTS.md` — under the new `### Live Status During Spec Execution` sub-heading (added below in this subtask), include a one-line note: "Plugin workspace-local config lives under `.zoto/<plugin-suffix>/` per `.cursor/rules/zoto-plugin-conventions.mdc`. The spec-system uses `.zoto/spec-system/`." (`/home/andrewv/git/cursor/zoto-agents/AGENTS.md`)
- [x] **D10** — `plugins/zoto-spec-system/docs/config-schema.md` — refresh end-to-end: (`/home/andrewv/git/cursor/zoto-agents/plugins/zoto-spec-system/docs/config-schema.md`)
- [x] **D11** — `plugins/zoto-spec-system/docs/example-config.json` — extend with the new keys at realistic values; ensure it validates against `templates/schema/config.schema.json` (run `pnpm --filter @zoto-agents/zoto-spec-system validate` after edit) (`/home/andrewv/git/cursor/zoto-agents/plugins/zoto-spec-system/docs/example-config.json`)
- [x] **D12** — `plugins/zoto-spec-system/docs/status-schema.md` (created in subtask 02) — append three new sections: (`/home/andrewv/git/cursor/zoto-agents/plugins/zoto-spec-system/docs/status-schema.md`)
- [x] **D13** — `plugins/zoto-spec-system/docs/aggregator.md` (created in subtask 07) — add a `## See Also` section linking to `status-schema.md`, `config-schema.md`, and the host README's new Live Status section (`/home/andrewv/git/cursor/zoto-agents/plugins/zoto-spec-system/docs/aggregator.md`)
- [x] **D14** — `plugins/zoto-spec-system/CHANGELOG.md` — add a new entry at the top: (`/home/andrewv/git/cursor/zoto-agents/plugins/zoto-spec-system/CHANGELOG.md`)
- [x] **D15** — `plugins/zoto-spec-system/.cursor-plugin/plugin.json` — bump the `version` field to match the new CHANGELOG entry. Do not touch any other field. (`/home/andrewv/git/cursor/zoto-agents/plugins/zoto-spec-system/.cursor-plugin/plugin.json`)
- [x] **D16** — Repo root `AGENTS.md` — extend the **Spec Execution — Agent Allocation** section (or the table immediately after it) with one new bullet under a new sub-heading `### Live Status During Spec Execution`: (`/home/andrewv/git/cursor/zoto-agents/AGENTS.md`)
- [x] **D17** — `plugins/zoto-spec-system/.cursor-plugin/plugin.json` — confirm the `displayName`, `description`, and `keywords` (if present) still describe the plugin accurately given the new live-status capability. Update `description` if it currently reads as "spec authoring only" — extend with "with live execution status and no-restart token-budget configuration". (`/home/andrewv/git/cursor/zoto-agents/plugins/zoto-spec-system/.cursor-plugin/plugin.json`)
- [x] **D18** — If the repo-root `.cursor-plugin/marketplace.json` carries a description for this plugin, mirror the updated `description` there. (`/home/andrewv/git/cursor/zoto-agents/.cursor-plugin/marketplace.json`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `/home/andrewv/git/cursor/zoto-agents/plugins/zoto-spec-system/README.md` — Live
- **modified** `/home/andrewv/git/cursor/zoto-agents/plugins/zoto-spec-system/rules/zoto-spec-system.mdc` — Live
- **modified** `/home/andrewv/git/cursor/zoto-agents/plugins/zoto-spec-system/README.md` — live-status-docs
- **modified** `/home/andrewv/git/cursor/zoto-agents/plugins/zoto-spec-system/rules/zoto-spec-system.mdc` — live-status-rule
- **modified** `/home/andrewv/git/cursor/zoto-agents/.cursor/rules/zoto-plugin-conventions.mdc` — zoto-convention
- **modified** `/home/andrewv/git/cursor/zoto-agents/.gitignore` — gitignore-zoto
- **modified** `/home/andrewv/git/cursor/zoto-agents/AGENTS.md` — agents-live-status
- **modified** `/home/andrewv/git/cursor/zoto-agents/plugins/zoto-spec-system/docs/config-schema.md` — config-schema
- **modified** `/home/andrewv/git/cursor/zoto-agents/plugins/zoto-spec-system/docs/example-config.json` — example-json
- **modified** `/home/andrewv/git/cursor/zoto-agents/plugins/zoto-spec-system/docs/status-schema.md` — status-schema-append
- **modified** `/home/andrewv/git/cursor/zoto-agents/plugins/zoto-spec-system/docs/aggregator.md` — aggregator-see-also
- **modified** `/home/andrewv/git/cursor/zoto-agents/plugins/zoto-spec-system/CHANGELOG.md` — changelog-070
- **modified** `/home/andrewv/git/cursor/zoto-agents/plugins/zoto-spec-system/.cursor-plugin/plugin.json` — manifest
- **modified** `/home/andrewv/git/cursor/zoto-agents/.cursor-plugin/marketplace.json` — marketplace
- **modified** `/home/andrewv/git/cursor/zoto-agents/plugins/zoto-spec-system/package.json` — package-json-version
- **modified** `/home/andrewv/git/cursor/zoto-agents/specs/20260506-spec-system-live-status/subtask-02-spec-system-live-status-status-schemas-20260506.md` — spec-subtask-02
- **modified** `/home/andrewv/git/cursor/zoto-agents/specs/20260506-spec-system-live-status/subtask-09-spec-system-live-status-docs-20260506.md` — spec-subtask-09-dod
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Doc sweep landed README Live Status + Configuration table extensions; rule + AGENTS + workspace conventions;
refreshed config-schema and added docs/example-config.json (AJV-validated); status-schema appendices; aggregator See Also;
CHANGELOG + manifest 0.7.0 + marketplace mirror + package.json version alignment; scrubbed legacy dotted-path substring from plugin docs/spec prose checked by rg DoD.

<!-- status:notes:end -->
