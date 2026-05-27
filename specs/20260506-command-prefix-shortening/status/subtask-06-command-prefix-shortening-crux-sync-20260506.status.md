# Subtask 06 — command-prefix-shortening — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 06 |
| feature | command-prefix-shortening |
| assigned_agent | crux-cursor-rule-manager |
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
- [ ] **D01** — Identify every `.cursor/rules/*.crux.md` / `*.crux.mdc` whose source `.mdc` was edited in subtask 04 (subtask 01's inventory should already list these candidates)
- [ ] **D02** — For each candidate, verify the `generated:` + `sourceChecksum:` (or `sourceUrl:`) frontmatter contract still holds — i.e. the file is genuinely a derived CRUX output
- [ ] **D03** — Recompute the source checksum (use the `crux-utils` skill: `Read(.cursor/skills/crux-utils/SKILL.md)`)
- [ ] **D04** — If the new source checksum equals the persisted `sourceChecksum`, skip — content unchanged
- [ ] **D05** — Otherwise, regenerate the derived `.crux.md` / `.crux.mdc` using surgical-diff updates that preserve the original CRUX notation style
- [ ] **D06** — Update the `sourceChecksum` (or equivalent metadata) inside the derived file's frontmatter
- [ ] **D07** — Confirm token-reduction remains within the project's CRUX target (≤ 20% of source) — if a regenerated file no longer reduces sufficiently, flag it for follow-up rather than degrade the source
- [ ] **D08** — Check `AGENTS.md` for an inline `⟦CRUX:...⟧` block. **Current state (verified at spec time): `AGENTS.md` carries the `<CRUX agents="always">` annotation tag at line 1 but contains NO inline `⟦CRUX:...⟧`-encoded block — therefore no regeneration is required for this spec.** This deliverable acts as a **guard against future regression**: if a future change adds an inline CRUX block, that block must be regenerated in place when the source content changes; do NOT create an `AGENTS.source.md` (`AGENTS.md` is the source file in this repo)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
_None._
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->

<!-- status:notes:end -->
