---
name: eqart-sdf
description: Build crisp graphics — logos, icons, badges, geometric scenes, UI shapes — as signed-distance-field programs in eqart-ir/2. Primitives and boolean/smooth-min operators are composed as opdefs and soft-masked into coloured layers, optimised for exact edges and real-time WebGPU/WebGL2 shader export with a 3D viewer. Use when the user asks for vector-like or geometric imagery made from math, or an SDF / Shadertoy-style scene. Requires the eqart MCP server.
license: MIT
metadata:
  plugin: zoto-equation-art
  status: available (v0.2.0); WebGPU/WebGL2 viewer export; parameter fitting M3
---

# eqart-sdf — signed distance field scenes

## Preconditions
Same as `eqart-compose`: check the `eqart_validate` tool exists, read `eqart_grammar` once, and look at the `sdf_badge` example (`eqart_examples` with name `sdf_badge`).

## Library
Copy the opdefs you need from `references/sdf-opdefs.json`, or import saved ones with `eqart_oplib` (`action: import`). Distances are in canvas units: the short axis spans −1…1.

## Workflow
1. Sketch the scene as a CSG tree: primitives, then transforms (translate = substitute `x − a`; rotate = substitute rotated coordinates in a `let`), then combinators (`min` union, `max` intersection, `max(a, −b)` subtraction, `smin` blend).
2. Colour each region with `["softmask", d, k]`. Choose k ≈ 0.5 × render width (in pixels), so edges anti-alias over about one pixel. Layer the regions with occlusion products.
3. Outlines: `abs(d) − w`. Rings and shells: onion `abs(d) − w` repeated. Rounded corners: `d − r`.
4. Run validate, then render, view the PNG, and patch, as in `eqart-compose` steps 2–3 (critique rubric included).
5. Deliver: final PNG, LaTeX export and byte size. When the user wants a shader or a 3D view, run `eqart_export` with `targets: ["webgpu"]` (see below).

## Notes
- `smin` gives a non-exact distance near blends. Lower k there or expect slightly softer edges.
- Pixel-crisp output needs the canvas resolution set to the delivery size. Closed-form SDF programs re-render at any resolution without changing (no simulation state).

## Real-time / 3D export
`eqart_export` with `targets: ["webgpu"]` (or `webgl`, `html`) transpiles the program to WGSL and GLSL ES 3.00 and writes a self-contained `viewer.html`. It tries WebGPU first and falls back to WebGL2 (force one with `?api=webgl` or `?api=webgpu`). The 2D view shows the render. The 3D view raymarches a height field: luminance by default, or the program's signed distance when `meta.sdf` holds an SDF expression (for example `["sd_circle", "x", "y", 0.5]`). Report the `viewer.html` path and tell the user to open it in Chrome. With the `gpu-preview` extra, `eqart.webgpu.native_preview` renders the WGSL natively to a PNG for a check.
