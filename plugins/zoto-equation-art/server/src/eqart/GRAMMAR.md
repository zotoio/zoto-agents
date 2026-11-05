# eqart-ir/2 grammar

A program is a JSON object. Expressions are JSON S-expressions: `["op", arg, ...]`.
Numbers are constants; strings are names. Nothing is ever `eval`ed.

```
{
  "ir": "eqart-ir/2",
  "canvas":  {"width": W, "height": H, "scale"?: S, "cx"?: 0, "cy"?: 0},
  "params"?: {"name": {"value": number|nested list} | {"shape": [..], "init": {"kind": "zeros|normal|uniform", "seed": 0, ...}},
              ... optional "fit": bool, "quant": 1..32 (bits; default 8 for tensors, 32 for scalars)},
  "opdefs"?: {"name": {"args": ["a", "b"], "body": EXPR, "origin"?: "human|llm|evolved"}},
  "fields"?: {"F": {"channels": k, "res"?: [w, h], "boundary"?: "wrap|clamp|zero|mirror", "init"?: EXPR}},
  "schedule"?: [ PASS | LOOP ],
  "output": EXPR,          // 1 or 3 channels, 0..1, clamped
  "meta"?: {...}            // ignored by hashing and bit accounting
}
PASS = {"id"?: str, "writes": {"F": EXPR, ...}, "repeat"?: n}
LOOP = {"loop": n, "schedule": [PASS | LOOP]}
```

## Coordinates and names
- Default: short canvas axis spans −1..1, y points up, origin at centre. `scale` = pixels per unit (default min(W,H)/2); `cx`, `cy` shift the view.
- Built-in names: `x y` (continuous coords of the current grid), `px py` (integer pixel index), `t` (global step counter), `W H` (current grid size), `pi e`.
- `$name` reads a param. 0-D params are scalars; 1-D params are channel vectors; 2-D params are only for `matvec` / `conv`.
- Inside an opdef body only its args, built-ins and params are visible.

## Values
Every value is per-pixel with a channel axis. Scalars have 1 channel and broadcast against k-channel vectors.

## Core ops
| Family | Ops |
|---|---|
| Arithmetic | `add mul min max` (variadic), `sub div pow mod`, `neg abs sign floor fract sqrt exp log` |
| Trig | `sin cos tan atan atan2 tanh` |
| Smooth / logic | `softmask(z,k)` = e^(−e^(k·z)) ≈ 1 where z<0, 0 where z>0; `smoothstep(e0,e1,x)`, `clamp(x,lo,hi)`, `mix(a,b,t)`, `lt gt le ge eq` (→ 0/1), `select(c,a,b)`, `sawtooth(t)` = t − π·round(t/π) |
| Vectors | `vec(e...)` / `concat`, `comp(v,i)`, `dot(a,b)`, `len(v)`, `sum_c(v)`, `matvec("$W", v, bias?)` |
| Fields | `tap("F", dx, dy)` neighbour (literal offsets, dy up), `lap("F")` 5-point Laplacian, `conv("F","$K")` 2-D kernel, `sample("F", X, Y)` bilinear at continuous coords (any resolution), `reduce("mean|sum|min|max", EXPR)` |
| Binding | `["let", {"a": EXPR, "b": EXPR}, BODY]` (sequential) |
| Index loops | `["sum_i", "s", lo, hi, BODY]`, `["prod_i", "u", lo, hi, BODY]` (literal bounds, inclusive) |
| Per-pixel loop | `["iterate", N, {"z": INIT}, {"z": UPDATE}, RESULT, ESCAPE?]`; updates are simultaneous; `_n` = iterations run; pixels freeze once ESCAPE > 0.5 |
| Noise | `hash(a, b, ..., seed)` → U[0,1), deterministic (floors its args) |
| Opdef call | `["name", args...]` or `["call", "name", args...]` |

## Pass semantics
- A pass evaluates every `writes` expression against the state *before* the pass (Jacobi), then commits.
- All fields written by one pass must share a resolution; that resolution is the pass grid.
- `t` increments after every pass execution (each `repeat`, each loop iteration).
- Non-finite values abort the render with the pass id and step.

## Limits (defaults)
50k structure nodes · 64M param floats · depth 256 · iterate ≤ 10k · cost estimate ≤ 5e11 · ≤ 4096² pixels.

## Idioms
- Soft shape: `["softmask", SDF, 200]`. Painter's layering: `Σ_i c_i·M_i·Π_{j>i}(1−M_j) + bg·Π_j(1−M_j)`.
- Explicit diffusion: `u + D·lap(u)` is stable only for D ≤ 0.25.
- Pseudo-random per-instance variation without tables: `cos(3 s²)`, `hash(s, seed)`.
- Residual layering: output = base + residual, each its own sub-expression or field.
