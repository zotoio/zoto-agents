---
name: eqart-compose
description: Turn a text prompt into an image rendered entirely from an invented math program (eqart-ir/2) — closed forms, soft masks, layered occlusion, per-pixel iteration, cellular automata, reaction-diffusion and other multi-pass simulations — then refine it through a render-and-critique loop. Use when the user wants a picture, texture, pattern or scene generated "from equations", "as math", "procedurally", or in the style of Hamid Naderi Yeganeh. Requires the eqart MCP server.
license: MIT
metadata:
  plugin: zoto-equation-art
  status: available (v0.2.0)
---

# eqart-compose — prompt → program → image

You author an `eqart-ir/2` program whose render matches the prompt. Readability does not matter; fidelity to the prompt does. You may invent any operators you need as `opdefs`. No pretrained models may appear in the program.

## 0. Preconditions
- Check the `eqart_validate` tool exists. If it doesn't, tell the user the eqart MCP server isn't running and that it needs `uv` on PATH (https://docs.astral.sh/uv/). Then offer the CLI fallback: `uv run --project <plugin>/server eqart render <file.json> --out-dir .eqart/runs/<id>`.
- Read the grammar once per session: `eqart_grammar` (or resource `eqart://grammar`).
- Skim `references/vocabulary.md` for idioms. Call `eqart_oplib` with `action: list` to see invented operators from earlier runs, and `eqart_examples` for working programs.

## 1. Plan (briefly, in chat)
Decompose the prompt into layers, back to front, and pick a mechanism for each:

| Need | Mechanism |
|---|---|
| Crisp shapes, logos | SDF opdefs + `softmask(d, k)` |
| Many similar objects | `sum_i` / `prod_i` with closed-form jitter (`cos(3 s²)`, `hash(s, seed)`) |
| Depth ordering | occlusion products `Π (1 − M_j)` |
| Organic texture | fBm opdef (`sum_i` of rotated cosines), domain warping |
| Spots, stripes, coral, labyrinths | reaction-diffusion field (Gray-Scott) |
| Growth, crystals, cells | cellular automata over fields, `hash` initial conditions |
| Fractals | `iterate` with `escape` |
| Smooth gradients, sky, light | closed-form functions of `x, y` |

Choose the canvas aspect ratio from the prompt; default to 512×512 or 640×384. Keep the first draft cheap (≤ 256 px on the long side for stateful programs).

## 2. Draft → validate → render
1. Write the program. Put reusable pieces in `opdefs`.
2. Call `eqart_validate`. Fix every error, and act on CFL warnings (diffusion coefficient ≤ 0.25 per explicit step).
3. Call `eqart_render` with `out_dir` = `<workspace>/.eqart/runs/<slug>-<n>`. For simulations, pass `snapshot_every` so you can see the dynamics.
4. **Open `png_path` and look at it.** Never judge a render you haven't viewed.

## 3. Critique loop (up to 6 rounds)
Score the render against the prompt using `references/critique-rubric.md`. Record the scores as JSON in `<out_dir>/critique.json`.

Then edit with `eqart_patch` (RFC 6902) rather than rewriting the program. Targeted patches keep history diffable and save tokens:
- Wrong placement or size: patch the constants in the relevant opdef or let binding.
- Missing element: `add` a new opdef plus a new layer term.
- Muddy edges: raise the `softmask` sharpness. Speckle: lower it, or blur via `sample` from a low-res field.
- Simulation exploded (non-finite error): reduce the step coefficients, or clamp the state each step.

### Deciding whether an iteration improved: `eqart_judge`
After each re-render, call `eqart_judge` with `candidate_png` (new render), `previous_png` (best render so far), `target_png` when there is a reference image, and `goal` (the user's prompt). `judge: "auto"` picks:
1. **Jev** when `TYPESAFE_API_KEY` is set in the server's environment. The candidate, previous and target renders go to Jev (TypeSafe System One, `jev-1.14.0`, image assets with the `TypeSafe-Danger-Zone-Images` header) as an `accept` / `revise` / `reject` choice, an `improved` yes/no, and a **Box** question marking the region that most needs work (`focus_box`, fractions of width/height). Aim your next `eqart_patch` at the layer that draws inside `focus_box`.
2. **Weight-free metrics** when a target image is given: PSNR / MS-SSIM against the target (the spec's fidelity gate is PSNR ≥ 35 dB and MS-SSIM ≥ 0.98).
3. **You (the host)** otherwise: the tool returns `judge: "host"`. Open both PNGs and decide with the rubric, as before. Nothing is required to be installed and nothing crashes without a key.

`judge: "perceptual"` (LPIPS) only works when the optional `weights` extra is installed and the user asked for it, or `EQART_WEIGHTS=1` is set. Never install it unprompted.

Rules: never print, echo or store the API key. A judge only recommends. Keep `reject`ed rounds out of the best-so-far, but you still choose and apply every edit, and the user owns any destructive change (overwriting their files, saving operators).

Stop when every rubric dimension is ≥ 7 (or the judge accepts and the fidelity gate is met for image targets), or after 6 rounds. Report the best round, not necessarily the last.

## 4. Deliver
- Render the final program at the target resolution. A stateful program keeps its canvas size, because its dynamics are in pixel units.
- `eqart_export` with `targets: ["latex", "json-min"]`. Add `"webgpu"` when the user wants an interactive or 3D view: it writes `viewer.html` (WebGPU first, WebGL2 fallback, 2D + 3D height-field raymarch) plus `program.wgsl` and `program.frag.glsl`.
- `eqart_metrics` with `ir` gives the program's size in bytes. Mention it next to the PNG size of the render; a 2 KB program that draws a 200 KB image is the point.
- If you invented an operator that would plausibly help other prompts, offer to save it with `eqart_oplib` (`action: add`). Only save it if the user agrees.

## Output to the user
Show the final PNG path(s) and the critique summary (scores per round). Include the program size against the PNG size, and the run directory. Keep the IR itself in files, not in chat, unless asked.
