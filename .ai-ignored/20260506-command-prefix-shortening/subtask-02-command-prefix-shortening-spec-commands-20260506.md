# Subtask: Spec-System Command Files (Canonical + Alias)

## Metadata
- **Subtask ID**: 02
- **Feature**: command-prefix-shortening
- **Assigned Subagent**: crux-software-engineer
- **Dependencies**: 01
- **Created**: 20260506

## Objective

Produce the new canonical `z-spec-<verb>.md` command files for the Spec System plugin and convert the existing `zoto-spec-<verb>.md` files into thin alias delegates. After this subtask, both `/z-spec-create` and `/zoto-spec-create` (and the analogous pairs for `execute`, `judge`, `init`) resolve to the same workflow.

## Deliverables Checklist
- [x] Create `plugins/zoto-spec-system/commands/z-spec-create.md` — canonical command, instructions migrated verbatim from `zoto-spec-create.md` with all in-body slash references switched to the new short form (`/z-spec-execute`, `/z-spec-judge`, etc.)
- [x] Create `plugins/zoto-spec-system/commands/z-spec-execute.md` — canonical command, mirrored from `zoto-spec-execute.md`
- [x] Create `plugins/zoto-spec-system/commands/z-spec-judge.md` — canonical command, mirrored from `zoto-spec-judge.md`
- [x] Create `plugins/zoto-spec-system/commands/z-spec-init.md` — canonical command, mirrored from `zoto-spec-init.md`
- [x] Convert `plugins/zoto-spec-system/commands/zoto-spec-create.md` to a thin alias that spawns the same `zoto-spec-generator` subagent and invokes the same `zoto-create-spec` skill, passing `$ARGUMENTS` through; description must include the phrase **"alias for `/z-spec-create`"**
- [x] Convert `plugins/zoto-spec-system/commands/zoto-spec-execute.md` to a thin alias for `/z-spec-execute`
- [x] Convert `plugins/zoto-spec-system/commands/zoto-spec-judge.md` to a thin alias for `/z-spec-judge`
- [x] Convert `plugins/zoto-spec-system/commands/zoto-spec-init.md` to a thin alias for `/z-spec-init`
- [x] Each canonical file's "Related" section references the new short names (`/z-spec-*`)
- [x] Each alias file is < 30 lines and contains a single delegation block — no instruction duplication
- [x] Frontmatter `name:` matches the file basename in every case (plugin convention — `scripts/validate-template.mjs` only enforces that `name` and `description` are present and non-empty, but matching basename keeps command discovery predictable)
- [x] `node scripts/validate-template.mjs` passes for the spec-system plugin

## Definition of Done
- [x] All four `z-spec-*.md` canonical files exist and validate
- [x] All four `zoto-spec-*.md` files now contain only the alias delegation pattern
- [x] No instruction body is duplicated between a canonical and alias file
- [x] Validator passes
- [x] No file under "Out of Scope" (plugin folder name, skill names, agent names, package.json) was modified

## Implementation Notes

- Use the source file `plugins/zoto-spec-system/commands/zoto-spec-create.md` (and its siblings) as the starting point for the **canonical** file content. Move it into the `z-spec-*.md` filename, then rewrite every in-body slash reference to the short form before saving.
- Suggested alias body (pattern, adapt per command):

  ```markdown
  ---
  name: zoto-spec-create
  description: Alias for /z-spec-create — kept for back-compat. Forwards $ARGUMENTS to the canonical command.
  ---

  # zoto-spec-create (alias)

  > **Note**: `/zoto-spec-create` is the legacy name. The canonical command is **`/z-spec-create`**. Both resolve to the same workflow.

  When this command is invoked, spawn a `zoto-spec-generator` subagent that uses the `zoto-create-spec` skill, exactly as `/z-spec-create` does. Pass `$ARGUMENTS` through unchanged.

  See `plugins/zoto-spec-system/commands/z-spec-create.md` for full usage and behaviour.
  ```

- Do **not** duplicate the precondition / argument-handling / "What happens" sections in the alias — link to the canonical file instead. The alias must dispatch the same agent + skill so behaviour cannot drift.
- The plugin's frontmatter `name:` field should equal the file basename without extension as a convention. Aliases keep `name: zoto-spec-create`, etc. Canonical files use `name: z-spec-create`, etc. (The validator does not enforce this match, but matching keeps command discovery predictable.)
- Agent names referenced in the body (`zoto-spec-generator`, `zoto-spec-judge`, `zoto-spec-executor`) are **out of scope** — keep them as-is. Only slash-command references are renamed.
- Run `node scripts/validate-template.mjs` after edits to confirm both old and new files validate.

### Alias delegation idiom for `askQuestion`-owning commands

Some commands own `askQuestion` pre-collection **before** spawning a subagent (e.g. `/zoto-eval-help` enumerates README sections and prompts the user; `/zoto-eval-advise` runs `askQuestion` at two breakpoints — drill-down selection and action recommendations). For these, the simple "spawn the same subagent + skill" alias body is **not sufficient** because it would skip the pre-collection logic.

For an `askQuestion`-owning command, the alias body MUST instruct the agent to **read the canonical file and follow its instructions verbatim**, rather than reproducing or paraphrasing the pre-collection. Example pattern:

```markdown
---
name: zoto-eval-help
description: Alias for /z-eval-help — kept for back-compat. Read commands/z-eval-help.md and follow its instructions verbatim with $ARGUMENTS.
---

# zoto-eval-help (alias)

> **Note**: `/zoto-eval-help` is the legacy name. The canonical command is **`/z-eval-help`**. Both resolve to the same workflow.

When this command is invoked, **read `plugins/zoto-eval-system/commands/z-eval-help.md` and follow its instructions verbatim**, with `$ARGUMENTS` passed through unchanged. Do not paraphrase, summarise, or pre-empt any instruction in the canonical file — including the `askQuestion` pre-collection. The canonical command owns all interactive prompts.

See `plugins/zoto-eval-system/commands/z-eval-help.md` for full usage and behaviour.
```

This idiom applies to:
- `/zoto-eval-help` (single askQuestion breakpoint)
- `/zoto-eval-advise` (two askQuestion breakpoints)

Spec-system commands (`/zoto-spec-create`, `/zoto-spec-execute`, `/zoto-spec-judge`, `/zoto-spec-init`) currently spawn subagents directly without command-level `askQuestion` pre-collection, so the simpler "spawn the same subagent + skill" delegation is fine for them — but executing agents may still prefer the "read and follow" idiom for symmetry across both plugins.

## Testing Strategy

**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Run `node scripts/validate-template.mjs` (fast, repo-scoped) after every batch of file changes
- Run `pnpm --filter @zoto-agents/zoto-spec-system test` if Spec System has plugin-local tests that exercise commands
- Defer the full root `pnpm test` and `validate-skills.mjs` execution to subtask 07

## Execution Notes

### Agent Session Info
- Agent: crux-software-engineer
- Started: 2026-05-06T21:53+10:00
- Completed: 2026-05-06T21:54+10:00

### Work Log

1. Read all 4 existing command files (`zoto-spec-{create,execute,judge,init}.md`)
2. Created 4 canonical `z-spec-*.md` files with all in-body slash references updated to short form (`/z-spec-*`, `/z-eval-*`)
3. Converted 4 existing `zoto-spec-*.md` files to thin alias delegates (each < 15 lines, single delegation block)
4. Ran `node scripts/validate-template.mjs` — passed with no errors (only pre-existing mcp.json warnings)
5. Verified: agent names (`zoto-spec-generator`, `zoto-spec-executor`, `zoto-spec-judge`), skill names (`zoto-create-spec`, `zoto-execute-spec`, `zoto-judge-spec`), plugin paths, and config paths were NOT modified

### Blockers Encountered

None.

### Files Modified

**Created (canonical commands):**
- `plugins/zoto-spec-system/commands/z-spec-create.md`
- `plugins/zoto-spec-system/commands/z-spec-execute.md`
- `plugins/zoto-spec-system/commands/z-spec-judge.md`
- `plugins/zoto-spec-system/commands/z-spec-init.md`

**Modified (converted to thin aliases):**
- `plugins/zoto-spec-system/commands/zoto-spec-create.md`
- `plugins/zoto-spec-system/commands/zoto-spec-execute.md`
- `plugins/zoto-spec-system/commands/zoto-spec-judge.md`
- `plugins/zoto-spec-system/commands/zoto-spec-init.md`
