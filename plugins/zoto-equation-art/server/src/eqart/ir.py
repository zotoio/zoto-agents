"""Static validation, cost estimation and canonicalization for eqart-ir/2."""
from __future__ import annotations

import hashlib
import json
import math
from dataclasses import dataclass, field

from .interp import ALL_OPS, ARITY, BUILTINS, SPECIAL

IR_VERSION = "eqart-ir/2"


@dataclass
class Limits:
    max_nodes: int = 50_000
    max_param_floats: int = 64_000_000
    max_depth: int = 256
    max_iterate: int = 10_000
    max_cost: float = 5e11
    max_pixels: int = 4096 * 4096
    max_fields: int = 32
    max_channels: int = 256


@dataclass
class Report:
    errors: list = field(default_factory=list)
    warnings: list = field(default_factory=list)
    nodes: int = 0
    param_floats: int = 0
    cost: float = 0.0
    steps: int = 0

    @property
    def ok(self):
        return not self.errors

    def as_dict(self):
        return {"ok": self.ok, "errors": self.errors, "warnings": self.warnings,
                "nodes": self.nodes, "param_floats": self.param_floats,
                "cost_estimate": self.cost, "steps": self.steps}


def _shape_size(shape):
    n = 1
    for d in shape:
        n *= int(d)
    return n


def _param_shape(spec):
    if "value" in spec:
        v = spec["value"]
        shape = []
        while isinstance(v, list):
            shape.append(len(v))
            v = v[0] if v else 0
        return shape
    return list(spec.get("shape", []))


class _Checker:
    def __init__(self, ir, limits: Limits, report: Report):
        self.ir, self.lim, self.r = ir, limits, report
        self.params = ir.get("params") or {}
        self.fields = ir.get("fields") or {}
        self.opdefs = ir.get("opdefs") or {}
        self._opcost: dict = {}

    def err(self, where, msg):
        self.r.errors.append(f"{where}: {msg}")

    # returns per-pixel cost estimate of the expression
    def expr(self, node, scope: set, where: str, depth=0) -> float:
        self.r.nodes += 1
        if depth > self.lim.max_depth:
            self.err(where, f"nesting deeper than {self.lim.max_depth}")
            return 1
        if isinstance(node, (bool, int, float)):
            return 0
        if isinstance(node, str):
            if node in scope or node in BUILTINS:
                return 0
            if node.startswith("$"):
                if node[1:] not in self.params:
                    self.err(where, f"unknown param {node}")
                return 0
            self.err(where, f"unknown name {node!r}")
            return 0
        if isinstance(node, dict):
            self.err(where, "object found where an expression was expected")
            return 0
        if not isinstance(node, list) or not node or not isinstance(node[0], str):
            self.err(where, f"invalid expression {str(node)[:60]}")
            return 0
        head, args = node[0], node[1:]
        if head in self.opdefs and head not in ALL_OPS:
            od = self.opdefs[head]
            if len(args) != len(od.get("args", [])):
                self.err(where, f"opdef {head} expects {len(od.get('args', []))} args")
            c = sum(self.expr(a, scope, where, depth + 1) for a in args)
            return c + self._opdef_cost(head)
        if head == "call":
            if not args or args[0] not in self.opdefs:
                self.err(where, "call needs a known opdef name")
                return 1
            return self.expr([args[0], *args[1:]], scope, where, depth)
        if head not in ALL_OPS:
            hint = " (define it in opdefs or import from the op library)"
            self.err(where, f"unknown operator {head!r}{hint}")
            return 1
        lo, hi = ARITY.get(head, (0, None))
        if len(args) < lo or (hi is not None and len(args) > hi):
            self.err(where, f"{head} takes {lo}..{hi if hi is not None else 'n'} args, got {len(args)}")
            return 1
        if head in SPECIAL:
            return self.special(head, args, scope, where, depth)
        return 1 + sum(self.expr(a, scope, where, depth + 1) for a in args)

    def special(self, head, args, scope, where, depth):
        d = depth + 1
        if head == "let":
            binds, body = args
            if not isinstance(binds, dict):
                self.err(where, "let bindings must be an object")
                return 1
            s = set(scope)
            c = 0
            for k, v in binds.items():
                c += self.expr(v, s, where, d)
                s.add(k)
            return c + self.expr(body, s, where, d)
        if head in ("tap", "lap", "conv", "sample"):
            f = args[0]
            if not isinstance(f, str) or f not in self.fields:
                self.err(where, f"{head} needs a declared field name, got {f!r}")
            if head == "tap":
                for a in args[1:]:
                    if not isinstance(a, (int, float)):
                        self.err(where, "tap offsets must be numeric literals")
                return 1
            if head == "lap":
                return 9
            if head == "conv":
                k = args[1]
                if not (isinstance(k, str) and k.startswith("$") and k[1:] in self.params):
                    self.err(where, "conv kernel must be a declared $param")
                    return 9
                shp = _param_shape(self.params[k[1:]])
                return 2 * _shape_size(shp) if shp else 9
            return 12 + self.expr(args[1], scope, where, d) + self.expr(args[2], scope, where, d)
        if head == "reduce":
            if args[0] not in ("mean", "sum", "min", "max"):
                self.err(where, f"reduce op must be mean|sum|min|max, got {args[0]!r}")
            return 2 + self.expr(args[1], scope, where, d)
        if head == "matvec":
            wp = args[0]
            cost = 1
            if not (isinstance(wp, str) and wp.startswith("$") and wp[1:] in self.params):
                self.err(where, "matvec weight must be a declared $param")
            else:
                shp = _param_shape(self.params[wp[1:]])
                if len(shp) != 2:
                    self.err(where, f"matvec weight {wp} must be 2D")
                else:
                    cost = 2 * shp[0] * shp[1]
            return cost + sum(self.expr(a, scope, where, d) for a in args[1:])
        if head in ("sum_i", "prod_i"):
            iv, lo, hi, body = args
            if not isinstance(iv, str):
                self.err(where, f"{head} index must be a name")
                return 1
            if not isinstance(lo, (int, float)) or not isinstance(hi, (int, float)):
                self.err(where, f"{head} bounds must be numeric literals")
                return 1
            n = max(0, int(hi) - int(lo) + 1)
            return n * (1 + self.expr(body, scope | {iv}, where, d))
        if head == "iterate":
            n = args[0]
            if not isinstance(n, (int, float)) or int(n) < 0:
                self.err(where, "iterate count must be a non-negative literal")
                n = 1
            if int(n) > self.lim.max_iterate:
                self.err(where, f"iterate count {int(n)} exceeds {self.lim.max_iterate}")
            init, update = args[1], args[2]
            if not isinstance(init, dict) or not isinstance(update, dict):
                self.err(where, "iterate init/update must be objects")
                return 1
            c0 = sum(self.expr(v, scope, where, d) for v in init.values())
            s = scope | set(init) | {"_n"}
            missing = set(update) - set(init)
            if missing:
                self.err(where, f"iterate updates undeclared state {sorted(missing)}")
            body = sum(self.expr(v, s, where, d) for v in update.values())
            if len(args) > 4:
                body += self.expr(args[4], s, where, d)
            return c0 + int(n) * (body + 1) + self.expr(args[3], s, where, d)
        return 1

    def _opdef_cost(self, name, stack=()):
        if name in self._opcost:
            return self._opcost[name]
        if name in stack:
            self.err(f"opdefs.{name}", "recursive opdef (use iterate instead)")
            return 1
        self._opcost[name] = 1  # provisional
        od = self.opdefs[name]
        c = self.expr(od.get("body", 0), set(od.get("args", [])), f"opdefs.{name}")
        self._opcost[name] = c
        return c


def _check_opdef_cycles(opdefs, report):
    graph = {}

    def heads(n, acc):
        if isinstance(n, list) and n:
            if isinstance(n[0], str):
                if n[0] in opdefs:
                    acc.add(n[0])
                if n[0] == "call" and len(n) > 1 and n[1] in opdefs:
                    acc.add(n[1])
            for a in n[1:]:
                heads(a, acc)
        elif isinstance(n, dict):
            for v in n.values():
                heads(v, acc)
        return acc

    for k, od in opdefs.items():
        graph[k] = heads(od.get("body"), set())
    state = {}

    def visit(k):
        if state.get(k) == 1:
            report.errors.append(f"opdefs.{k}: cycle in opdef dependency graph")
            return
        if state.get(k) == 2:
            return
        state[k] = 1
        for nxt in graph.get(k, ()):
            visit(nxt)
        state[k] = 2

    for k in graph:
        visit(k)


def _walk_cfl(node, where, report):
    if isinstance(node, list) and node:
        if node[0] == "mul" and any(isinstance(a, list) and a and a[0] == "lap" for a in node[1:]):
            consts = [a for a in node[1:] if isinstance(a, (int, float))]
            if consts:
                c = math.prod(consts)
                if abs(c) * 4 > 1:
                    report.warnings.append(f"{where}: explicit diffusion coefficient {c} violates CFL (4·c ≤ 1); expect instability")
        for a in node[1:]:
            _walk_cfl(a, where, report)
    elif isinstance(node, dict):
        for v in node.values():
            _walk_cfl(v, where, report)


def validate(ir, limits: Limits | None = None, width=None, height=None) -> Report:
    lim = limits or Limits()
    r = Report()
    if not isinstance(ir, dict):
        r.errors.append("root: IR must be a JSON object")
        return r
    if ir.get("ir") != IR_VERSION:
        r.errors.append(f"root: 'ir' must be '{IR_VERSION}'")
    allowed = {"ir", "canvas", "params", "opdefs", "fields", "schedule", "output", "meta"}
    for k in ir:
        if k not in allowed:
            r.warnings.append(f"root: unknown key {k!r} ignored")
    c = ir.get("canvas")
    if not isinstance(c, dict) or not isinstance(c.get("width"), int) or not isinstance(c.get("height"), int):
        r.errors.append("canvas: width and height must be integers")
        return r
    W = int(width or c["width"])
    H = int(height or c["height"] * W // c["width"])
    if W <= 0 or H <= 0 or W * H > lim.max_pixels:
        r.errors.append(f"canvas: {W}x{H} outside limits (≤ {lim.max_pixels} pixels)")
        return r
    if "output" not in ir:
        r.errors.append("output: missing")
    params = ir.get("params") or {}
    for name, spec in params.items():
        if not isinstance(spec, dict) or ("value" not in spec and "shape" not in spec):
            r.errors.append(f"params.{name}: needs 'value' or 'shape'")
            continue
        r.param_floats += _shape_size(_param_shape(spec)) if _param_shape(spec) else 1
        q = spec.get("quant", 8)
        if not isinstance(q, int) or not (1 <= q <= 32):
            r.errors.append(f"params.{name}: quant must be an int 1..32")
    if r.param_floats > lim.max_param_floats:
        r.errors.append(f"params: {r.param_floats} floats exceeds {lim.max_param_floats}")
    fields = ir.get("fields") or {}
    if len(fields) > lim.max_fields:
        r.errors.append(f"fields: more than {lim.max_fields}")
    opdefs = ir.get("opdefs") or {}
    for name, od in opdefs.items():
        if name in ALL_OPS:
            r.errors.append(f"opdefs.{name}: shadows a core operator")
        if not isinstance(od, dict) or "body" not in od or not isinstance(od.get("args", []), list):
            r.errors.append(f"opdefs.{name}: needs 'args' (list) and 'body'")
    _check_opdef_cycles(opdefs, r)
    if r.errors:
        return r
    chk = _Checker(ir, lim, r)
    fscale = W / c["width"]
    for name, spec in fields.items():
        k = spec.get("channels", 1)
        if not isinstance(k, int) or not (1 <= k <= lim.max_channels):
            r.errors.append(f"fields.{name}: channels must be 1..{lim.max_channels}")
        if spec.get("boundary", "clamp") not in ("wrap", "clamp", "zero", "mirror"):
            r.errors.append(f"fields.{name}: bad boundary")
        if "init" in spec:
            chk.expr(spec["init"], set(), f"fields.{name}.init")

    def field_pixels(fname):
        res = (fields.get(fname) or {}).get("res")
        if res:
            return res[0] * res[1] * fscale * fscale
        return W * H

    def sched(items, mult, path):
        for i, it in enumerate(items if isinstance(items, list) else []):
            where = f"{path}[{i}]"
            if not isinstance(it, dict):
                r.errors.append(f"{where}: schedule item must be an object")
                continue
            if "loop" in it:
                n = it["loop"]
                if not isinstance(n, int) or n < 0:
                    r.errors.append(f"{where}: loop must be a non-negative int")
                    continue
                sched(it.get("schedule") or [], mult * n, where + ".schedule")
                continue
            writes = it.get("writes")
            if not isinstance(writes, dict) or not writes:
                r.errors.append(f"{where}: pass needs non-empty 'writes'")
                continue
            rep = int(it.get("repeat", 1))
            for fname, e in writes.items():
                if fname not in fields:
                    r.errors.append(f"{where}: writes undeclared field {fname!r}")
                    continue
                per_px = chk.expr(e, set(), f"{where}.writes.{fname}")
                r.cost += per_px * field_pixels(fname) * rep * mult
                _walk_cfl(e, f"{where}.writes.{fname}", r)
            r.steps += rep * mult

    sched(ir.get("schedule") or [], 1, "schedule")
    if "output" in ir:
        r.cost += chk.expr(ir["output"], set(), "output") * W * H
    for name in opdefs:
        chk._opdef_cost(name)
    if r.nodes > lim.max_nodes:
        r.errors.append(f"structure: {r.nodes} nodes exceeds {lim.max_nodes}")
    if r.cost > lim.max_cost:
        r.errors.append(f"cost: estimate {r.cost:.3g} exceeds budget {lim.max_cost:.3g}")
    if width and width != c["width"] and r.steps:
        r.warnings.append("rendering a stateful program at a different resolution changes its dynamics (pixel-unit stencils)")
    return r


def canonical(ir: dict, strip_meta=True) -> str:
    d = {k: v for k, v in ir.items() if not (strip_meta and k == "meta")}
    return json.dumps(d, sort_keys=True, separators=(",", ":"), allow_nan=False)


def ir_hash(ir: dict, *extra) -> str:
    h = hashlib.sha256(canonical(ir).encode())
    for e in extra:
        h.update(b"|" + str(e).encode())
    return h.hexdigest()
