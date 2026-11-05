# zoto-equation-art

Images as invented math. Programs are written in `eqart-ir/2`: sandboxed, multi-pass JSON programs built from closed forms, soft masks, SDFs, per-pixel iteration, cellular automata and PDE simulations. Every pixel comes from the program. By default no pretrained model weights appear in programs or in fit losses, so the plugin needs no torch and downloads no models.

The logo was rendered by the plugin itself (`assets/logo.program.json`, a Gray-Scott program of about 1 KB).

## Status: v0.2.0

| Piece | State |
|---|---|
| Agent Plugins 1.0 + Cursor + Claude Code + Codex manifests, `mcp.json` / `.mcp.json` | done |
| `eqart-ir/2` validator: scopes, opdef DAG, limits, cost estimate, CFL warnings | done |
| NumPy interpreter: fields, passes, loops, `tap`/`lap`/`conv`/`sample`/`reduce`, `iterate` + escape, `hash`, opdefs | done |
| Sandboxed render (subprocess, timeout, RLIMIT_AS), cache, snapshots, path confinement | done |
| Metrics (PSNR/SSIM/MS-SSIM/grad-L1), bit accounting, PNG/JPEG/WebP references, `storage` label | done |
| JSON-Patch editing, LaTeX export, persistent operator library | done |
| **Fractal module**: 18 presets → generative SVG, flat SVG, PNG, eqart-ir program; resvg cross-check | done (v0.2.0) |
| **Fractal fitting**: exact SVG round-trip; raster IFS (density collage), Julia, L-system templates | done (v0.2.0) |
| **WebGPU / WebGL2 export**: WGSL + GLSL transpiler, self-contained 2D/3D viewer | done (v0.2.0) |
| **Iteration judge**: Jev (when `TYPESAFE_API_KEY` is set) → metrics → host; opt-in perceptual (`weights`) | done (v0.2.0) |
| Skills: `eqart-compose`, `eqart-sdf`, `eqart-fractal-svg` | done |
| JAX compiler + `eqart_fit` (params, splat, inr) | M3 |
| Multipass (field-program) shader compilation, `eqart-basis` | M4 |
| `eqart-nca`, `eqart-pde`, `eqart-evolve`, `eqart-hybrid`, `eqart-bench` | M5–M7 |

The spec is in [`docs/SPEC.md`](docs/SPEC.md).

## Requirements
- [`uv`](https://docs.astral.sh/uv/) on PATH. The MCP server runs via `uv run --frozen --project <plugin>/server eqart-mcp`, with its venv in the client's plugin data dir.
- Python ≥ 3.11 (uv fetches it if missing).

## Optional extras
Install with `uv sync --project <plugin>/server --extra <name>` (`eqart_setup` prints the command; agents run it only after you confirm):

| Extra | Adds | Needed for |
|---|---|---|
| `svg` | `resvg-py` (no system libraries) | resvg cross-check of generated SVGs, fitting foreign SVGs |
| `gpu-preview` | `wgpu` | native WGSL preview to PNG (`eqart.webgpu.native_preview`) |
| `weights` | `torch`, `lpips` | opt-in perceptual judge (see below) |
| `fit`, `basis`, `evolve` | jax/optax, PyWavelets/scipy, openevolve | later milestones |

## MCP tools
`eqart_validate`, `eqart_render`, `eqart_metrics`, `eqart_patch`, `eqart_export`, `eqart_oplib`, `eqart_examples`, `eqart_grammar`, `eqart_setup`, plus in v0.2.0 `eqart_fractal_presets`, `eqart_fractal_render`, `eqart_fractal_fit` and `eqart_judge`. Resources: `eqart://grammar`, `eqart://ops`, `eqart://examples/{name}`.

Render output must go under `EQART_HOME` (the plugin data dir) or inside a directory named `.eqart`, e.g. `<workspace>/.eqart/runs/<id>`.

## Fractals (text ⇄ SVG ⇄ equations)
Four families with 18 presets: `ifs` (barnsley_fern, sierpinski_triangle, sierpinski_carpet, heighway_dragon, levy_c, pythagoras_tree), `lsystem` (koch_curve, koch_snowflake, hilbert, sierpinski_arrowhead, plant_a, plant_b), `spiral` (golden_spiral, nautilus) and `escape` (mandelbrot, seahorse_valley, julia_rabbit, julia_dendrite). Each preset produces a generative SVG (nested `<use>`; 1–9 KB), a flattened SVG (up to a few MB), a PNG and, where one exists, an eqart-ir/2 program. Escape-time sets come out as contour SVGs: SVG can't iterate.

Every SVG the plugin writes embeds its spec, so it round-trips exactly. Other SVGs are rasterized with resvg and fitted like images. See `docs/SPEC.md` for scale-balanced expansion, binary doubling, the 60k instance cap, the density-based collage fit and the known weak spots.

## WebGPU / WebGL2 3D output
`eqart_export` with `targets: ["webgpu"]` (or `webgl`, `html`, `wgsl`, `glsl`), or on the command line `eqart export prog.json --format webgpu --out-dir .eqart/viewers/x`, writes:
- `viewer.html`: self-contained, no Python needed to view. It tries WebGPU and falls back to WebGL2 (`?api=webgl` / `?api=webgpu` force one). It has a 2D view and a 3D view that raymarches a height field (luminance, or the signed distance when `meta.sdf` is set). Drag to orbit, scroll to zoom.
- `program.wgsl` and `program.frag.glsl`: the transpiled shaders.

Closed-form programs (including per-pixel `iterate`, `sum_i`, opdefs and scalar params) are transpiled. Field programs (Gray-Scott, Life) are rendered once by the sandboxed renderer and shown as a texture. Samples: `examples/viewers/*/viewer.html`.

## Judging improvement iterations (Jev, metrics, host, weights)
`eqart_judge(candidate_png, previous_png?, target_png?, goal?, judge="auto")` recommends **accept / revise / reject**:
1. **Jev**: used when `TYPESAFE_API_KEY` is set. Renders are sent as image assets to TypeSafe System One (`jev-1.14.0`, `TypeSafe-Danger-Zone-Images: true`) with a choice (verdict), a noul (improved?) and a **Box** question that returns the region needing the most work. Override with `TYPESAFE_JEV_MODEL` / `TYPESAFE_BASE_URL`. The key is never logged, returned or written.
2. **Metrics**: when a target image is given, weight-free PSNR / MS-SSIM against it.
3. **Host**: otherwise the host agent opens the PNGs and critiques them, the same as v0.1.0. Nothing extra is required.

**Weights option (opt-in).** The default stays weight-free: rankings use the fidelity gate (PSNR ≥ 35 dB and MS-SSIM ≥ 0.98), then fewest bits, then render speed, then novelty. The `weights` extra plus `judge="perceptual"` (or `EQART_WEIGHTS=1`) adds an LPIPS distance as a critique / tie-break signal for improvement iterations and image fitting. It never replaces the fidelity gate, it is never needed for validate/render/examples/tests, and backbone weights are fetched only on first explicit use, never at install time. The tradeoff: LPIPS tracks perceived similarity better on textures, but it brings torch (~1 GB+) and model downloads, and it can reward plausible-looking texture over faithful structure.

## CLI fallback (clients without MCP)
```
uv run --project plugins/zoto-equation-art/server eqart validate prog.json
uv run --project plugins/zoto-equation-art/server eqart render prog.json --out-dir .eqart/runs/a
uv run --project plugins/zoto-equation-art/server eqart metrics .eqart/runs/a/render.png --target ref.png --ir prog.json
uv run --project plugins/zoto-equation-art/server eqart export prog.json --format webgpu --out-dir .eqart/viewers/a
uv run --project plugins/zoto-equation-art/server --extra svg eqart fractal barnsley_fern --cross-check --out-dir .eqart/fractal/fern
uv run --project plugins/zoto-equation-art/server --extra svg eqart fit target.png --family auto --budget 30
uv run --project plugins/zoto-equation-art/server eqart judge new.png --previous old.png --goal "autumn grove"
```

## Development
```
cd plugins/zoto-equation-art
pnpm test                 # uv run pytest (fast suite)
EQART_SLOW=1 pnpm test    # also runs the long raster-fit tests
```
