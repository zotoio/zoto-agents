---
name: eqart-fractal-svg
description: Render fractals as compact generative SVGs (plus flattened SVG, PNG and an eqart-ir/2 program) from 18 presets across four families — IFS (Barnsley fern, Sierpinski, dragon, Lévy C, Pythagoras tree), L-systems (Koch, Hilbert, arrowhead, plants), spirals (golden, nautilus) and escape-time sets (Mandelbrot, Julia) — and fit fractal equations back from SVGs or raster images. Use when the user asks for a fractal, a self-similar SVG, "SVG from equations", or to turn a fractal-looking image or SVG into equations. Requires the eqart MCP server.
license: MIT
metadata:
  plugin: zoto-equation-art
  status: available (v0.2.0)
---

# eqart-fractal-svg — text ⇄ fractal SVG ⇄ equations

## 0. Preconditions
- Check the `eqart_fractal_render` tool exists. If not, the eqart MCP server isn't running: it needs `uv` on PATH. CLI fallback: `uv run --project <plugin>/server --extra svg eqart fractal <preset> --out-dir .eqart/fractal/<slug>`.
- `eqart_setup` reports whether the optional `svg` extra (resvg-py, no system libraries) is installed. It is needed for `cross_check` and for fitting foreign SVGs. Offer the install command; run it only after the user agrees.

## 1. Text → SVG
1. Call `eqart_fractal_presets` and pick the closest preset. Families: `ifs`, `lsystem`, `spiral`, `escape`.
2. Call `eqart_fractal_render` with `{"preset": "<name>", "size": 512}` and overrides as needed (`color`, `background`, `depth` for L-systems, `levels` for spirals, `maps` for custom IFS, `c`/`center`/`half_width` for Julia/Mandelbrot). Use `out_dir` = `<workspace>/.eqart/fractal/<slug>`.
3. Pass `cross_check: true` when the `svg` extra is installed: the generative SVG is re-rendered with resvg and compared (SSIM) to the plugin's own raster.
4. **Open `png_path` and look at it** before describing it.
5. Report the files and byte sizes: generative SVG (typically 1–9 KB) vs flattened SVG (tens of KB to MB) vs PNG, plus `instances` and `depth`.

Facts to keep straight when explaining results:
- Automatic depth is capped at 60,000 instances (resvg rejects much larger SVGs). IFS maps descend levels in proportion to how much they shrink (scale-balanced), so the fern needs ~57k instances instead of 4²².
- Spirals use binary doubling, so the SVG grows with log(depth).
- Escape-time sets (Mandelbrot, Julia) have **no generative SVG**: SVG can't iterate. They come out as contour SVGs; their compact form is the spec or the eqart-ir program.
- IFS/spiral programs are per-pixel inverse-IFS approximations of the limit set. Plants, Hilbert and the snowflake have no per-pixel program yet; their compact form is the spec embedded in the SVG.

## 2. SVG / image → equations
1. Call `eqart_fractal_fit` with the file path, `family` (`auto` by default; `ifs`, `lsystem` or `escape`) and a `budget_s` (default 30).
2. SVGs this plugin wrote round-trip exactly from the embedded spec (`exact: true`). Other SVGs are rasterized with resvg, then fitted like images.
3. Report `best.family`, `best.overlap` (tolerant IoU, 1 px slack), `time_s` and the re-rendered `render.png_path`; open that PNG and compare it with the input before claiming success.
4. Known limits to state when relevant: fits can overrun the time budget by ~15–40 %; the L-system fit only knows the bundled templates; Mandelbrot location search is not implemented (only Julia sets are fitted; Mandelbrot is compared against the default view only).

## 3. Further steps
- To view a fitted or preset program in 3D, run `eqart_export` on its `program.json` with `targets: ["webgpu"]` and give the user the `viewer.html` path.
- For a refinement loop on a render, use `eqart_judge` (see the `eqart-compose` skill).

## Output to the user
List the SVG / flat SVG / PNG / program paths with byte sizes, the instance count, and the resvg SSIM when checked. For fits, give the family, overlap and time, plus the caveats above when they apply.
