# Subtask: Inventory and Decision

## Metadata
- **Subtask ID**: 01
- **Feature**: command-prefix-shortening
- **Assigned Subagent**: crux-platform-architect
- **Dependencies**: None
- **Created**: 20260506

## Objective

Produce the concrete, exhaustive change list that all downstream subtasks consume. Confirm (or, with documented rationale, override) the spec's chosen implementation option (rename + back-compat alias). Catalogue every file that contains a `/zoto-spec-*` or `/zoto-eval-*` slash command reference and classify each occurrence as **rename**, **leave-as-alias**, **update-text**, or **out-of-scope**.

This subtask is the planning gate — no source files are edited here; the deliverable is a living change-list document inside the spec directory that subtasks 02–07 reference verbatim.

## Deliverables Checklist
- [ ] Run an exhaustive `rg`/`Grep` sweep for `/zoto-spec-` and `/zoto-eval-` across the repo, excluding `specs/**`, `evals/_runs/**`, `node_modules/**`, `pnpm-lock.yaml`, and `.zoto/eval-system/cache/**`
- [ ] Run a second sweep for the bare prefixes `zoto-spec-` and `zoto-eval-` to catch references outside slash syntax (e.g. inside YAML strings, JSON `examples`, or HTML attribute values)
- [ ] For each hit, classify it: (a) command-file body that becomes the canonical form, (b) command-file body that becomes a thin alias, (c) prose/code reference that must be updated to the new canonical name, (d) plugin-folder/skill/agent path that is **out of scope** (per the spec's exclusion list)
- [ ] Confirm or override the chosen rename option (default Option 2) with documented rationale; record the decision in `inventory.md`
- [ ] Document any surprise references found (e.g. SVG embedded text, schema `examples`, error-message string literals in TS)
- [ ] List every file that the architect believes contains a CRUX-compressed view of an in-scope source rule, so subtask 06 knows what to regenerate
- [ ] Verify `package.json` scripts and `.cursor-plugin/marketplace.json` do **not** carry the slash-command prefixes (or list them if they do)
- [ ] Create `specs/20260506-command-prefix-shortening/inventory.md` with the classified change list, grouped by phase/owner

## Definition of Done
- [ ] `inventory.md` lists every in-scope file with one row per occurrence and a clear classification
- [ ] Out-of-scope surfaces are explicitly enumerated and reconciled against the spec's Out-of-Scope section (any disagreement is escalated rather than silently re-scoped)
- [ ] Subtask 02 and 03 can derive the exact set of new and edited command files from `inventory.md` alone
- [ ] Subtask 04 can derive the exact set of doc/rule files to edit from `inventory.md` alone
- [ ] No source files are modified by this subtask (only `inventory.md` is created)

## Implementation Notes

- Use the spec's "In Scope" / "Out of Scope" sections as the canonical decision boundary. If you find a reference that does not cleanly fall into either, propose a classification and flag it in `inventory.md` for the user to confirm.
- Pay particular attention to:
  - `site/images/{diagrams,mockups}/*.svg` — text inside `<text>` elements may show slash commands; confirm whether they update cleanly or need follow-up.
  - `scripts/eval-stamp.ts`, `plugins/zoto-eval-system/scripts/eval-update.ts` — the slash command appears inside **error message strings**, not as identifiers. Update them as text.
  - `plugins/zoto-eval-system/templates/llm/agent-sdk/case.ts.tmpl` and similar — template files. Updates here propagate into generated host-repo evals on next run.
  - `plugins/zoto-eval-system/skills/zoto-help-evals/evals/evals.json` and other `evals/evals.json` files — eval cases with `prompt: "/zoto-eval-help"` need updating to the new canonical form **plus** likely an additional case asserting the alias dispatches the same workflow.
  - Any `.cursor/rules/*.mdc` file that has a paired `.crux.mdc` derived file (e.g. `crux-memories-integration.crux.mdc`) — list both.
- The deliverable is a planning document, not code. Keep it grouped by destination subtask so each downstream owner sees their slice immediately.

## Testing Strategy

This subtask does not modify code, so no targeted tests are added. The verification subtask (07) sanity-checks `inventory.md` against the final `git diff`.

## Execution Notes

### Agent Session Info
- Agent: crux-platform-architect
- Started: 2026-05-06T21:52Z
- Completed: 2026-05-06T21:55Z

### Work Log

1. Read the full subtask spec and parent spec for context and scope boundaries.
2. Ran exhaustive `Grep` sweeps for `/zoto-spec-*` and `/zoto-eval-*` across the entire repo, targeting each directory individually to get precise results: `plugins/`, `site/`, `scripts/`, `evals/`, `.cursor/`, `docs/`, `AGENTS.md`, `.zoto/`, `README.md`, `package.json`, `.cursor-plugin/marketplace.json`.
3. Ran a secondary sweep for bare prefixes (`zoto-spec-create`, `zoto-eval-configure`, etc.) to catch non-slash references.
4. Checked both CRUX-compressed files (`install.crux.md`, `.cursor/rules/crux-memories-integration.crux.mdc`) — confirmed neither contains slash-command references.
5. Verified root `README.md`, root `package.json`, and `.cursor-plugin/marketplace.json` are clean of slash-command literals.
6. Classified every hit as: command-file body (alias vs canonical), prose/code reference (update), or out-of-scope (plugin identity paths, schema `$id` URLs, import paths, runtime manifests).
7. Documented 8 surprises/edge cases: SVG `<text>` elements (5 files, all cleanly updatable), compiled `.mjs` hook mirrors, SVG `alt` text in HTML, JSON example in design.html, live workspace config, missing `/zoto-spec-init` in plugin-manager, test fixture string, heavy user-checklists template.
8. Confirmed Option 2 (rename + back-compat alias) with documented rationale.
9. Confirmed subtask 06 (CRUX sync) is a no-op — no CRUX file's source contains slash-command references.
10. Wrote the full classified inventory to `specs/20260506-command-prefix-shortening/inventory.md`.

### Blockers Encountered

None.

### Files Modified

- `specs/20260506-command-prefix-shortening/inventory.md` (created)
