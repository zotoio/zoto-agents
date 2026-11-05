"""Inverse direction: SVG / image -> fractal spec.

* SVGs written by eqart.fractal carry their spec in <metadata id="eqart-fractal"> and
  round-trip exactly (regenerated SVG is byte-identical).
* Other SVGs are rasterized with resvg-py (optional 'svg' extra) and fitted like images.
* Raster fits: Julia sets (c search), IFS (density-based collage optimisation) and
  L-systems (fixed template library). Score = tolerant overlap (IoU with 1 px slack).

Known weak spots (documented in docs/SPEC.md): time budgets can overrun by ~15-40 %,
the L-system fit only knows the bundled templates, and Mandelbrot location search is not
implemented (only Julia sets are fitted among escape-time sets).
"""
from __future__ import annotations

import html
import io
import json
import math
import re
import time

import numpy as np
from PIL import Image

from . import fractal as F
from .interp import EqartError

WORK = 64


def parse_svg_spec(svg: str) -> dict | None:
    m = re.search(rf'<metadata id="{F.META_ID}">(.*?)</metadata>', svg, re.S)
    if not m:
        return None
    return json.loads(html.unescape(m.group(1)))


# ---------------------------------------------------------------- raster helpers

def _load(img) -> np.ndarray:
    if isinstance(img, np.ndarray):
        return img[..., :3].astype(np.uint8) if img.ndim == 3 else np.repeat(img[..., None], 3, -1).astype(np.uint8)
    if isinstance(img, (bytes, bytearray)):
        return np.asarray(Image.open(io.BytesIO(img)).convert("RGB"))
    return np.asarray(Image.open(str(img)).convert("RGB"))


def foreground_mask(rgb: np.ndarray) -> np.ndarray:
    a = rgb.astype(float)
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    bg = np.median(border, axis=0)
    d = np.sqrt(((a - bg) ** 2).sum(-1))
    return d > 60


def _crop_square(mask: np.ndarray, size=WORK):
    ys, xs = np.nonzero(mask)
    if len(xs) == 0:
        raise EqartError("no foreground found in image")
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    side = max(x1 - x0, y1 - y0)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    box = (cx - side / 2, cy - side / 2, cx + side / 2, cy + side / 2)
    im = Image.fromarray((mask * 255).astype(np.uint8)).crop(tuple(int(round(v)) for v in box))
    small = np.asarray(im.resize((size, size), Image.BOX), dtype=float) / 255.0
    return small, box


def _dilate(m):
    p = np.pad(m, 1)
    return p[1:-1, 1:-1] | p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]


def overlap(a: np.ndarray, b: np.ndarray) -> float:
    """Tolerant overlap (IoU-like, 1 px misalignment allowed)."""
    a, b = a.astype(bool), b.astype(bool)
    na, nb = a.sum(), b.sum()
    if na + nb == 0:
        return 1.0
    return float(((a & _dilate(b)).sum() + (b & _dilate(a)).sum()) / (na + nb))


def _blur(x, r=1):
    k = np.array([1, 4, 6, 4, 1], float) / 16 if r else np.array([1.0])
    for ax in (0, 1):
        x = np.apply_along_axis(lambda v: np.convolve(v, k, mode="same"), ax, x)
    return x


# ---------------------------------------------------------------- Julia / Mandelbrot

def _escape_mask(spec, size):
    cnt, n = F.escape_counts(spec, size, size)
    return cnt >= n


def fit_julia(target: np.ndarray, budget_s=10.0, seed=0):
    t0 = time.time()
    rng = np.random.default_rng(seed)
    T = target > 0.5

    def score(c):
        spec = {"kind": "julia", "c": [float(c[0]), float(c[1])], "center": [0, 0], "half_width": 1.6, "max_iter": 80}
        m = _escape_mask(spec, 96)
        if m.sum() < 20:
            return 0.0, None
        crop, _ = _crop_square(m, WORK)
        return overlap(crop > 0.5, T), spec

    best = (0.0, None, (0.0, 0.0))
    for cr in np.linspace(-1.2, 0.45, 12):
        for ci in np.linspace(0, 1.1, 10):
            s, sp = score((cr, ci))
            if s > best[0]:
                best = (s, sp, (cr, ci))
            if time.time() - t0 > budget_s * 0.6:
                break
    step = 0.08
    c = np.array(best[2])
    while time.time() - t0 < budget_s and step > 0.002:
        improved = False
        for _ in range(6):
            cand = c + rng.normal(0, step, 2)
            s, sp = score(cand)
            if s > best[0]:
                best, c, improved = (s, sp, tuple(cand)), cand, True
        if not improved:
            step *= 0.6
    s, spec, _ = best
    if spec:
        spec = {"family": "escape", "title": "fitted Julia set", **spec, "max_iter": 200}
    return {"family": "escape", "spec": spec, "overlap": round(s, 4)}


def fit_mandelbrot_default(target: np.ndarray):
    spec = F.resolve_spec("mandelbrot")
    m = _escape_mask(spec, 128)
    crop, _ = _crop_square(m, WORK)
    return {"family": "escape", "spec": spec, "overlap": round(overlap(crop > 0.5, target > 0.5), 4),
            "note": "Mandelbrot location search is not implemented; compared against the default view only"}


# ---------------------------------------------------------------- IFS collage fit

_YY, _XX = np.mgrid[0:WORK, 0:WORK]
_U = (_XX + 0.5) / WORK
_V = 1 - (_YY + 0.5) / WORK


def _warp(D, m):
    """Image of density D under affine map m (unit-square coords): out(p) = D(m^-1 p)."""
    a, b, c, d, e, f = m
    det = a * d - b * c
    if abs(det) < 1e-4:
        return np.zeros_like(D)
    u, v = _U - e, _V - f
    qu = (d * u - b * v) / det
    qv = (-c * u + a * v) / det
    i = np.floor((1 - qv) * WORK).astype(int)
    j = np.floor(qu * WORK).astype(int)
    ok = (i >= 0) & (i < WORK) & (j >= 0) & (j < WORK)
    out = np.zeros_like(D)
    out[ok] = D[i[ok], j[ok]]
    return out


def _collage_loss(maps, D):
    C = np.zeros_like(D)
    for m in maps:
        C += _warp(D, m)
    over = np.maximum(C - 1, 0)
    C = np.minimum(C, 1)
    return float(np.mean((C - D) ** 2) + 0.3 * np.mean(over ** 2))


def _random_map(rng, T):
    ys, xs = np.nonzero(T > 0.5)
    k = rng.integers(len(xs))
    s = rng.uniform(0.3, 0.6)
    th = rng.uniform(-math.pi, math.pi) if rng.random() < 0.3 else rng.normal(0, 0.3)
    flip = -1 if rng.random() < 0.15 else 1
    a, b, c, d = s * math.cos(th), -s * math.sin(th) * flip, s * math.sin(th), s * math.cos(th) * flip
    px, py = (xs[k] + 0.5) / WORK, 1 - (ys[k] + 0.5) / WORK
    return [a, b, c, d, px - (a * 0.5 + b * 0.5), py - (c * 0.5 + d * 0.5)]


def render_maps_mask(maps, size=WORK, n=30000, seed=0):
    pts = F._chaos_points(maps, n=n, seed=seed)
    m = np.zeros((size, size), bool)
    i = np.floor((1 - pts[:, 1]) * size).astype(int)
    j = np.floor(pts[:, 0] * size).astype(int)
    ok = (i >= 0) & (i < size) & (j >= 0) & (j < size)
    m[i[ok], j[ok]] = True
    return m


def fit_ifs(target: np.ndarray, n_maps=None, budget_s=30.0, seed=0):
    t0 = time.time()
    rng = np.random.default_rng(seed)
    T = target
    # density-based collage measure: blur thin structures so 1-px lines still overlap
    D = np.clip(_blur(_blur(T)) * 2.5, 0, 1)
    counts = [n_maps] if n_maps else [2, 3, 4, 5, 6]
    per = budget_s / len(counts)
    results = []
    for n in counts:
        t1 = time.time()
        best_round = None
        # restarts: each round = random collage search + annealed refinement; keep the best attractor
        while time.time() - t1 < per and (best_round is None or time.time() - t1 < per * 0.9):
            t2 = time.time()
            rb = min(per / 3, per - (t2 - t1)) if best_round else per / 3
            best, best_loss = None, 1e9
            while best is None or time.time() - t2 < rb * 0.35:
                maps = [_random_map(rng, T) for _ in range(n)]
                L = _collage_loss(maps, D)
                if L < best_loss:
                    best, best_loss = maps, L
            step = 0.05
            cur, cur_loss = [list(m) for m in best], best_loss
            while time.time() - t2 < rb and step > 1e-3:
                k = rng.integers(n)
                cand = [list(m) for m in cur]
                cand[k] = list(np.array(cand[k]) + rng.normal(0, step, 6))
                L = _collage_loss(cand, D)
                if L < cur_loss:
                    cur, cur_loss = cand, L
                else:
                    step *= 0.998
            ov = overlap(render_maps_mask(cur), T > 0.5)
            if best_round is None or ov > best_round["overlap"]:
                best_round = {"n_maps": n, "maps": cur, "collage_loss": cur_loss, "overlap": ov, "score": ov - 0.01 * n}
            if ov > 0.95:
                break
        results.append(best_round)
    best = max(results, key=lambda r: r["score"])
    maps = [[round(float(v), 5) for v in m] for m in best["maps"]]
    spec = {"family": "ifs", "title": f"fitted IFS ({best['n_maps']} maps)", "maps": maps, "color": "#222222"}
    return {"family": "ifs", "spec": spec, "overlap": round(best["overlap"], 4), "n_maps": best["n_maps"],
            "tried": [{"n_maps": r["n_maps"], "overlap": round(r["overlap"], 4)} for r in results]}


# ---------------------------------------------------------------- L-system templates

def fit_lsystem(target: np.ndarray, budget_s=10.0):
    t0 = time.time()
    T = target > 0.5
    best = {"overlap": -1}
    for name, p in F.PRESETS.items():
        if p["family"] != "lsystem":
            continue
        for depth in range(1, int(p["depth"]) + 2):
            if time.time() - t0 > budget_s:
                break
            spec = {"preset": name, "depth": depth, "size": 128, "stroke_px": 1.5}
            r = F.render_spec(spec, want=("png",))
            m = foreground_mask(r["rgb"])
            crop, _ = _crop_square(m, WORK)
            for k in range(4):
                for flip in (False, True):
                    c = np.rot90(crop, k)
                    c = c[:, ::-1] if flip else c
                    ov = overlap(c > 0.3, T)
                    if ov > best["overlap"]:
                        best = {"overlap": ov, "spec": {"preset": name, "depth": depth}, "rot90": k, "flip": flip}
    spec = F.resolve_spec(best["spec"])
    spec.pop("size", None)
    return {"family": "lsystem", "spec": spec, "overlap": round(best["overlap"], 4),
            "orientation": {"rot90": best["rot90"], "flip": best["flip"]},
            "note": "L-system fit searches the bundled template library only"}


# ---------------------------------------------------------------- entry points

def fit_image(img, family="auto", budget_s=30.0, n_maps=None, seed=0) -> dict:
    t0 = time.time()
    rgb = _load(img)
    mask = foreground_mask(rgb)
    target, box = _crop_square(mask)
    fams = ["escape", "lsystem", "ifs"] if family == "auto" else [family]
    shares = {"escape": 0.2, "lsystem": 0.15, "ifs": 0.65} if family == "auto" else {family: 1.0}
    cands = []
    for fam in fams:
        b = budget_s * shares[fam]
        if fam == "escape":
            cands.append(fit_julia(target, b, seed))
            cands.append(fit_mandelbrot_default(target))
        elif fam == "lsystem":
            cands.append(fit_lsystem(target, b))
        elif fam == "ifs":
            cands.append(fit_ifs(target, n_maps, b, seed))
        else:
            raise EqartError(f"unknown family {fam}")
    cands = [c for c in cands if c.get("spec")]
    best = max(cands, key=lambda c: c["overlap"])
    elapsed = time.time() - t0
    return {"ok": True, "best": best, "candidates": [{"family": c["family"], "overlap": c["overlap"],
            "title": c["spec"].get("title", c["spec"].get("preset"))} for c in cands],
            "crop_box": [round(float(v), 2) for v in box], "time_s": round(elapsed, 2),
            "budget_s": budget_s, "budget_overrun": round(max(0.0, elapsed / budget_s - 1), 3)}


def fit_svg(svg: str, family="auto", budget_s=30.0, size=256, **kw) -> dict:
    spec = parse_svg_spec(svg)
    if spec is not None:
        regen = F.render_spec(spec, want=("svg", "flat"))
        exact = svg in (regen["svg"], regen.get("flat_svg"))
        return {"ok": True, "exact": exact, "best": {"family": spec["family"], "spec": spec, "overlap": 1.0 if exact else None},
                "method": "embedded eqart spec"}
    rgb = F.resvg_rgb(svg, size)
    out = fit_image(rgb, family=family, budget_s=budget_s, **kw)
    out["exact"] = False
    out["method"] = "resvg rasterize + image fit"
    return out
