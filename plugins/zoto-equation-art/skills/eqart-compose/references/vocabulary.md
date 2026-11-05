# Vocabulary of invented-math idioms

## Soft indicator (Yeganeh)
`["softmask", Z, k]` = e^(−e^(k·Z)): ≈1 where Z<0, ≈0 where Z>0. Pair with a signed distance: `["softmask", ["sub", ["len", ["vec", "x", "y"]], 0.5], 200]` is a disc.

## Layering
Back-to-front painter's algorithm, closed form:
`out = bg·Π_j(1−M_j) + Σ_i c_i·M_i·Π_{j>i}(1−M_j)`
With `prod_i` / `sum_i`, nearer layers get larger indices.

## Instances without tables
Per-instance variation from the index: positions `1.6·cos(3 s²)`, scale `1.18^s` (perspective), hue `0.8 + 0.15 cos(s)`, random `hash(s, 17)`.

## Texture
fBm opdef: `Σ_s 0.6^s cos(1.9^s (cos(2s²)x + sin(2s²)y) + 3s)`. Domain warp: evaluate a shape at `x + 0.05·fbm(...)`.

## Periodic folding
`["sawtooth", T]` repeats space with period π. `["mod", x, p]` repeats it with period p.

## Simulations (fields + schedule)
- Gray-Scott: `u += 0.2∇²u − uv² + f(1−u)`, `v += 0.1∇²v + uv² − (f+k)v`. Coral f≈0.0545, k≈0.062; spots f≈0.035, k≈0.065; labyrinth f≈0.029, k≈0.057.
- Life-like CA: neighbour sum via 8 `tap`s and rules with `eq`.
- Diffusion/blur: repeated `u + 0.2·lap(u)`, with coefficients ≤ 0.25.
- Advection: `sample("F", x − vx·dt, y − vy·dt)` (semi-Lagrangian).

## Fractals
`iterate` with escape. `_n / N` gives smooth-ish colouring; add `log(log(|z|))` terms for continuous bands.

## Multi-resolution
Declare low-res fields (`"res": [64, 64]`) for big soft structure and `sample` them on the full canvas. This is cheap global composition.

Bundled worked examples are available via `eqart_examples`: `yeganeh_grove`, `gray_scott`, `life`, `mandelbrot`, `sdf_badge`.
