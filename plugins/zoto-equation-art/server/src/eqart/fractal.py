"""Fractal families -> generative SVG, flattened SVG, PNG and an eqart-ir/2 program.

Families: ifs (affine maps, optional "tree" mode drawing every level), lsystem (bracketed
turtle L-systems), spiral (one similarity map, all levels, binary doubling) and escape
(Mandelbrot / Julia escape-time sets; contour SVG only).

Design decisions (see docs/SPEC.md, "Fractal module"):
* scale-balanced expansion: each IFS map descends levels in proportion to -log(contraction);
* binary doubling for single-map spirals (SVG grows with log(depth));
* automatic depth is capped at MAX_INSTANCES leaf instances (resvg refuses ~1M nodes);
* no vector-effect strokes: stroke widths are computed in local units;
* every SVG this module writes embeds its spec in <metadata id="eqart-fractal"> so it
  round-trips exactly (fractal_fit.parse_svg_spec).
"""
from __future__ import annotations

import copy
import html
import io
import json
import math
from functools import lru_cache

import numpy as np
from PIL import Image, ImageDraw

from .interp import EqartError

MAX_INSTANCES = 60_000
FAMILIES = ("ifs", "lsystem", "spiral", "escape")
META_ID = "eqart-fractal"

S3 = math.sqrt(3.0)

PRESETS: dict[str, dict] = {
    # ------------------------------------------------------------- IFS
    "barnsley_fern": {"family": "ifs", "title": "Barnsley fern", "color": "#2f8f3a", "maps": [
        [0, 0, 0, 0.16, 0, 0], [0.85, 0.04, -0.04, 0.85, 0, 1.6],
        [0.2, -0.26, 0.23, 0.22, 0, 1.6], [-0.15, 0.28, 0.26, 0.24, 0, 0.44]]},
    "sierpinski_triangle": {"family": "ifs", "title": "Sierpinski triangle", "color": "#3b4cc0",
        "base": [[0, 0], [1, 0], [0.5, S3 / 2]], "maps": [
        [0.5, 0, 0, 0.5, 0, 0], [0.5, 0, 0, 0.5, 0.5, 0], [0.5, 0, 0, 0.5, 0.25, S3 / 4]]},
    "sierpinski_carpet": {"family": "ifs", "title": "Sierpinski carpet", "color": "#7b3294",
        "base": [[0, 0], [1, 0], [1, 1], [0, 1]], "maps": [
        [1 / 3, 0, 0, 1 / 3, i / 3, j / 3] for j in range(3) for i in range(3) if (i, j) != (1, 1)]},
    "heighway_dragon": {"family": "ifs", "title": "Heighway dragon", "color": "#c0392b", "maps": [
        [0.5, -0.5, 0.5, 0.5, 0, 0], [-0.5, -0.5, 0.5, -0.5, 1, 0]]},
    "levy_c": {"family": "ifs", "title": "Lévy C curve", "color": "#d35400", "maps": [
        [0.5, 0.5, -0.5, 0.5, 0, 0], [0.5, -0.5, 0.5, 0.5, 0.5, -0.5]]},
    "pythagoras_tree": {"family": "ifs", "title": "Pythagoras tree", "color": "#8e5b2a", "tree": True,
        "base": [[0, 0], [1, 0], [1, 1], [0, 1]], "maps": [
        [0.5, -0.5, 0.5, 0.5, 0, 1], [0.5, 0.5, -0.5, 0.5, 0.5, 1.5]]},
    # ------------------------------------------------------------- L-systems
    "koch_curve": {"family": "lsystem", "title": "Koch curve", "color": "#1f6fb2", "axiom": "F",
        "rules": {"F": "F+F--F+F"}, "angle": 60, "depth": 5},
    "koch_snowflake": {"family": "lsystem", "title": "Koch snowflake", "color": "#2c7fb8", "axiom": "F--F--F",
        "rules": {"F": "F+F--F+F"}, "angle": 60, "depth": 4},
    "hilbert": {"family": "lsystem", "title": "Hilbert curve", "color": "#444444", "axiom": "A",
        "rules": {"A": "+BF-AFA-FB+", "B": "-AF+BFB+FA-"}, "angle": 90, "depth": 5},
    "sierpinski_arrowhead": {"family": "lsystem", "title": "Sierpinski arrowhead", "color": "#5e3c99",
        "axiom": "A", "rules": {"A": "B-A-B", "B": "A+B+A"}, "angle": 60, "depth": 7},
    "plant_a": {"family": "lsystem", "title": "Fractal plant", "color": "#3a7d2c", "axiom": "X",
        "rules": {"X": "F+[[X]-X]-F[-FX]+X", "F": "FF"}, "angle": 25, "depth": 5, "heading": 65},
    "plant_b": {"family": "lsystem", "title": "Bush", "color": "#4d8b31", "axiom": "F",
        "rules": {"F": "FF-[-F+F+F]+[+F-F-F]"}, "angle": 22.5, "depth": 4, "heading": 90},
    # ------------------------------------------------------------- spirals
    "golden_spiral": {"family": "spiral", "title": "Golden spiral", "color": "#b8860b",
        "map": [0, 0.6180339887, -0.6180339887, 0, 1, 1], "base": "golden", "levels": 16},
    "nautilus": {"family": "spiral", "title": "Nautilus septa", "color": "#a0522d",
        "map": [0.94 * math.cos(0.35), -0.94 * math.sin(0.35), 0.94 * math.sin(0.35), 0.94 * math.cos(0.35), 0, 0],
        "base": "septum", "levels": 64},
    # ------------------------------------------------------------- escape-time
    "mandelbrot": {"family": "escape", "title": "Mandelbrot set", "kind": "mandelbrot",
        "center": [-0.6, 0.0], "half_width": 1.6, "max_iter": 200},
    "seahorse_valley": {"family": "escape", "title": "Seahorse valley", "kind": "mandelbrot",
        "center": [-0.745, 0.11], "half_width": 0.035, "max_iter": 400},
    "julia_rabbit": {"family": "escape", "title": "Douady rabbit (Julia)", "kind": "julia",
        "c": [-0.123, 0.745], "center": [0.0, 0.0], "half_width": 1.5, "max_iter": 200},
    "julia_dendrite": {"family": "escape", "title": "Dendrite (Julia)", "kind": "julia",
        "c": [0.0, 1.0], "center": [0.0, 0.0], "half_width": 1.5, "max_iter": 200},
}

# IFS equivalents of L-system limit sets (used for the eqart-ir program only).
_LSYS_IFS = {
    "koch_curve": [[1 / 3, 0, 0, 1 / 3, 0, 0], [1 / 6, -S3 / 6, S3 / 6, 1 / 6, 1 / 3, 0],
                   [1 / 6, S3 / 6, -S3 / 6, 1 / 6, 0.5, S3 / 6], [1 / 3, 0, 0, 1 / 3, 2 / 3, 0]],
    "sierpinski_arrowhead": PRESETS["sierpinski_triangle"]["maps"],
}


def presets() -> dict:
    return {k: {"family": v["family"], "title": v["title"]} for k, v in PRESETS.items()}


def resolve_spec(spec: dict | str) -> dict:
    """Preset name or partial spec -> full spec (preset values overridden by spec keys)."""
    if isinstance(spec, str):
        spec = {"preset": spec}
    spec = dict(spec)
    name = spec.get("preset")
    if name:
        if name not in PRESETS:
            raise EqartError(f"unknown preset {name}; available: {sorted(PRESETS)}")
        full = copy.deepcopy(PRESETS[name])
        full.update({k: v for k, v in spec.items()})
        spec = full
    fam = spec.get("family")
    if fam not in FAMILIES:
        raise EqartError(f"family must be one of {FAMILIES}")
    spec.setdefault("size", 512)
    spec["size"] = int(max(32, min(2048, spec["size"])))
    spec.setdefault("color", "#222222")
    spec.setdefault("background", "#ffffff")
    return spec


# ===================================================================== affine helpers

def _m3(m):
    a, b, c, d, e, f = m
    return np.array([[a, b, e], [c, d, f], [0, 0, 1.0]])


def _from3(M):
    return [M[0, 0], M[0, 1], M[1, 0], M[1, 1], M[0, 2], M[1, 2]]


def _apply(m, pts):
    a, b, c, d, e, f = m
    p = np.asarray(pts, dtype=float)
    return np.stack([a * p[:, 0] + b * p[:, 1] + e, c * p[:, 0] + d * p[:, 1] + f], axis=1)


def _contraction(m):
    return max(math.sqrt(abs(m[0] * m[3] - m[1] * m[2])), 0.03)


def _num(v):
    s = f"{v:.5g}"
    return "0" if s in ("-0", "0") else s


def _svg_matrix(m):
    a, b, c, d, e, f = m
    return "matrix(" + " ".join(_num(v) for v in (a, c, b, d, e, f)) + ")"


def _chaos_points(maps, n=40000, seed=0):
    rng = np.random.default_rng(seed)
    w = np.array([max(abs(m[0] * m[3] - m[1] * m[2]), 0.01) for m in maps])
    w /= w.sum()
    idx = rng.choice(len(maps), size=n, p=w)
    M = np.array(maps, dtype=float)
    p = np.zeros(2)
    out = np.empty((n, 2))
    for k in range(n):
        a, b, c, d, e, f = M[idx[k]]
        p = np.array([a * p[0] + b * p[1] + e, c * p[0] + d * p[1] + f])
        out[k] = p
    return out[20:]


def _bbox(pts):
    p = np.asarray(pts)
    return [float(p[:, 0].min()), float(p[:, 1].min()), float(p[:, 0].max()), float(p[:, 1].max())]


# ===================================================================== geometry per family
# Each builder returns a Geometry dict:
#   world bbox, "defs"/"top" for the generative SVG, and flat primitives for the raster.

def _ifs_geometry(spec):
    maps = [list(map(float, m)) for m in spec["maps"]]
    tree = bool(spec.get("tree"))
    if spec.get("base"):
        base = np.array(spec["base"], dtype=float)
    else:
        x0, y0, x1, y1 = _bbox(_chaos_points(maps))
        base = np.array([[x0, y0], [x1, y0], [x1, y1], [x0, y1]])
    r = [_contraction(m) for m in maps]
    unit = min(-math.log(min(x, 0.999)) for x in r)
    cost = [max(1, round(-math.log(min(x, 0.999)) / unit)) for x in r]
    cap = int(spec.get("max_instances", MAX_INSTANCES))

    @lru_cache(None)
    def count(b):
        if b <= 0:
            return 1
        return (1 if tree else 0) + sum(count(b - c) for c in cost)

    budget = spec.get("budget")
    if budget is None:
        budget = 1
        while budget < 400 and count(budget + 1) <= cap:
            budget += 1
    budget = int(budget)
    if count(budget) > 4 * cap:
        raise EqartError(f"budget {budget} gives {count(budget)} instances (> {4 * cap})")
    # leaves (flat)
    polys = []
    stack = [(np.eye(3), budget)]
    while stack:
        M, b = stack.pop()
        if b <= 0 or tree:
            polys.append(_apply(_from3(M), base))
        if b > 0:
            for m, c in zip(maps, cost):
                stack.append((M @ _m3(m), b - c))
    allp = np.concatenate(polys)
    # generative defs, only reachable budgets
    need, todo = set(), [budget]
    while todo:
        b = todo.pop()
        if b in need:
            continue
        need.add(b)
        if b > 0:
            todo.extend(max(0, b - c) for c in cost)
    pts = " ".join(f"{_num(x)},{_num(y)}" for x, y in base)
    defs = [f'<polygon id="L0" points="{pts}"/>']
    for b in sorted(need):
        if b == 0:
            continue
        uses = [f'<use href="#L0"/>'] if tree else []
        uses += [f'<use href="#L{max(0, b - c)}" transform="{_svg_matrix(m)}"/>' for m, c in zip(maps, cost)]
        defs.append(f'<g id="L{b}">{"".join(uses)}</g>')
    return {"bbox": _bbox(allp), "defs": defs, "top": f'<use href="#L{budget}"/>', "fill": True,
            "polys": polys, "lines": [], "instances": count(budget), "depth": budget, "base": base}


def _lsys_expand(spec, depth):
    s = spec["axiom"]
    for _ in range(depth):
        s = "".join(spec["rules"].get(ch, ch) for ch in s)
    return s


def _turtle_segments(s, angle, heading, draw="FGAB"):
    x = y = 0.0
    th = math.radians(heading)
    da = math.radians(angle)
    stack, polylines, cur = [], [], [(0.0, 0.0)]
    for ch in s:
        if ch in draw:
            x, y = x + math.cos(th), y + math.sin(th)
            cur.append((x, y))
        elif ch == "+":
            th += da
        elif ch == "-":
            th -= da
        elif ch == "[":
            stack.append((x, y, th))
        elif ch == "]":
            if len(cur) > 1:
                polylines.append(cur)
            x, y, th = stack.pop()
            cur = [(x, y)]
    if len(cur) > 1:
        polylines.append(cur)
    return polylines


def _lsys_count(spec, depth, draw="FGAB"):
    counts = {ch: (1 if ch in draw else 0) for ch in set(spec["axiom"]) | set("".join(spec["rules"].values())) | set(spec["rules"])}
    for _ in range(depth):
        counts = {ch: (sum(counts.get(c, 1 if c in draw else 0) for c in spec["rules"][ch]) if ch in spec["rules"] else counts[ch]) for ch in counts}
    return sum(counts.get(c, 0) for c in spec["axiom"])


def _lsys_geometry(spec):
    draw = spec.get("draw", "FGAB")
    cap = int(spec.get("max_instances", MAX_INSTANCES))
    depth = int(spec.get("depth", 4))
    while depth > 0 and _lsys_count(spec, depth, draw) > cap:
        depth -= 1
    angle, heading = float(spec["angle"]), float(spec.get("heading", 0))
    polylines = _turtle_segments(_lsys_expand(spec, depth), angle, heading, draw)
    allp = np.array([p for pl in polylines for p in pl])
    # generative: symbol X_k = turtle walk over rule(X) placing Y_{k-1} with rigid transforms.
    da = math.radians(angle)
    rules = spec["rules"]
    syms = sorted(set(rules) | set(c for c in draw if c in "".join(rules.values()) + spec["axiom"]))
    net = {}  # (sym, level) -> (dx, dy, dth)

    def walk(string, level, emit):
        x = y = th = 0.0
        stack, out = [], []
        for ch in string:
            if ch in syms:
                key = (ch, level)
                if emit:
                    out.append(f'<use href="#{ch}{level}" transform="translate({_num(x)} {_num(y)}) rotate({_num(math.degrees(th))})"/>')
                dx, dy, dth = net[key]
                x, y = x + dx * math.cos(th) - dy * math.sin(th), y + dx * math.sin(th) + dy * math.cos(th)
                th += dth
            elif ch == "+":
                th += da
            elif ch == "-":
                th -= da
            elif ch == "[":
                stack.append((x, y, th))
            elif ch == "]":
                x, y, th = stack.pop()
        return (x, y, th), out

    defs = []
    for ch in syms:
        net[(ch, 0)] = (1.0, 0.0, 0.0) if ch in draw else (0.0, 0.0, 0.0)
        defs.append(f'<path id="{ch}0" d="M0 0H1"/>' if ch in draw else f'<g id="{ch}0"/>')
    for k in range(1, depth + 1):
        for ch in syms:
            body = rules.get(ch, ch)
            (nx, ny, nth), uses = walk(body, k - 1, True)
            net[(ch, k)] = (nx, ny, nth)
            defs.append(f'<g id="{ch}{k}">{"".join(uses)}</g>')
    _, top = walk(spec["axiom"], depth, True)
    top_g = f'<g transform="rotate({_num(heading)})">{"".join(top)}</g>'
    return {"bbox": _bbox(allp), "defs": defs, "top": top_g, "fill": False, "polys": [],
            "lines": polylines, "instances": sum(len(p) - 1 for p in polylines), "depth": depth}


def _spiral_base(kind):
    if kind == "golden":
        t = np.linspace(math.pi, math.pi / 2, 24)
        arc = np.stack([1 + np.cos(t), np.sin(t)], axis=1)
        sq = np.array([[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]], dtype=float)
        svg = '<g id="B0"><path d="M0 0H1V1H0Z" stroke-opacity="0.35"/><path d="M0 0A1 1 0 0 1 1 1"/></g>'
        return [sq, arc], svg
    # septum: radial wall plus outer shell arc
    t = np.linspace(0, 0.35, 8)
    arc = np.stack([np.cos(t), np.sin(t)], axis=1)
    wall = np.array([[0.55, 0.0], [1.0, 0.0]])
    svg = f'<g id="B0"><path d="M0.55 0H1"/><path d="M1 0A1 1 0 0 1 {_num(math.cos(0.35))} {_num(math.sin(0.35))}"/></g>'
    return [wall, arc], svg


def _spiral_geometry(spec):
    m = [float(v) for v in spec["map"]]
    cap = int(spec.get("max_instances", MAX_INSTANCES))
    levels = int(max(1, min(int(spec.get("levels", 16)), cap)))
    k = max(0, math.ceil(math.log2(levels)))
    n = 2 ** k
    base_lines, base_svg = _spiral_base(spec.get("base", "golden"))
    lines = []
    M = np.eye(3)
    for _ in range(n):
        T = _from3(M)
        lines.extend(_apply(T, bl).tolist() for bl in base_lines)
        M = M @ _m3(m)
    defs = [base_svg]
    P = _m3(m)
    for j in range(1, k + 1):
        defs.append(f'<g id="B{j}"><use href="#B{j - 1}"/><use href="#B{j - 1}" transform="{_svg_matrix(_from3(P))}"/></g>')
        P = P @ P
    allp = np.array([p for pl in lines for p in pl])
    return {"bbox": _bbox(allp), "defs": defs, "top": f'<use href="#B{k}"/>', "fill": False,
            "polys": [], "lines": lines, "instances": n, "depth": k}


# ===================================================================== escape-time

def escape_counts(spec, w, h):
    cx, cy = spec["center"]
    hw = float(spec["half_width"])
    hh = hw * h / w
    xs = np.linspace(cx - hw, cx + hw, w, endpoint=False) + hw / w
    ys = np.linspace(cy + hh, cy - hh, h, endpoint=False) - hh / h
    X, Y = np.meshgrid(xs, ys)
    if spec.get("kind") == "julia":
        z = X + 1j * Y
        c = complex(*spec["c"])
    else:
        z = np.zeros_like(X, dtype=complex)
        c = X + 1j * Y
    n = int(spec.get("max_iter", 200))
    cnt = np.zeros(X.shape, dtype=np.int32)
    alive = np.ones(X.shape, dtype=bool)
    for _ in range(n):
        z = np.where(alive, z * z + c, z)
        esc = alive & (np.abs(z) > 2)
        alive &= ~esc
        cnt += alive
        if not alive.any():
            break
    return cnt, n


def _escape_rgb(cnt, n, color="#1b2a4a"):
    s = cnt / n
    inside = cnt >= n
    r = np.power(s, 0.4); g = np.power(s, 1.2); b = 1 - np.power(s, 0.25)
    rgb = np.stack([r, g, b], -1)
    rgb[inside] = 0.0
    return (np.clip(rgb, 0, 1) * 255).astype(np.uint8)


def _trace_loops(mask):
    """Crack-edge boundary loops of a boolean mask (pixel coords, y down)."""
    h, w = mask.shape
    P = np.zeros((h + 2, w + 2), dtype=bool)
    P[1:-1, 1:-1] = mask
    nxt = {}
    ii, jj = np.nonzero(P)
    for i, j in zip(ii.tolist(), jj.tolist()):
        x, y = j - 1, i - 1
        if not P[i - 1, j]:
            nxt.setdefault((x + 1, y), []).append((x, y))       # top edge, right->left
        if not P[i + 1, j]:
            nxt.setdefault((x, y + 1), []).append((x + 1, y + 1))
        if not P[i, j - 1]:
            nxt.setdefault((x, y), []).append((x, y + 1))
        if not P[i, j + 1]:
            nxt.setdefault((x + 1, y + 1), []).append((x + 1, y))
    loops = []
    while nxt:
        start = next(iter(nxt))
        loop, cur = [start], start
        while True:
            outs = nxt.get(cur)
            if not outs:
                break
            nx = outs.pop()
            if not outs:
                del nxt[cur]
            if nx == start:
                break
            loop.append(nx)
            cur = nx
        # drop collinear points
        if len(loop) > 2:
            keep = []
            L = len(loop)
            for k in range(L):
                a, b, c = loop[k - 1], loop[k], loop[(k + 1) % L]
                if (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) != 0:
                    keep.append(b)
            loops.append(keep)
    return loops


def _escape_contour_svg(spec, cnt, n, size):
    levels = spec.get("contour_levels") or [0.02, 0.05, 0.1, 0.2, 0.4, 1.0]
    s = cnt / n
    parts = []
    lut = _escape_rgb(np.array([[int(l * n) for l in levels]]), n)[0]
    for lvl, col in zip(levels, lut):
        mask = s >= lvl - 1e-9
        if not mask.any():
            continue
        d = "".join("M" + " ".join(f"{x} {y}" for x, y in lp) + "Z" for lp in _trace_loops(mask) if lp)
        parts.append(f'<path fill="rgb({col[0]},{col[1]},{col[2]})" fill-rule="evenodd" d="{d}"/>')
    return parts


# ===================================================================== rasterize & SVG

def _world_to_px(bbox, size, pad=0.04):
    x0, y0, x1, y1 = bbox
    w, h = max(x1 - x0, 1e-9), max(y1 - y0, 1e-9)
    s = size * (1 - 2 * pad) / max(w, h)
    tx = size / 2 - s * (x0 + x1) / 2
    ty = size / 2 + s * (y0 + y1) / 2
    return s, tx, ty


def _spec_meta(spec):
    return f'<metadata id="{META_ID}">{html.escape(json.dumps(spec, sort_keys=True, separators=(",", ":")), quote=False)}</metadata>'


def _hex(c):
    c = c.lstrip("#")
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))


def _stroke_px(spec, geom):
    return float(spec.get("stroke_px", 1.25 if geom["instances"] > 2000 else 2.0))


def render_spec(spec: dict | str, want=("svg", "flat", "png", "ir")) -> dict:
    spec = resolve_spec(spec)
    size = spec["size"]
    fam = spec["family"]
    out = {"ok": True, "spec": spec, "family": fam}
    if fam == "escape":
        cnt, n = escape_counts(spec, size, size)
        rgb = _escape_rgb(cnt, n)
        parts = _escape_contour_svg(spec, cnt, n, size)
        bg = '<rect width="100%" height="100%" fill="rgb(0,0,255)"/>'
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">'
               f'{_spec_meta(spec)}{bg}{"".join(parts)}</svg>')
        out.update(svg=svg, flat_svg=svg, generative=False, instances=0,
                   note="escape-time sets have no generative SVG; contour SVG written, compact form is the spec / eqart-ir program")
        out["rgb"] = rgb
        out["ir"] = escape_ir(spec) if "ir" in want else None
        return out
    geom = {"ifs": _ifs_geometry, "lsystem": _lsys_geometry, "spiral": _spiral_geometry}[fam](spec)
    s, tx, ty = _world_to_px(geom["bbox"], size)
    col = spec["color"]
    sw = _stroke_px(spec, geom) / s  # local units; nested L-system/IFS transforms are rigid or scale it with the geometry
    style = (f'fill="{col}" stroke="none"' if geom["fill"] else
             f'fill="none" stroke="{col}" stroke-width="{_num(sw)}" stroke-linecap="round" stroke-linejoin="round"')
    head = f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">'
    bg = f'<rect width="100%" height="100%" fill="{spec["background"]}"/>'
    world = f'matrix({_num(s)} 0 0 {_num(-s)} {_num(tx)} {_num(ty)})'
    svg = (head + _spec_meta(spec) + bg + f'<defs>{"".join(geom["defs"])}</defs>'
           + f'<g transform="{world}" {style}>{geom["top"]}</g></svg>')
    out.update(svg=svg, generative=True, instances=geom["instances"], depth=geom["depth"])
    # flat primitives in pixel space
    def px(p):
        p = np.asarray(p)
        return np.stack([p[:, 0] * s + tx, ty - p[:, 1] * s], 1)
    if "flat" in want or "png" in want:
        if geom["fill"]:
            flat_items = [px(p) for p in geom["polys"]]
            body = "".join('<polygon points="' + " ".join(f"{x:.2f},{y:.2f}" for x, y in q) + '"/>' for q in flat_items)
            fstyle = f'fill="{col}"'
        else:
            flat_items = [px(p) for p in geom["lines"]]
            body = '<path d="' + "".join("M" + " L".join(f"{x:.2f} {y:.2f}" for x, y in q) for q in flat_items) + '"/>'
            fstyle = f'fill="none" stroke="{col}" stroke-width="{_stroke_px(spec, geom):.3g}" stroke-linecap="round" stroke-linejoin="round"'
        out["flat_svg"] = head + _spec_meta(spec) + bg + f'<g {fstyle}>{body}</g></svg>'
        # own raster (PIL, 2x supersampled)
        ss = 2
        im = Image.new("RGB", (size * ss, size * ss), _hex(spec["background"]))
        dr = ImageDraw.Draw(im)
        c = _hex(col)
        wpx = max(1, round(_stroke_px(spec, geom) * ss))
        for q in flat_items:
            pts = [(float(x) * ss, float(y) * ss) for x, y in q]
            if geom["fill"]:
                if len(pts) >= 3:
                    dr.polygon(pts, fill=c)
            else:
                dr.line(pts, fill=c, width=wpx, joint="curve")
        out["rgb"] = np.asarray(im.resize((size, size), Image.LANCZOS))
    out["ir"] = None
    if "ir" in want:
        try:
            out["ir"] = geometric_ir(spec, geom)
        except EqartError as e:
            out["ir_note"] = str(e)
    return out


# ===================================================================== eqart-ir/2 programs

def escape_ir(spec):
    n = int(spec.get("max_iter", 200))
    n_ir = min(n, 400)
    cx, cy = spec["center"]
    hw = float(spec["half_width"])
    julia = spec.get("kind") == "julia"
    init = {"zr": "x", "zi": "y"} if julia else {"zr": 0, "zi": 0}
    cr, ci = (spec["c"] if julia else ("x", "y"))
    return {
        "ir": "eqart-ir/2",
        "meta": {"title": spec.get("title", "escape-time set"), "method": "eqart-fractal-svg",
                 "fractal": {k: spec[k] for k in ("kind", "c", "center", "half_width", "max_iter") if k in spec}},
        "canvas": {"width": 256, "height": 256, "scale": 128 / hw, "cx": cx, "cy": cy},
        "output": ["iterate", n_ir, init,
                   {"zr": ["add", ["sub", ["mul", "zr", "zr"], ["mul", "zi", "zi"]], cr],
                    "zi": ["add", ["mul", 2, "zr", "zi"], ci]},
                   ["let", {"s": ["div", "_n", n_ir]},
                    ["mul", ["lt", "_n", n_ir], ["vec", ["pow", "s", 0.4], ["pow", "s", 1.2], ["sub", 1, ["pow", "s", 0.25]]]]],
                   ["gt", ["add", ["mul", "zr", "zr"], ["mul", "zi", "zi"]], 4]],
    }


def _inv(m):
    a, b, c, d, e, f = m
    det = a * d - b * c
    if abs(det) < 1e-9:
        return None
    ia, ib, ic, id_ = d / det, -b / det, -c / det, a / det
    return [ia, ib, ic, id_, -(ia * e + ib * f), -(ic * e + id_ * f)]


def _r(v):
    return float(f"{v:.6g}")


def _ifs_escape_expr(maps, bbox, n_iter, tree_base=None):
    """Per-pixel inverse-IFS escape iteration: apply the inverse of the first map whose
    image of the bounding box contains the point; escape when none does."""
    x0, y0, x1, y1 = [_r(v) for v in bbox]
    invs = [(_inv(m)) for m in maps]
    invs = [[_r(v) for v in iv] for iv in invs if iv is not None]
    if not invs:
        raise EqartError("all maps singular")

    def inside(u, v):
        return ["mul", ["ge", u, x0], ["le", u, x1], ["ge", v, y0], ["le", v, y1]]

    def chain(coord):
        expr_u = "u" if coord == "u" else "v"
        out = expr_u
        for iv in reversed(invs):
            a, b, c, d, e, f = iv
            qu = ["add", ["mul", a, "u"], ["mul", b, "v"], e]
            qv = ["add", ["mul", c, "u"], ["mul", d, "v"], f]
            out = ["select", inside(qu, qv), qu if coord == "u" else qv, out]
        return out

    def any_inside():
        terms = []
        for a, b, c, d, e, f in invs:
            qu = ["add", ["mul", a, "u"], ["mul", b, "v"], e]
            qv = ["add", ["mul", c, "u"], ["mul", d, "v"], f]
            terms.append(inside(qu, qv))
        return terms[0] if len(terms) == 1 else ["max", *terms]

    if tree_base is not None:
        update = {"u": chain("u"), "v": chain("v"), "hit": ["max", "hit", tree_base]}
        esc = ["max", ["gt", "hit", 0.5], ["sub", 1, any_inside()]]
        return ["iterate", n_iter, {"u": "x", "v": "y", "hit": 0}, update,
                ["max", "hit", tree_base], esc]
    update = {"u": chain("u"), "v": chain("v")}
    return ["iterate", n_iter, {"u": "x", "v": "y"}, update,
            ["mul", ["ge", "_n", n_iter], inside("u", "v")], ["sub", 1, any_inside()]]


def geometric_ir(spec, geom):
    fam = spec["family"]
    bbox = geom["bbox"]
    if fam == "ifs":
        maps = spec["maps"]
        if spec.get("tree"):
            bx0, by0, bx1, by1 = _bbox(geom["base"])
            tb = ["mul", ["ge", "u", bx0], ["le", "u", bx1], ["ge", "v", by0], ["le", "v", by1]]
            expr = _ifs_escape_expr(maps, bbox, 14, tree_base=tb)
        else:
            rmax = max(min(math.sqrt(abs(m[0] * m[3] - m[1] * m[2])), 0.95) for m in maps)
            n_it = int(min(14, max(4, math.ceil(math.log(128) / -math.log(rmax)))))
            expr = _ifs_escape_expr(maps, _bbox(_chaos_points(maps)) if not spec.get("base") else _bbox(spec["base"]), n_it)
    elif fam == "lsystem":
        name = spec.get("preset")
        if name not in _LSYS_IFS:
            raise EqartError("this L-system has no IFS equivalent; its compact form is the spec (no per-pixel IR yet)")
        maps = _LSYS_IFS[name]
        bbox = _bbox(_chaos_points(maps))  # the program draws the limit set in the IFS's own frame
        rmax = max(math.sqrt(abs(m[0] * m[3] - m[1] * m[2])) for m in maps)
        expr = _ifs_escape_expr(maps, bbox, int(math.ceil(math.log(64) / -math.log(rmax))))
    else:  # spiral: inverse single map, hit when inside the base cell
        if spec.get("base") == "golden":
            tb = ["mul", ["lt", ["abs", ["sub", ["len", ["vec", ["sub", "u", 1], "v"]], 1]], 0.02],
                  ["ge", "u", 0], ["le", "u", 1], ["ge", "v", 0], ["le", "v", 1]]
        else:
            tb = ["mul", ["lt", ["abs", "v"], 0.012], ["ge", "u", 0.55], ["le", "u", 1]]
        iv = [_r(v) for v in _inv(spec["map"])]
        a, b, c, d, e, f = iv
        n = int(spec.get("levels", 16))
        expr = ["iterate", n, {"u": "x", "v": "y", "hit": 0},
                {"u": ["add", ["mul", a, "u"], ["mul", b, "v"], e],
                 "v": ["add", ["mul", c, "u"], ["mul", d, "v"], f],
                 "hit": ["max", "hit", tb]},
                ["max", "hit", tb], ["gt", "hit", 0.5]]
    x0, y0, x1, y1 = bbox
    span = max(x1 - x0, y1 - y0) * 1.08
    rgb = [round(v / 255, 3) for v in _hex(spec["color"])]
    bg = [round(v / 255, 3) for v in _hex(spec["background"])]
    return {
        "ir": "eqart-ir/2",
        "meta": {"title": spec.get("title", fam), "method": "eqart-fractal-svg",
                 "note": "per-pixel inverse-IFS escape approximation of the limit set; exact form is meta.fractal",
                 "height": "invert" if sum(bg) / 3 > 0.5 else "luma",
                 "fractal": {k: v for k, v in spec.items() if k not in ("title",)}},
        "canvas": {"width": 256, "height": 256, "scale": _r(256 / span), "cx": _r((x0 + x1) / 2), "cy": _r((y0 + y1) / 2)},
        "output": ["let", {"m": expr}, ["add", ["mul", ["vec", *rgb], "m"], ["mul", ["vec", *bg], ["sub", 1, "m"]]]],
    }


def png_bytes(rgb) -> bytes:
    buf = io.BytesIO()
    Image.fromarray(np.asarray(rgb, dtype=np.uint8)).save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def resvg_rgb(svg: str, size: int | None = None):
    """Rasterize SVG with resvg-py (optional 'svg' extra). Returns HxWx3 uint8 on white."""
    try:
        import resvg_py
    except ImportError as e:  # pragma: no cover - depends on extra
        raise EqartError("resvg-py not installed: uv sync --project <plugin>/server --extra svg") from e
    kw = {"svg_string": svg, "background": "#ffffff"}
    if size:
        kw.update(width=int(size), height=int(size))
    data = resvg_py.svg_to_bytes(**kw)
    return np.asarray(Image.open(io.BytesIO(bytes(data))).convert("RGB"))
