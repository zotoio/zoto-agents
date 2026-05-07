# Subtask: Eval-System SVG Diagrams & Cursor IDE Mockups

## Metadata
- **Subtask ID**: 04
- **Feature**: site-evals-matrix-revamp
- **Assigned Subagent**: crux-software-engineer
- **Dependencies**: 01
- **Created**: 20260506

## Objective

Author the SVG diagrams and Cursor IDE mockups that the new `site/eval-system/` documentation subtree (subtask 05) will reference. Match the existing `site/images/diagrams/` and `site/images/mockups/` style conventions established by the prior github-pages-site spec, but re-tinted to the Matrix palette so they sit comfortably on top of the rain canvas.

## Deliverables Checklist

- [ ] **`site/images/diagrams/eval-lifecycle.svg`** — six-step horizontal flow: `init → configure → create → execute → judge → compare`. Each step is a labelled node; `update` sits below the spine pointing into `create` / `execute` to show it runs as a continuous sync loop. Annotate the static-vs-LLM split (one icon for pytest, one for `@cursor/sdk`).
- [ ] **`site/images/diagrams/eval-run-report.svg`** — three-panel illustration: a single timestamped run directory `evals/_runs/<ts>/` on the left, three output files (`static.yml`, `llm.yml`, `report.yml`) in the centre, and the `report.yml` aggregate fanning out into the `/canvas` hand-off on the right.
- [ ] **`site/images/diagrams/eval-update-contract.svg`** — visual of the `_meta.generated === true` contract: two columns (generated cases vs user-authored cases) with arrows from the updater hitting only the generated column; the user-authored column is marked "preserved verbatim".
- [ ] **`site/images/diagrams/eval-askquestion-flow.svg`** — sequence-style diagram showing `command (askQuestion) ↔ user`, `command → Task subagent (with pre-collected answers)`, and `subagent → needs_user_input → command (askQuestion) → resume`. Highlight that agents and skills never call `askQuestion` directly.
- [ ] **`site/images/mockups/eval-create.svg`** — Cursor IDE mockup of `/zoto-eval-create` running: chat panel showing the create skill output, sidebar listing `evals/`, `evals/_llm/`, `.zoto/eval-system/manifest.yml`.
- [ ] **`site/images/mockups/eval-canvas-compare.svg`** — Cursor IDE mockup of `/zoto-eval-compare run-A run-B` rendering a `/canvas` chart of `runs × cases × tokens`.
- [ ] **`site/images/mockups/eval-judge-output.svg`** — Cursor IDE mockup of `/zoto-eval-judge` rendering `judge:` annotations appended to `llm.yml`.
- [ ] **`site/images/mockups/eval-advise-flow.svg`** — Cursor IDE mockup of `/zoto-eval-advise` showing the dimension severity scoreboard + the recommendation hand-off.
- [ ] **All assets are valid SVG** (`xmllint --noout site/images/diagrams/*.svg site/images/mockups/*.svg` passes).
- [ ] **All assets use the Matrix palette** (`--matrix-bg`, `--matrix-text`, `--matrix-accent`) inlined as hex values; no Charcoal-era blue (`#8ec0d6`) appears.

## Definition of Done

- [ ] Eight new SVG files exist with stable, content-descriptive filenames.
- [ ] All SVGs validate as well-formed XML.
- [ ] All SVGs use the Matrix palette consistently with existing `site/images/diagrams/*.svg` style (size, stroke weights, label fonts).
- [ ] `<title>` and `<desc>` are populated on each SVG so screen-reader users get a meaningful description (subtask 07 will verify).
- [ ] No file uses an external font; everything is system-stack or `monospace`.

## Implementation Notes

### Canonical Matrix palette mapping (use these hex values across all eight new SVGs)

| Role | Charcoal-era hex (existing SVGs) | Matrix hex (new SVGs) |
|---|---|---|
| Background / panel fill | `#1a1a1a` / `#2a2a2a` | `#000000` / `#0a0f0a` |
| Card surface | `#242424` | `#0f1a0f` |
| Border / stroke | `#3a3a3a` | `#1a3a1a` |
| Body text | `#e0e0e0` | `#c8ffc8` |
| Dim text / labels | `#999999` | `#6a8a6a` |
| Accent / highlight | `#8ec0d6` | `#00ff7f` |
| Accent hover / glow | `#a8d4e6` | `#5cffaf` |

Inline these as literal hex values (SVG `<style>` blocks do not see page CSS variables). Re-using existing accent shapes is fine; only the palette changes.

- Reference the existing `site/images/diagrams/workflow-overview.svg` and `site/images/mockups/create-spec.svg` for the structural baseline (canvas size, header banner, label sizing, stroke weights). The visual idiom must read as the same family.
- Use `viewBox="0 0 1200 700"` (or similar 12:7) for diagrams; mockups can be wider (`1400 × 900`).
- For Cursor mockups, keep the structural fidelity rule from the prior spec: convey panels and structure, not pixel-perfect rendering.
- Add a `<title>` + `<desc>` immediately inside each `<svg>` root so the file is accessible:
  ```svg
  <svg ...><title>Eval lifecycle</title><desc>Six-step flow from init to compare ...</desc>...</svg>
  ```
- Inline a small `<style>` block at the top of each SVG for fills / strokes / fonts; do **not** rely on the page CSS — these need to render standalone in `<img>` tags.
- Eyeball test: open each SVG directly in a browser (`file://`) to confirm it reads without ambient page styling.

## Testing Strategy

**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Run `xmllint --noout` over every produced SVG.
- Open each SVG in a browser standalone to verify legibility.
- Diff visual style against the existing `site/images/diagrams/workflow-overview.svg` for consistency (line weights, font sizes).

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
