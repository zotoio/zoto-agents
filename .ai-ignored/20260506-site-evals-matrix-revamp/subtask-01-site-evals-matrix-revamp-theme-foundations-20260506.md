# Subtask: Theme Foundations (Matrix tokens, falling-glyphs canvas, PrismJS overrides, logo retreatment)

## Metadata
- **Subtask ID**: 01
- **Feature**: site-evals-matrix-revamp
- **Assigned Subagent**: crux-software-engineer
- **Dependencies**: None
- **Created**: 20260506

## Objective

Lay the visual foundation that every other subtask depends on: introduce a Matrix-themed CSS token set, ship a guarded `<canvas>` falling-glyphs background module, layer a Matrix-flavoured PrismJS override on top of the existing Tomorrow Night theme, and retint the existing pixel-block logo. After this subtask, both `site/index.html` and the existing `site/spec-system/*.html` pages should already render with the new palette (with no functional change to their IA), even before subtasks 02 and 03 rewrite their content / mark-up.

## Deliverables Checklist

- [ ] **`site/css/style.css`** — add a `--matrix-*` custom-property block at the top of the `:root` rule (`--matrix-bg: #000`, `--matrix-surface: #0a0f0a`, `--matrix-card: #0f1a0f`, `--matrix-border: #1a3a1a`, `--matrix-text: #c8ffc8`, `--matrix-text-dim: #6a8a6a`, `--matrix-accent: #00ff7f`, `--matrix-accent-hover: #5cffaf`, `--matrix-grid: #1a3a1a`). The existing `--color-*` semantic tokens (`--color-bg-primary`, `--color-text-primary`, `--color-bg-secondary`, etc.) are reassigned to the Matrix palette so every consumer of the semantic tokens picks up the new look without a rename. **Do not** add a `--charcoal-*` alias block in `site/css/style.css` — the only `--charcoal-*` consumers in the repo are inline in `site/index.html` (under `body.landing-charcoal`), and subtask 02 owns that migration directly.
- [ ] **`site/css/style.css`** — update base `body` rules so the Matrix palette is the default; verify the existing `--color-bg-primary`, `--color-text-primary`, etc. still resolve to readable values (≥7:1 contrast for body copy on background).
- [ ] **`site/css/style.css`** — add `.matrix-rain-strong` and `.matrix-rain-soft` body modifiers (canvas opacity 1.0 vs 0.10 respectively) and a `.matrix-rain-canvas` selector for the `<canvas>` element (`position: fixed; inset: 0; z-index: -1; pointer-events: none`).
- [ ] **`site/css/prism-matrix.css`** — new file. Override the Tomorrow-Night Prism palette to Matrix-flavoured greens (keywords / strings / functions in cool greens, comments dimmed at `#4a6a4a`). Loads *after* the CDN Prism stylesheet on every page.
- [ ] **`site/js/matrix-rain.js`** — new file. A self-contained IIFE that:
  - bails out early when `window.matchMedia('(prefers-reduced-motion: reduce)').matches`;
  - bails out when `document.querySelector('canvas.matrix-rain-canvas')` is absent;
  - sizes the canvas to `window.innerWidth × window.innerHeight` (and re-sizes on `resize`);
  - draws falling katakana / digit glyphs at ~30 fps via `requestAnimationFrame` + a `lastFrameTs` throttle;
  - pauses the loop when `document.visibilityState === 'hidden'` (re-starts on `visibilitychange`);
  - on mobile (`window.innerWidth ≤ 768` or `window.devicePixelRatio < 2`) reduces column density and skips DPR upscaling.
- [ ] **`site/index.html`** *(structural only — copy stays for now, subtask 02 rewrites it)* — add `<canvas class="matrix-rain-canvas"></canvas>` as the first child of `<body>`, add `class="matrix-rain-strong"` to the `<body>`, and `<script defer src="js/matrix-rain.js"></script>` + `<link rel="stylesheet" href="css/prism-matrix.css">` to `<head>`.
- [ ] **`site/spec-system/{index,quickstart,configuration,design}.html`** *(structural only — full restyle is subtask 03)* — same canvas element + `class="matrix-rain-soft"` on body + the two new `<script>` / `<link>` references (with `../` prefixes).
- [ ] **`site/404.html`** — same wiring as `site/index.html` (`matrix-rain-strong`).
- [ ] **`site/images/logo.svg`** — recolour fills to the Matrix palette and add a `<filter id="crt-glow">` (subtle inner shadow + scanline). Preserve viewBox and pixel-block geometry.
- [ ] **`site/images/logo.png`** — re-export at the existing dimensions from the updated SVG (use ImageMagick / Inkscape locally; the artefact is committed).
- [ ] **Favicon** in `site/index.html` and every existing page — replace the inline data-URI SVG with a Matrix-themed equivalent (or point to the retinted SVG via `<link rel="icon" href="images/logo.svg">`).

## Definition of Done

- [ ] `--matrix-*` properties resolve to Matrix-palette values; the existing `--color-*` semantic tokens render against the Matrix palette without a rename.
- [ ] No `--charcoal-*` alias block is introduced in `site/css/style.css` (the only `--charcoal-*` consumers in the repo are inline overrides in `site/index.html`, owned by subtask 02).
- [ ] `js/matrix-rain.js` does not throw under `prefers-reduced-motion: reduce`; loop pauses when the tab is hidden.
- [ ] PrismJS code blocks remain readable (passes a manual contrast spot-check on bash + json + ts samples).
- [ ] Logo SVG / PNG render with the new palette in any browser; geometry unchanged.
- [ ] No linter errors in any modified file.
- [ ] No content / IA change to the landing page or spec-system docs subtree (those are subtasks 02 and 03).

## Implementation Notes

- The canvas should sit behind everything else with `z-index: -1`; existing `.top-nav` / `.page-layout` / `.sidebar` keep their solid `--matrix-surface` backgrounds so text never sits directly on the rain unless explicitly opted-in.
- Use `ctx.fillStyle = 'rgba(0, 0, 0, 0.10)'` for the trailing fade (or whatever black-with-alpha value reads best under the Matrix palette); avoid full clear-each-frame so the trail effect is preserved.
- Throttle to 30 fps (`if (now - lastFrameTs < 33) return`) to keep CPU low on mobile.
- For glyphs, use a UTF-8 string of half-width katakana plus ASCII digits, e.g. `'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉ0123456789Z'.split('')`. The katakana range (U+FF6A–U+FF9D) is intentional — write `site/js/matrix-rain.js` as UTF-8 (no BOM) so the literal ships untouched. **Do not** call this "ASCII-safe"; it is UTF-8 with explicit Unicode literals.
- The `prefers-reduced-motion` guard must be checked once at startup and again when the matchMedia query fires `change` events.
- Favicon: prefer `<link rel="icon" type="image/svg+xml" href="images/logo.svg">` over the inline data-URI to share assets with the hero logo.
- Keep PrismJS CDN load order intact in every page: `prism-tomorrow.min.css` first, then `prism-matrix.css` second.
- Do **not** change the IA of any page in this subtask. Hero copy / section copy / nav structure are out of scope here.

## Testing Strategy

**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Open `site/index.html` and `site/spec-system/index.html` in a browser; verify the canvas renders behind content and pages remain navigable.
- DevTools → Rendering → Emulate CSS media `prefers-reduced-motion: reduce`; confirm canvas is empty (no animation).
- DevTools → Performance → record 5 s on the landing page; verify FPS stays ≥30 and CPU usage stays modest on a throttled mobile profile.
- Backgrounding the tab (`document.hidden = true`) should pause the loop — observable via a `console.debug` in the rAF callback during dev (remove before commit).

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
