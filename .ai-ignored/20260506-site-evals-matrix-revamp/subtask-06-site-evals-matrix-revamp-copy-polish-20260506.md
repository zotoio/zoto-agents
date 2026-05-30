# Subtask: Cross-Cutting Copy Polish (READMEs, marketplace descriptions, voice alignment)

## Metadata
- **Subtask ID**: 06
- **Feature**: site-evals-matrix-revamp
- **Assigned Subagent**: crux-platform-architect
- **Dependencies**: 02, 05
- **Created**: 20260506

## Objective

After the landing page (subtask 02) and the eval-system docs subtree (subtask 05) have set the new voice on the site, sweep the non-site documents — top-level `README.md`, both plugin READMEs, and the marketplace `description` fields — so the wording, positioning, and "no single-plugin highlight" rule hold consistently across every public surface of the monorepo. The literal word "flagship" today only appears in `site/index.html` (and is removed by subtask 02) — this subtask is **primarily an opening-paragraph voice alignment** across non-site docs, not a banned-word search. Technical content stays accurate; only voice, framing, and a few copy-edit-level lines change.

## Deliverables Checklist

- [ ] **`README.md` (top-level)** — refresh:
  - opening tagline / first paragraph: peer billing for the two plugins.
  - the "Plugins" table: rewrite each `Description` cell with a punchier one-liner that mirrors the new landing-page voice without losing technical precision.
  - any other prose that references the spec-system as the canonical or only plugin.
  - **Do not** change command snippets, file paths, or technical instructions.
- [ ] **`plugins/zoto-spec-system/README.md`** — voice pass:
  - verify (via `git grep -in 'flagship\|primary plugin\|main plugin\|only plugin' plugins/zoto-spec-system/README.md`) that no occurrences exist — current state is already zero, so this is a defensive check, not a search-and-replace.
  - sharpen the opening 1–3 paragraphs and the "When to use this vs Plan mode" intro so they read in the same voice as the landing-page hero copy.
  - keep all technical content (command listings, configuration tables, lifecycle code blocks, status-aggregator prose) verbatim.
- [ ] **`plugins/zoto-eval-system/README.md`** — voice pass:
  - verify (via `git grep -in 'flagship\|primary plugin\|main plugin\|only plugin' plugins/zoto-eval-system/README.md`) that no occurrences exist — current state is already zero, so this is a defensive check, not a search-and-replace.
  - sharpen the opening / overview / "Migration from current state" intros so they match the landing-page voice.
  - tighten "Quick start" lines; verify command names and paths still match `commands/` and `.zoto/eval-system/config.yml`.
  - keep all technical content (schema references, file layouts, judge / adviser / compare sections) verbatim.
- [ ] **`.cursor-plugin/marketplace.json`** — review and (where useful) shorten / sharpen each plugin's `description` so it reads in the same voice as the README opening line. The wire format (`name`, `source`, `description`) does not change.
- [ ] **`AGENTS.md`** — *only* if the file contains user-facing wording that singles out one plugin (e.g. an explanation of the spec-system as the primary deliverable of this monorepo). Do not edit AGENTS.md content that is operational guidance for agents.
- [ ] **CRUX guard** — none of the edits in this subtask touch:
  - any `*.crux.md` / `*.crux.mdc` file
  - any file whose frontmatter contains `generated:` plus `sourceChecksum:` or `sourceUrl:`
  - any file carrying the "Generated file - do not edit!" banner
- [ ] **Word inventory after polish** — `git grep -i 'flagship'` over the modified surfaces (READMEs + marketplace.json + site/) returns no matches. `git grep -i 'primary plugin\|main plugin\|only plugin'` returns no remaining single-plugin highlights.
- [ ] **Update CHANGELOGs** in both plugins with a brief one-line entry (`Doc: voice / positioning pass for the equal-billing site revamp`).

## Definition of Done

- [ ] The four files modified above (top-level README, two plugin READMEs, marketplace.json) read in the same voice as the new landing page.
- [ ] No "flagship" / "primary plugin" / "main plugin" wording remains anywhere in the modified files or in `site/`.
- [ ] All technical content in the modified files (commands, paths, schemas) is verifiably unchanged from before the edit (subtask diff should be voice-and-positioning only, not behaviour).
- [ ] No CRUX-generated file is touched.
- [ ] Plugin CHANGELOGs each have one new line under "Unreleased" (or whatever heading is current) recording the voice pass.

## Implementation Notes

- Voice rules (re-stated for this subtask):
  - second person ("you")
  - short sentences, benefit-led
  - **avoid** hype words: "powerful", "blazing", "industry-leading", "flagship", "next-generation"
  - **avoid** single-plugin-highlight phrases: "primary plugin", "main plugin", "the only plugin", "our flagship"
- The two plugin READMEs are the largest files in scope; do not rewrite top-to-bottom. Aim for a focused diff: the opening 1–3 paragraphs, any section intros that lean on charcoal-era / single-plugin framing, and a final pass to remove banned words. Everything else stays.
- For `marketplace.json`, the existing descriptions are already factual; consider only minor sharpening so they flow with the new voice.
- Coordinate with subtask 02's executor: the landing-page copy is the canonical voice example. Mirror its tone (and only its tone) in the READMEs.
- Keep CHANGELOG entries chronological and follow whatever heading style each plugin already uses.

## Testing Strategy

**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Run a literal grep for banned words across the modified files.
- Diff each modified README and confirm the diff is voice-only (no command, path, or schema change).
- Re-run `node scripts/validate-template.mjs` to make sure marketplace edits still parse cleanly.

## Execution Notes

[To be filled by executing agent]

### Agent Session Info
- Agent: [Not yet assigned]
- Started: [Not yet started]
- Completed: [Not yet completed]

### Work Log
[Agent adds notes here during execution]

### Blockers Encountered
[Any blockers or issues]

### Files Modified
[List of files changed]
