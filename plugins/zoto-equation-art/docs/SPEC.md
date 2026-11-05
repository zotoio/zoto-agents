# zoto-equation-art — Technical Spec v2 (condensed, v0.2.0)

This is the in-repo summary of the "zoto-equation-art — Technical Spec v2" design doc, updated for the v0.2.0 fractal / export / judge round. `server/src/eqart/GRAMMAR.md` is the normative grammar for `eqart-ir/2`.

## 1. Decisions
1. **Objective.** A candidate must first reach fidelity: **PSNR ≥ 35 dB and MS-SSIM ≥ 0.98** against the target. Among candidates that pass, the winner is the one with the **fewest bits**, then the fastest render, then the most novel. Any result whose bit count is at least the target's own PNG size is labelled **`storage`** and left out of rankings, so a raw pixel table can't win.
2. **Stateful programs.** A program is a series of passes over multi-channel fields, with stencils (`tap`, `lap`, `conv`), resampling, global reductions, per-pixel loops (`iterate` with escape, `sum_i`, `prod_i`) and loops of whole passes. Programs are data. They are interpreted and **never executed as Python**. Rendering runs in a subprocess with a time limit, an address-space cap and confined output paths.
3. **No pretrained weights by default.** None in programs and none in fitting losses, so the default plugin needs no torch and downloads no models. For text-to-image, the host agent looking at the render is the default judge. Two optional judges exist (§5), and neither changes the ranking rule in §1.1.

## 2. IR v2
`{"ir": "eqart-ir/2", "meta", "canvas", "params", "opdefs", "fields", "schedule", "output"}`. Expressions are S-expressions in JSON (`["op", ...args]`). Names: `x, y` (world coordinates from `canvas.scale/cx/cy`), `px, py, W, H, t, pi, e`, `$param`. Invented operators are `opdefs` (DAG-checked). Bit accounting quantizes params and zstd-compresses the canonical structure (`eqart_metrics`).

## 3. Fractal module (`eqart.fractal`, `eqart.fractal_fit`)
### 3.1 Families and presets (18)
| Family | Presets | Generative SVG |
|---|---|---|
| `ifs` | barnsley_fern, sierpinski_triangle, sierpinski_carpet, heighway_dragon, levy_c, pythagoras_tree (`tree`: draws every level) | nested `<use>` with affine `matrix()` |
| `lsystem` | koch_curve, koch_snowflake, hilbert, sierpinski_arrowhead, plant_a, plant_b | per-level symbols placed with rigid turtle transforms |
| `spiral` | golden_spiral, nautilus | binary doubling of one similarity map |
| `escape` | mandelbrot, seahorse_valley, julia_rabbit, julia_dendrite | none (contour SVG) |

Each render returns a generative SVG, a flattened SVG (explicit polygons/paths), a PNG (the plugin's own PIL raster from the flat geometry) and an eqart-ir/2 program when one exists.

### 3.2 Generation rules
- **Scale-balanced expansion.** Each IFS map `i` gets an integer cost `c_i ∝ −log r_i`, where `r_i = sqrt|det|`, clipped at 0.03 for singular maps. Symbol `L_b` = ⋃ map_i(`L_{b−c_i}`). A map descends levels in proportion to how much it shrinks, so the fern needs ~57k leaf instances instead of 4²².
- **Binary doubling** for single-map spirals: `B_k = B_{k−1} ∪ T^{2^{k−1}}(B_{k−1})`. The SVG grows with log(depth).
- **Instance cap 60,000.** resvg refuses SVGs past roughly 1M internal nodes (~250k of these instances), so automatic depth or budget stops at 60k leaves.
- **No `vector-effect` strokes.** resvg ignores `non-scaling-stroke`, so stroke widths are computed in local units. L-system nesting uses only rigid transforms, so one width holds at every level.
- **Escape-time sets** (Mandelbrot, Julia) have no generative SVG because SVG can't iterate. They are written as layered crack-edge contour SVGs. Their compact form is the spec or the eqart-ir `iterate` program.
- **Metadata.** Every SVG the module writes embeds its spec in `<metadata id="eqart-fractal">`. Plugin-written SVGs therefore round-trip exactly: the regenerated SVG is byte-identical.

### 3.3 eqart-ir programs for fractals
- Escape: an exact `iterate` + escape program.
- IFS / spiral / Koch / arrowhead: a per-pixel **inverse-IFS escape** approximation. Each step applies the inverse of the first map whose image of the bounding box contains the point, and the point escapes when no map's image contains it. `tree` and spiral variants mark a hit when the point lands in the base cell. The exact form stays in `meta.fractal`.
- Plants, Hilbert, snowflake: no per-pixel program yet (the spec is the compact form).

### 3.4 Inverse direction
- Plugin SVG → spec (exact). Foreign SVG → **resvg-py** raster (optional `svg` extra, no system libraries) → image fit.
- Image fit (`family=auto|ifs|lsystem|escape`): foreground mask from the border colour, cropped to a 64² square.
  - **IFS:** random-restart + annealed perturbation on a **density-based collage loss**. The target is blurred into a density so 1-px structures still overlap; collage = Σ warp_i(D) clipped at 1, with a penalty on overlap. Thin structures failed before this measure: the Sierpinski triangle went from IoU 0.06 to ~0.9. Map count is chosen by overlap − 0.01·n.
  - **Julia:** coarse grid over `c`, then local random search.
  - **L-system:** fixed template library (the presets) × depths × 8 orientations.
- Score: tolerant overlap (IoU with 1-px slack).

Reference results on plugin-rendered targets (tolerant overlap at the 64² working resolution, which is lenient): Sierpinski IFS with 3 maps ≈ 0.99 in 8–13 s, fern (auto) ≈ 0.96 in 40 s, Julia rabbit ≈ 0.96 in < 1 s, dragon (auto) ≈ 0.9, fractal plant (template) ≈ 0.98. Builder-reported numbers on harder targets were lower (Sierpinski 0.89, fern 0.78, rabbit 0.79, dragon 0.67, plant 0.52). The IFS search restarts until the budget is spent and keeps the best attractor.

### 3.5 Known weak spots
- Fits overrun their time budget by about 15–40 % (`budget_overrun` is reported).
- The L-system fit only searches the bundled template library.
- Mandelbrot location search is not implemented. Only Julia sets are fitted; Mandelbrot is compared against the default view only.
- Some contour SVGs drop fine detail (Seahorse Valley has the lowest resvg SSIM).

## 4. Exports
- `latex`, `json-min`, `decoded` (v0.1.0).
- **WebGPU / WebGL2** (v0.2.0): an IR → WGSL / GLSL ES 3.00 transpiler for closed-form programs. It covers arithmetic, comparisons as `step`, `select` as `mix`, `let`, opdefs (inlined), `iterate` (loop + `break`), `sum_i` / `prod_i`, and scalar or ≤4-vector params. Field programs fall back to a texture rendered by the sandbox. `viewer.html` is self-contained: WebGPU first, then WebGL2, with 2D and 3D views. The 3D view raymarches a height field of luminance, inverted for light backgrounds via `meta.height: "invert"`, or of the SDF from `meta.sdf`. A native WGSL preview is available with the `gpu-preview` extra. The transpiled sdf_badge, Mandelbrot and Yeganeh grove match the CPU renderer at PSNR > 47 dB.

## 5. Judges for improvement iterations (`eqart_judge`)
Order for `auto`:
1. **Jev**, when `TYPESAFE_API_KEY` is set: TypeSafe System One `jev-1.14.0` with image assets (`TypeSafe-Danger-Zone-Images: true`). It answers three questions: a choice `accept | revise | reject`, a noul "improved over previous?" and a Box "region that most needs work".
2. **Metrics**, when there is a target: PSNR / MS-SSIM.
3. **Host**: the agent views the PNGs.

`perceptual` (LPIPS) needs the `weights` extra and an explicit request or `EQART_WEIGHTS=1`. Judges only recommend. The host and user own every apply. API keys are never logged or returned.

## 6. Testing and milestones
- `pnpm test` (plugin) runs the fast pytest suite, including the resvg cross-check, export smoke tests and judge fallbacks. `EQART_SLOW=1` adds the long raster fits.
- M0–M1 (v0.1.0) and the fractal / export / judge round (v0.2.0) are done. Next: M2 (cheap scoring, forward prompt suite), M3 (JAX compiler, parameter / splat / neural-field fits), M4 (multipass field-program shaders), M5–M7.

## 7. Risks
NumPy simulation speed (3,000 Gray-Scott steps at 256 px take ~6.4 s; the GPU backend in M3–M4 addresses this); WebGPU availability varies by browser (the viewer falls back to WebGL2); Jev image features are "danger zone" (dreamer-ready) and may change between releases.
