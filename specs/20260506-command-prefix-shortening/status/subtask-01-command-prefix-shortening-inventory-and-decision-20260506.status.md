# Subtask 01 — command-prefix-shortening — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 01 |
| feature | command-prefix-shortening |
| assigned_agent | crux-platform-architect |
| model | composer-2-fast |
| token_budget | 200000 |
| state | pending |
| started_at |  |
| last_heartbeat |  |
| completed_at |  |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [ ] **D01** — Run an exhaustive `rg`/`Grep` sweep for `/zoto-spec-` and `/zoto-eval-` across the repo, excluding `specs/**`, `evals/_runs/**`, `node_modules/**`, `pnpm-lock.yaml`, and `.zoto/eval-system/cache/**`
- [ ] **D02** — Run a second sweep for the bare prefixes `zoto-spec-` and `zoto-eval-` to catch references outside slash syntax (e.g. inside YAML strings, JSON `examples`, or HTML attribute values)
- [ ] **D03** — For each hit, classify it: (a) command-file body that becomes the canonical form, (b) command-file body that becomes a thin alias, (c) prose/code reference that must be updated to the new canonical name, (d) plugin-folder/skill/agent path that is **out of scope** (per the spec's exclusion list)
- [ ] **D04** — Confirm or override the chosen rename option (default Option 2) with documented rationale; record the decision in `inventory.md`
- [ ] **D05** — Document any surprise references found (e.g. SVG embedded text, schema `examples`, error-message string literals in TS)
- [ ] **D06** — List every file that the architect believes contains a CRUX-compressed view of an in-scope source rule, so subtask 06 knows what to regenerate
- [ ] **D07** — Verify `package.json` scripts and `.cursor-plugin/marketplace.json` do **not** carry the slash-command prefixes (or list them if they do)
- [ ] **D08** — Create `specs/20260506-command-prefix-shortening/inventory.md` with the classified change list, grouped by phase/owner
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
_None._
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->

<!-- status:notes:end -->
