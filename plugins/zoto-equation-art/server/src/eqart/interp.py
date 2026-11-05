"""NumPy reference interpreter for eqart-ir/2.

Values are float arrays shaped (h, w, k) or Python floats. Scalars per pixel
use k == 1 so they broadcast against k-channel vectors.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any, Callable

import numpy as np

BUILTINS = {"x", "y", "px", "py", "t", "W", "H", "pi", "e"}

# Special forms receive raw (unevaluated) arguments.
SPECIAL = {"let", "iterate", "sum_i", "prod_i", "tap", "lap", "conv", "sample",
           "reduce", "matvec", "call"}


class EqartError(Exception):
    """Raised for invalid programs or runtime failures."""


@dataclass
class Grid:
    w: int
    h: int
    canvas_w: int
    canvas_h: int
    scale: float
    cx: float
    cy: float
    dtype: Any

    def __post_init__(self):
        s = self.scale * self.w / self.canvas_w
        i = np.arange(self.w, dtype=self.dtype)
        j = np.arange(self.h, dtype=self.dtype)
        xs = (i + 0.5 - self.w / 2) / s + self.cx
        ys = (self.h / 2 - j - 0.5) / s + self.cy
        self.x = np.broadcast_to(xs[None, :, None], (self.h, self.w, 1))
        self.y = np.broadcast_to(ys[:, None, None], (self.h, self.w, 1))
        self.px = np.broadcast_to(i[None, :, None], (self.h, self.w, 1))
        self.py = np.broadcast_to(j[:, None, None], (self.h, self.w, 1))
        self.s = s


@dataclass
class Ctx:
    grid: Grid
    fields: dict
    field_specs: dict
    params: dict
    opdefs: dict
    t: int = 0
    canvas: dict = field(default_factory=dict)


# ---------------------------------------------------------------- helpers

def _arr(v, ctx: Ctx):
    if isinstance(v, np.ndarray):
        if v.ndim == 3:
            return v
        if v.ndim == 0:
            return np.full((ctx.grid.h, ctx.grid.w, 1), float(v), dtype=ctx.grid.dtype)
        raise EqartError(f"unexpected array rank {v.ndim}")
    return np.full((ctx.grid.h, ctx.grid.w, 1), float(v), dtype=ctx.grid.dtype)


def _const(v) -> float:
    if isinstance(v, np.ndarray):
        if v.size == 1:
            return float(v.reshape(-1)[0])
        flat = v.reshape(-1, v.shape[-1]) if v.ndim == 3 else v.reshape(-1)
        if np.all(flat == flat[0]):
            return float(np.asarray(flat[0]).reshape(-1)[0])
        raise EqartError("expected a constant, got a varying value")
    return float(v)


def _param_value(name: str, ctx: Ctx):
    if name not in ctx.params:
        raise EqartError(f"unknown param ${name}")
    p = ctx.params[name]
    if p.ndim == 0:
        return float(p)
    if p.ndim == 1:  # channel vector
        return p.reshape(1, 1, -1).astype(ctx.grid.dtype)
    return p  # tensors only valid in matvec/conv/indexing


def _boundary_index(idx: np.ndarray, n: int, mode: str):
    if mode == "wrap":
        return np.mod(idx, n), None
    if mode == "clamp":
        return np.clip(idx, 0, n - 1), None
    if mode == "mirror":
        period = 2 * n
        m = np.mod(idx, period)
        return np.where(m >= n, period - 1 - m, m), None
    if mode == "zero":
        valid = (idx >= 0) & (idx < n)
        return np.clip(idx, 0, n - 1), valid
    raise EqartError(f"unknown boundary {mode}")


def _field(name: str, ctx: Ctx) -> np.ndarray:
    if name not in ctx.fields:
        raise EqartError(f"unknown field {name}")
    return ctx.fields[name]


def _tap(name: str, dx: int, dy: int, ctx: Ctx) -> np.ndarray:
    f = _field(name, ctx)
    fh, fw, _ = f.shape
    if (fh, fw) != (ctx.grid.h, ctx.grid.w):
        raise EqartError(f"tap on field {name} ({fw}x{fh}) from a {ctx.grid.w}x{ctx.grid.h} grid; use sample")
    mode = ctx.field_specs[name].get("boundary", "clamp")
    if mode == "wrap":
        return np.roll(f, shift=(dy, -dx), axis=(0, 1))  # dy up => earlier row
    rows, rv = _boundary_index(np.arange(fh) - dy, fh, mode)
    cols, cv = _boundary_index(np.arange(fw) + dx, fw, mode)
    out = f[rows][:, cols]
    if rv is not None:
        out = out * rv[:, None, None] * cv[None, :, None]
    return out


def _sample(name: str, X, Y, ctx: Ctx) -> np.ndarray:
    f = _field(name, ctx)
    fh, fw, k = f.shape
    c = ctx.canvas
    s = c["scale"] * fw / c["width"]
    X = _arr(X, ctx)[..., 0]
    Y = _arr(Y, ctx)[..., 0]
    u = (X - c["cx"]) * s + fw / 2 - 0.5
    v = fh / 2 - 0.5 - (Y - c["cy"]) * s
    u0 = np.floor(u).astype(np.int64)
    v0 = np.floor(v).astype(np.int64)
    fu = (u - u0)[..., None]
    fv = (v - v0)[..., None]
    mode = ctx.field_specs[name].get("boundary", "clamp")
    out = 0.0
    for dv, wv in ((0, 1 - fv), (1, fv)):
        for du, wu in ((0, 1 - fu), (1, fu)):
            rr, rvld = _boundary_index(v0 + dv, fh, mode)
            cc, cvld = _boundary_index(u0 + du, fw, mode)
            val = f[rr, cc]
            if rvld is not None:
                val = val * (rvld & cvld)[..., None]
            out = out + val * wv * wu
    return out.astype(ctx.grid.dtype)


def _splitmix(z: np.ndarray) -> np.ndarray:
    z = (z + np.uint64(0x9E3779B97F4A7C15))
    z = (z ^ (z >> np.uint64(30))) * np.uint64(0xBF58476D1CE4E5B9)
    z = (z ^ (z >> np.uint64(27))) * np.uint64(0x94D049BB133111EB)
    return z ^ (z >> np.uint64(31))


def _hash(args, ctx: Ctx):
    arrs = [_arr(a, ctx) for a in args]
    arrs = np.broadcast_arrays(*arrs)
    with np.errstate(over="ignore"):
        acc = np.zeros(arrs[0].shape, dtype=np.uint64)
        for a in arrs:
            ia = np.floor(a).astype(np.int64).view(np.uint64)
            acc = _splitmix(acc ^ ia)
    return ((acc >> np.uint64(11)).astype(np.float64) / float(1 << 53)).astype(ctx.grid.dtype)


def _vec(vals, ctx: Ctx):
    return np.concatenate([_arr(v, ctx) for v in vals], axis=-1)


def _chan(v, i: int):
    if not isinstance(v, np.ndarray) or v.ndim != 3:
        if i == 0:
            return v
        raise EqartError("comp index out of range for scalar")
    if i < 0 or i >= v.shape[-1]:
        raise EqartError(f"comp index {i} out of range for {v.shape[-1]} channels")
    return v[..., i:i + 1]


def _cmp(fn):
    return lambda a, b: np.asarray(fn(a, b), dtype=np.float64) * 1.0


def _fold(fn):
    def f(*xs):
        out = xs[0]
        for x in xs[1:]:
            out = fn(out, x)
        return out
    return f


EPS = 1e-30


def _div(a, b):
    b = np.asarray(b, dtype=np.float64) if not isinstance(b, np.ndarray) else b
    safe = np.where(b == 0, 1e-12, b)
    return np.divide(a, safe)


def _pow(a, b):
    bb = np.asarray(b)
    if bb.size and np.all(bb == np.round(bb)):
        return np.power(a, b)
    return np.power(np.maximum(np.abs(a), EPS), b)

OPS: dict[str, Callable] = {
    "add": _fold(np.add),
    "mul": _fold(np.multiply),
    "sub": lambda a, b: np.subtract(a, b),
    "div": _div,
    "neg": np.negative,
    "pow": _pow,
    "mod": np.mod,
    "min": _fold(np.minimum),
    "max": _fold(np.maximum),
    "abs": np.abs,
    "sign": np.sign,
    "floor": np.floor,
    "fract": lambda a: a - np.floor(a),
    "sqrt": lambda a: np.sqrt(np.maximum(a, 0.0)),
    "exp": lambda a: np.exp(np.clip(a, -700, 700)),
    "log": lambda a: np.log(np.maximum(a, EPS)),
    "sin": np.sin, "cos": np.cos, "tan": np.tan, "atan": np.arctan,
    "atan2": np.arctan2, "tanh": np.tanh,
    "softmask": lambda z, k: np.exp(-np.exp(np.clip(np.multiply(k, z), -60, 60))),
    "smoothstep": lambda e0, e1, xx: (lambda tt: tt * tt * (3 - 2 * tt))(np.clip((np.subtract(xx, e0)) / np.where(np.subtract(e1, e0) == 0, 1e-12, np.subtract(e1, e0)), 0, 1)),
    "clamp": lambda a, lo, hi: np.clip(a, lo, hi),
    "lt": _cmp(np.less), "gt": _cmp(np.greater), "le": _cmp(np.less_equal),
    "ge": _cmp(np.greater_equal), "eq": _cmp(np.equal),
    "select": lambda c, a, b: np.where(np.asarray(c) > 0.5, a, b),
    "sawtooth": lambda tt: tt - math.pi * np.round(np.divide(tt, math.pi)),
    "mix": lambda a, b, tt: np.add(a, np.multiply(np.subtract(b, a), tt)),
}
# ops needing ctx
CTX_OPS = {"vec", "concat", "comp", "dot", "len", "sum_c", "hash"}

ARITY = {  # (min, max) ; None = variadic
    "add": (2, None), "mul": (2, None), "min": (2, None), "max": (2, None),
    "sub": (2, 2), "div": (2, 2), "pow": (2, 2), "mod": (2, 2), "atan2": (2, 2),
    "lt": (2, 2), "gt": (2, 2), "le": (2, 2), "ge": (2, 2), "eq": (2, 2),
    "softmask": (2, 2), "smoothstep": (3, 3), "clamp": (3, 3), "select": (3, 3),
    "mix": (3, 3), "vec": (1, None), "concat": (1, None), "comp": (2, 2),
    "dot": (2, 2), "len": (1, 1), "sum_c": (1, 1), "hash": (1, None),
    "tap": (1, 3), "lap": (1, 1), "conv": (2, 2), "sample": (3, 3),
    "reduce": (2, 2), "matvec": (2, 3), "let": (2, 2), "iterate": (4, 5),
    "sum_i": (4, 4), "prod_i": (4, 4),
}
for _u in ("neg", "abs", "sign", "floor", "fract", "sqrt", "exp", "log", "sin",
           "cos", "tan", "atan", "tanh", "sawtooth"):
    ARITY[_u] = (1, 1)

ALL_OPS = set(OPS) | CTX_OPS | SPECIAL


# ---------------------------------------------------------------- evaluator

def evaluate(node, ctx: Ctx, env: dict, depth: int = 0):
    if depth > 512:
        raise EqartError("expression nesting too deep")
    if isinstance(node, bool):
        return 1.0 if node else 0.0
    if isinstance(node, (int, float)):
        return float(node)
    if isinstance(node, str):
        return _lookup(node, ctx, env)
    if not isinstance(node, list) or not node:
        raise EqartError(f"invalid expression node: {node!r}")
    head, args = node[0], node[1:]
    if not isinstance(head, str):
        raise EqartError(f"operator must be a string, got {head!r}")
    if head in SPECIAL:
        return _special(head, args, ctx, env, depth)
    if head in OPS or head in CTX_OPS:
        vals = [evaluate(a, ctx, env, depth + 1) for a in args]
        return _apply(head, vals, ctx)
    if head in ctx.opdefs:
        return _call_opdef(head, args, ctx, env, depth)
    raise EqartError(f"unknown operator {head!r}")


def _lookup(name: str, ctx: Ctx, env: dict):
    if name in env:
        return env[name]
    if name.startswith("$"):
        return _param_value(name[1:], ctx)
    g = ctx.grid
    if name == "x":
        return g.x
    if name == "y":
        return g.y
    if name == "px":
        return g.px
    if name == "py":
        return g.py
    if name == "t":
        return float(ctx.t)
    if name == "W":
        return float(g.w)
    if name == "H":
        return float(g.h)
    if name == "pi":
        return math.pi
    if name == "e":
        return math.e
    raise EqartError(f"unknown name {name!r}")


def _apply(head: str, vals: list, ctx: Ctx):
    if head in ("vec", "concat"):
        return _vec(vals, ctx)
    if head == "comp":
        return _chan(vals[0], int(_const(vals[1])))
    if head == "dot":
        return np.sum(np.multiply(vals[0], vals[1]), axis=-1, keepdims=True)
    if head == "len":
        v = vals[0]
        return np.sqrt(np.sum(np.multiply(v, v), axis=-1, keepdims=True)) if isinstance(v, np.ndarray) else abs(v)
    if head == "sum_c":
        v = vals[0]
        return np.sum(v, axis=-1, keepdims=True) if isinstance(v, np.ndarray) else v
    if head == "hash":
        return _hash(vals, ctx)
    with np.errstate(all="ignore"):
        return OPS[head](*vals)


def _call_opdef(name, args, ctx, env, depth):
    od = ctx.opdefs[name]
    names = od.get("args", [])
    if len(names) != len(args):
        raise EqartError(f"opdef {name} expects {len(names)} args, got {len(args)}")
    vals = {n: evaluate(a, ctx, env, depth + 1) for n, a in zip(names, args)}
    return evaluate(od["body"], ctx, vals, depth + 1)


def _special(head, args, ctx: Ctx, env, depth):
    ev = lambda n, e=env: evaluate(n, ctx, e, depth + 1)  # noqa: E731
    if head == "call":
        if not args or not isinstance(args[0], str) or args[0] not in ctx.opdefs:
            raise EqartError("call needs a known opdef name")
        return _call_opdef(args[0], args[1:], ctx, env, depth)
    if head == "let":
        binds, body = args
        if not isinstance(binds, dict):
            raise EqartError("let bindings must be an object")
        e = dict(env)
        for k, v in binds.items():
            e[k] = evaluate(v, ctx, e, depth + 1)
        return ev(body, e)
    if head == "tap":
        dx = int(_const(ev(args[1]))) if len(args) > 1 else 0
        dy = int(_const(ev(args[2]))) if len(args) > 2 else 0
        return _tap(args[0], dx, dy, ctx)
    if head == "lap":
        n = args[0]
        c = _tap(n, 0, 0, ctx)
        return _tap(n, 1, 0, ctx) + _tap(n, -1, 0, ctx) + _tap(n, 0, 1, ctx) + _tap(n, 0, -1, ctx) - 4 * c
    if head == "conv":
        name, kp = args
        if not (isinstance(kp, str) and kp.startswith("$")):
            raise EqartError("conv kernel must be a $param")
        K = ctx.params[kp[1:]]
        if K.ndim != 2:
            raise EqartError("conv kernel must be 2D")
        kh, kw = K.shape
        out = 0.0
        for r in range(kh):
            for cc in range(kw):
                if K[r, cc] != 0:
                    out = out + K[r, cc] * _tap(name, cc - kw // 2, kh // 2 - r, ctx)
        return out
    if head == "sample":
        return _sample(args[0], ev(args[1]), ev(args[2]), ctx)
    if head == "reduce":
        op = args[0]
        v = _arr(ev(args[1]), ctx)
        fn = {"mean": np.mean, "sum": np.sum, "min": np.min, "max": np.max}.get(op)
        if fn is None:
            raise EqartError(f"unknown reduce op {op}")
        return fn(v, axis=(0, 1), keepdims=True)
    if head == "matvec":
        wp = args[0]
        if not (isinstance(wp, str) and wp.startswith("$")):
            raise EqartError("matvec weight must be a $param")
        Wm = ctx.params[wp[1:]]
        v = _arr(ev(args[1]), ctx)
        if Wm.ndim != 2 or Wm.shape[1] != v.shape[-1]:
            raise EqartError(f"matvec shape mismatch: W{Wm.shape} vs {v.shape[-1]} channels")
        out = v @ Wm.T.astype(v.dtype)
        if len(args) > 2:
            out = out + ev(args[2])
        return out
    if head in ("sum_i", "prod_i"):
        iv, lo, hi, body = args
        lo, hi = int(_const(ev(lo))), int(_const(ev(hi)))
        acc = 0.0 if head == "sum_i" else 1.0
        for i in range(lo, hi + 1):
            e = dict(env)
            e[iv] = float(i)
            val = evaluate(body, ctx, e, depth + 1)
            acc = acc + val if head == "sum_i" else acc * val
        return acc
    if head == "iterate":
        return _iterate(args, ctx, env, depth)
    raise EqartError(f"unhandled special form {head}")


def _iterate(args, ctx: Ctx, env, depth):
    n = int(_const(evaluate(args[0], ctx, env, depth + 1)))
    init, update, result = args[1], args[2], args[3]
    escape = args[4] if len(args) > 4 else None
    if not isinstance(init, dict) or not isinstance(update, dict):
        raise EqartError("iterate init/update must be objects")
    state = {}
    e = dict(env)
    for k, v in init.items():
        state[k] = _arr(evaluate(v, ctx, e, depth + 1), ctx).copy()
        e[k] = state[k]
    shape = (ctx.grid.h, ctx.grid.w, 1)
    active = np.ones(shape, dtype=bool)
    count = np.zeros(shape, dtype=ctx.grid.dtype)
    for _ in range(n):
        e = dict(env)
        e.update(state)
        e["_n"] = count
        new = {k: _arr(evaluate(v, ctx, e, depth + 1), ctx) for k, v in update.items()}
        for k, v in new.items():
            state[k] = np.where(active, v, state[k])
        count = count + active
        if escape is not None:
            e2 = dict(env)
            e2.update(state)
            e2["_n"] = count
            esc = np.asarray(_arr(evaluate(escape, ctx, e2, depth + 1), ctx)) > 0.5
            active &= ~esc
            if not active.any():
                break
    e = dict(env)
    e.update(state)
    e["_n"] = count
    return evaluate(result, ctx, e, depth + 1)


# ---------------------------------------------------------------- program runner

def load_params(ir: dict, dtype) -> dict:
    out = {}
    for name, spec in (ir.get("params") or {}).items():
        if "value" in spec:
            arr = np.asarray(spec["value"], dtype=np.float64)
        else:
            init = spec.get("init", {"kind": "zeros"})
            shape = tuple(spec.get("shape", []))
            rng = np.random.default_rng(int(init.get("seed", 0)))
            kind = init.get("kind", "zeros")
            if kind == "zeros":
                arr = np.zeros(shape)
            elif kind == "normal":
                arr = rng.normal(float(init.get("mean", 0.0)), float(init.get("std", 1.0)), shape)
            elif kind == "uniform":
                arr = rng.uniform(float(init.get("low", -1.0)), float(init.get("high", 1.0)), shape)
            else:
                raise EqartError(f"unknown init kind {kind} for ${name}")
        if "shape" in spec and tuple(arr.shape) != tuple(spec["shape"]):
            raise EqartError(f"param ${name} shape {arr.shape} != declared {spec['shape']}")
        out[name] = arr.astype(dtype)
    return out


def canvas_info(ir: dict, width=None, height=None) -> dict:
    c = ir["canvas"]
    W0, H0 = int(c["width"]), int(c["height"])
    W = int(width or W0)
    H = int(height or (H0 * W // W0 if width else H0))
    base_scale = float(c.get("scale", min(W0, H0) / 2))
    return {"width": W, "height": H, "scale": base_scale * W / W0,
            "cx": float(c.get("cx", 0.0)), "cy": float(c.get("cy", 0.0)),
            "res_factor": W / W0}


def run_program(ir: dict, width=None, height=None, precision="f32",
                snapshot_every: int = 0, on_snapshot=None, max_steps=None):
    """Execute schedule, return (rgb uint8 HxWx3, info)."""
    dtype = np.float64 if precision == "f64" else np.float32
    canvas = canvas_info(ir, width, height)
    W, H = canvas["width"], canvas["height"]
    params = load_params(ir, dtype)
    specs = ir.get("fields") or {}
    opdefs = ir.get("opdefs") or {}

    def grid_for(res):
        gw, gh = (W, H) if res is None else (max(1, int(round(res[0] * canvas["res_factor"]))),
                                            max(1, int(round(res[1] * canvas["res_factor"]))))
        return Grid(gw, gh, W, H, canvas["scale"], canvas["cx"], canvas["cy"], dtype)

    fields: dict = {}
    ctx = Ctx(grid=grid_for(None), fields=fields, field_specs=specs, params=params,
              opdefs=opdefs, t=0, canvas=canvas)
    for name, spec in specs.items():
        g = grid_for(spec.get("res"))
        k = int(spec.get("channels", 1))
        ctx.grid = g
        if "init" in spec:
            val = _arr(evaluate(spec["init"], ctx, {}), ctx)
            val = np.broadcast_to(val, (g.h, g.w, k)).astype(dtype).copy() if val.shape[-1] in (1, k) else None
            if val is None:
                raise EqartError(f"field {name} init channel mismatch")
        else:
            val = np.zeros((g.h, g.w, k), dtype=dtype)
        fields[name] = val

    steps = {"n": 0}
    out_expr = ir["output"]

    def render_output():
        ctx.grid = grid_for(None)
        v = _arr(evaluate(out_expr, ctx, {}), ctx)
        if v.shape[-1] == 1:
            v = np.repeat(v, 3, axis=-1)
        if v.shape[-1] != 3:
            raise EqartError(f"output must have 1 or 3 channels, got {v.shape[-1]}")
        bad = ~np.isfinite(v)
        nonfinite = float(bad.mean())
        v = np.where(bad, 0, v)
        return (np.clip(v, 0, 1) * 255 + 0.5).astype(np.uint8), nonfinite

    def run_pass(p):
        writes = p.get("writes") or {}
        names = list(writes)
        if not names:
            raise EqartError(f"pass {p.get('id', '?')} writes nothing")
        res = {tuple(fields[n].shape[:2]) for n in names}
        if len(res) != 1:
            raise EqartError(f"pass {p.get('id', '?')} writes fields of different resolutions")
        ctx.grid = grid_for(specs[names[0]].get("res"))
        for _ in range(int(p.get("repeat", 1))):
            new = {}
            for n in names:
                k = fields[n].shape[-1]
                v = _arr(evaluate(writes[n], ctx, {}), ctx)
                if v.shape[-1] not in (1, k):
                    raise EqartError(f"pass {p.get('id', '?')}: {v.shape[-1]} channels written to {n} ({k})")
                v = np.broadcast_to(v, fields[n].shape).astype(dtype)
                if not np.isfinite(v).all():
                    raise EqartError(f"non-finite values in field {n} at pass {p.get('id', '?')}, step {ctx.t}")
                new[n] = v
            fields.update(new)
            ctx.t += 1
            steps["n"] += 1
            if max_steps and steps["n"] > max_steps:
                raise EqartError(f"step budget {max_steps} exceeded")
            if snapshot_every and on_snapshot and steps["n"] % snapshot_every == 0:
                img, _ = render_output()
                on_snapshot(steps["n"], img)
                ctx.grid = grid_for(specs[names[0]].get("res"))

    def run_schedule(items):
        for it in items:
            if "loop" in it:
                for _ in range(int(it["loop"])):
                    run_schedule(it.get("schedule") or [])
            else:
                run_pass(it)

    run_schedule(ir.get("schedule") or [])
    img, nonfinite = render_output()
    return img, {"steps": steps["n"], "nonfinite_fraction": nonfinite,
                 "width": W, "height": H, "precision": precision}
