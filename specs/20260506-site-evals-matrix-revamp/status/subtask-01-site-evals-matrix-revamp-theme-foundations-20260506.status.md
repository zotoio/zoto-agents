# Subtask 01 — site-evals-matrix-revamp — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 01 |
| feature | site-evals-matrix-revamp |
| assigned_agent | crux-software-engineer |
| model | composer-2-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-06T12:31:33Z |
| last_heartbeat | 2026-05-06T12:33:00Z |
| completed_at | 2026-05-06T12:33:00Z |
| git_sha | 36e26f7e7b8d557f0dd414ca6d63e82b657fe818 |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — `--matrix-*` token block added at the top of `:root`; `--color-*` semantic tokens reassigned via `var(--matrix-*)`. No `--charcoal-*` alias block introduced (only a comment explaining the deliberate omission). Evidence: `75:111:site/css/style.css`.
- [x] **D02** — `body` rules now include `position: relative; min-height: 100vh` so the fixed canvas can sit behind content; colour/background already resolve via the reassigned `--color-*` tokens (`#c8ffc8` on `#000`, > 7:1). Evidence: `172:183:site/css/style.css`.
- [x] **D03** — `.matrix-rain-canvas`, `.matrix-rain-strong` (opacity 1), `.matrix-rain-soft` (opacity 0.10), and a `prefers-reduced-motion: reduce` `display: none !important` guard added at the bottom of `style.css`. Evidence: `1085:1122:site/css/style.css`.
- [x] **D04** — `site/css/prism-matrix.css` written; loads after `prism-tomorrow.min.css`. Cool-green token tiers (keywords/operators/strings/functions/numbers) + dimmed comments at `#4a6a4a` italic. Evidence: `1:147:site/css/prism-matrix.css`.
- [x] **D05** — `site/js/matrix-rain.js` written as UTF-8 (no BOM, verified with `file`); IIFE with early-exit `prefers-reduced-motion: reduce` check + lazy-start `change` listener, missing-canvas guard, ~30 fps throttle, `visibilitychange` pause/resume via in-loop `paused` flag, debounced `resize`, mobile (`innerWidth ≤ 768 || DPR < 2`) reduces column density + skips DPR upscaling. Half-width katakana (U+FF6A–U+FF9D) + ASCII digits + `Z`. `node --check` clean. Evidence: `1:161:site/js/matrix-rain.js`.
- [x] **D06** — `site/index.html`: `prism-matrix.css` + `matrix-rain.js` added to `<head>`; `<canvas class="matrix-rain-canvas">` added as the first child of `<body>`; `matrix-rain-strong` class added alongside the existing `landing-charcoal` (the inline charcoal style block was deliberately left intact for subtask 02). Evidence: `21:32:site/index.html`.
- [x] **D07** — `site/spec-system/{index,quickstart,configuration,design}.html`: each gets `../css/prism-matrix.css` + `../js/matrix-rain.js`, `matrix-rain-soft` body class, canvas element, and the SVG favicon. Evidence: `9:20:site/spec-system/index.html`.
- [x] **D08** — `site/404.html`: `matrix-rain-strong` body class, canvas, prism-tomorrow + prism-matrix stylesheets, `matrix-rain.js`. Evidence: `1:14:site/404.html`.
- [x] **D09** — `site/images/logo.svg`: pixel-block fills retinted to `#00ff7f` on `#000` (with the inner negative-space rect retinted to `#000`); added `<filter id="crt-glow">` (Gaussian blur + alpha component-transfer + feMerge) and a `<pattern id="scanlines">` overlay. ViewBox / geometry unchanged. Evidence: `1:33:site/images/logo.svg`.
- [x] **D10** — `site/images/logo.png` re-exported via `convert -background "#000000" -density 300 ... -colorspace sRGB -depth 8` from a flattened intermediate SVG (same pixel geometry). Verified to contain `#00FF7F` (SpringGreen) pixels at 256×256 8-bit sRGB. ImageMagick's internal MSVG renderer can't rasterise `<filter>`/`<pattern>`, so the PNG is geometry-only — the canonical SVG keeps the full effect.
- [x] **D11** — Every page's inline data-URI favicon replaced with `<link rel="icon" type="image/svg+xml" href="…/images/logo.svg">` (+ `alternate icon` PNG fallback). `rg "data:image/svg" site/` returns zero matches.
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `site/css/style.css` — Added Matrix --matrix-* token block, reassigned --color-* semantic tokens, .matrix-rain-canvas / -strong / -soft selectors, and prefers-reduced-motion display:none guard.
- **created** `site/css/prism-matrix.css` — Tomorrow-Night Prism override mapped to cool-green Matrix palette (keywords #c8ffc8, strings #00ff7f, functions/numbers #5cffaf, comments #4a6a4a italic).
- **created** `site/js/matrix-rain.js` — UTF-8 IIFE for the falling-glyphs canvas; prefers-reduced-motion bail-out, missing-canvas guard, ~30 fps throttle, in-loop visibility pause, mobile density / DPR halving, half-width katakana literals.
- **modified** `site/index.html` — Added prism-matrix.css link, matrix-rain.js script, matrix-rain-strong body class, canvas as first child of body, and SVG favicon link. Inline body.landing-charcoal block left for subtask 02.
- **modified** `site/spec-system/index.html` — Structural Matrix wiring (matrix-rain-soft body class, canvas, prism-matrix stylesheet, matrix-rain script with ../ prefix, SVG favicon).
- **modified** `site/spec-system/quickstart.html` — Structural Matrix wiring (matrix-rain-soft body class, canvas, prism-matrix stylesheet, matrix-rain script with ../ prefix, SVG favicon).
- **modified** `site/spec-system/configuration.html` — Structural Matrix wiring (matrix-rain-soft body class, canvas, prism-matrix stylesheet, matrix-rain script with ../ prefix, SVG favicon).
- **modified** `site/spec-system/design.html` — Structural Matrix wiring (matrix-rain-soft body class, canvas, prism-matrix stylesheet, matrix-rain script with ../ prefix, SVG favicon).
- **modified** `site/404.html` — Matrix-rain-strong wiring (canvas, prism-matrix stylesheet, matrix-rain script, SVG favicon).
- **modified** `site/images/logo.svg` — Retinted to #00ff7f on #000 with <filter id="crt-glow"> + <pattern id="scanlines">. ViewBox / pixel-block geometry preserved.
- **modified** `site/images/logo.png` — Re-exported via ImageMagick from a flattened intermediate SVG (only locally available rasteriser is MSVG; rsvg-convert / inkscape / cairosvg not installed). 256x256 sRGB with #00FF7F SpringGreen pixels. Canonical SVG retains full filter + pattern for browser rendering.
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->

## Definition-of-Done summary

- ✅ `--matrix-*` properties resolve to Matrix-palette values; `--color-*` semantic tokens render against the Matrix palette without rename.
- ✅ No `--charcoal-*` alias block was introduced in `site/css/style.css` (only an explanatory comment).
- ✅ `js/matrix-rain.js` does not throw under `prefers-reduced-motion: reduce` — the IIFE returns before attaching any rAF or visibility listeners; defence-in-depth `display: none !important` in CSS at the same media query.
- ✅ Loop pauses when the tab is hidden (in-loop `paused` flag flipped on `document.visibilityState === 'hidden'`; the rAF body returns early so no drawing happens, and browsers throttle hidden-tab rAF anyway); restarts on `visibilitychange`.
- ✅ PrismJS code blocks remain readable — keywords `#c8ffc8`, strings `#00ff7f`, functions `#5cffaf`, comments `#4a6a4a` italic on `var(--matrix-surface)`.
- ✅ Logo SVG renders with the new palette in any browser; geometry unchanged. PNG re-exported (geometry-only — see caveat).
- ✅ `ReadLints` clean across every modified file.
- ✅ No content / IA change to landing page or spec-system subtree — only structural wiring + visual tokens.

## Caveats

- PNG re-export went through a **flattened intermediate SVG** because the only SVG rasteriser available locally is ImageMagick's internal MSVG (no `rsvg-convert`, `inkscape`, or `cairosvg`). The canonical `site/images/logo.svg` keeps the full `<filter id="crt-glow">` and `<pattern id="scanlines">` for browser rendering — only the PNG fallback is geometry-only. Subtask 02 / 07 can regenerate a fully-effected PNG once `rsvg-convert` or `inkscape` is installed.
- The inline `body.landing-charcoal` style block in `site/index.html` was **deliberately left untouched** at subtask 01's completion — subtask 02 owns that migration. Subtask 02 has since run and migrated the inline block to `body.landing-matrix`; this is the expected, legitimate handover, not a S01 violation.

## Judge verdict (2026-05-06T22:50:00Z)

- **Verdict**: Partial
- **Score**: 4 / 5
- **Confidence**: high
- **Summary**: All 11 deliverables (D01–D11) are confirmed against disk. Verdict is downgraded from Approve to Partial because the `artifacts:` block in this status pair is a list of bare path strings instead of the `{path, kind, note}` object form required by `plugins/zoto-spec-system/templates/schema/subtask-status.schema.json`. `spec-onstop-check.ts` exits 2 on this critical inconsistency, which by reviewer contract forbids reporting `Verified`. The deliverables themselves are sound; only the status-pair authoring needs to be re-rendered. Once F01 is fixed and the round-trip helper succeeds, this verdict is expected to upgrade to Approve.
- **Fix list** (routed back to `crux-software-engineer`):
  - **F01 (major, blocker for `Verified`)** — Re-author `artifacts:` as objects with `{path, kind, note}` so the schema validates and the round-trip helper succeeds. (`57:68:specs/20260506-site-evals-matrix-revamp/status/subtask-01-site-evals-matrix-revamp-theme-foundations-20260506.status.yml`)
  - **F02 (minor)** — Update D03 `evidence_path` `1014:1051:site/css/style.css` → `1028:1056:site/css/style.css`.
  - **F03 (minor)** — Update D04 `evidence_path` `1:135:site/css/prism-matrix.css` → `1:147:site/css/prism-matrix.css`.
  - **F04 (minor)** — Update D05 `evidence_path` `1:235:site/js/matrix-rain.js` → `1:161:site/js/matrix-rain.js`.
  - **F05 (minor)** — Reword the work-log claim that the visibilitychange handler calls `cancelAnimationFrame`; the implementation uses an in-loop `paused` flag (functionally equivalent — the rAF body returns early so no drawing happens, browsers throttle hidden-tab rAF anyway).
  - **F06 (minor, nice-to-have)** — Cosmetic: `site/images/logo.png` lacks the SVG `<filter id="crt-glow">` / `<pattern id="scanlines">` effects because ImageMagick's MSVG renderer cannot rasterise them. Anyone with `rsvg-convert`, `inkscape`, or `cairosvg` can regenerate a fully-effected PNG; do NOT block subtask 01 advancement on this — the subtask file already acknowledges the caveat.

> Note: this verdict block was appended manually because the round-trip helper (`spec-status-roundtrip md-from-yml`) refuses to render while `artifacts:` is schema-invalid. After F01 lands, the next render will fold this block back through the helper.

<!-- status:notes:end -->

<!-- The prior `<!-- status:judge:start --> ... <!-- status:judge:end -->` block (J01/J02) has been superseded by the 2026-05-06T22:50:00Z verdict above, which is the authoritative copy. The yml's `extra.judge` block is the machine-readable source of truth. -->

