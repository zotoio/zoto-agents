# Subtask 03 — command-prefix-shortening — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 03 |
| feature | command-prefix-shortening |
| assigned_agent | crux-software-engineer |
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
- [ ] **D01** — Create `plugins/zoto-eval-system/commands/z-eval-init.md` — canonical, mirrored from `zoto-eval-init.md` with in-body slash references rewritten to `/z-eval-*`
- [ ] **D02** — Create `plugins/zoto-eval-system/commands/z-eval-configure.md` — canonical, mirrored from `zoto-eval-configure.md`
- [ ] **D03** — Create `plugins/zoto-eval-system/commands/z-eval-create.md` — canonical, mirrored from `zoto-eval-create.md`
- [ ] **D04** — Create `plugins/zoto-eval-system/commands/z-eval-update.md` — canonical, mirrored from `zoto-eval-update.md`
- [ ] **D05** — Create `plugins/zoto-eval-system/commands/z-eval-execute.md` — canonical, mirrored from `zoto-eval-execute.md`
- [ ] **D06** — Create `plugins/zoto-eval-system/commands/z-eval-judge.md` — canonical, mirrored from `zoto-eval-judge.md`
- [ ] **D07** — Create `plugins/zoto-eval-system/commands/z-eval-compare.md` — canonical, mirrored from `zoto-eval-compare.md`
- [ ] **D08** — Create `plugins/zoto-eval-system/commands/z-eval-help.md` — canonical, mirrored from `zoto-eval-help.md`
- [ ] **D09** — Create `plugins/zoto-eval-system/commands/z-eval-advise.md` — canonical, mirrored from `zoto-eval-advise.md` (preserves the **two** command-owned `askQuestion` breakpoints — drill-down selection and action recommendations — and the handoff to `/z-eval-create` / `/z-eval-update`)
- [ ] **D10** — Convert each existing `zoto-eval-<verb>.md` (including `zoto-eval-advise.md`) into a thin alias that delegates to its `z-eval-<verb>` counterpart, with `$ARGUMENTS` passed through. For commands that own pre-collection (`/zoto-eval-help`, `/zoto-eval-advise`), follow the **alias delegation idiom for `askQuestion`-owning commands** documented in subtask 02's Implementation Notes: the alias body must instruct the agent to read and follow the canonical file's instructions verbatim rather than spawn-without-pre-collection
- [ ] **D11** — Each alias file's `description` includes the phrase **"alias for `/z-eval-<verb>`"**
- [ ] **D12** — Each canonical file's "Related" / cross-reference sections use the new short names
- [ ] **D13** — Each alias file is < 30 lines, contains no instruction duplication, and links to its canonical counterpart
- [ ] **D14** — Frontmatter `name:` matches the file basename in every case
- [ ] **D15** — The `/z-eval-help` canonical file's body (and any sibling) preserves the exact help-routing contract documented in `plugins/zoto-eval-system/rules/zoto-eval-system.mdc` § "Help-Intent Routing" — only the slash-command literal changes
- [ ] **D16** — `node scripts/validate-template.mjs` passes for the eval-system plugin
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
_None._
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->

<!-- status:notes:end -->
