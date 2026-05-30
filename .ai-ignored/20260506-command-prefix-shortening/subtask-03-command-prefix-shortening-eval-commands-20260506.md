# Subtask: Eval-System Command Files (Canonical + Alias)

## Metadata
- **Subtask ID**: 03
- **Feature**: command-prefix-shortening
- **Assigned Subagent**: crux-software-engineer
- **Dependencies**: 01
- **Created**: 20260506

## Objective

Produce the new canonical `z-eval-<verb>.md` command files for the Eval System plugin and convert the existing `zoto-eval-<verb>.md` files into thin alias delegates. After this subtask, both `/z-eval-create` and `/zoto-eval-create` (and the analogous pairs for the **eight other verbs** — `init`, `configure`, `update`, `execute`, `judge`, `compare`, `help`, `advise`) resolve to the same workflow.

## Deliverables Checklist
- [x] Create `plugins/zoto-eval-system/commands/z-eval-init.md` — canonical, mirrored from `zoto-eval-init.md` with in-body slash references rewritten to `/z-eval-*`
- [x] Create `plugins/zoto-eval-system/commands/z-eval-configure.md` — canonical, mirrored from `zoto-eval-configure.md`
- [x] Create `plugins/zoto-eval-system/commands/z-eval-create.md` — canonical, mirrored from `zoto-eval-create.md`
- [x] Create `plugins/zoto-eval-system/commands/z-eval-update.md` — canonical, mirrored from `zoto-eval-update.md`
- [x] Create `plugins/zoto-eval-system/commands/z-eval-execute.md` — canonical, mirrored from `zoto-eval-execute.md`
- [x] Create `plugins/zoto-eval-system/commands/z-eval-judge.md` — canonical, mirrored from `zoto-eval-judge.md`
- [x] Create `plugins/zoto-eval-system/commands/z-eval-compare.md` — canonical, mirrored from `zoto-eval-compare.md`
- [x] Create `plugins/zoto-eval-system/commands/z-eval-help.md` — canonical, mirrored from `zoto-eval-help.md`
- [x] Create `plugins/zoto-eval-system/commands/z-eval-advise.md` — canonical, mirrored from `zoto-eval-advise.md` (preserves the **two** command-owned `askQuestion` breakpoints — drill-down selection and action recommendations — and the handoff to `/z-eval-create` / `/z-eval-update`)
- [x] Convert each existing `zoto-eval-<verb>.md` (including `zoto-eval-advise.md`) into a thin alias that delegates to its `z-eval-<verb>` counterpart, with `$ARGUMENTS` passed through. For commands that own pre-collection (`/zoto-eval-help`, `/zoto-eval-advise`), follow the **alias delegation idiom for `askQuestion`-owning commands** documented in subtask 02's Implementation Notes: the alias body must instruct the agent to read and follow the canonical file's instructions verbatim rather than spawn-without-pre-collection
- [x] Each alias file's `description` includes the phrase **"alias for `/z-eval-<verb>`"**
- [x] Each canonical file's "Related" / cross-reference sections use the new short names
- [x] Each alias file is < 30 lines, contains no instruction duplication, and links to its canonical counterpart
- [x] Frontmatter `name:` matches the file basename in every case
- [x] The `/z-eval-help` canonical file's body (and any sibling) preserves the exact help-routing contract documented in `plugins/zoto-eval-system/rules/zoto-eval-system.mdc` § "Help-Intent Routing" — only the slash-command literal changes
- [x] `node scripts/validate-template.mjs` passes for the eval-system plugin

## Definition of Done
- [x] All nine `z-eval-*.md` canonical files exist and validate (`init`, `configure`, `create`, `update`, `execute`, `judge`, `compare`, `help`, `advise`)
- [x] All nine `zoto-eval-*.md` files now contain only the alias delegation pattern
- [x] Validator passes
- [x] No file under "Out of Scope" (plugin folder name, skill names, agent names, scripts/eval-*.ts identifiers) was modified
- [x] The alias for `/zoto-eval-help` correctly preserves the askQuestion-driven section listing behaviour by deferring to the canonical command
- [x] The alias for `/zoto-eval-advise` correctly preserves the **two** command-owned askQuestion breakpoints (drill-down selection, action recommendations) by deferring to the canonical command

## Implementation Notes

- Use the source `zoto-eval-<verb>.md` files as the starting point for canonical content. Move into `z-eval-<verb>.md` filenames, rewrite in-body slash references, save.
- Use the same alias delegation pattern as subtask 02 (see that subtask for a template snippet). Adapt it per verb — but keep it minimal.
- The `/zoto-eval-help` command currently owns the askQuestion that lists README sections; the canonical `/z-eval-help` keeps that ownership. The alias `zoto-eval-help.md` simply delegates and lets the canonical command handle the prompt. Confirm during execution that the help skill (`zoto-help-evals`) does not hard-depend on the command name string for its behaviour — if it does, escalate to subtask 04 / 05.
- The `/zoto-eval-advise` command owns askQuestion at **two** breakpoints (drill-down selection and action recommendations) per the `20260506-eval-adviser` spec. The canonical `/z-eval-advise` keeps both. The alias is built from the same idiom — see the **alias delegation idiom for askQuestion-owning commands** in subtask 02's Implementation Notes; do **not** copy or paraphrase the pre-collection logic into the alias.
- Subagent / skill names referenced in the body (`zoto-eval-configurer`, `zoto-eval-judge`, `zoto-help-evals`, `zoto-eval-adviser`, `zoto-advise-evals`, `zoto-eval-tooling`, etc.) are **out of scope**.
- Confirm the alias frontmatter passes the marketplace-name pattern check (`scripts/validate-template.mjs`'s `pluginNamePattern`) — `zoto-eval-help` already does, so no change to validation logic is required here.

## Testing Strategy

**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Run `node scripts/validate-template.mjs` after every batch of file changes
- Run `pnpm --filter @zoto-agents/zoto-eval-system test` if eval-system has plugin-local tests touching commands
- Defer full root tests and `validate-skills.mjs` to subtask 07

## Execution Notes

### Agent Session Info
- Agent: crux-software-engineer
- Started: 2026-05-06T21:53Z
- Completed: 2026-05-06T21:54Z

### Work Log

1. Read all 9 existing `zoto-eval-*.md` command files.
2. Created 9 canonical `z-eval-*.md` files by copying content from counterparts, changing frontmatter `name:` to `z-eval-<verb>`, and replacing all in-body slash references (`/zoto-eval-*` → `/z-eval-*`, `/zoto-spec-*` → `/z-spec-*`). Agent names, skill names, plugin paths left unchanged.
3. Converted all 9 existing `zoto-eval-*.md` files into thin alias delegates (< 15 lines each). Used the "read and follow verbatim" idiom for all commands, with explicit `askQuestion` preservation notes for `help` and `advise`.
4. Ran `node scripts/validate-template.mjs` — passed with 0 errors.

### Blockers Encountered

None.

### Files Modified

**Created (9 canonical):**
- `plugins/zoto-eval-system/commands/z-eval-init.md`
- `plugins/zoto-eval-system/commands/z-eval-configure.md`
- `plugins/zoto-eval-system/commands/z-eval-create.md`
- `plugins/zoto-eval-system/commands/z-eval-update.md`
- `plugins/zoto-eval-system/commands/z-eval-execute.md`
- `plugins/zoto-eval-system/commands/z-eval-judge.md`
- `plugins/zoto-eval-system/commands/z-eval-compare.md`
- `plugins/zoto-eval-system/commands/z-eval-help.md`
- `plugins/zoto-eval-system/commands/z-eval-advise.md`

**Modified (9 aliases):**
- `plugins/zoto-eval-system/commands/zoto-eval-init.md`
- `plugins/zoto-eval-system/commands/zoto-eval-configure.md`
- `plugins/zoto-eval-system/commands/zoto-eval-create.md`
- `plugins/zoto-eval-system/commands/zoto-eval-update.md`
- `plugins/zoto-eval-system/commands/zoto-eval-execute.md`
- `plugins/zoto-eval-system/commands/zoto-eval-judge.md`
- `plugins/zoto-eval-system/commands/zoto-eval-compare.md`
- `plugins/zoto-eval-system/commands/zoto-eval-help.md`
- `plugins/zoto-eval-system/commands/zoto-eval-advise.md`
