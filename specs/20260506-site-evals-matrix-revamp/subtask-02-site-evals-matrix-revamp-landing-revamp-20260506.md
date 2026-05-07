# Subtask: Landing Page Revamp (peer plugin grid, drop "flagship", refreshed meta + hero copy)

## Metadata
- **Subtask ID**: 02
- **Feature**: site-evals-matrix-revamp
- **Assigned Subagent**: crux-software-engineer
- **Dependencies**: 01
- **Created**: 20260506

## Objective

Rebuild `site/index.html` so it presents `zoto-spec-system` and `zoto-eval-system` as peers — no "flagship" framing, no single-plugin highlight, refreshed meta tags, and punchier hero / section copy that still reads as technically accurate to engineers. Wire the two plugin docs subtrees (the existing `site/spec-system/` and the new `site/eval-system/` that subtask 05 will populate) into the navigation, the plugin grid, and the quick-link cards.

## Deliverables Checklist

- [ ] **Drop "Flagship Plugin"** — the `<h2 class="section-heading">Flagship Plugin</h2>` section (and its single `featured-card`) is removed.
- [ ] **Plugin grid** — new `<section class="landing-section" id="plugins">` containing `.plugin-grid` with two cards (`.plugin-card`) for `zoto-spec-system` and `zoto-eval-system`. The `id="plugins"` is the anchor that the hero CTA targets — it must be present on the section wrapper. Each card has:
  - plugin name as `<h3>`
  - version badge sourced from each plugin's `package.json` / `.cursor-plugin/plugin.json` (hard-coded for now is fine — note the source path in a comment)
  - a one-sentence pitch (engaging, technically accurate, no hype words like "powerful" / "blazing")
  - a primary CTA button into that plugin's docs (`spec-system/index.html` and `eval-system/index.html` respectively)
  - three quick-link chips (Quickstart / Design / Configuration) each linking into the plugin's docs subtree
- [ ] **Hero refresh** — replace tagline `Plan, Judge, Execute — Engineering Specs Powered by AI` with a peer-billing tagline (suggested: `Plan and verify your specs. Generate and update your evals.`); rewrite the hero description to position both plugins (≤2 sentences); rewrite hero CTA labels — primary stays `Get Started` but secondary becomes `View on GitHub` (already accurate). Hero CTA primary should link to a section anchor (e.g. `#plugins`) rather than only the spec-system quickstart.
- [ ] **How It Works** — generalise from spec-system-only to a two-pane layout (or two stacked rows) showing a 3-step flow per plugin. Spec-system row keeps `create → judge → execute`. Eval-system row gets `create → execute → update / judge / advise / compare`. Keep step copy short.
- [ ] **Explore quick links** — replace the 4-card grid (which today only links into spec-system docs) with 6 cards: Spec System Quickstart, Spec System Design, Spec System Configuration, Eval System Quickstart, Eval System Design, GitHub.
- [ ] **Specs ship with your code** — keep the section but rewrite copy so it does not single out the spec-system. Suggested framing: "Commit specs and eval cases alongside your code". CRUX-Memories link stays.
- [ ] **Install** — replace `cursor plugin install zoto-spec-system` with two install lines (one per plugin) and a one-line note that they are independent.
- [ ] **Top-nav dropdown** — add a second dropdown for `Eval System` mirroring the existing Spec System dropdown (Overview / Quickstart / Design / Configuration). Eval-system dropdown links target `eval-system/*.html` (subtask 05 will create those targets).
- [ ] **Footer** — update the `Documentation` link to point at a top-of-page anchor or open the plugin grid; keep GitHub + LICENSE.
- [ ] **Meta tags** — replace `<title>`, `<meta name="description">`, `<meta property="og:*">`, `<meta name="twitter:*">` to cover **both** plugins (suggested title: `Zoto Agents — Spec System & Eval System for Cursor`). Rewrite `og:description` / `twitter:description` to the new positioning.
- [ ] **404 copy** (`site/404.html`) — remove any spec-system-only references in the body copy; rewrite to point users at the landing page's plugin grid.
- [ ] **`site/robots.txt`** — keep the sitemap URL stable; only update if the sitemap structure changes (out of scope here).
- [ ] **Inline `--charcoal-*` migration** — the inline `<style>` block in `site/index.html` defining `body.landing-charcoal { --charcoal-bg: …; --charcoal-surface: …; … }` is the only consumer of `--charcoal-*` in the repo. Migrate it: replace each `--charcoal-*` declaration and every consumer rule (`var(--charcoal-bg)`, `var(--charcoal-surface)`, `var(--charcoal-text)`, `var(--charcoal-accent)`, etc.) with the corresponding `--matrix-*` token (or rewrite the rule to read directly from `--color-*` semantic tokens, which are already pointed at the Matrix palette by subtask 01). The `body class="landing-charcoal"` may stay as a structural hook for inline overrides, or be renamed (e.g. to `landing-matrix`) — whichever yields the smaller diff. After this deliverable, `git grep -i 'charcoal'` over `site/` returns no matches.
- [ ] **No content remains** that calls one plugin "flagship", "primary", or "the main plugin" anywhere in `site/index.html` or `site/404.html`.

## Definition of Done

- [ ] `grep -n -i 'flagship' site/index.html site/404.html` returns no matches.
- [ ] `grep -n -i 'charcoal' site/index.html site/404.html` returns no matches (the inline `--charcoal-*` overrides are migrated to `--matrix-*` / `--color-*`).
- [ ] Page passes manual visual review at `python3 -m http.server` against the Matrix theme from subtask 01.
- [ ] Plugin grid renders both plugins side-by-side at desktop and stacks cleanly on mobile (≤768 px).
- [ ] Top-nav has working dropdowns for both plugins; the eval-system links resolve once subtask 05 ships (broken-link sweep is subtask 07's responsibility — for this subtask, the markup must point at the canonical target paths).
- [ ] All meta tags (`title`, `description`, `og:*`, `twitter:*`) reflect both plugins.
- [ ] No linter errors in modified files.

## Implementation Notes

- Reuse the existing `.featured-card` / `.step-card` / `.link-card` classes — add a `.plugin-card` class only if the existing `.featured-card` does not generalise cleanly. Two `.featured-card` instances side-by-side in a `.grid.grid-2` will likely do the job.
- The existing `body class="landing-charcoal"` is used purely as an inline-CSS hook on `site/index.html`. Migrate the inline overrides to `--matrix-*` (or to `--color-*`, which subtask 01 has already pointed at the Matrix palette) and either rename the class to something palette-neutral (e.g. `landing-matrix`) or drop the inline override block entirely if all rules now resolve from the cascade. Whichever option keeps the diff smaller is correct.
- Voice guide: short sentences, second person ("you"), benefit-led, no hype adjectives. Avoid words: "powerful", "blazing", "industry-leading", "flagship", "next-generation".
- Suggested plugin pitches:
  - Spec System: "Decompose complex initiatives into reviewable specs, judge them independently, then execute with adversarial verification."
  - Eval System: "Stamp static and LLM eval suites side by side, keep them in sync as code drifts, and compare runs across models on a single canvas."
- For the two-pane "How It Works", add a `.flow-row` class (flex row of step cards prefixed by a small plugin icon) so each plugin's flow reads independently.
- Sitemap regeneration is out of scope. The robots.txt stays put.

## Testing Strategy

**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Local preview via `python3 -m http.server 8080` from `site/`; verify all anchors resolve.
- Visual diff against the previous landing page using two browser tabs.
- DevTools → Lighthouse → Best Practices spot-run on the landing page (subtask 07 handles the formal pass).

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
