# Changelog

## 0.2.0

- Fractal module (`eqart.fractal`): four families (IFS, L-systems, spirals, escape-time) with 18 presets. Each preset produces a generative SVG, a flattened SVG, a PNG and an eqart-ir/2 program where one exists. Scale-balanced IFS expansion, binary doubling for spirals, a 60k instance cap, stroke widths in local units (no `vector-effect`), and contour SVGs for Mandelbrot/Julia.
- Fractal fitting (`eqart.fractal_fit`): exact round-trip of plugin-written SVGs through embedded specs, resvg rasterization of foreign SVGs, a density-based collage IFS fit, Julia `c` search and L-system template matching.
- MCP tools `eqart_fractal_presets`, `eqart_fractal_render`, `eqart_fractal_fit`; CLI `eqart fractal|presets|fit`.
- WebGPU / WebGL2 export (`eqart.webgpu`): an IR→WGSL/GLSL transpiler and a self-contained `viewer.html` with a 2D view and a 3D height-field raymarch. Field programs use a texture fallback. `eqart_export` targets `webgpu|webgl|html|wgsl|glsl`; CLI `eqart export --format`. Optional native WGSL preview with the `gpu-preview` extra.
- `eqart_judge` / `eqart judge`: improvement-iteration decisions. Uses Jev (TypeSafe System One with image assets + Box) when `TYPESAFE_API_KEY` is set, then weight-free metrics, then the host agent. Opt-in perceptual judge through the new `weights` extra.
- New optional extras: `svg` (resvg-py) and `weights` (torch + lpips, opt-in only).
- New skill `eqart-fractal-svg` with `/z-eqart-fractal-svg`. `eqart-compose` now judges iterations with `eqart_judge`, and `eqart-sdf` documents 3D export.
- Plugin metadata, evals and commands brought in line with the zoto-agents validator; MIT `LICENSE` added; registered in the Cursor, Claude Code and Codex marketplaces.

## 0.1.0

- Scaffold + IR v2 core (milestones M0 + M1): validator, NumPy interpreter, sandboxed cached renderer, metrics and bit accounting, JSON Patch, LaTeX export, operator library, MCP server, `eqart-compose` and `eqart-sdf` skills, 5 bundled examples, 32 tests.
