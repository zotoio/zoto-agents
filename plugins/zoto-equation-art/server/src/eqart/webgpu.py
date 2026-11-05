"""WebGL2 / WebGPU export: eqart-ir/2 -> GLSL ES 3.00 + WGSL + a self-contained HTML viewer.

Closed-form programs (no fields/schedule, per-pixel `iterate`, `sum_i`, `let`, opdefs, scalar
params) are transpiled to shader code. Programs that need fields, stencils or array params
(Gray-Scott, Life, ...) fall back to a texture: the Python renderer produces the PNG once and
the shaders sample it. Either way the viewer offers a 2D view and a 3D raymarched height
field (height = luminance, or the program's signed distance when meta.sdf is an expression).
The HTML needs no Python at view time; it prefers WebGPU and falls back to WebGL2
(force with ?api=webgl or ?api=webgpu).
"""
from __future__ import annotations

import base64
import json
import math
from pathlib import Path

from .interp import EqartError

UNSUPPORTED = {"tap", "lap", "conv", "sample", "reduce", "matvec", "hash"}


class Unsupported(EqartError):
    pass


def _lit(v: float) -> str:
    v = float(v)
    if not math.isfinite(v):
        v = 3.0e38 if v > 0 else -3.0e38
    s = repr(v)
    if "e" in s or "E" in s:
        m, e = s.lower().split("e")
        if "." not in m:
            m += ".0"
        return f"{m}e{int(e)}"
    return s if "." in s else s + ".0"


class _Gen:
    def __init__(self, ir: dict, lang: str):
        self.ir, self.lang = ir, lang
        self.opdefs = ir.get("opdefs") or {}
        self.params = ir.get("params") or {}
        self.n = 0
        self.lines: list[str] = []
        self.indent = 1

    # -- type helpers
    def T(self, d):
        if self.lang == "glsl":
            return ["float", "vec2", "vec3", "vec4"][d - 1]
        return ["f32", "vec2<f32>", "vec3<f32>", "vec4<f32>"][d - 1]

    def splat(self, e, d, to):
        if d == to:
            return e
        if d != 1:
            raise Unsupported(f"cannot broadcast {d} channels to {to}")
        return f"{self.T(to)}({e})"

    def emit(self, s):
        self.lines.append("  " * self.indent + s)

    def decl(self, e, d, name=None):
        v = name or f"v{self.n}"
        self.n += 1
        if self.lang == "glsl":
            self.emit(f"{self.T(d)} {v} = {e};")
        else:
            self.emit(f"var {v}: {self.T(d)} = {e};")
        return v

    # -- expressions
    def gen(self, node, env, depth=0):
        if depth > 400:
            raise Unsupported("expression too deep")
        if isinstance(node, bool):
            return _lit(1.0 if node else 0.0), 1
        if isinstance(node, (int, float)):
            return _lit(node), 1
        if isinstance(node, str):
            return self.name(node, env)
        if not isinstance(node, list) or not node:
            raise Unsupported(f"bad node {node!r}")
        h, args = node[0], node[1:]
        if h in UNSUPPORTED:
            raise Unsupported(f"op {h} needs the texture fallback")
        if h == "let":
            binds, body = args
            e = dict(env)
            for k, v in binds.items():
                c, d = self.gen(v, e, depth + 1)
                e[k] = (self.decl(c, d), d)
            return self.gen(body, e, depth + 1)
        if h == "iterate":
            return self.iterate(args, env, depth)
        if h in ("sum_i", "prod_i"):
            return self.sum_i(h, args, env, depth)
        if h == "call":
            h, args = args[0], args[1:]
        if h in self.opdefs:
            od = self.opdefs[h]
            e = {}
            for nm, a in zip(od.get("args", []), args):
                c, d = self.gen(a, env, depth + 1)
                e[nm] = (self.decl(c, d), d)
            return self.gen(od["body"], e, depth + 1)
        vals = [self.gen(a, env, depth + 1) for a in args]
        return self.op(h, vals)

    def name(self, n, env):
        if n in env:
            return env[n]
        if n.startswith("$"):
            spec = self.params.get(n[1:])
            if spec is None or "value" not in spec:
                raise Unsupported(f"param {n} has no inline value")
            v = spec["value"]
            if isinstance(v, (int, float)):
                return _lit(v), 1
            if isinstance(v, list) and 1 < len(v) <= 4 and all(isinstance(x, (int, float)) for x in v):
                return f"{self.T(len(v))}({', '.join(_lit(x) for x in v)})", len(v)
            raise Unsupported(f"array param {n}")
        table = {"x": ("p.x", 1), "y": ("p.y", 1), "t": ("0.0", 1), "pi": (_lit(math.pi), 1),
                 "e": (_lit(math.e), 1), "W": ("U_W", 1), "H": ("U_H", 1), "px": ("U_PX", 1), "py": ("U_PY", 1)}
        if n in table:
            return table[n]
        raise Unsupported(f"unknown name {n}")

    def op(self, h, vals):
        g = self.lang == "glsl"
        dims = [d for _, d in vals]
        D = max(dims) if dims else 1

        def S(i, to=D):
            return self.splat(vals[i][0], vals[i][1], to)

        if h in ("add", "mul", "min", "max"):
            out, od = vals[0]
            for c, d in vals[1:]:
                to = max(od, d)
                a, b = self.splat(out, od, to), self.splat(c, d, to)
                out = f"({a} + {b})" if h == "add" else f"({a} * {b})" if h == "mul" else f"{h}({a}, {b})"
                od = to
            return out, od
        if h == "sub":
            return f"({S(0)} - {S(1)})", D
        if h == "div":
            return f"({S(0)} / {S(1)})", D
        if h == "neg":
            return f"(-{S(0)})", D
        if h == "pow":
            return f"pow(max(abs({S(0)}), {self.splat(_lit(1e-30), 1, D)}), {S(1)})", D
        if h == "mod":
            a, b = S(0), S(1)
            return f"({a} - {b} * floor({a} / {b}))", D
        unary = {"abs": "abs", "sign": "sign", "floor": "floor", "fract": "fract", "sin": "sin", "cos": "cos",
                 "tan": "tan", "atan": "atan", "tanh": "tanh"}
        if h in unary:
            return f"{unary[h]}({S(0)})", D
        z = self.splat(_lit(0.0), 1, D)
        if h == "sqrt":
            return f"sqrt(max({S(0)}, {z}))", D
        if h == "exp":
            return f"exp(clamp({S(0)}, {self.splat('-80.0', 1, D)}, {self.splat('80.0', 1, D)}))", D
        if h == "log":
            return f"log(max({S(0)}, {self.splat(_lit(1e-30), 1, D)}))", D
        if h == "atan2":
            return (f"atan({S(0)}, {S(1)})" if g else f"atan2({S(0)}, {S(1)})"), D
        if h == "softmask":
            return f"exp(-exp(clamp({S(1)} * {S(0)}, {self.splat('-60.0', 1, D)}, {self.splat('60.0', 1, D)})))", D
        if h == "smoothstep":
            e0, e1, xx = S(0), S(1), S(2)
            t = f"clamp(({xx} - {e0}) / ({e1} - {e0}), {z}, {self.splat('1.0', 1, D)})"
            v = self.decl(t, D)
            return f"({v} * {v} * ({self.splat('3.0', 1, D)} - {self.splat('2.0', 1, D)} * {v}))", D
        if h == "clamp":
            return f"clamp({S(0)}, {S(1)}, {S(2)})", D
        one = self.splat("1.0", 1, D)
        if h == "lt":
            return f"({one} - step({S(1)}, {S(0)}))", D
        if h == "gt":
            return f"({one} - step({S(0)}, {S(1)}))", D
        if h == "le":
            return f"step({S(0)}, {S(1)})", D
        if h == "ge":
            return f"step({S(1)}, {S(0)})", D
        if h == "eq":
            return f"(step({S(0)}, {S(1)}) * step({S(1)}, {S(0)}))", D
        if h == "select":
            return f"mix({S(2)}, {S(1)}, step({self.splat('0.5', 1, D)}, {S(0)}))", D
        if h == "mix":
            return f"({S(0)} + ({S(1)} - {S(0)}) * {S(2)})", D
        if h == "sawtooth":
            return f"({S(0)} - {_lit(math.pi)} * round({S(0)} / {_lit(math.pi)}))", D
        if h in ("vec", "concat"):
            tot = sum(dims)
            if tot > 4:
                raise Unsupported("vectors wider than 4 channels")
            if tot == 1:
                return vals[0]
            return f"{self.T(tot)}({', '.join(c for c, _ in vals)})", tot
        if h == "comp":
            c, d = vals[0]
            idx = int(float(vals[1][0]))
            if d == 1:
                return c, 1
            return f"{c}.{'xyzw'[idx]}", 1
        if h == "dot":
            return (f"dot({S(0)}, {S(1)})" if D > 1 else f"({S(0)} * {S(1)})"), 1
        if h == "len":
            c, d = vals[0]
            return (f"length({c})" if d > 1 else f"abs({c})"), 1
        if h == "sum_c":
            c, d = vals[0]
            return (f"dot({c}, {self.T(d)}(1.0))" if d > 1 else c), 1
        raise Unsupported(f"op {h}")

    def _int(self, node, env):
        c, _ = self.gen(node, env)
        return int(float(c))

    def iterate(self, args, env, depth):
        n = self._int(args[0], env)
        init, update, result = args[1], args[2], args[3]
        escape = args[4] if len(args) > 4 else None
        e = dict(env)
        state = {}
        for k, v in init.items():
            c, d = self.gen(v, e, depth + 1)
            state[k] = (self.decl(c, d), d)
            e[k] = state[k]
        cnt = self.decl("0.0", 1)
        g = self.lang == "glsl"
        it = f"i{self.n}"
        self.n += 1
        self.emit(f"for (int {it} = 0; {it} < {n}; {it}++) {{" if g else f"for (var {it}: i32 = 0; {it} < {n}; {it}++) {{")
        self.indent += 1
        e2 = dict(env, **state, _n=(cnt, 1))
        new = {}
        for k, v in update.items():
            c, d = self.gen(v, e2, depth + 1)
            if k not in state:
                raise Unsupported(f"iterate updates unknown state {k}")
            new[k] = self.decl(self.splat(c, d, state[k][1]), state[k][1])
        for k, v in new.items():
            self.emit(f"{state[k][0]} = {v};")
        self.emit(f"{cnt} = {cnt} + 1.0;")
        if escape is not None:
            c, d = self.gen(escape, e2, depth + 1)
            self.emit(f"if ({c if d == 1 else c + '.x'} > 0.5) {{ break; }}")
        self.indent -= 1
        self.emit("}")
        return self.gen(result, dict(env, **state, _n=(cnt, 1)), depth + 1)

    def sum_i(self, h, args, env, depth):
        iv, lo, hi, body = args
        lo, hi = self._int(lo, env), self._int(hi, env)
        g = self.lang == "glsl"
        k = f"k{self.n}"
        self.n += 1
        save, self.lines = self.lines, []
        self.indent += 1
        ivar = self.decl(f"float({k})" if g else f"f32({k})", 1)
        c, d = self.gen(body, dict(env, **{iv: (ivar, 1)}), depth + 1)
        inner, self.lines = self.lines, save
        self.indent -= 1
        acc = self.decl(self.splat("0.0" if h == "sum_i" else "1.0", 1, d), d)
        self.emit(f"for (int {k} = {lo}; {k} <= {hi}; {k}++) {{" if g else f"for (var {k}: i32 = {lo}; {k} <= {hi}; {k}++) {{")
        self.lines.extend(inner)
        self.emit(f"  {acc} = {acc} {'+' if h == 'sum_i' else '*'} {c};")
        self.emit("}")
        return acc, d


def _body(ir, lang, expr):
    g = _Gen(ir, lang)
    c, d = g.gen(expr, {})
    if d == 1:
        c = g.splat(c, 1, 3)
    elif d != 3:
        raise Unsupported(f"output must have 1 or 3 channels, got {d}")
    return "\n".join(g.lines), c


def transpile(ir: dict) -> dict:
    """Return {"mode": "shader"|"texture", "glsl": fn src, "wgsl": fn src, "reason": ...}."""
    if ir.get("fields") or ir.get("schedule"):
        raise Unsupported("stateful field program (passes over fields) uses the texture fallback")
    out = {"mode": "shader"}
    for lang in ("glsl", "wgsl"):
        body, ret = _body(ir, lang, ir["output"])
        if lang == "glsl":
            out["glsl"] = f"vec3 eqart(vec2 p) {{\n{body}\n  return {ret};\n}}\n"
        else:
            out["wgsl"] = f"fn eqart(p: vec2<f32>) -> vec3<f32> {{\n{body}\n  return {ret};\n}}\n"
    sdf = (ir.get("meta") or {}).get("sdf")
    if isinstance(sdf, list):
        b, r = _body(ir, "glsl", sdf)
        out["glsl"] += f"float eqart_sdf(vec2 p) {{\n{b}\n  return ({r}).x;\n}}\n"
        b, r = _body(ir, "wgsl", sdf)
        out["wgsl"] += f"fn eqart_sdf(p: vec2<f32>) -> f32 {{\n{b}\n  return ({r}).x;\n}}\n"
        out["sdf"] = True
    return out


TEX_GLSL = "vec3 eqart(vec2 p) {\n  vec2 uv = vec2((p.x - U_DOM.x) / (2.0 * U_DOM.z) + 0.5, 0.5 - (p.y - U_DOM.y) / (2.0 * U_DOM.w));\n  return textureLod(uTex, uv, 0.0).rgb;\n}\n"
TEX_WGSL = "fn eqart(p: vec2<f32>) -> vec3<f32> {\n  let uv = vec2<f32>((p.x - U.dom.x) / (2.0 * U.dom.z) + 0.5, 0.5 - (p.y - U.dom.y) / (2.0 * U.dom.w));\n  return textureSampleLevel(tex, samp, uv, 0.0).rgb;\n}\n"

GLSL_FRAG = """#version 300 es
precision highp float;
uniform vec4 uA; // width, height, mode (0=2D, 1=3D), hscale
uniform vec4 uB; // yaw, pitch, dist, has_sdf
uniform vec4 U_DOM; // cx, cy, half-width, half-height
uniform sampler2D uTex;
out vec4 outColor;
#define U_W uA.x
#define U_H uA.y
#define U_PX gl_FragCoord.x
#define U_PY (uA.y - gl_FragCoord.y)
%FN%
float luma(vec3 c) { return dot(clamp(c, 0.0, 1.0), vec3(0.299, 0.587, 0.114)); }
float hgt(vec2 p) {
%HGT_GLSL%
}
void main() {
  vec2 frag = gl_FragCoord.xy / uA.xy;
  if (uA.z < 0.5) {
    vec2 p = vec2(U_DOM.x + (frag.x - 0.5) * 2.0 * U_DOM.z, U_DOM.y + (frag.y - 0.5) * 2.0 * U_DOM.w);
    outColor = vec4(clamp(eqart(p), 0.0, 1.0), 1.0);
    return;
  }
  float yaw = uB.x, pitch = uB.y, dist = uB.z;
  float R = max(U_DOM.z, U_DOM.w);
  vec3 tgt = vec3(U_DOM.x, 0.0, U_DOM.y);
  vec3 ro = tgt + dist * R * vec3(cos(pitch) * sin(yaw), sin(pitch), cos(pitch) * cos(yaw));
  vec3 fw = normalize(tgt - ro), rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0))), up = cross(rt, fw);
  vec2 q = (gl_FragCoord.xy - 0.5 * uA.xy) / uA.y;
  vec3 rd = normalize(fw * 1.6 + rt * q.x + up * q.y);
  float t = 0.0, tmax = dist * R * 3.0, dt = tmax / 220.0;
  vec3 col = mix(vec3(0.06, 0.07, 0.1), vec3(0.18, 0.2, 0.28), q.y + 0.5);
  float prevD = 1.0, prevT = 0.0;
  for (int i = 0; i < 220; i++) {
    vec3 pos = ro + rd * t;
    vec2 p = vec2(pos.x, pos.z);
    bool inside = abs(p.x - U_DOM.x) <= U_DOM.z && abs(p.y - U_DOM.y) <= U_DOM.w;
    float d = inside ? pos.y - hgt(p) : 1.0;
    if (inside && d < 0.0) {
      float a = prevT, b = t;
      for (int k = 0; k < 6; k++) { float m = 0.5 * (a + b); vec3 pm = ro + rd * m; if (pm.y - hgt(pm.xz) < 0.0) b = m; else a = m; }
      vec3 ph = ro + rd * b;
      float e = 2.0 * U_DOM.z / uA.x;
      vec3 n = normalize(vec3(hgt(ph.xz - vec2(e, 0.0)) - hgt(ph.xz + vec2(e, 0.0)), 2.0 * e, hgt(ph.xz - vec2(0.0, e)) - hgt(ph.xz + vec2(0.0, e))));
      vec3 base = clamp(eqart(vec2(ph.x, ph.z)), 0.0, 1.0);
      float diff = max(dot(n, normalize(vec3(0.5, 0.9, 0.3))), 0.0);
      col = base * (0.25 + 0.75 * diff);
      break;
    }
    prevT = t; t += dt;
    if (t > tmax) break;
  }
  outColor = vec4(col, 1.0);
}
"""

WGSL_SRC = """struct Uni { a: vec4<f32>, b: vec4<f32>, dom: vec4<f32> };
@group(0) @binding(0) var<uniform> U: Uni;
@group(0) @binding(1) var tex: texture_2d<f32>;
@group(0) @binding(2) var samp: sampler;
struct VOut { @builtin(position) pos: vec4<f32> };
@vertex fn vs(@builtin(vertex_index) i: u32) -> VOut {
  var xy = array<vec2<f32>, 3>(vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0));
  var o: VOut; o.pos = vec4<f32>(xy[i], 0.0, 1.0); return o;
}
var<private> FRAG: vec2<f32>;
%DEFS%
%FN%
fn luma(c: vec3<f32>) -> f32 { return dot(clamp(c, vec3<f32>(0.0), vec3<f32>(1.0)), vec3<f32>(0.299, 0.587, 0.114)); }
fn hgt(p: vec2<f32>) -> f32 {
%HGT_WGSL%
}
@fragment fn fs(@builtin(position) fc: vec4<f32>) -> @location(0) vec4<f32> {
  FRAG = fc.xy;
  _ = textureSampleLevel(tex, samp, vec2<f32>(0.5, 0.5), 0.0); // keep bindings 1-2 in the auto layout
  let res = U.a.xy;
  let frag = vec2<f32>(fc.x / res.x, 1.0 - fc.y / res.y);
  if (U.a.z < 0.5) {
    let p = vec2<f32>(U.dom.x + (frag.x - 0.5) * 2.0 * U.dom.z, U.dom.y + (frag.y - 0.5) * 2.0 * U.dom.w);
    return vec4<f32>(clamp(eqart(p), vec3<f32>(0.0), vec3<f32>(1.0)), 1.0);
  }
  let yaw = U.b.x; let pitch = U.b.y; let dist = U.b.z;
  let R = max(U.dom.z, U.dom.w);
  let tgt = vec3<f32>(U.dom.x, 0.0, U.dom.y);
  let ro = tgt + dist * R * vec3<f32>(cos(pitch) * sin(yaw), sin(pitch), cos(pitch) * cos(yaw));
  let fw = normalize(tgt - ro); let rt = normalize(cross(fw, vec3<f32>(0.0, 1.0, 0.0))); let up = cross(rt, fw);
  let q = vec2<f32>(fc.x - 0.5 * res.x, 0.5 * res.y - fc.y) / res.y;
  let rd = normalize(fw * 1.6 + rt * q.x + up * q.y);
  var t = 0.0; let tmax = dist * R * 3.0; let dt = tmax / 220.0;
  var col = mix(vec3<f32>(0.06, 0.07, 0.1), vec3<f32>(0.18, 0.2, 0.28), q.y + 0.5);
  var prevT = 0.0;
  for (var i: i32 = 0; i < 220; i++) {
    let pos = ro + rd * t;
    let p = vec2<f32>(pos.x, pos.z);
    let inside = abs(p.x - U.dom.x) <= U.dom.z && abs(p.y - U.dom.y) <= U.dom.w;
    var d = 1.0;
    if (inside) { d = pos.y - hgt(p); }
    if (inside && d < 0.0) {
      var a = prevT; var b = t;
      for (var k: i32 = 0; k < 6; k++) { let m = 0.5 * (a + b); let pm = ro + rd * m; if (pm.y - hgt(pm.xz) < 0.0) { b = m; } else { a = m; } }
      let ph = ro + rd * b;
      let e = 2.0 * U.dom.z / res.x;
      let n = normalize(vec3<f32>(hgt(ph.xz - vec2<f32>(e, 0.0)) - hgt(ph.xz + vec2<f32>(e, 0.0)), 2.0 * e, hgt(ph.xz - vec2<f32>(0.0, e)) - hgt(ph.xz + vec2<f32>(0.0, e))));
      let base = clamp(eqart(ph.xz), vec3<f32>(0.0), vec3<f32>(1.0));
      let diff = max(dot(n, normalize(vec3<f32>(0.5, 0.9, 0.3))), 0.0);
      col = base * (0.25 + 0.75 * diff);
      break;
    }
    prevT = t; t = t + dt;
    if (t > tmax) { break; }
  }
  return vec4<f32>(col, 1.0);
}
"""

WGSL_DEFS = "fn U_W_f() -> f32 { return U.a.x; }\n"


def _domain(ir):
    c = ir["canvas"]
    W, H = int(c["width"]), int(c["height"])
    s = float(c.get("scale", min(W, H) / 2))
    return {"width": W, "height": H, "cx": float(c.get("cx", 0)), "cy": float(c.get("cy", 0)),
            "hw": W / (2 * s), "hh": H / (2 * s)}


def build_shaders(ir: dict, texture_png: bytes | None = None) -> dict:
    """Return GLSL fragment source, WGSL module source and viewer metadata."""
    try:
        t = transpile(ir)
    except Unsupported as e:
        t = {"mode": "texture", "reason": str(e), "glsl": TEX_GLSL, "wgsl": TEX_WGSL}
    dom = _domain(ir)
    hscale = 0.18 * max(dom["hw"], dom["hh"])
    if t.get("sdf"):
        hg = f"  return -{_lit(hscale)} * clamp(eqart_sdf(p) / {_lit(0.25 * max(dom['hw'], dom['hh']))}, -1.0, 1.0);"
        hw_ = hg
    elif (ir.get("meta") or {}).get("height") == "invert":  # light background: dark strokes stand up
        hg = f"  return {_lit(hscale)} * (1.0 - luma(eqart(p)));"
        hw_ = hg
    else:
        hg = f"  return {_lit(hscale)} * luma(eqart(p));"
        hw_ = hg
    # WGSL: replace GLSL-only macros used by name() (W/H/px/py)
    wgsl_fn = (t["wgsl"].replace("U_W", "U.a.x").replace("U_H", "U.a.y")
               .replace("U_PX", "FRAG.x").replace("U_PY", "FRAG.y"))
    glsl = GLSL_FRAG.replace("%FN%", t["glsl"]).replace("%HGT_GLSL%", hg)
    wgsl = WGSL_SRC.replace("%DEFS%", "").replace("%FN%", wgsl_fn).replace("%HGT_WGSL%", hw_)
    return {"mode": t["mode"], "reason": t.get("reason"), "glsl": glsl, "wgsl": wgsl, "domain": dom,
            "sdf": bool(t.get("sdf"))}


HTML = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>%TITLE% · eqart 3D viewer</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
html,body{margin:0;height:100%;background:#0d0f14;color:#dfe3ea;font:14px system-ui,sans-serif}
#bar{position:fixed;top:0;left:0;right:0;display:flex;gap:8px;align-items:center;padding:8px 12px;background:#0d0f14cc;z-index:2}
button{background:#1c2130;color:#dfe3ea;border:1px solid #2d3448;border-radius:6px;padding:4px 10px;cursor:pointer}
button.on{background:#3b5bdb;border-color:#3b5bdb}
#c{width:100vw;height:100vh;display:block;touch-action:none}
#api{opacity:.8}
</style></head><body>
<div id="bar"><strong>%TITLE%</strong>
<button id="b2d">2D</button><button id="b3d" class="on">3D</button>
<span id="api">starting…</span><span style="opacity:.6">drag to orbit · wheel to zoom</span></div>
<canvas id="c"></canvas>
<script type="x-shader/x-fragment" id="glsl">%GLSL%</script>
<script type="text/wgsl" id="wgsl">%WGSL%</script>
<script>
const META = %META%;
const TEX_B64 = "%TEX%";
const cv = document.getElementById('c');
const st = {mode: 1, yaw: 0.7, pitch: 0.75, dist: 2.2};
const apiEl = document.getElementById('api');
function setMode(m){st.mode=m;document.getElementById('b2d').classList.toggle('on',m===0);document.getElementById('b3d').classList.toggle('on',m===1);}
document.getElementById('b2d').onclick=()=>setMode(0);
document.getElementById('b3d').onclick=()=>setMode(1);
let drag=null;
cv.addEventListener('pointerdown',e=>{drag=[e.clientX,e.clientY];cv.setPointerCapture(e.pointerId);});
cv.addEventListener('pointerup',()=>drag=null);
cv.addEventListener('pointermove',e=>{if(!drag)return;st.yaw-=(e.clientX-drag[0])*0.01;st.pitch=Math.min(1.5,Math.max(0.05,st.pitch+(e.clientY-drag[1])*0.01));drag=[e.clientX,e.clientY];});
cv.addEventListener('wheel',e=>{e.preventDefault();st.dist=Math.min(8,Math.max(0.6,st.dist*Math.exp(e.deltaY*0.001)));},{passive:false});
function resize(){const d=Math.min(window.devicePixelRatio||1,2);cv.width=Math.floor(cv.clientWidth*d);cv.height=Math.floor(cv.clientHeight*d);}
window.addEventListener('resize',resize);
function uniforms(){const D=META.domain;const aspect=cv.width/cv.height;let hw=D.hw,hh=D.hh;
  // 2D view keeps the program's aspect, letterboxed to the window
  if(st.mode===0){if(hw/hh<aspect)hw=hh*aspect;else hh=hw/aspect;}
  return new Float32Array([cv.width,cv.height,st.mode,0, st.yaw,st.pitch,st.dist,META.sdf?1:0, D.cx,D.cy,hw,hh]);}
async function loadBitmap(){if(!TEX_B64){const c=document.createElement('canvas');c.width=c.height=1;return createImageBitmap(c);}
  const b=await (await fetch('data:image/png;base64,'+TEX_B64)).blob();return createImageBitmap(b,{imageOrientation:'none'});}

async function startWebGPU(){
  if(!navigator.gpu) throw new Error('navigator.gpu missing');
  const adapter=await navigator.gpu.requestAdapter(); if(!adapter) throw new Error('no WebGPU adapter');
  const device=await adapter.requestDevice();
  const ctx=cv.getContext('webgpu'); const fmt=navigator.gpu.getPreferredCanvasFormat();
  ctx.configure({device,format:fmt,alphaMode:'opaque'});
  const module=device.createShaderModule({code:document.getElementById('wgsl').textContent});
  const info=await module.getCompilationInfo?.(); if(info&&info.messages.some(m=>m.type==='error')) throw new Error('WGSL: '+info.messages.map(m=>m.message).join('; '));
  const pipe=device.createRenderPipeline({layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format:fmt}]},primitive:{topology:'triangle-list'}});
  const ubuf=device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
  const bmp=await loadBitmap();
  const tex=device.createTexture({size:[bmp.width,bmp.height],format:'rgba8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});
  device.queue.copyExternalImageToTexture({source:bmp},{texture:tex},[bmp.width,bmp.height]);
  const samp=device.createSampler({magFilter:'linear',minFilter:'linear'});
  const bg=device.createBindGroup({layout:pipe.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:ubuf}},{binding:1,resource:tex.createView()},{binding:2,resource:samp}]});
  apiEl.textContent='WebGPU · '+META.mode;
  function frame(){resize();device.queue.writeBuffer(ubuf,0,uniforms());
    const enc=device.createCommandEncoder();const pass=enc.beginRenderPass({colorAttachments:[{view:ctx.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});
    pass.setPipeline(pipe);pass.setBindGroup(0,bg);pass.draw(3);pass.end();device.queue.submit([enc.finish()]);requestAnimationFrame(frame);}
  frame();
}

async function startWebGL(){
  const gl=cv.getContext('webgl2'); if(!gl) throw new Error('WebGL2 unavailable');
  const vs='#version 300 es\\nvoid main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.0-1.0,0.0,1.0);}';
  function sh(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
  const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,vs));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,document.getElementById('glsl').textContent.trim()));gl.linkProgram(pr);
  if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(pr));
  gl.useProgram(pr);
  const bmp=await loadBitmap();const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,bmp);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  const lA=gl.getUniformLocation(pr,'uA'),lB=gl.getUniformLocation(pr,'uB'),lD=gl.getUniformLocation(pr,'U_DOM');
  apiEl.textContent='WebGL2 · '+META.mode;
  function frame(){resize();gl.viewport(0,0,cv.width,cv.height);const u=uniforms();gl.uniform4fv(lA,u.subarray(0,4));gl.uniform4fv(lB,u.subarray(4,8));gl.uniform4fv(lD,u.subarray(8,12));gl.drawArrays(gl.TRIANGLES,0,3);requestAnimationFrame(frame);}
  frame();
}

(async()=>{resize();const want=new URLSearchParams(location.search).get('api');
  const order=want==='webgl'?[startWebGL]:want==='webgpu'?[startWebGPU]:[startWebGPU,startWebGL];
  for(const f of order){try{await f();return;}catch(e){console.warn(f.name,e);apiEl.textContent=f.name+' failed: '+e.message;}}
})();
</script></body></html>
"""


def export_viewer(ir: dict, out_dir: Path, texture_png: bytes | None = None, title: str | None = None) -> dict:
    """Write viewer.html + program.wgsl + program.frag.glsl into out_dir. texture_png is required
    (and produced by the caller via the sandboxed renderer) when the program falls back to texture mode."""
    sh = build_shaders(ir)
    if sh["mode"] == "texture" and not texture_png:
        raise EqartError("texture fallback needs texture_png (render the program first)")
    out_dir.mkdir(parents=True, exist_ok=True)
    title = title or (ir.get("meta") or {}).get("title") or "eqart program"
    meta = {"domain": sh["domain"], "mode": sh["mode"], "sdf": sh["sdf"], "reason": sh["reason"]}
    tex = base64.b64encode(texture_png).decode() if sh["mode"] == "texture" else ""
    esc = lambda s: s.replace("</script", "<\\/script")  # noqa: E731
    page = (HTML.replace("%TITLE%", title.replace("<", "&lt;"))
            .replace("%GLSL%", esc(sh["glsl"])).replace("%WGSL%", esc(sh["wgsl"]))
            .replace("%META%", json.dumps(meta)).replace("%TEX%", tex))
    files = {}
    p = out_dir / "viewer.html"; p.write_text(page); files["html"] = str(p)
    p = out_dir / "program.wgsl"; p.write_text(sh["wgsl"]); files["wgsl"] = str(p)
    p = out_dir / "program.frag.glsl"; p.write_text(sh["glsl"]); files["glsl"] = str(p)
    return {"ok": True, "files": files, "mode": sh["mode"], "reason": sh["reason"], "sdf": sh["sdf"]}


def native_preview(ir: dict, out_png: Path, size=(512, 512), mode=1) -> dict:
    """Optional native render of the WGSL with wgpu-py (gpu-preview extra). Shader mode only."""
    try:
        import wgpu  # noqa: F401
    except ImportError:
        return {"ok": False, "errors": ["wgpu not installed: uv sync --project <plugin>/server --extra gpu-preview"]}
    import numpy as np
    from PIL import Image
    sh = build_shaders(ir)
    if sh["mode"] != "shader":
        return {"ok": False, "errors": [f"native preview needs shader mode ({sh['reason']})"]}
    gpu = wgpu.gpu
    req = getattr(gpu, "request_adapter_sync", None) or gpu.request_adapter
    adapter = req(power_preference="high-performance")
    device = (getattr(adapter, "request_device_sync", None) or adapter.request_device)()
    W, H = size
    tex = device.create_texture(size=(W, H, 1), format=wgpu.TextureFormat.rgba8unorm,
                                usage=wgpu.TextureUsage.RENDER_ATTACHMENT | wgpu.TextureUsage.COPY_SRC)
    dummy = device.create_texture(size=(1, 1, 1), format=wgpu.TextureFormat.rgba8unorm,
                                  usage=wgpu.TextureUsage.TEXTURE_BINDING)
    mod = device.create_shader_module(code=sh["wgsl"])
    pipe = device.create_render_pipeline(layout="auto", vertex={"module": mod, "entry_point": "vs"},
                                         fragment={"module": mod, "entry_point": "fs",
                                                   "targets": [{"format": wgpu.TextureFormat.rgba8unorm}]},
                                         primitive={"topology": wgpu.PrimitiveTopology.triangle_list})
    d = sh["domain"]
    u = np.array([W, H, mode, 0, 0.7, 0.75, 2.2, 0, d["cx"], d["cy"], d["hw"], d["hh"]], dtype=np.float32)
    ubuf = device.create_buffer_with_data(data=u.tobytes(), usage=wgpu.BufferUsage.UNIFORM)
    bg = device.create_bind_group(layout=pipe.get_bind_group_layout(0), entries=[
        {"binding": 0, "resource": {"buffer": ubuf, "offset": 0, "size": 48}},
        {"binding": 1, "resource": dummy.create_view()},
        {"binding": 2, "resource": device.create_sampler()}])
    enc = device.create_command_encoder()
    rp = enc.begin_render_pass(color_attachments=[{"view": tex.create_view(), "load_op": wgpu.LoadOp.clear,
                                                   "store_op": wgpu.StoreOp.store, "clear_value": (0, 0, 0, 1)}])
    rp.set_pipeline(pipe); rp.set_bind_group(0, bg); rp.draw(3); rp.end()
    device.queue.submit([enc.finish()])
    data = device.queue.read_texture({"texture": tex, "origin": (0, 0, 0), "mip_level": 0},
                                     {"offset": 0, "bytes_per_row": W * 4, "rows_per_image": H}, (W, H, 1))
    img = np.frombuffer(bytes(data), dtype=np.uint8).reshape(H, W, 4)[..., :3]
    out_png.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(img).save(out_png)
    return {"ok": True, "png_path": str(out_png)}
