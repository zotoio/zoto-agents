# Subtask: Documentation & Developer Experience Review

## Metadata
- **Subtask ID**: 08
- **Feature**: Eval Plugin Implementation & Application Review
- **Assigned Subagent**: zoto-plugin-manager
- **Dependencies**: 01
- **Created**: 20260523

## Objective

Review every user-facing document and string the plugin ships, plus the
overall onboarding "happy path" friction. Identify accuracy, completeness,
tone, and ergonomics gaps that would block a confident publish.

## Deliverables Checklist

- [x] `findings-08-documentation-dx.md` covering:

  - [x] **README.md (500 lines)**:
    - Accuracy: every command, field, file path, schema reference cross-checked against actual plugin content (call out any drift).
    - The footnote "The rename is complete everywhere except this single footnote" (line 7 of the local copy's `README.md` — verify with `Read` before drafting findings) — is that still factually true after the latest changes?
    - Section structure: TOC missing? Sections > 100 lines? Code samples that no longer match shipped templates?
    - Tone/positioning: README opens with peer-billing voice (per CHANGELOG voice pass); is it consistent end-to-end?
    - Concrete examples: are they runnable as written, or do they assume preceding setup not shown?

  - [x] **CHANGELOG.md (62 lines)**:
    - The `[Unreleased]` section — list of changes vs the current version (`0.3.1`). Does the unreleased section warrant a new version cut?
    - Semver hygiene: are breaking changes (e.g. config-field additions, output filename rename) flagged as MAJOR/MINOR appropriately?
    - Date stamps: any out-of-order entries?
    - Migration guidance present for v0.2.0 breaking changes — is similar guidance present for `[Unreleased]` items?

  - [x] **LICENSE**: confirm MIT, confirm year/holder are correct.

  - [x] **Plugin rule (`rules/zoto-eval-system.mdc`)**:
    - `alwaysApply: true` — is the cost (every agent loads this rule) justified?
    - Help-intent routing rigidity: does it intercept reasonable inline answers? Does it have a "skip" exception?
    - TodoWrite contract: is it actually enforced by every named agent, or only documented?
    - Length and clarity.

  - [x] **Skill SKILL.md files**: each ≤ 500-line plugin-conventions limit. Spot-check: does every SKILL.md describe its inputs (pre-collected answers), outputs (deliverables, optional `needs_user_input`), and side effects (writes manifest, writes evals tree, etc.)?

  - [x] **Command markdown files (`commands/*.md`)**: each clearly documents the command's `askQuestion` ownership, the subagent it spawns, and any `--flag` it accepts.

  - [x] **Agent markdown files (`agents/*.md`)**: each documents the skill it consumes, the input contract, the output contract, and the explicit "no askQuestion" rule.

  - [x] **Error messages**: from subtask 04's sample, assess clarity, actionability, and tone.

  - [x] **Onboarding happy-path friction**: walk a new user through Cursor-marketplace install → /z-eval-init → /z-eval-configure → /z-eval-create → /z-eval-update → /z-eval-execute. For each step note: documentation referenced, decisions required, error states possible. Score each step 1–5 for friction.

  - [x] **Plugin rule (`rules/zoto-eval-system.mdc`) length check** vs the parallel `crux-memories-integration.crux.mdc` — note any divergence in rule-style conventions for this monorepo.

- [x] **Findings ledger** at top: severity, confidence, effort.

- [x] **Top-3 "blockers for publish"** in documentation alone.

- [x] No file mutations under the authoritative plugin docs root `<plugin>/` (static review only); spec artefacts updated only under `specs/20260523-eval-plugin-review/` per execution defaults.

## Definition of Done

- [x] Findings document committed under `specs/20260523-eval-plugin-review/findings-08/`.
- [x] Every accuracy claim is cited (`start:end:filepath` to the doc and `start:end:filepath` to the source it should match).
- [x] Onboarding friction walk-through includes at least one citation per step.
- [x] No mutations outside `specs/20260523-eval-plugin-review/`.

## Implementation Notes

- Local plugin docs root: `/home/andrewv/.cursor/plugins/local/zoto-eval-system/`.
- Cross-check the README against `subtask 01` inventory for completeness.
- For "every user-facing string is accurate" — sample, don't enumerate; pick high-traffic strings (init message, config-missing error, drift detected, etc.).
- Compare the `zoto-eval-system.mdc` rule with `/home/andrewv/git/cursor/zoto-agents/.cursor/rules/crux-memories-integration.crux.mdc` for cross-plugin convention consistency.

## Testing Strategy

**IMPORTANT**: Static review only. Do NOT execute any command, eval, or test.

## Execution Notes

### Agent Session Info
- Agent: zoto-plugin-manager (Documentation & DX review — Subtask 08)
- Started: 20260523 (session)
- Completed: 20260523

### Work Log

- Reviewed authoritative plugin tree `/home/andrewv/.cursor/plugins/local/zoto-eval-system/` (README, CHANGELOG, LICENSE, rule, all skills/commands/agents sampled, hook strings, stamped `templates/package-scripts/base.json`).
- Cross-checked prerequisites against `findings-01-inventory.md` (13 commands / 9 skills / 8 agents).
- Incorporated error-message ergonomics framing from `findings-04-surface-ergonomics.md` (quoted subtask-only; no edits to findings-04).
- Wrote consolidated deliverable: `findings-08/findings-08-documentation-dx.md`.

### Blockers Encountered

- None blocking static review.

### Files Modified

- `specs/20260523-eval-plugin-review/findings-08/findings-08-documentation-dx.md` (created)
- `specs/20260523-eval-plugin-review/subtask-08-eval-plugin-review-documentation-dx-20260523.md` (checklists / execution notes)

### Adversarial Verification (Subtask 08 — 20260523)

- Verifier: `zoto-spec-judge` (independent context).
- File existence: subtask file, `findings-08/findings-08-documentation-dx.md`, and onboarding walk-through (§9) all present.
- **D1 (changelog vs `plugin.json` 0.3.1)** — confirmed: `plugin.json` declares `"version": "0.3.1"`, `CHANGELOG.md` jumps `[Unreleased]` → `[0.1.0]` → `[0.2.0]` with **no `0.3.x` section**.
- **D2 (`config.json` vs `config.yml` drift)** — confirmed: 16 file matches across `<plugin>/`, including the three skills cited (`zoto-help-evals/SKILL.md`, `zoto-configure-evals/SKILL.md`, `zoto-execute-evals/SKILL.md`) plus the README at lines 54 and 286.
- **D3 (Install/Quick-start contradiction)** — confirmed: README "Lifecycle → Install" (lines 121–122) claims no host-repo writes until `/z-eval-configure`, but Quick start (lines 35, 50) and `commands/z-eval-init.md` clearly require `/z-eval-init` to write `.zoto/eval-system/config.yml` first.
- **README line-7 footnote** — confirmed accurate: repo-wide grep for `eval:live` / `_live` under `<plugin>/` returns **only** line 7 of the README. Zero other occurrences.
- **Onboarding citations** — confirmed: 6/6 lifecycle steps in §9 carry at least one `start:end:filepath` citation.
- **Ledger completeness** — confirmed: all 10 findings (D1–D10) have Sev, Confidence, Effort populated.
- **Scope discipline** — confirmed: only mutations from this subtask are under `specs/20260523-eval-plugin-review/`. Other dirty paths in `git status` (`.crux/`, `.cursor/agents/crux-*`, `.cursor/commands/crux-*`, `AGENTS.md`, `CRUX.md`, `.cursor/agents/zoto-eval-architect.md`, `.cursor/agents/zoto-eval-engineer.md`, `.zoto/eval-system/config.yml`) pre-date this subtask.
- Verdict: **Verified**.
